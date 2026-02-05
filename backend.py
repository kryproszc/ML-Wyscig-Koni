from fastapi import FastAPI, File, UploadFile, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Union, Optional
import uuid
import pandas as pd
import numpy as np
import asyncio
from io import BytesIO
from openpyxl import load_workbook
from calculation_method import TriangleCalculator


from triangle_utils import TriangleCalculator_det
calculator_det = TriangleCalculator_det()    

import time
from typing import Dict,Literal


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE = {}

class MatrixRequest(BaseModel):
    user_id: str
    paid_data: List[List[Union[str, int, float, None]]]
    paid_weights: List[List[int]]
    cl_data: List[List[Union[str, int, float, None]]]
    cl_weights: List[List[int]]
    triangle_raw: List[List[Union[str, int, float, None]]]
    cl_weights_raw: List[List[int]]
    wagi_mult: Optional[List[List[int]]] = None
    quantiles: Optional[List[float]] = None
    nbr_samples: Optional[int] = 1000

class QuantileRequest(BaseModel):
    user_id: str
    request_id: str
    quantiles: List[float]



class UserSession:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.simulations: Dict[str, Dict] = {}

    def save_simulation(self, request_id: str, sim, diff, latest, quantiles_result=None):
        self.simulations[request_id] = {
            "sim": sim,
            "diff": diff,
            "latest": latest,
            "quantiles": quantiles_result
        }

    def get_simulation(self, request_id: str):
        return self.simulations.get(request_id)


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, UserSession] = {}

    def get_session(self, user_id: str) -> UserSession:
        if user_id not in self.sessions:
            self.sessions[user_id] = UserSession(user_id)
        return self.sessions[user_id]


SESSIONS = SessionManager()





@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/upload")
async def create_upload_files(file: UploadFile):
    content = await file.read()
    wb = load_workbook(filename=BytesIO(content))
    ws = wb.active
    return {"filename": file.filename, "size": len(content)}

@app.post("/calc/cl")
async def calc_cl(
    data: List[List[Union[str, int, float, None]]],
    selected: List[List[int]],
):
    df = pd.DataFrame(data).iloc[1:, 1:]
    df = df.apply(pd.to_numeric, errors="coerce")
    tri = TriangleCalculator.full_ci_calculation(df)[0]
    safe_tri = tri.replace([np.inf, -np.inf], np.nan).astype(object).where(pd.notnull(tri), None)

    matrix = [[tri.columns.name or "AY"] + list(tri.columns)]
    for idx in tri.index:
        values = list(safe_tri.loc[idx])
        while values and values[-1] is None:
            values.pop()
        row = [idx] + values
        matrix.append(row)
    return {"data": matrix}


@app.post("/calc/full")
async def calc_full(payload: MatrixRequest):
    import time
    import uuid
    import pandas as pd
    import numpy as np
    
    try:
        try:
            user_session = SESSIONS.get_session(payload.user_id)

            df_triangle_raw = (
                pd.DataFrame(payload.triangle_raw)
                .iloc[1:, 1:]
                .apply(pd.to_numeric, errors="coerce")
            )
            df_cl_weights_raw = pd.DataFrame(payload.paid_weights).astype(float)
            wagi_z_trojkata = np.array(df_cl_weights_raw.values, dtype=float)

            wagi_z_reszt = pd.DataFrame(payload.cl_weights).astype(float)
            df_np = np.array(df_triangle_raw.values, dtype=float)
            df_bool = wagi_z_reszt.copy()
            mask_reszty = df_bool.to_numpy(dtype=object)

            combined_mask = (~np.isnan(df_np))
            mask_np = ~np.isnan(df_np)
            
            tri0_np = TriangleCalculator.to_incr_np(df_np)
            ctri0_np = TriangleCalculator.to_cum_np(tri0_np)
            a2a_np = TriangleCalculator.get_a2a_factors_np(ctri0_np, mask_np)
            ctri_np = TriangleCalculator.fit_triangle_from_latest_np(df_np, mask_np)
            tri_np = TriangleCalculator.to_incr_np(ctri_np)
            r_adj_np, phi_np = TriangleCalculator.full_ci_calculation_np(df_np,mask_np, mask_reszty)
            residuals = r_adj_np[~np.isnan(r_adj_np)].flatten()

            sim_results_np = TriangleCalculator.run_simulations_numpy_nb(
                tri_np, residuals, wagi_z_trojkata, phi_np, a2a_np, nbr_samples=payload.nbr_samples
            )

            latest = np.sum(TriangleCalculator.get_latest(df_triangle_raw))
            sim_diff_np = sim_results_np - latest

            request_id = str(uuid.uuid4())

            user_session.save_simulation(
                request_id=request_id,
                sim=sim_results_np,
                diff=sim_diff_np,
                latest=latest
            )

            counts, bins = np.histogram(sim_results_np, bins=50)

            return {
                "message": "OK",
                "request_id": request_id,
                "triangle_shape": df_triangle_raw.shape,
                "histogram": {
                    "bins": bins.tolist(),
                    "counts": counts.tolist()
                }
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Błąd podczas obliczeń: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Krytyczny błąd serwera: {str(e)}")



@app.post("/calc/quantiles")
async def calc_quantiles(payload: QuantileRequest):
    user_session = SESSIONS.get_session(payload.user_id)
    cached = user_session.get_simulation(payload.request_id)

    if cached is None:
        raise HTTPException(status_code=403, detail="Nie znaleziono danych symulacji")

    sim_results_np = cached["sim"]
    sim_diff_np = cached["diff"]

    quantiles = payload.quantiles
    values_sim = np.quantile(sim_results_np, quantiles)
    values_diff = np.quantile(sim_diff_np, quantiles)

    quantile_result = {
        str(round(q, 4)): {
            "value": float(round(v1, 2)) if np.isfinite(v1) else None,
            "value_minus_latest": float(round(v2, 2)) if np.isfinite(v2) else None
        }
        for q, v1, v2 in zip(quantiles, values_sim, values_diff)
    }

    stats = {
        "mean": {
            "value": float(np.mean(sim_results_np)),
            "value_minus_latest": float(np.mean(sim_diff_np)),
        },
        "variance": {
            "value": float(np.var(sim_results_np)),
            "value_minus_latest": float(np.var(sim_diff_np)),
        },
        "std_dev": {
            "value": float(np.std(sim_results_np)),
            "value_minus_latest": float(np.std(sim_diff_np)),
        },
        "min": {
            "value": float(np.min(sim_results_np)),
            "value_minus_latest": float(np.min(sim_diff_np)),
        },
        "max": {
            "value": float(np.max(sim_results_np)),
            "value_minus_latest": float(np.max(sim_diff_np)),
        },
    }

    return {
        "quantiles": quantile_result,
        "stats": stats
    }

@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    for i in range(1, 11):
        await websocket.send_json({"progress": i})
        if i < 10:
            await asyncio.sleep(1)
    await websocket.close()

class PercentileRequest(BaseModel):
    user_id: str
    request_id: str
    value: float
    source: str  # 'sim' lub 'diff'

@app.post("/calc/percentile")
async def calc_percentile(payload: PercentileRequest):
    user_session = SESSIONS.get_session(payload.user_id)
    cached = user_session.get_simulation(payload.request_id)

    if cached is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono danych symulacji")

    value = payload.value
    source = payload.source

    def compute_percentile(data, val):
        sorted_data = np.sort(data)
        percentile = np.searchsorted(sorted_data, val, side='right') / len(sorted_data)
        return float(round(percentile, 6))

    if source == 'sim':
        percentile = compute_percentile(cached["sim"], value)
    elif source == 'diff':
        percentile = compute_percentile(cached["diff"], value)
    else:
        raise HTTPException(status_code=400, detail="Nieprawidłowe źródło: musi być 'sim' lub 'diff'")

    return {
        "source": source,
        "percentile": percentile
    }

@app.post("/calc/mult_stoch")
async def calc_mult_stoch(payload: MatrixRequest):
    raw = payload.paid_data

    # odetnij: 1) wiersz nagłówków, 2) pierwszą kolumnę (etykiety wierszy)
    data_rows = [row[1:] for row in raw[1:]]  # [1:] wiersze, [1:] kolumny

    # zbuduj słownik kolumn w kolejności wejścia (po odcięciu 1. kolumny)
    num_cols = len(data_rows[0]) if data_rows else 0
    data = {col_idx: [] for col_idx in range(num_cols)}

    for row in data_rows:
        for col_idx, value in enumerate(row):
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                num_value = None
            data[col_idx].append(num_value)

    # obliczenia
    train_devide = TriangleCalculator.elementwise_division(data)

    train_devide_serializable = np.array(train_devide).tolist()
    return {"train_devide": train_devide_serializable}



class WspolczynnikiMultRequest(BaseModel):
    user_id: str
    wagi_mult: List[List[int]]
    paid_data: List[List[Union[str, int, float, None]]]


import math

def try_parse_float(value):
    try:
        f = float(value)
        if not math.isfinite(f):
            return None
        return f
    except (ValueError, TypeError):
        return None

@app.post("/calc/wspolczynniki_mult")
async def calc_wspolczynniki_mult(payload: WspolczynnikiMultRequest):
    import numpy as np
    import pandas as pd

    paid_data = payload.paid_data
    weights = payload.wagi_mult

    # --- przetwarzanie danych tak samo jak w /calc/paid/cl ---
    # UWAGA: paid_data zawiera nagłówek + pierwszą kolumnę z latami
    actual_data = paid_data[1:]  # pomiń pierwszy wiersz (nagłówek)
    data = {}
    headers = np.arange(len(actual_data[0]) - 1)  # -1 bo pomijamy pierwszą kolumnę
    
    for i, col in enumerate(headers):
        data[col] = []
        for row in actual_data:
            value = row[i + 1]  # +1 bo pomijamy pierwszą kolumnę (lata)
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                num_value = None
            data[col].append(num_value)

    # --- obliczenia ---
    l_ij = pd.DataFrame(TriangleCalculator.elementwise_division(data))
    p_ij = pd.DataFrame(data)
    w_ij = pd.DataFrame(weights)

    dev_j = TriangleCalculator.Dev_prem(p_ij, w_ij)
    sigmas = TriangleCalculator.calculate_sigma(p_ij, l_ij, w_ij, dev_j)

    # --- JSON-safe (NaN/Inf -> None) ---
    def to_jsonable(x):
        arr = np.asarray(x, dtype=float)
        if arr.ndim == 0:
            return float(arr) if np.isfinite(arr) else None
        out = arr.astype(object)
        out[~np.isfinite(arr)] = None
        return out.tolist()

    return {
        "dev":   to_jsonable(dev_j),
        "sd":    to_jsonable(sigmas[0]),
        "sigma": to_jsonable(sigmas[1]),
    }


class WspolczynnikiMultiplikatywnaStochastycznaRequest(BaseModel):
    user_id: str
    dev: List[float]
    sd: List[float]
    sigma: List[float]
    triangle: List[List[Union[str, int, float, None]]]
    sim_total: Optional[int] = 1000
    batch_sim: Optional[int] = 1000
    main_seed: Optional[int] = 202260011
    ultimate_param_resrisk: Optional[int] = 0

@app.post("/calc/obliczenia_stoch_multiplikatywna")
async def obliczenia_stoch_multiplikatywna(payload: WspolczynnikiMultiplikatywnaStochastycznaRequest):
    # Przetwarzanie danych - POMIJAMY nagłówek i pierwszą kolumnę z etykietami
    triangle_data = payload.triangle[1:]  # pomijamy pierwszy wiersz (nagłówek)
    
    data = {}
    headers = np.arange(len(triangle_data[0]) - 1)  # -1 bo pomijamy pierwszą kolumnę
    
    for i, col in enumerate(headers):
        data[col] = []
        for row in triangle_data:
            value = row[i + 1]  # +1 bo pomijamy pierwszą kolumnę (etykiety)
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                num_value = None
            data[col].append(num_value)
    
    df_np = np.array(list(data.values()), dtype=float).T
    
    results_cale = TriangleCalculator.run_batched_simulation(df_np, payload.sd, payload.dev, payload.sigma,
                                                             sim_total=payload.sim_total,batch_sim=payload.batch_sim,
                                                             ultimate_param_resrisk=payload.ultimate_param_resrisk,
                                                             main_seed=payload.main_seed)
    
    latest = np.sum(TriangleCalculator.get_latest(pd.DataFrame(df_np)))
    sim_diff_np = results_cale - latest

    request_id = str(uuid.uuid4())
    user_session = SESSIONS.get_session(payload.user_id)
    user_session.save_simulation(request_id, results_cale, sim_diff_np, latest)
    
    # Sprawdź czy results_cale zawiera NaN przed utworzeniem histogramu
    if np.any(np.isnan(results_cale)):
        results_cale_clean = results_cale[~np.isnan(results_cale)]
        if len(results_cale_clean) > 0:
            counts, bins = np.histogram(results_cale_clean, bins=50)
        else:
            counts, bins = np.array([]), np.array([])
    else:
        counts, bins = np.histogram(results_cale, bins=50)

    return {
        "message": "OK",
        "request_id": request_id,
        "triangle_shape": df_np.shape,
        "histogram": {
            "bins": bins.tolist(),
            "counts": counts.tolist()
        }
    }

class QuantileStochRequest(BaseModel):
    user_id: str
    request_id: str
    quantiles: List[float]

@app.post("/calc/quantiles_stoch")
async def calc_quantiles_stoch(payload: QuantileStochRequest):
    user_session = SESSIONS.get_session(payload.user_id)
    cached = user_session.get_simulation(payload.request_id)

    if cached is None:
        raise HTTPException(status_code=403, detail="Nie znaleziono danych symulacji")

    sim_results_np = cached["sim"]
    sim_diff_np = cached["diff"]

    quantiles = payload.quantiles
    values_sim = np.quantile(sim_results_np, quantiles)
    values_diff = np.quantile(sim_diff_np, quantiles)

    quantile_result = {
        str(round(q, 4)): {
            "value": float(round(v1, 2)) if np.isfinite(v1) else None,
            "value_minus_latest": float(round(v2, 2)) if np.isfinite(v2) else None
        }
        for q, v1, v2 in zip(quantiles, values_sim, values_diff)
    }

    stats = {
        "mean": {
            "value": float(np.mean(sim_results_np)),
            "value_minus_latest": float(np.mean(sim_diff_np)),
        },
        "variance": {
            "value": float(np.var(sim_results_np)),
            "value_minus_latest": float(np.var(sim_diff_np)),
        },
        "std_dev": {
            "value": float(np.std(sim_results_np)),
            "value_minus_latest": float(np.std(sim_diff_np)),
        },
        "min": {
            "value": float(np.min(sim_results_np)),
            "value_minus_latest": float(np.min(sim_diff_np)),
        },
        "max": {
            "value": float(np.max(sim_results_np)),
            "value_minus_latest": float(np.max(sim_diff_np)),
        },
    }

    return {
        "quantiles": quantile_result,
        "stats": stats
    }


class PercentileStochRequest(BaseModel):
    user_id: str
    request_id: str
    value: float
    source: str  # 'sim' lub 'diff'

@app.post("/calc/percentile_stoch")
async def calc_percentile_stoch(payload: PercentileStochRequest):
    user_session = SESSIONS.get_session(payload.user_id)
    cached = user_session.get_simulation(payload.request_id)

    if cached is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono danych symulacji")

    value = payload.value
    source = payload.source

    def compute_percentile(data, val):
        sorted_data = np.sort(data)
        percentile = np.searchsorted(sorted_data, val, side='right') / len(sorted_data)
        return float(round(percentile, 6))

    if source == 'sim':
        percentile = compute_percentile(cached["sim"], value)
    elif source == 'diff':
        percentile = compute_percentile(cached["diff"], value)
    else:
        raise HTTPException(status_code=400, detail="Nieprawidłowe źródło: musi być 'sim' lub 'diff'")

    return {
        "source": source,
        "percentile": percentile
    }


###################
@app.get("/debug/endpoints")
def debug_endpoints():
    return [route.path for route in app.routes]
### boot

class WspolczynnikiBootRequest(BaseModel):
    user_id: str
    wagi_boot: List[List[int]]
    paid_data: List[List[Union[str, int, float, None]]]




@app.post("/calc/wspolczynniki_boot")
async def calc_wspolczynniki_boot(payload: WspolczynnikiBootRequest):
    paid_data = payload.paid_data
    weights = payload.wagi_boot

    # --- przetwarzanie danych tak samo jak w /calc/wspolczynniki_mult ---
    # UWAGA: paid_data zawiera nagłówek + pierwszą kolumnę z latami
    actual_data = paid_data[1:]  # pomiń pierwszy wiersz (nagłówek)
    data = {}
    headers = np.arange(len(actual_data[0]) - 1)  # -1 bo pomijamy pierwszą kolumnę
    
    for i, col in enumerate(headers):
        data[col] = []
        for row in actual_data:
            value = row[i + 1]  # +1 bo pomijamy pierwszą kolumnę (lata)
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                num_value = None
            data[col].append(num_value)

    l_ij = pd.DataFrame(TriangleCalculator.elementwise_division(data))
    w_ij = pd.DataFrame(weights)
    p_ij = pd.DataFrame(data)
 
    dev_j = TriangleCalculator.Dev_prem(p_ij, w_ij)
    sigmas = TriangleCalculator.calculate_sigma(p_ij, l_ij, w_ij, dev_j)

    # --- JSON-safe (NaN/Inf -> None) ---
    def to_jsonable(x):
        arr = np.asarray(x, dtype=float)
        if arr.ndim == 0:
            return float(arr) if np.isfinite(arr) else None
        out = arr.astype(object)
        out[~np.isfinite(arr)] = None
        return out.tolist()

    return {
        "dev":   to_jsonable(dev_j),
        "sd":    to_jsonable(sigmas[0]),
        "sigma": to_jsonable(sigmas[1]),
    }


class WspolczynnikiBootParamRequest(BaseModel):
    user_id: str
    dev: List[float]
    sd: List[float]
    sigma: List[float]
    triangle: List[List[Union[str, int, float, None]]]
    wagi_boot: List[List[int]]
    sim_total: Optional[int] = 1000
    batch_sim: Optional[int] = 1000
    main_seed: Optional[int] = 202260011
    ultimate_param_resrisk: Optional[int] = 0


@app.post("/calc/obliczenia_boot_multiplikatywna")
async def obliczenia_boot_multiplikatywna(payload: WspolczynnikiBootParamRequest):

    wagi = pd.DataFrame(payload.wagi_boot)
    # Przetwarzanie danych - POMIJAMY nagłówek i pierwszą kolumnę z etykietami
    triangle_data = payload.triangle[1:]  # pomijamy pierwszy wiersz (nagłówek)
    data = {}
    headers = np.arange(len(triangle_data[0]) - 1)  # -1 bo pomijamy pierwszą kolumnę
    
    for i, col in enumerate(headers):
        data[col] = []
        for row in triangle_data:
            value = row[i + 1]  # +1 bo pomijamy pierwszą kolumnę (etykiety)
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                num_value = 0.0  # lub None, jak preferujesz
            data[col].append(num_value)
    

    triangle_np = np.array(list(data.values()), dtype=float).T

    weight_np = wagi.iloc[:(wagi.shape[0]-1), :(wagi.shape[0]-1)].to_numpy(dtype=np.float64)


    results = TriangleCalculator.run_bootstrap_monte_carlo_init(
        triangle_np,
        weight_np,
        number_of_simulations=payload.sim_total,
        is_sigma_reestimated=False
    )
    
    latest = np.sum(TriangleCalculator.get_latest(pd.DataFrame(triangle_np)))
    sim_diff_np = results - latest
    request_id = str(uuid.uuid4())
    user_session = SESSIONS.get_session(payload.user_id)
    user_session.save_simulation(request_id, results, sim_diff_np, latest)

    # Sprawdź czy results zawiera NaN przed utworzeniem histogramu
    if np.any(np.isnan(results)):
        results_clean = results[~np.isnan(results)]
        if len(results_clean) > 0:
            counts, bins = np.histogram(results_clean, bins=50)
        else:
            counts, bins = np.array([]), np.array([])
    else:
        counts, bins = np.histogram(results, bins=50)

    return {
        "message": "OK",
        "request_id": request_id,
        "triangle_shape": triangle_np.shape,
        "histogram": {
            "bins": bins.tolist(),
            "counts": counts.tolist()
        }
    }


@app.post("/calc/quantiles_boot")
async def calc_quantiles_boot(payload: QuantileStochRequest):
    user_session = SESSIONS.get_session(payload.user_id)
    cached = user_session.get_simulation(payload.request_id)

    if cached is None:
        raise HTTPException(status_code=403, detail="Nie znaleziono danych boot")

    sim_results_np = cached["sim"]
    sim_diff_np = cached["diff"]

    quantiles = payload.quantiles
    values_sim = np.quantile(sim_results_np, quantiles)
    values_diff = np.quantile(sim_diff_np, quantiles)

    quantile_result = {
        str(round(q, 4)): {
            "value": float(round(v1, 2)) if np.isfinite(v1) else None,
            "value_minus_latest": float(round(v2, 2)) if np.isfinite(v2) else None
        }
        for q, v1, v2 in zip(quantiles, values_sim, values_diff)
    }

    stats = {
        "mean": {
            "value": float(np.mean(sim_results_np)),
            "value_minus_latest": float(np.mean(sim_diff_np)),
        },
        "variance": {
            "value": float(np.var(sim_results_np)),
            "value_minus_latest": float(np.var(sim_diff_np)),
        },
        "std_dev": {
            "value": float(np.std(sim_results_np)),
            "value_minus_latest": float(np.std(sim_diff_np)),
        },
        "min": {
            "value": float(np.min(sim_results_np)),
            "value_minus_latest": float(np.min(sim_diff_np)),
        },
        "max": {
            "value": float(np.max(sim_results_np)),
            "value_minus_latest": float(np.max(sim_diff_np)),
        },
    }

    return {
        "quantiles": quantile_result,
        "stats": stats
    }


@app.post("/calc/percentile_boot")
async def calc_percentile_boot(payload: PercentileStochRequest):
    user_session = SESSIONS.get_session(payload.user_id)
    cached = user_session.get_simulation(payload.request_id)

    if cached is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono danych boot")

    value = payload.value
    source = payload.source

    def compute_percentile(data, val):
        sorted_data = np.sort(data)
        percentile = np.searchsorted(sorted_data, val, side='right') / len(sorted_data)
        return float(round(percentile, 6))

    if source == 'sim':
        percentile = compute_percentile(cached["sim"], value)
    elif source == 'diff':
        percentile = compute_percentile(cached["diff"], value)
    else:
        raise HTTPException(status_code=400, detail="Nieprawidłowe źródło: musi być 'sim' lub 'diff'")

    return {
        "source": source,
        "percentile": percentile
    }


############ Deterministyczna

class PaidTriangleRequest(BaseModel):
    user_id: str
    paid_data_det: List[List[Union[str, int, float, None]]]
    weights: Optional[List[List[int]]] = None



class PaidCLRequest(BaseModel):
    user_id: str
    paid_data_det: List[List[Union[str, int, float, None]]]
    weights: List[List[int]]

@app.post("/calc/paid/train_devide_paid")
async def calc_paid_train_devide(payload: PaidTriangleRequest):
    data = {}
    headers = [x for x in range(len(payload.paid_data_det[0]))]
    for i, col in enumerate(headers):
        data[col] = []
        for row in payload.paid_data_det:
            value = row[i]
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                num_value = None
            data[col].append(num_value)
    train_devide = TriangleCalculator.elementwise_division(data)

    train_devide_serializable = np.array(train_devide).tolist()

    return {
        "train_devide": train_devide_serializable
    }


@app.post("/calc/paid/cl")
async def calc_paid_cl(payload: PaidCLRequest):
    paid_data = payload.paid_data_det
    weights = payload.weights

    data = {}
    headers = np.arange(len(paid_data[0]) )
 
    for i, col in enumerate(headers):
        data[col] = []
        for row in paid_data:
            value = row[i]
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                num_value = None
            data[col].append(num_value)

    l_ij = pd.DataFrame(TriangleCalculator.elementwise_division(data))
    w_ij = pd.DataFrame(payload.weights)
    p_ij = pd.DataFrame(data)
    dev_j = TriangleCalculator.Dev_prem(p_ij,w_ij)

     
    sigmas = TriangleCalculator.calculate_sigma(p_ij, l_ij, w_ij, dev_j)

    return {
        "message": "Odebrano dane i zastosowano wagi",
        "dev_j": list(dev_j), 
         "sd_j": list(sigmas[1]), # <- ważne! żeby było JSON-serializowalne
    }


####


# 🧩 Dane współczynników
class SaveVectorRequest(BaseModel):
    curve_name: Optional[str] = None
    coeffs: Optional[List[float]] = None
    volume: Optional[int] = None
    values: Optional[List[float]] = None
    final_dev_vector: Optional[List[float]] = None

# 🧩 Główna paczka: trójkąt + współczynniki
class SaveVectorPayload(BaseModel):
    paid_data_det: List[List[Optional[float]]]
    coeff_sets: List[SaveVectorRequest]

import numpy as np
import pandas as pd
from fastapi import HTTPException

@app.post("/calc/paid/save_vector")
async def save_vector(payload: SaveVectorPayload):
    if len(payload.coeff_sets) != 2:
        raise HTTPException(status_code=400, detail="❌ Oczekiwano dokładnie 2 zestawów współczynników (A i B).")

    def extract_vector(p: SaveVectorRequest) -> List[float]:
        if p.curve_name and p.coeffs:
            return p.coeffs
        elif p.volume is not None and p.values:
            return p.values
        elif p.final_dev_vector:
            return p.final_dev_vector
        else:
            raise HTTPException(status_code=422, detail="❌ Nieprawidłowy format jednego z obiektów.")

    wektor_a = extract_vector(payload.coeff_sets[0])
    wektor_b = extract_vector(payload.coeff_sets[1])
 
    df_triangle = pd.DataFrame(payload.paid_data_det).apply(pd.to_numeric, errors='coerce')
    df_triangle = df_triangle.drop(columns='AY', errors='ignore')

    latest = TriangleCalculator.get_latest(df_triangle)

    df_proj_a = calculator_det.triangle_forward(df_triangle, wektor_a, 1)
    df_proj_b = calculator_det.triangle_forward(df_triangle, wektor_b, 1)

    last_values_a = df_proj_a.apply(lambda row: row[~row.isna()].iloc[-1], axis=1)
    last_values_b = df_proj_b.apply(lambda row: row[~row.isna()].iloc[-1], axis=1)

    diff = last_values_a - last_values_b
    percent_diff = np.where(last_values_a != 0, (diff / last_values_a) * 100, 0)

    projection_a_ibnr = last_values_a - latest
    projection_b_ibnr = last_values_b - latest

    diff_ibnr = projection_a_ibnr - projection_b_ibnr
    percent_diff_ibnr = np.where(projection_a_ibnr != 0, (diff_ibnr / projection_a_ibnr) * 100, 0)

    df_comparison = pd.DataFrame({
        "Wiersz": range(len(df_proj_a)),
        "Projection A": last_values_a,
        "Projection B": last_values_b,
        "Projection A IBNR": projection_a_ibnr.round(2),
        "Projection B IBNR": projection_b_ibnr.round(2),
        "Różnica": diff.round(2),
        "Różnica %": np.round(percent_diff, 2),
        "Różnica ibnr": diff_ibnr.round(2),
        "Różnica ibnr %": np.round(percent_diff_ibnr, 2),
    })

    # SUMY
    sum_a = float(last_values_a.sum())
    sum_b = float(last_values_b.sum())
    sum_diff = sum_a - sum_b
    sum_percent = (sum_diff / sum_a * 100) if sum_a != 0 else 0

    sum_a_ibnr = float(projection_a_ibnr.sum())
    sum_b_ibnr = float(projection_b_ibnr.sum())
    sum_diff_ibnr = sum_a_ibnr - sum_b_ibnr
    sum_percent_ibnr = (sum_diff_ibnr / sum_a_ibnr * 100) if sum_a_ibnr != 0 else 0
    print(df_comparison)
    df_comparison.loc["Suma"] = {
        "Wiersz": "Suma",
        "Projection A": sum_a,
        "Projection B": sum_b,
        "Projection A IBNR": round(sum_a_ibnr, 2),
        "Projection B IBNR": round(sum_b_ibnr, 2),
        "Różnica": round(sum_diff, 2) if sum_diff == sum_diff else 0,
        "Różnica %": None if np.isnan(sum_percent) else round(sum_percent, 2),
        "Różnica ibnr": round(sum_diff_ibnr, 2),
        "Różnica ibnr %": None if np.isnan(sum_percent_ibnr) else round(sum_percent_ibnr, 2),
    }



    return {
        "wektor_a": [float(x) for x in wektor_a],
        "wektor_b": [float(x) for x in wektor_b],
        "triangle_rows": int(len(payload.paid_data_det)),
        "comparison": df_comparison.to_dict(orient="records"),
    }


## incurred

class IncurredTriangleRequest(BaseModel):
    user_id: str
    incurred_data_det: List[List[Union[str, int, float, None]]]
    weights: Optional[List[List[int]]] = None


class IncurredCLRequest(BaseModel):
    user_id: str
    incurred_data_det: List[List[Union[str, int, float, None]]]
    weights: List[List[int]]

@app.post("/calc/incurred/train_devide_incurred")
async def calc_incurred_train_devide(payload: IncurredTriangleRequest):
    data = {}
    headers = [x for x in range(len(payload.incurred_data_det[0]))]
    for i, col in enumerate(headers):
        data[col] = []
        for row in payload.incurred_data_det:
            value = row[i]
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                num_value = None
            data[col].append(num_value)

    train_devide = TriangleCalculator.elementwise_division(data)
    train_devide_serializable = np.array(train_devide).tolist()
    return {"train_devide": train_devide_serializable}


@app.post("/calc/incurred/cl")
async def calc_incurred_cl(payload: IncurredCLRequest):
    incurred_data = payload.incurred_data_det
    weights = payload.weights

    data = {}
    headers = np.arange(len(incurred_data[0]))
    for i, col in enumerate(headers):
        data[col] = []
        for row in incurred_data:
            value = row[i]
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                num_value = None
            data[col].append(num_value)

    l_ij = pd.DataFrame(TriangleCalculator.elementwise_division(data))
    w_ij = pd.DataFrame(weights)
    p_ij = pd.DataFrame(data)
    dev_j = TriangleCalculator.Dev_prem(p_ij, w_ij)
    sigmas = TriangleCalculator.calculate_sigma(p_ij, l_ij, w_ij, dev_j)

    return {
        "message": "Odebrano dane i zastosowano wagi",
        "dev_j": list(dev_j),
        "sd_j": list(sigmas[1]),
    }



class SelectedDevJRequest(BaseModel):
    user_id: Optional[str] = None
    selected_dev_j: List[float]
    selected_indexes: Optional[List[int]] = None
    tail_values: Optional[List[float]] = None
    full_dev_j: List[float]
    sd_j: List[float]
    cl_weights: Optional[List[List[float]]] = None  # macierz wag
    fitting_method: Literal["log_regression", "least_squares"] = "least_squares"  # metoda dopasowania
    use_weighting: bool = False 
# -------------------------------------------------------------------
# ENDPOINT – istniejący (Paid) NIE zmieniamy
# -------------------------------------------------------------------
@app.post("/calc/paid/selected_dev_j")
async def calc_paid_selected_dev_j(payload: SelectedDevJRequest):
    return _process_selected_dev_j(payload)   # <‑‑ patrz funkcja pomocnicza


# -------------------------------------------------------------------
# ENDPOINT – NOWY wariant Incurred
# -------------------------------------------------------------------
@app.post("/calc/incurred/selected_dev_j")
async def calc_incurred_selected_dev_j(payload: SelectedDevJRequest):
    return _process_selected_dev_j(payload)   # logika współdzielona


# -------------------------------------------------------------------
# WSPÓLNA FUNKCJA POMOCNICZA
# -------------------------------------------------------------------
def _process_selected_dev_j(payload: SelectedDevJRequest):
    """
    Wspólna logika dla wariantów Paid / Incurred.
    """
    curve_list = ["Exponential", "Weibull", "Power", "Inverse Power"]
    wazona_metoda = payload.use_weighting
    metoda_dopasowania =  payload.fitting_method
    # ▸ wektor pełny
    full_ys = np.array(payload.full_dev_j, dtype=float)
    cl_weights = np.array(payload.cl_weights)
    cl_weights = cl_weights[:, payload.selected_indexes]
    n_j = np.nansum(cl_weights, axis=0)

    print(cl_weights)
    # ▸ punkty wybrane przez użytkownika
    xs = np.array(payload.selected_indexes or [], dtype=float) + 1  # indeksy 1‑based
    ys = np.array(payload.selected_dev_j, dtype=float)
    sd_j = np.array([payload.sd_j[x] for x in payload.selected_indexes], dtype=float)
    
    # wagi logregresion
    f = np.asarray(ys, dtype=float)
    se = np.asarray(sd_j, dtype=float)

    if wazona_metoda:
        weights_df_lq = pd.DataFrame(index=np.arange(len(f)))
        weights_df = pd.DataFrame(index=np.arange(len(f)))
        weights_df["Exponential"] = 1.0 / (se / (f - 1.0))**2
        weights_df["Inverse Power"] = weights_df["Exponential"]
        weights_df["Power"] = 1.0 / (se / (f * np.log(f)))**2
        g = np.log(f / (f - 1.0))
        weights_df["Weibull"] = 1.0 / (se / ((f - 1.0) * f * g))**2

        weights_df_lq["Exponential"] =  0.001 * n_j / (sd_j**2)
        weights_df_lq["Power"] = 0.001 * n_j / ((sd_j / (f * np.log(f)))**2)
        weights_df_lq["Inverse Power"] = 0.001 * n_j / ((sd_j / ((f - 1.0) * f * g))**2)  
        weights_df_lq["Weibull"] = 0.001 * n_j / ((sd_j / ((f - 1.0) * f * g))**2)  

    else:
        weights_df = pd.DataFrame(
            1.0,
            index=np.arange(len(f)),
            columns=curve_list
        )
        weights_df_lq =weights_df
    if metoda_dopasowania == "log_regression":
        parameters_curve = calculator_det.parameters_curve_reservoir_logregression(
            xs=xs, ys=ys, lista_krzywych=curve_list, weights = weights_df
        )
        tail = int(payload.tail_values[0]) if payload.tail_values else 0
        xs_sim = np.array([i + 1 for i in range(len(full_ys) + tail)], dtype=float)
        simulation_results = calculator_det.sim_data_curve_rezerwy_logregression(
            xs_sim, curve_list, parameters_curve
        )
        f_curves_graph_real_choose = calculator_det.sim_data_curve_rezerwy_logregression(
            xs, curve_list, parameters_curve
        )
        r2_curves_df = calculator_det.r2_curves_logregression(f_curves_graph_real_choose, ys)
    else:
        parameters_curve = calculator_det.parameters_curve_reservoir_least_squares(
            xs=xs, ys=ys, lista_krzywych=curve_list, weights = weights_df_lq
        )
        tail = int(payload.tail_values[0]) if payload.tail_values else 0
        xs_sim = np.array([i + 1 for i in range(len(full_ys) + tail)], dtype=float)
        simulation_results = calculator_det.sim_data_curve_rezerwy_least_squares(
            xs_sim, curve_list, parameters_curve
        )
        f_curves_graph_real_choose = calculator_det.sim_data_curve_rezerwy_least_squares(
            xs, curve_list, parameters_curve
        )
        r2_curves_df = calculator_det.r2_curves_least_squares(f_curves_graph_real_choose, ys)




    return {
        "simulation_results": simulation_results.to_dict(),
        "r2_scores": r2_curves_df.to_dict(),
    }



class SaveVectorRequest(BaseModel):
    curve_name:        Optional[str]        = None   # symulowana krzywa CL
    coeffs:            Optional[List[float]] = None  # ⬆ jej współczynniki
    volume:            Optional[int]         = None  # dev_j z konkretnego volume
    values:            Optional[List[float]] = None  # ⬆ jego wektor dev_j
    final_dev_vector:  Optional[List[float]] = None  # gotowy dev_final / combined


# ──────────────────────────────────────────────────────────────────────────────
#  2. Cały payload: trójkąt incurred + dokładnie 2 zestawy współczynników
# ──────────────────────────────────────────────────────────────────────────────
class SaveVectorPayload(BaseModel):
    incurred_data_det: List[List[Optional[float]]]
    coeff_sets:        List[SaveVectorRequest]


# ──────────────────────────────────────────────────────────────────────────────
#  3. Pomocnicza funkcja – wyciąga wektor z SaveVectorRequest
# ──────────────────────────────────────────────────────────────────────────────
def _extract_vector(p: SaveVectorRequest) -> List[float]:
    if p.curve_name and p.coeffs:
        return p.coeffs
    if p.volume is not None and p.values:
        return p.values
    if p.final_dev_vector:
        return p.final_dev_vector
    raise HTTPException(
        status_code=422,
        detail="❌ Nieprawidłowy format jednego z obiektów (brak danych wektora).",
    )


# ──────────────────────────────────────────────────────────────────────────────
#  4. Endpoint  POST /calc/incurred/save_vector
# ──────────────────────────────────────────────────────────────────────────────
@app.post("/calc/incurred/save_vector")
async def save_vector_incurred(payload: SaveVectorPayload):
    # 1) Walidacja liczby zestawów
    if len(payload.coeff_sets) != 2:
        raise HTTPException(
            status_code=400,
            detail="❌ Oczekiwano dokładnie 2 zestawów współczynników (A i B).",
        )

    # 2) Wektory A/B (jak u Ciebie – wspólna funkcja pomocnicza)
    vector_a = _extract_vector(payload.coeff_sets[0])
    vector_b = _extract_vector(payload.coeff_sets[1])

    
    # 3) Trójkąt INCURRED
    df_triangle = (
        pd.DataFrame(payload.incurred_data_det)
        .apply(pd.to_numeric, errors="coerce")
        .drop(columns="AY", errors="ignore")
    )

    # 4) Najnowsza przekątna (observed-to-date)
    latest = TriangleCalculator.get_latest(df_triangle)

    # 5) Projekcje A/B
    df_proj_a = calculator_det.triangle_forward(df_triangle, vector_a, 1)
    df_proj_b = calculator_det.triangle_forward(df_triangle, vector_b, 1)

    # 6) Ostatnie nie-NaN w wierszu
    last_a = df_proj_a.apply(lambda r: r[~r.isna()].iloc[-1], axis=1)
    last_b = df_proj_b.apply(lambda r: r[~r.isna()].iloc[-1], axis=1)

    # 7) Różnice i % (projekcje)
    diff_abs = last_a - last_b
    diff_pct = np.where(last_a != 0, (diff_abs / last_a) * 100, np.nan)

    # 8) IBNR = projekcja - latest
    proj_a_ibnr = last_a - latest
    proj_b_ibnr = last_b - latest

    diff_ibnr = proj_a_ibnr - proj_b_ibnr
    diff_ibnr_pct = np.where(proj_a_ibnr != 0, (diff_ibnr / proj_a_ibnr) * 100, 0)

    # 9) Tabela porównania (tak jak w paid)
    df_comparison = pd.DataFrame({
        "Wiersz": range(len(df_proj_a)),
        "Projection A": last_a,
        "Projection B": last_b,
        "Projection A IBNR": proj_a_ibnr.round(2),
        "Projection B IBNR": proj_b_ibnr.round(2),
        "Różnica": diff_abs.round(2),
        "Różnica %": np.round(diff_pct, 2),
        "Różnica ibnr": diff_ibnr.round(2),
        "Różnica ibnr %": np.round(diff_ibnr_pct, 2),
    }).fillna(0)


    # 10) SUMA (jak w paid)
    sum_a = float(last_a.sum())
    sum_b = float(last_b.sum())
    sum_diff = sum_a - sum_b
    sum_percent = (sum_diff / sum_a * 100) if sum_a != 0 else 0

    sum_a_ibnr = float(proj_a_ibnr.sum())
    sum_b_ibnr = float(proj_b_ibnr.sum())
    sum_diff_ibnr = sum_a_ibnr - sum_b_ibnr
    sum_percent_ibnr = (sum_diff_ibnr / sum_a_ibnr * 100) if sum_a_ibnr != 0 else 0

    df_comparison.loc["Suma"] = {
        "Wiersz": "Suma",
        "Projection A": round(sum_a, 2),
        "Projection B": round(sum_b, 2),
        "Projection A IBNR": round(sum_a_ibnr, 2),
        "Projection B IBNR": round(sum_b_ibnr, 2),
        "Różnica": round(sum_diff, 2),
        "Różnica %": None if np.isnan(sum_percent) else round(sum_percent, 2),
        "Różnica ibnr": round(sum_diff_ibnr, 2),
        "Różnica ibnr %": None if np.isnan(sum_percent_ibnr) else round(sum_percent_ibnr, 2),
    }

    return {
        "wektor_a": [float(x) for x in vector_a],
        "wektor_b": [float(x) for x in vector_b],
        "triangle_rows": int(len(payload.incurred_data_det)),
        "comparison": df_comparison.to_dict(orient="records"),
    }



# porownanie wynikow #########################

class SaveVectorRequest(BaseModel):
    curve_name:        Optional[str]   = None
    coeffs:            Optional[List[float]] = None
    volume:            Optional[int]   = None
    values:            Optional[List[float]] = None
    final_dev_vector:  Optional[List[float]] = None


# ==================================================================================
# 2️⃣  NOWY  model ładujący  ⟶  Paid + Incurred  razem
# ==================================================================================
class SaveSummaryPayload(BaseModel):
    paid_data_det:     List[List[Optional[float]]]
    incurred_data_det: List[List[Optional[float]]]

    paid_coeff_set:     SaveVectorRequest
    incurred_coeff_set: SaveVectorRequest


# ==================================================================================
# 3️⃣  HELPER – zamienia SaveVectorRequest → wektor  (ta sama logika co wcześniej)
# ==================================================================================
from fastapi import HTTPException

def extract_vector(req: SaveVectorRequest) -> List[float]:
    if req.curve_name and req.coeffs:
        return req.coeffs
    elif req.volume is not None and req.values:
        return req.values
    elif req.final_dev_vector:
        return req.final_dev_vector
    else:
        raise HTTPException(
            status_code=422,
            detail="❌ Nieprawidłowy format obiektu współczynników.",
        )


# ==================================================================================
# 4️⃣  ENDPOINT  POST /calc/summary/save_vector
# ==================================================================================
from fastapi import status

@app.post("/calc/summary/save_vector", status_code=status.HTTP_201_CREATED)
async def save_summary_vector(payload: SaveSummaryPayload):

    # ─── 1. wyciągamy wektory ────────────────────────────────────────
    try:
        vec_paid = _extract_vector(payload.paid_coeff_set)
        vec_inc  = _extract_vector(payload.incurred_coeff_set)
    except HTTPException as e:
        raise e

    # ─── 2. DataFrame’y z trójkątów ─────────────────────────────────
    df_paid = (
        pd.DataFrame(payload.paid_data_det)
        .apply(pd.to_numeric, errors="coerce")
        .drop(columns="AY", errors="ignore")
    )
    df_inc = (
        pd.DataFrame(payload.incurred_data_det)
        .apply(pd.to_numeric, errors="coerce")
        .drop(columns="AY", errors="ignore")
    )

    # ─── 3. projekcje dla każdego z osobna ──────────────────────────
    proj_paid = calculator_det.triangle_forward(df_paid, vec_paid, 1)
    proj_inc  = calculator_det.triangle_forward(df_inc,  vec_inc,  1)



    last_paid = proj_paid.apply(lambda r: r.dropna().iloc[-1], axis=1)
    last_inc  = proj_inc.apply(lambda r: r.dropna().iloc[-1], axis=1)

 

    sum_paid = last_paid.sum()
    sum_inc  = last_inc.sum()

    df_two = pd.DataFrame(
        {
            "Paid":     last_paid.round(2),
            "Incurred": last_inc.round(2),
        }
    )

    return {
        "triangle_paid"     : payload.paid_data_det,
        "triangle_incurred" : payload.incurred_data_det,
        "vec_paid"          : vec_paid,
        "vec_incurred"      : vec_inc,
        "comparison"        : df_two.to_dict(orient="records"),   # ⬅️ tylko 2 kolumny
    }



#################################


from sklearn.linear_model import LinearRegression
from statsmodels.nonparametric.smoothers_lowess import lowess
from pydantic import BaseModel, Field

from scipy.stats import spearmanr, norm


class TriangleInput(BaseModel):
    triangle: List[List[Optional[float]]]
    alpha: float = Field(1.0, ge=0.0, le=2.0)
    ci: float = Field(0.5, ge=0.0001, le=0.9999)

# 📊 Endpoint 1 – analiza residuals i LOWESS
@app.post("/analyze-residuals")
def analyze_residuals(data: TriangleInput):
    max_len = max(len(row) for row in data.triangle)
    padded = [row + [np.nan] * (max_len - len(row)) for row in data.triangle]
    tri_arr = np.array(padded, dtype=float)

    tri_df = pd.DataFrame(
        tri_arr,
        index=np.arange(1, tri_arr.shape[0] + 1),
        columns=np.arange(1, tri_arr.shape[1] + 1),
    )

    alpha = data.alpha
    delta = 2 - alpha

    fitted_values, origin_periods, dev_periods, actual_vals, std_residuals = (
        [] for _ in range(5)
    )

    eps = 1e-12
    has_zero_variance = False  # <<< FLAGA NA FRONT

    for j in range(tri_df.shape[1] - 1):
        x_col, y_col = tri_df.iloc[:, j], tri_df.iloc[:, j + 1]
        valid = ~(x_col.isna() | y_col.isna())

        x = x_col[valid].to_numpy(dtype=float).reshape(-1, 1)
        y = y_col[valid].to_numpy(dtype=float)

        if len(y) <= 1:
            continue

        # wagi Macka
        x_safe = np.maximum(x.flatten(), 1.0)
        w = 1 / np.power(x_safe, delta)

        lr = LinearRegression(fit_intercept=False)
        lr.fit(x, y, sample_weight=w)

        # >>> KLUCZOWA ZMIANA: sprawdzamy współczynnik przejścia
        beta = lr.coef_[0]
        if np.isclose(beta, 1.0, atol=1e-8):
            has_zero_variance = True
            continue

        y_hat = lr.predict(x)
        residuals = y - y_hat

        rss_w = np.sum(w * residuals**2)
        sigma = np.sqrt(rss_w / (len(y) - 1))

        S = np.sum(w * (x.flatten() ** 2))
        h = w * (x.flatten() ** 2) / S
        denom = sigma * np.sqrt(np.maximum(1 - h, eps))

        stud_resid = residuals * np.sqrt(w) / denom
        stud_resid[h > 0.99] = np.nan

        fitted_values.extend(y_hat)
        origin_periods.extend(x_col.index[valid])
        dev_periods.extend([j + 1] * len(y))
        actual_vals.extend(y)
        std_residuals.extend(stud_resid)

    residuals_raw = np.array(actual_vals) - np.array(fitted_values)

    obs_vs_fitted = pd.DataFrame({
        "origin_period": origin_periods,
        "dev_period": np.array(dev_periods),
        "cal_period": np.array(origin_periods) + np.array(dev_periods) - 1,
        "residuals": residuals_raw,
        "standard_residuals": std_residuals,
        "fitted_value": fitted_values,
    })

    obs_vs_fitted = (
        obs_vs_fitted
        .replace([np.inf, -np.inf], np.nan)
        .dropna()
        .reset_index(drop=True)
    )

    def safe_lowess(y, x, frac=2 / 3):
        df = pd.DataFrame({"x": x, "y": y}).dropna()
        if len(df) < 5:
            return pd.DataFrame(columns=["x", "lowess"])
        res = lowess(df["y"], df["x"], frac=frac)
        return (
            pd.DataFrame(res, columns=["x", "lowess"])
            .replace([np.inf, -np.inf], np.nan)
            .dropna()
        )

    lowess_results = {
        "fitted_value": safe_lowess(
            obs_vs_fitted["standard_residuals"],
            obs_vs_fitted["fitted_value"]
        ),
        "origin_period": safe_lowess(
            obs_vs_fitted["standard_residuals"],
            obs_vs_fitted["origin_period"]
        ),
        "cal_period": safe_lowess(
            obs_vs_fitted["standard_residuals"],
            obs_vs_fitted["cal_period"]
        ),
        "dev_period": safe_lowess(
            obs_vs_fitted["standard_residuals"],
            obs_vs_fitted["dev_period"]
        ),
    }

    return {
        "obs_vs_fitted": obs_vs_fitted.to_dict(orient="records"),
        "lowess_results": {
            k: v.to_dict(orient="records") for k, v in lowess_results.items()
        },
        # <<< FLAGA POJAWIA SIĘ TYLKO GDY β = 1
        "has_zero_variance": has_zero_variance
    }


# 📈 Endpoint 2 – analiza zależności
@app.post("/analyze-dependence")
def analyze_dependence(data: TriangleInput):
    triangle = np.array(data.triangle, dtype=np.float64)
    ci = float(data.ci)

    n_rows, n_cols = triangle.shape
    ata = np.full((n_rows, n_cols - 1), np.nan)

    # --- ATA (age-to-age)
    for i in range(n_rows):
        for j in range(n_cols - 1):
            a = triangle[i, j]
            b = triangle[i, j + 1]
            if not np.isnan(a) and not np.isnan(b) and a != 0:
                ata[i, j] = b / a

    T_k = []
    has_skipped_dependence = False  # <<< FLAGA NA BACKEND / FRONT

    for k in range(n_cols - 3):
        col1 = ata[:, k]
        col2 = ata[:, k + 1]
        valid = ~np.isnan(col1) & ~np.isnan(col2)

        if np.sum(valid) <= 1:
            has_skipped_dependence = True
            continue

        x = col1[valid]
        y = col2[valid]

        # >>> KLUCZOWE: pomijamy stałe kolumny (Spearman undefined)
        if len(np.unique(x)) == 1 or len(np.unique(y)) == 1:
            has_skipped_dependence = True
            continue

        rho, _ = spearmanr(x, y)

        if np.isnan(rho) or np.isinf(rho):
            has_skipped_dependence = True
            continue

        T_k.append(float(rho))

    if len(T_k) > 0:
        weights = np.arange(len(T_k), 0, -1)
        T_final = float(np.average(np.array(T_k), weights=weights))
        Var_T = float(1 / ((n_cols - 2) * (n_cols - 3) / 2))
        Z = float(norm.ppf(ci + (1 - ci) / 2))
        range_ = [float(-Z * np.sqrt(Var_T)), float(Z * np.sqrt(Var_T))]
    else:
        T_final = None
        Var_T = None
        range_ = [None, None]

    # 🔷 Gęstość do wykresu
    density_data = None
    if T_final is not None and Var_T is not None:
        sd = float(np.sqrt(Var_T))

        x_seq = np.linspace(-1, 1, 500)
        y_seq = norm.pdf(x_seq, loc=0, scale=sd)

        ci_x = np.arange(range_[0], range_[1], 0.01)
        ci_y = norm.pdf(ci_x, loc=0, scale=sd)

        density_data = {
            "curve": list(zip(x_seq.tolist(), y_seq.tolist())),
            "ci_area": list(zip(ci_x.tolist(), ci_y.tolist())),
            "T_stat": T_final,
            "T_y": float(norm.pdf(T_final, loc=0, scale=sd))
        }

    return {
        "T_stat": T_final,
        "Var": Var_T,
        "Range": range_,
        "ci": ci,
        "density_plot": density_data,

        # <<< JASNA INFORMACJA LOGICZNA
        "has_skipped_dependence": has_skipped_dependence
    }

from math import comb, sqrt
class AnalyzeDep2Request(BaseModel):
    triangle: List[List[Optional[float]]]
    ci: float = 0.95

class DensityPlot(BaseModel):
    curve:  list[tuple[float, float]]
    ci_area:list[tuple[float, float]]
    Z_stat: float
    Z_y:    float

class AnalyzeDep2Response(BaseModel):
    totals: dict[str, float]       # albo Dict[str, float]
    range:  dict[str, float]
    ci: float
    density_plot: Optional[DensityPlot] = None
# ------------------------------------------------------------------ #


# ------------------------------------------------------------------ #
#  LOGIKA                                                            #
# ------------------------------------------------------------------ #
# Endpoint 3
def calendar_year_effect(
    triangle: List[List[Optional[float]]],
    ci: float = 0.95
) -> AnalyzeDep2Response:

    if not (0 < ci < 1):
        raise ValueError("ci must be between 0 and 1")

    tri = np.array(triangle, dtype=float)
    n_rows, n_cols = tri.shape

    # Cumulative triangle (jeśli dane już są cumulative, ta linia nie szkodzi)
    cum_tri = np.array(tri)

    ata = np.full((n_rows, n_cols - 1), np.nan)
    for i in range(n_rows):
        for j in range(n_cols - 1):
            if (
                not np.isnan(cum_tri[i, j])
                and not np.isnan(cum_tri[i, j + 1])
                and cum_tri[i, j] != 0
            ):
                ata[i, j] = cum_tri[i, j + 1] / cum_tri[i, j]

    col_medians = np.nanmedian(ata, axis=0)
    S_L = np.where(
        ata < col_medians, "S",
        np.where(ata > col_medians, "L", "*")
    )

    # przekątne calendar year
    diags = [np.diag(S_L[:i, :i][:, ::-1]) for i in range(2, n_rows)]

    Z_tot = E_tot = Var_tot = 0.0
    for d in diags:
        S_j = np.sum(d == "S")
        L_j = np.sum(d == "L")
        n_j = S_j + L_j
        m_j = (n_j - 1) // 2
        Z_j = min(S_j, L_j)
        Z_tot += Z_j

        if n_j > 0:
            E_j = n_j / 2 - comb(n_j - 1, m_j) * n_j / 2 ** n_j
            Var_j = (
                n_j * (n_j - 1) / 4
                - comb(n_j - 1, m_j) * n_j * (n_j - 1) / 2 ** n_j
                + E_j - E_j ** 2
            )
        else:
            E_j = Var_j = 0.0

        E_tot += E_j
        Var_tot += Var_j

    # >>> KLUCZOWA FLAGA
    has_calendar_effect_issue = (Var_tot == 0)

    z_score = norm.ppf(ci + (1 - ci) / 2)
    rng_low = E_tot - z_score * sqrt(Var_tot) if Var_tot > 0 else E_tot
    rng_up  = E_tot + z_score * sqrt(Var_tot) if Var_tot > 0 else E_tot

    density = None
    if Var_tot > 0:
        sd = sqrt(Var_tot)
        x_seq = np.linspace(E_tot - 4 * sd, E_tot + 4 * sd, 500)
        y_seq = norm.pdf(x_seq, loc=E_tot, scale=sd)

        ci_x = np.arange(rng_low, rng_up, 0.01)
        ci_y = norm.pdf(ci_x, loc=E_tot, scale=sd)

        density = DensityPlot(
            curve=list(zip(x_seq.tolist(), y_seq.tolist())),
            ci_area=list(zip(ci_x.tolist(), ci_y.tolist())),
            Z_stat=float(Z_tot),
            Z_y=float(norm.pdf(Z_tot, loc=E_tot, scale=sd))
        )

    return AnalyzeDep2Response(
        totals={
            "Z": round(Z_tot, 4),
            "E[Z]": round(E_tot, 4),
            "Var[Z]": round(Var_tot, 4),
        },
        range={
            "Lower": round(rng_low, 4),
            "Upper": round(rng_up, 4),
        },
        ci=ci,
        density_plot=density,
        # <<< NOWA, JEDYNA FLAGA
        has_calendar_effect_issue=has_calendar_effect_issue
    )

# ------------------------------------------------------------------ #
#  ENDPOINT                                                          #
# ------------------------------------------------------------------ #
@app.post("/analyze-dep2", response_model=AnalyzeDep2Response)
def analyze_dep2(req: AnalyzeDep2Request):
    return calendar_year_effect(req.triangle, ci=req.ci)