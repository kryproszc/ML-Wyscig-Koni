import pandas as pd
import numpy as np

from numba import njit


@njit
def _build_base_triangle(data_paid, n_dev):

    mm, n_cols_orig = data_paid.shape
    total_cols = n_dev + 1
    base = np.empty((mm, total_cols), dtype=np.float64)

    for i in range(mm):
        for j in range(total_cols):
            if j < n_cols_orig:
                base[i, j] = data_paid[i, j]
            else:
                base[i, j] = np.nan
    return base

@njit
def transform_data(data_input, exposure):
    n, m = data_input.shape
    data_input = data_input[:,:(n+1)]

    output = np.empty((n, m))

    for i in range(n):
        output[i, 0] = data_input[i, 0]/exposure[i]

    for j in range(1, m):
        for i in range(n):
            if not np.isnan(data_input[i, j]):
                output[i, j] = (data_input[i, j] - data_input[i, j - 1]) / exposure[i]

    return output
@njit
def wspolczynnik_LR(data_LR, w, exposure):
    n, m = data_LR.shape
    wsp_LR = np.empty(m)

    for j in range(m):
        numerator = 0.0
        denominator = 0.0

        for i in range(n):
            lr_ij = data_LR[i, j]
            w_ij = w[i, j]
            e_i = exposure[i]

            if not np.isnan(lr_ij) and not np.isnan(w_ij) and not np.isnan(e_i):
                numerator += lr_ij * w_ij * e_i
                denominator += w_ij * e_i

        if denominator == 0:
            wsp_LR[j] = 0.0  # lub np.nan jeśli wolisz
        else:
            wsp_LR[j] = numerator / denominator

    return wsp_LR
@njit
def sigma_LR(data_LR, w, exposure, wsp_LR):
    n, m = data_LR.shape
    sigma_j = np.empty(m)
    for j in range(m):
        sum_num = 0.0
        sum_denom = 0.0
        mean_j = wsp_LR[j]

        for i in range(n):
            lr = data_LR[i, j]
            wij = w[i, j]
            ei = exposure[i]

            if not np.isnan(wij):
                sum_num += wij * ei * (lr - mean_j) ** 2
                sum_denom += wij

        if sum_denom > 1 and sum_num!=0:
            sigma_j[j] = sum_num / (sum_denom - 1)
        else:
            sigma_j[j] = sigma_j[j-1]

    return sigma_j
@njit
def wspolczynnik_sd(wsp_sigma, w, exposure):
    n, m = w.shape
    sd_j = np.empty(m)
    for j in range(m):
        denominator = 0.0
        for i in range(n):
            wij = w[i, j]
            ei = exposure[i]
            if not np.isnan(wij):
                denominator += wij * ei
        if denominator == 0:
            sd_j[j] = sd_j[j-1]
        else:
            sd_j[j] = np.sqrt(wsp_sigma[j] / denominator)

    return sd_j
@njit
def choose_value_list(vec_input, vec_wykluczenia, a, b):
    count = 0
    for k in range(len(vec_wykluczenia)):
        idx = vec_wykluczenia[k] - 1
        val = vec_input[idx]
        if a < val < b:
            count += 1

    out_vals = np.empty(count)
    out_inds = np.empty(count, dtype=np.int64)

    pos = 0
    for k in range(len(vec_wykluczenia)):
        idx = vec_wykluczenia[k] - 1
        val = vec_input[idx]
        if a < val < b:
            out_vals[pos] = val
            out_inds[pos] = idx
            pos += 1

    return out_vals, out_inds
@njit(fastmath=False)
def fit_curve_factor_lr(data_input, sd_input, x_k):

    n = len(data_input)
    se2 = sd_input**2
    w = np.empty(n)
    for i in range(n):
        denom = data_input[i] ** 2

        w_mian = np.sqrt(np.log(1.0 + se2[i] / denom))
        #w[i] = 1.0 / w_mian
        if  w_mian!=0 :
            w[i] = 1.0 / w_mian
        else:
            w[i] = 0

    y = np.empty(n)
    for i in range(n):
        if data_input[i] > 0.0:
            y[i] = np.log(data_input[i])
        else:
            y[i] = 0.0

    A = A_x = A_xx = A_y = A_xy = 0.0
    for i in range(n):
        wi = w[i]
        xi = x_k[i]
        yi = y[i]
        A += wi
        A_x += wi * xi
        A_xx += wi * xi * xi
        A_y += wi * yi
        A_xy += wi * xi * yi

    Delta = A * A_xx - A_x * A_x
    if Delta == 0.0:
        return 0.0, 0.0

    a_coef = (A * A_xy - A_x * A_y) / Delta
    b_coef = (A_xx * A_y - A_x * A_xy) / Delta
    return a_coef, b_coef
@njit
def wspolczynnik_reg_factor_cl(a_coef, b_coef, k_start, k_stop):
    n = k_stop - k_start + 1
    out = np.empty(n)
    for i in range(n):
        k = k_start + i
        out[i] = np.exp(a_coef * k + b_coef)
    return out

@njit
def sum_reverse_diagonal(data: np.ndarray) -> float:
    tot = 0.0
    rows, cols = data.shape
    for i in range(rows):
        j = cols - 1 - i
        if 0 <= j < cols:
            v = data[i, j]
            if not np.isnan(v):
                tot += v
    return tot

@njit
def zastap_zera_nan(tablica):
    for i in range(tablica.shape[0]):
        for j in range(tablica.shape[1]):
            if i!=0 and tablica[i, j] == 0:
                tablica[i, j] = np.nan
    return tablica
@njit
def triangle_forward_loss_ratio_numba(
        tri_in: np.ndarray,
        LR_j:   np.ndarray,
        exposure: np.ndarray,
        k_forward: int
) -> np.ndarray:

    mm, n_cols_orig = tri_in.shape
    n_cols_out = max(n_cols_orig, len(LR_j) + 1)

    tri = np.empty((mm, n_cols_out), dtype=np.float64)
    tri[:] = np.nan

    for i in range(mm):
        for j in range(n_cols_orig):
            tri[i, j] = tri_in[i, j]

    for j in range(k_forward):
        max_ind_row = 1 if (mm - j) < 1 else (mm - j)
        start_row = max_ind_row - 1

        for i in range(start_row, mm):
            base_val = tri[i, j]
            tri[i, j + 1] = base_val + exposure[i] * LR_j[j]
    return tri


@njit
def add_first(arr, val):
    return np.concatenate((np.array([val]), arr))


@njit()
def simulate_reserving_batched_numba(data_paid,
                                     sigma_j, dev, sd, e_values, wagi_trimmed,
                                     ilosc_dop_wsp_CL,
                                     Poz_LR,
                                     il_ogon,
                                     ultimate_param_resrisk,discount_factors,net_to_gross,
                                     sim_total=100_000,
                                     batch_sim=10_000,
                                     main_seed=202260011):
    latest = sum_reverse_diagonal(data_paid)
    mm, _   = data_paid.shape
    n_dev   = len(dev)
    base    = _build_base_triangle(data_paid, n_dev)
    results = np.zeros((sim_total, 3))
    n_batches = (sim_total + batch_sim - 1) // batch_sim

    index_el = 0
    for batch_idx in range(n_batches):
        np.random.seed(main_seed + batch_idx)
        start   = batch_idx * batch_sim
        end     = min(start + batch_sim, sim_total)
        cur_bs  = end - start

        mu_part    = np.empty((cur_bs, n_dev), dtype=np.float64)
        sigma_part = np.empty((cur_bs, n_dev), dtype=np.float64)

        for jj in range(n_dev):

            mu_part[:, jj] = np.random.normal(dev[jj], sd[jj], cur_bs)
            df  = max(1, mm - jj)
            chi = np.random.chisquare(df, cur_bs)
            for ss in range(cur_bs):
                sigma_part[ss, jj] = (np.floor(chi[ss]) * sigma_j[jj]) / df

        for s in range(cur_bs):
            paid = base.copy()
            n_cols_target = n_dev + 1
            new_tri = np.zeros((mm, mm+1))
            for r in range(mm):
                for c in range(mm):
                    v = data_paid[r, c]
                    new_tri[r, c] = v
            empty_column = np.full((wagi_trimmed.shape[0], 1), np.nan)
            wagi_modified = np.hstack((wagi_trimmed, empty_column))
            LR_i_j = transform_data(new_tri, e_values)
            empty_column_lr = np.full((LR_i_j.shape[0], 1), np.nan)
            LR_i_j_stoch = np.hstack((LR_i_j, empty_column_lr))
            for j in range(n_dev):
                max_ind_row = mm - j
                if max_ind_row < 1:
                    max_ind_row = 1
                for i in range(max_ind_row - 1, mm):
                    var_ij = sigma_part[s, j] / e_values[i]
                    dev_con = dev[j]
                    std_con = sd[j]
                    if mu_part[s, j] > 0.0:
                        lmean  = np.log(mu_part[s, j]**2 /
                                        np.sqrt(mu_part[s, j]**2 + var_ij))
                        lstdev = np.sqrt(np.log(1.0 + var_ij /
                                                (mu_part[s, j]**2)))
                        sto_lr = np.random.lognormal(lmean, lstdev)
                        paid[i, j + 1] = e_values[i] * sto_lr + paid[i, j]
                        if j == mm - i - 1:
                            new_tri[i, j + 1] = e_values[i] * sto_lr + paid[i, j]
                            LR_i_j_stoch[i, j + 1] = sto_lr
                        if i == mm - j - 1 and (j < (mm)):
                            if dev_con - 2 * std_con <= sto_lr <= dev_con + 2 * std_con:
                                wagi_modified[i , j + 1] = 1
                            elif (dev_con - 3 * std_con <= sto_lr <= dev_con - 2 * std_con) or (
                                    dev_con + 2 * std_con <= sto_lr <= dev_con + 3 * std_con):
                                wagi_modified[i, j + 1] = 0.5
                            else:
                                wagi_modified[i , j + 1] = 0

                    else:
                        adj_mu = (mu_part[s, j] +
                                  paid[i, j] / e_values[i])
                        lmean  = np.log(adj_mu**2 /
                                        np.sqrt(adj_mu**2 + var_ij))
                        lstdev = np.sqrt(np.log(1.0 + var_ij / (adj_mu**2)))
                        sto_lr = np.random.lognormal(lmean, lstdev)
                        paid[i, j + 1] = (e_values[i] *
                                          (sto_lr - paid[i, j] / e_values[i]) +
                                          paid[i, j])
                        if j == mm - i - 1:
                            new_tri[i, j + 1] = (e_values[i] *
                                          (sto_lr - paid[i, j] / e_values[i]) +
                                          paid[i, j])
                            LR_i_j_stoch[i, j + 1] = sto_lr
                        if i == mm - j - 1 and (j < (mm)):
                            if dev_con - 2 * std_con <= sto_lr <= dev_con + 2 * std_con:
                                wagi_modified[i , j + 1] = 1
                            elif (dev_con - 3 * std_con <= sto_lr <= dev_con - 2 * std_con) or (
                                    dev_con + 2 * std_con <= sto_lr <= dev_con + 3 * std_con):
                                wagi_modified[i, j + 1] = 0.5
                            else:
                                wagi_modified[i , j + 1] = 0
            new_tri[1:,new_tri.shape[1]-1] = np.nan
            LR_i_j_stoch = transform_data(new_tri, e_values)
            LR_j_wyzn = wspolczynnik_LR(LR_i_j_stoch, wagi_modified, e_values)
            sigma_j_pred = sigma_LR(LR_i_j_stoch, wagi_modified, e_values, LR_j_wyzn)
            sd_j = wspolczynnik_sd(sigma_j_pred, wagi_modified, e_values)
            vector_value, x_k_ind = choose_value_list(LR_j_wyzn, ilosc_dop_wsp_CL, 0, 10)
            sd_input = sd_j[x_k_ind]
            x_k_ind = x_k_ind
            a, b = fit_curve_factor_lr(vector_value, sd_input, x_k_ind)
            total_f_len = len(LR_j_wyzn) + il_ogon + 1
            vec_f = np.empty(total_f_len - 2)
            vec_f[:(Poz_LR - 2)] = LR_j_wyzn[2:(Poz_LR)]
            tail_factors = wspolczynnik_reg_factor_cl(
                float(a), float(b),
                Poz_LR,
                total_f_len - 1,
            )
            vec_f[(Poz_LR - 2):] = tail_factors[:(total_f_len - 2)]
            
            tri_proj_tmp = triangle_forward_loss_ratio_numba(new_tri[:,1:],vec_f,e_values,len(vec_f))

            cols_tmp = tri_proj_tmp.shape[1]
            tri_proj = np.empty((mm, cols_tmp + 1))
            tri_proj[:, 0] = data_paid[:, 0]

            for r in range(mm):
                for c in range(cols_tmp):
                    tri_proj[r, c + 1] = tri_proj_tmp[r, c]
            inc_proj = tri_proj[:, 1:] - tri_proj[:, :-1]
            inc_disc = np.empty_like(tri_proj)
            inc_disc[:, 0] = tri_proj[:, 0]
            for r in range(mm):
                for c in range(1, tri_proj.shape[1]):
                    inc_disc[r, c] = inc_proj[r, c - 1]

            for rr in range(mm - 1, -1, -1):
                offset = mm - 1 - rr
                for cc in range(offset + 1, tri_proj.shape[1]):
                    idx = cc - (offset + 1)
                    if idx < len(discount_factors):
                        inc_disc[rr, cc] /= discount_factors[idx]

            cum_disc = inc_disc.copy()
            for r in range(mm):
                for c in range(1, tri_proj.shape[1]):
                    cum_disc[r, c] += cum_disc[r, c - 1]

            ult_gross = np.sum(paid[:,-1])

            ult_gross_disc = np.sum(cum_disc[:, n_cols_target - 1])
            ult_net_disc = latest + (ult_gross_disc - latest) * net_to_gross

            
            results[index_el, 0] = ult_gross
            results[index_el, 1] = ult_gross_disc
            results[index_el, 2] = ult_net_disc
            index_el = index_el+1
    return results





class YearHorizont:
    def Union(self, lst1, lst2):
        final_list = list(set(lst1) | set(lst2))
        return final_list

    def change_value_less_diagonal(self,data,value_change):
        for j in range(1,data.shape[1]):
            for i in range(data.shape[0]-1,data.shape[0]-j-1,-1):
                data.iloc[i, j] = value_change
        return data
    def delete_element_list(self, list_1, list_2):
        for item in list_2:
            if item in list_1:
                list_1.remove(item)
        return (list_1)

    def add_el_list(self, a, b):
        pp = []
        for i in range(a, b + 1, 1):
            pp.append(i)
        return (pp)

    def index_all_1(self, df_trian):
        index_he = []
        index_ost = []
        index_firs = []
        m = df_trian.shape[0]
        n = df_trian.shape[1]
        for i in range(n - 1):
            ind_row = [x for x in range(m)]
            ind_col_last = np.where(df_trian.iloc[:, i + 1].isnull())[0].tolist()
            ind_col_before = np.where(df_trian.iloc[:, i].isnull())[0].tolist()
            index_ost.append(self.delete_element_list(ind_row, ind_col_before).pop())
            index_firs.append(min(self.delete_element_list(ind_row, ind_col_last)))
            sum_ind = self.Union(ind_col_last, ind_col_before)
            dev_ind = self.delete_element_list(ind_row, sum_ind)
            index_he.append(dev_ind)
        index_ost.append(ind_col_last[0] - 1)
        return (index_he, index_ost, index_firs)

    def index_all(self, df_trian):
        index_he = []
        index_ost = []
        index_firs = []
        m = df_trian.shape[0]
        n = df_trian.shape[1]
        for i in range(n-1):
            ind_row = [x for x in range(m)]
            ind_row_copy = [x for x in range(m)]
            ind_row_copy_2 = [x for x in range(m)]
            ind_col_last = np.where(df_trian.iloc[:, i+1].isnull())[0].tolist()
           # print(ind_col_last)
            ind_col_before = np.where(df_trian.iloc[:, i].isnull())[0].tolist()
            index_ost.append(self.delete_element_list(ind_row, ind_col_before).pop())
            index_firs.append(np.min(self.delete_element_list(ind_row_copy, ind_col_last)))
            sum_ind = self.Union(ind_col_last, ind_col_before)
            dev_ind = self.delete_element_list(ind_row_copy_2, sum_ind)
            index_he.append(dev_ind)
        #print(index_firs)
        index_ost.append(ind_col_last[0] - 1)
       # print(index_ost)
        return (index_he, index_ost, index_firs)

    def incremental_triangle(self, df_triangle):
        indeksy_f, ind_d_f, ind_g_f = self.index_all(df_triangle)
        n = df_triangle.shape[1]
        df_trian_copy = df_triangle.copy()
        for i in range(n - 1):
            b = df_triangle.iloc[indeksy_f[i], i + 1] - df_triangle.iloc[indeksy_f[i], i]
            df_trian_copy.iloc[indeksy_f[i], i + 1] = b
        for kk in range(n-1):
            if(ind_g_f[kk]>0 and np.isnan(df_trian_copy.iloc[ind_g_f[kk]-1,kk])):
                df_trian_copy.iloc[ind_g_f[kk + 1], kk + 1] = np.nan
        return (df_trian_copy)

    def calculate_inflation_adjustment(self,past_inflation, future_inflation):
        inf_adj = [1]
        k = 0
        for i in range(len(past_inflation) - 1, 0, -1):
            inf_adj_factor = ((1 + past_inflation[i]) / (1 + future_inflation)) * inf_adj[k]
            inf_adj.append(inf_adj_factor)
            k = k + 1
        return (inf_adj[::-1])

    def incrementa_with_inflation(self,incremental_triangle, infl_adj):
        increme_trian = incremental_triangle.copy()
        mm = increme_trian.shape[0] - 1
        for col in range(incremental_triangle.shape[1]):
            increme_trian.iloc[0:(mm - col), col] = [x * y for x, y in
                                                     zip(incremental_triangle.iloc[0:(mm - col), col], infl_adj[col:])]
        return (increme_trian)

    def inflation_to_triangle(self,df_inflation, df_triangles,line):
        inflation = self.show_exposure_for_lib(df_inflation, line)
        inflation = self.reverse_list(inflation.to_list())
        incremental_paid = self.incremental_triangle(df_triangles)
        past_inf = inflation[:-2]
        future_inf = inflation[-1]
        inflation_adjustment = self.calculate_inflation_adjustment(past_inf, future_inf)
        inc_inf = self.incrementa_with_inflation(incremental_paid, inflation_adjustment)
        paid_inflation = inc_inf.cumsum(axis=1)
        return paid_inflation

    def inflation_to_eksponsure(self,df_inflation, vec_eksponsure,line):
        inflation = self.show_exposure_for_lib(df_inflation, line)
        inflation = self.reverse_list(inflation.to_list())
        past_inf = inflation[:-2]
        future_inf = inflation[-1]
        inflation_adjustment = self.calculate_inflation_adjustment(past_inf, future_inf)
        exp_inflation = [x*y for x,y in zip(vec_eksponsure,inflation_adjustment)]
        return exp_inflation

    def inflation_to_eksponsure_interaktywna(self,vec_eksponsure):
        inflation = [0.055936461	,0.055936461,	0.051,	0.034,	0.023,	0.016,	0.02,	-0.006	,-0.009	,0	,0.009	,0.037,	0.043,	0.026	,0.035,	0.042,	0.025,	0.01,	0.021	,0.035,	0.008,	0]
        inflation = self.reverse_list(inflation)
        past_inf = inflation[:-2]
        future_inf = inflation[-1]
        inflation_adjustment = self.calculate_inflation_adjustment(past_inf, future_inf)
        exp_inflation = [x*y for x,y in zip(vec_eksponsure,inflation_adjustment)]
        return exp_inflation
    ###
    def data_for_lines_app(self,df):
        LoBs = np.unique(df['LoB'])
        list_triangle = []
        for LoB in LoBs:
            lies_bis = df.loc[df.iloc[:,0] == LoB]
            AY = np.unique(lies_bis['AY'])
            DY = (lies_bis.loc[df['AY'] == AY[0]].sort_values(by=['DY']))['DY']
            triangle_excel = pd.DataFrame(0, columns=DY,
                                          index=AY,dtype="Float64")
            for i in range(len(AY)):
                df2 = ((lies_bis.loc[df['AY'] == AY[i]].sort_values(by=['DY']))['Amount']).to_list()
                triangle_excel.iloc[i, 0:((len(df2)))] = df2
            list_triangle.append(triangle_excel)
       # list_triangle = list_triangle.astype("int64[pyarrow]")
        return ([LoBs, list_triangle])

    def show_triangle_for_libes_app(self,df_triangles, lob):
        Lobs, triangles = self.data_for_lines_app(df_triangles)
        ind, = np.where(Lobs == lob)
        return (triangles[ind[0]])

    def df_with_incremental(self,df_traingle):
        dr_traingle_cop = pd.DataFrame(0,columns=np.arange(1,df_traingle.shape[1]+1),index= df_traingle.index)
        dr_traingle_cop.iloc[:,0] = df_traingle.iloc[:,0].to_list()
        mm = dr_traingle_cop.shape[0]
        for col in range(1,dr_traingle_cop.shape[1]):
            dr_traingle_cop.iloc[0:(mm-col),col] =[x+y for x,y in zip(dr_traingle_cop.iloc[0:(mm-col),col-1].tolist(),df_traingle.iloc[0:(mm-col),col].tolist())]
        return (dr_traingle_cop)
    def add_nex_diagonal(self,trian_sim,d_sim):

        triangle_copy = trian_sim.copy()
        mm,nn = triangle_copy.shape[0],triangle_copy.shape[1]
        for k in range(nn + 1, nn + 2): triangle_copy[k] = np.nan
        triangle_copy.loc[len(triangle_copy)+1] = np.nan
        diag_rev = self.reverse_list(d_sim)
        #print(diag_rev)
        for i,j in zip(range(len(triangle_copy)-1,-1,-1),range(nn+1)):
            triangle_copy.iloc[i,j] = diag_rev[j]

        return(triangle_copy)

    def chose_value_list(self,vec_input, vec_wykluczenia):
        nowy_vec = []
        for wyk_value in vec_wykluczenia:
            nowy_vec.append(vec_input[wyk_value - 1])
        return (nowy_vec)


    def data_for_lines(self,df):
        LoBs = np.unique(df['LoB'])
        list_triangle = []
        for LoB in LoBs:
            lies_bis = df.loc[df.iloc[:,0] == LoB]
            AY = np.unique(lies_bis['AY'])
            DY = (lies_bis.loc[df['AY'] == AY[0]].sort_values(by=['DY']))['DY']
            triangle_excel = pd.DataFrame(0, columns=DY,
                                          index=AY,dtype="Float64")
            for i in range(len(AY)):
                df2 = ((lies_bis.loc[df['AY'] == AY[i]].sort_values(by=['DY']))['Amount']).to_list()
                triangle_excel.iloc[i, 0:((len(df2)))] = df2
            list_triangle.append(triangle_excel)
        return ([LoBs, list_triangle])

    def show_triangle_for_libes(self,df_triangles, lob):
        Lobs, triangles = self.data_for_lines(df_triangles)
        ind, = np.where(Lobs == lob)
        return (triangles[ind[0]])

    def show_exposure_for_lib(self,df_triangles, lob):
        df_triangles=df_triangles.set_index(['LoB'])
        exposure = df_triangles.loc[lob]
        return (exposure)

        
    def inflation_to_triangle(self,df_inflation, df_triangles,line):
        inflation = self.show_exposure_for_lib(df_inflation, line)
        inflation = self.reverse_list(inflation.to_list())
        incremental_paid = self.incremental_triangle(df_triangles)
        past_inf = inflation[:-2]
        future_inf = inflation[-1]
        inflation_adjustment = self.calculate_inflation_adjustment(past_inf, future_inf)
        inc_inf = self.incrementa_with_inflation(incremental_paid, inflation_adjustment)
        paid_inflation = inc_inf.cumsum(axis=1)
        return paid_inflation

    def inflation_to_eksponsure(self,df_inflation, vec_eksponsure,line):
        inflation = self.show_exposure_for_lib(df_inflation, line)
        inflation = self.reverse_list(inflation.to_list())
        past_inf = inflation[:-2]
        future_inf = inflation[-1]
        inflation_adjustment = self.calculate_inflation_adjustment(past_inf, future_inf)
        exp_inflation = [x*y for x,y in zip(vec_eksponsure,inflation_adjustment)]
        return exp_inflation


    def reverse_list(self, arr):
        left = 0
        right = len(arr) - 1
        while (left < right):
            # Swap
            temp = arr[left]
            arr[left] = arr[right]
            arr[right] = temp
            left += 1
            right -= 1
        return (arr)




    def extract_sector_series_from_column__add(self,file_path, sheet_name, sector_name):
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
        pd.options.display.float_format = "{:,.12f}".format
    
        df = df.iloc[:67]
        result = {
            'm_k': [],
            'sigma^2 Add': [],
            'estimation error loss ratios': []
        }
    
        headers = list(result.keys())
        current_header = None
        collecting = False
    
        for i, row in df.iterrows():
            cell = str(row[1]).strip() if pd.notna(row[1]) else ""
            if cell in headers:
                current_header = cell
                collecting = True
                continue
            if collecting and cell in headers:
                collecting = False
                current_header = None
                continue
            if collecting and current_header:
                if cell == sector_name:
                    values = []
                    for val in row[2:]:
                        if pd.isna(val):
                            break
                        values.append(val)
                    result[current_header] = values
        return result


    def run_simulation_lr(self, data_paid, sigma_j, dev, sd, e_values, wagi_trimmed,
                       ilosc_dop_wsp_CL, Poz_LR, il_ogon,
                       ultimate_param_resrisk,discount_factors, net_to_gross,
                       sim_total=100_000, batch_sim=10_000, main_seed=202206011):

        return simulate_reserving_batched_numba(
            data_paid,
            sigma_j, dev, sd, e_values, wagi_trimmed,
            ilosc_dop_wsp_CL, Poz_LR, il_ogon,
            ultimate_param_resrisk,discount_factors, net_to_gross,
            sim_total, batch_sim, main_seed
        )

    
    def triangle_forward_loss_ratio_numba_disc(self,
            tri_in: np.ndarray,
            LR_j: np.ndarray,
            exposure: np.ndarray,
            discount_factors: np.ndarray,
            net_to_gross: float,
            k_forward: int
    ) -> np.ndarray:
        mm, n_cols_orig = tri_in.shape
        n_cols_out = max(n_cols_orig, len(LR_j) + 1)
        base_col = tri_in[:, 0].copy()
        tri = np.empty((mm, n_cols_out), dtype=np.float64)
        tri[:] = np.nan
    
        for i in range(mm):
            for j in range(n_cols_orig):
                tri[i, j] = tri_in[i, j]
    
        for j in range(k_forward):
            max_ind_row = 1 if (mm - j) < 1 else (mm - j)
            start_row = max_ind_row - 1
    
            for i in range(start_row, mm):
                base_val = tri[i, j]
                tri[i, j + 1] = base_val + exposure[i] * LR_j[j]
    
                cols_tmp = tri.shape[1]
                tri_proj = np.full((mm, cols_tmp + 1), np.nan)
                tri_proj[:, 0] = base_col
                tri_proj[:, 1:] = tri
    
                inc_proj = tri_proj[:, 1:] - tri_proj[:, :-1]
                inc_proj[:, 0] = base_col
    
                for rr in range(mm - 1, -1, -1):
                    offset = mm - 1 - rr
                    for cc in range(offset + 1, inc_proj.shape[1]):
                        idx = cc - (offset + 1)
                        if idx < len(discount_factors) and not np.isnan(inc_proj[rr, cc]):
                            inc_proj[rr, cc] /= discount_factors[idx]
    
                total_disc = np.sum(np.nansum(inc_proj, axis=1))
        latest = sum_reverse_diagonal(tri_in)
    
        total_disc = np.sum(np.nansum(inc_proj, axis=1))
        ult_net_disc = latest + (total_disc - latest) * net_to_gross
    
        return np.array([np.sum(tri[:,-1]),total_disc,ult_net_disc])


77 528 289	3 780 090	5 208 668	15 841 994	22 505 673	26 732 315	33 606 691	36 422 504	40 169 275	37 897 295	36 690 788	33 750 134	11 175 531	2 171 350	1 893 307	1 386 892	1 104 726	840 650	379 668	453 859	441 811

0,767576629939175	0,849215998728698	0,869058834194445	0,786190560917326	0,748779996456646	0,668695046387924	0,686557747192719	0,926436750594510	0,995596273966541	1,000000000000000	0,963291673227506	0,970131982289575	0,996307734659081	0,964869420551402	0,960052469046005	0,999227500044326	0,999126425588477	0,907218279543446	0,960459854749154	1,000000000000000	1,000000000000000


1,03008057937231	1,09909083602943	1,17492200587691	1,25624397097192	1,34155878448775	1,43101089727766	1,52499051824097	1,62425078377706	1,73035239132369	1,84392911835232	1,96302684002627	2,08515131347181	2,20948369039686	2,33601950016222	2,46494710700462	2,59599927508437	2,72926651676528	2,86488687763830	3,00271385762887	3,14324522242772	3,28633795526627	3,43219327839059	3,58113813884027	3,73281427878610	3,88764133911182	4,04668905297548	4,20925629798950	4,37549710567373	4,54620753130120	4,72107744361955	4,90035716103268	5,08509200697979	5,27495059619472	5,47030216196783	5,67155882823323	5,87818609880756	6,09155334441540	6,31108483543555	6,53717191433263	6,77151941607788	7,01348492329913	7,26216209951746	7,51786959672847	7,78256904189375	8,05692428355122	8,33984845715264	8,63181455518119	8,93333470082846	9,24496297637720	9,56729849039352	9,90098871004849	10,24673308768780	10,60262589352600	10,97185179874290	11,35231046056150	11,74444946891190	12,15202842835830	12,57261640934510	13,01041545431900	13,46276143272020	13,92627939189690	14,40528546298820	14,90495556455270	15,42204773102960	15,95247367721090	16,50155656346030	17,07565270036420	17,66513128891530	18,27021085300590	18,90369484157800	19,56104679634620	20,23658171638170	20,93060923102750	21,65106592193610	22,39936335119950	23,17700576380760	23,97679705122320

        


array([[89537012.81, 107375181.58, 117862982.72999999,
        122063710.08999999, 124147359.44, 126748605.28, 129081673.36,
        129709283.32, 130455091.72999999, 130825562.35000001,
        131897507.34, 132746538.01, 134377318.60999998,
        136736439.51000002, 140705399.28, 143892559.3, 145295147.46,
        146091285.39999998, 146445096.31, 147261882.27],
       [22030083.29, 36416458.769999996, 40621913.639999986,
        43908681.28999999, 46592431.29999998, 48426716.12999998,
        50991052.34999998, 52570913.61999999, 52804677.90999998,
        53849306.739999995, 54226358.80999999, 54376937.15999999,
        55104794.73, 55852009.18999999, 56406142.03999999,
        57049915.16999999, 57247364.869999975, 57505620.40999998,
        57631855.92999996, <NA>],
       [26440587.21, 42436808.17, 47102953.14, 53788988.00999999,
        56460655.379999995, 58939167.410000004, 60056253.17000001,
        63179043.97000001, 63714892.81, 64808025.349999994, 66837120.44,
        68170271.36000001, 69778971.0, 71741204.24000001,
        72901087.56000003, 73619950.91000001, 73744671.89000002,
        73990097.68000002, <NA>, <NA>],
       [25669515.37, 44583079.26, 53943984.98000001, 57762894.77000001,
        60654583.20000001, 61162028.90000002, 63590006.290000014,
        66420764.960000016, 67265425.36000003, 68191462.26000002,
        68822958.28000002, 70206268.42000002, 70830027.20000002,
        71481154.54000002, 71559871.55000003, 71682126.28000003,
        71775566.24000004, <NA>, <NA>, <NA>],
       [22512950.82, 40348150.36, 46879126.73000001, 48603040.49000002,
        49909907.78000002, 51079533.98000003, 51400754.350000024,
        52175300.43000002, 52433323.020000026, 53129181.22000002,
        56098450.390000015, 56849551.440000005, 57322697.31,
        58184062.57000001, 58110426.69000001, 58622198.79000002, <NA>,
        <NA>, <NA>, <NA>],
       [25051867.599999998, 44015116.12, 50574872.32, 56953664.98000002,
        58406881.650000006, 59110144.500000015, 60193071.37000002,
        62440290.56000001, 64436469.610000014, 66807289.190000005,
        67996153.54, 69255198.9, 70151082.14, 70610788.38, 70844345.25,
        <NA>, <NA>, <NA>, <NA>, <NA>],
       [36172349.9, 60332741.33999999, 66384985.64999999, 69887718.58,
        73646173.58000001, 83091314.12999997, 84861089.99,
        86458933.99000001, 88654751.39999999, 89553543.72,
        91197913.96000001, 91448893.61000001, 91373030.29000004,
        91400886.86000003, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>],
       [52464859.31999999, 80118585.24000001, 86475789.63000001,
        90464410.37, 93207719.27000001, 95026285.7, 99866911.38,
        101799881.19000001, 102168947.76000002, 103439497.97000001,
        103469406.19000001, 103957433.85999998, 104415679.91999999, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>],
       [72776380.46, 112502272.53000002, 128593732.31000002,
        130949502.20000003, 135795734.00000006, 139664973.0000001,
        143107340.71000007, 144626758.49000007, 146120915.34000006,
        146801191.02000007, 147452003.33000007, 148025215.32000005, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>],
       [71220324.56, 103623719.54999995, 116118091.94999996,
        123495043.16999994, 128821462.87999997, 131782998.81999996,
        132980786.05999997, 136218239.85999998, 142217079.29,
        143226461.14999995, 143980135.19999996, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>],
       [70513290.89999999, 102738304.46, 112256201.41999997,
        117064611.26999997, 121915698.59999996, 124432881.21999997,
        125632193.15999998, 127358493.38999999, 129073539.93999998,
        129216531.62, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>],
       [70614675.29, 108439113.25, 120509649.89999999,
        127953365.09999998, 133254746.96999995, 136561459.77999997,
        147576529.17999998, 150057170.9, 150568851.57, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>],
       [87382464.56, 141545496.09000003, 160587045.77,
        171458188.95000005, 176205956.42000008, 181153086.52000004,
        183450960.73000005, 184566695.78000006, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>],
       [117049190.40999998, 194423302.65999997, 213723971.43999994,
        225595926.7799999, 236789409.17999998, 241127087.3199999,
        245136679.51999995, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>],
       [143533258.51999998, 231866424.71999997, 252392463.79999995,
        270068940.72999996, 286104621.48, 297298618.01, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>],
       [172288789.10999998, 275394595.0, 310687042.05, 327892204.03,
        342384893.25, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>],
       [212191426.13, 347810758.75000006, 386415748.77,
        412979861.90000004, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>],
       [231111462.3, 381176895.59999996, 424178582.87, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>],
       [224237717.91999996, 359196694.48999995, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>],
       [306549153.19, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>,
        <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>, <NA>]],
      dtype=object)
