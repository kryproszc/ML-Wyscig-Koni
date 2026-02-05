from scipy.optimize import least_squares
import numpy as np
import pandas as pd


class TriangleCalculator_det:
    def __init__(self):
        pass  # nie trzymamy danych na starcie, tylko czekamy na dane wejściowe


     
    def get_r2_numpy_manual(self, x, y):
        zx = (x - np.mean(x)) / np.std(x, ddof=1)
        zy = (y - np.mean(y)) / np.std(y, ddof=1)
        r = np.sum(zx * zy) / (len(x) - 1)
        return r ** 2

    def r2_curves(self, f_curves, y_input):
        r2_value = pd.DataFrame(np.nan, index=['Wartość'], columns=f_curves.index)

        k = 0
        for row in f_curves.index:

            if (row == "Exponential"):
                r2 = self.get_r2_numpy_manual(np.log(y_input - 1), np.log(f_curves.loc[row] - 1))
                r2_value.iloc[0, k] = r2

            elif (row == "Weibull"):
                r2 = self.get_r2_numpy_manual(
                    np.log(np.log(y_input / (y_input - 1))),
                    np.log(np.log(f_curves.loc[row] / (f_curves.loc[row] - 1)))
                )
                r2_value.iloc[0, k] = r2

            elif (row == "Power"):
                r2 = self.get_r2_numpy_manual(
                    np.log(np.log(y_input)),
                    np.log(np.log(f_curves.loc[row]))
                )
                r2_value.iloc[0, k] = r2

            elif (row == "Inverse Power"):
                r2 = self.get_r2_numpy_manual(
                    np.log(y_input - 1),
                    np.log(f_curves.loc[row] - 1)
                )
                r2_value.iloc[0, k] = r2

            k = k + 1

        return (r2_value)

    def curve_predict(self, x, a, b, c=None, curve=None):
        """
        Curve prediction strictly consistent with
        'Log Regression Fitting Method' from the document.
        """

        x = np.asarray(x, dtype=float)

        if curve == 'Exponential':
            # r_t = 1 + a * exp(b * t)
            y_fit = 1.0 + a * np.exp(b * x)

        elif curve == 'Weibull':
            # r_t = 1 / (1 - exp(-a * t^b))
            # consistent with:
            # log(log(r_t / (r_t - 1))) = log(a) + b * log(t)
            if np.any(x <= 0):
                raise ValueError("Weibull curve requires x > 0")

            y_fit = 1.0 / (1.0 - np.exp(-a * x ** b))

        elif curve == 'Power':
            # r_t = a^(b^t)
            y_fit = a ** (b ** x)

        elif curve == 'Inverse Power':
            # r_t = 1 + a * (c + t)^b
            if c is None:
                raise ValueError("Inverse Power curve requires parameter c")

            y_fit = 1.0 + a * (c + x) ** b

        else:
            raise ValueError(f"Unknown curve type: {curve}")

        return y_fit



    def parameters_curve_reservoir_logregression(
        self,
        xs,
        ys,
        lista_krzywych,
        weights=None   # <-- NOWY ARGUMENT
    ):
        """
        Log Regression Fitting Method
        (opcjonalnie: weighted)
        """

        parametry = pd.DataFrame(
            np.nan,
            index=lista_krzywych,
            columns=['a', 'b', 'c']
        )

        for krzywa in lista_krzywych:

            if krzywa == 'Exponential':
                weight_vals = weights['Exponential'].values if weights is not None else None
                param = np.polyfit(
                    xs,
                    np.log(ys - 1),
                    deg=1,
                    w=weight_vals
                )
                parametry.loc['Exponential', ['a', 'b']] = param

            elif krzywa == 'Weibull':
                weight_vals = weights['Weibull'].values if weights is not None else None
                param = np.polyfit(
                    np.log(xs),
                    np.log(np.log(ys / (ys - 1))),
                    deg=1,
                    w=weight_vals
                )
                parametry.loc['Weibull', ['a', 'b']] = param

            elif krzywa == 'Power':
                weight_vals = weights['Power'].values if weights is not None else None
                param = np.polyfit(
                    xs,
                    np.log(np.log(ys)),
                    deg=1,
                    w=weight_vals
                )
                parametry.loc['Power', ['a', 'b']] = param

            elif krzywa == 'Inverse Power':
                best_r2 = -np.inf
                best_param = None

                for c in [-0.5, 1, 3, 5]:
                    weight_vals = weights['Inverse Power'].values if weights is not None else None
                    param = np.polyfit(
                        np.log(xs + c),
                        np.log(ys - 1),
                        deg=1,
                        w=weight_vals
                    )

                    y_pred = self.curve_predict(
                        xs,
                        np.exp(param[1]),
                        param[0],
                        c,
                        curve='Inverse Power'
                    )

                    r2 = self.get_r2_numpy_manual(
                        np.log(ys - 1),
                        np.log(y_pred)
                    )

                    if r2 > best_r2:
                        best_r2 = r2
                        best_param = list(param) + [c]

                parametry.loc['Inverse Power'] = best_param

        return parametry




    def parameters_curve_reservoir_least_squares(
        self,
        xs,
        ys,
        lista_krzywych,
        weights=None
    ):
        """
        Least Squares Fitting Method (weighted)
        Starting values transformed from log-regression
        """

        xs = np.asarray(xs, dtype=float)
        ys = np.asarray(ys, dtype=float)

        if weights is None:
            weights_dict = {curve: np.ones_like(ys, dtype=float) for curve in lista_krzywych}
        else:
            weights_dict = {curve: weights[curve].values for curve in lista_krzywych}

        # ---------- 1. LOG-FIT (STARTY) ----------
        param_start = self.parameters_curve_reservoir_logregression(
            xs, ys, lista_krzywych, weights=weights
        )

        parametry = pd.DataFrame(
            np.nan,
            index=lista_krzywych,
            columns=['a', 'b', 'c']
        )

        for krzywa in lista_krzywych:

            # ===================== Exponential =====================
            if krzywa == 'Exponential':

                a_log, b_log = param_start.loc['Exponential', ['a', 'b']]
                if pd.isna(a_log) or pd.isna(b_log):
                    continue

                # transform log → curve
                start_curve = np.array([np.exp(a_log), b_log])
                w_sqrt = np.sqrt(weights_dict['Exponential'])

                def residuals(p):
                    a, b = p
                    y_hat = self.curve_predict(xs, a, b, 0, 'Exponential')
                    if not np.all(np.isfinite(y_hat)):
                        return np.full_like(ys, 1e6)
                    return w_sqrt * (ys - y_hat)

                res = least_squares(residuals, x0=start_curve, method='lm')

                parametry.loc['Exponential', ['a', 'b']] = (
                    res.x if res.success else start_curve
                )

            # ===================== Weibull =====================
# ===================== Weibull =====================
# ===================== Weibull =====================
            elif krzywa == 'Weibull':

                a0, b0 = parametry.loc['Exponential', ['a', 'b']]
                if a0 is None or b0 is None:
                    continue

                a0 = max(a0, 1e-6)
                b0 = max(b0, 1e-6)

                start_curve = np.array([a0, b0], dtype=float)
                w_sqrt = np.sqrt(weights_dict['Weibull'])

                def residuals(p):
                    a, b = p
                    y_hat = self.curve_predict(xs, a, b, 0, 'Weibull')
                    if not np.all(np.isfinite(y_hat)):
                        return np.full_like(ys, 1e6)
                    return w_sqrt * (ys - y_hat)

                res = least_squares(
                    residuals,
                    x0=start_curve,
                    method="trf",
                    bounds=([1e-6, 1e-6], [np.inf, np.inf])
                )

                if not res.success:
                    continue

                y_check = self.curve_predict(xs, res.x[0], res.x[1], 0, 'Weibull')
                if np.any(y_check <= 1) or not np.all(np.diff(y_check) <= 0):
                    continue

                parametry.loc['Weibull', ['a', 'b']] = res.x

                        
            elif krzywa == 'Power':

                a_log, b_log = param_start.loc['Power', ['a', 'b']]
                if pd.isna(a_log) or pd.isna(b_log):
                    continue

                # Power ma inną transformację
                start_curve = np.array([
                    np.exp(np.exp(a_log)),
                    np.exp(b_log)
                ])
                w_sqrt = np.sqrt(weights_dict['Power'])

                def residuals(p):
                    a, b = p
                    if a <= 0 or b <= 0:
                        return np.full_like(ys, 1e6)
                    y_hat = self.curve_predict(xs, a, b, 0, 'Power')
                    if not np.all(np.isfinite(y_hat)):
                        return np.full_like(ys, 1e6)
                    return w_sqrt * (ys - y_hat)

                res = least_squares(residuals, x0=start_curve, method='lm')

                parametry.loc['Power', ['a', 'b']] = (
                    res.x if res.success else start_curve
                )

            # ===================== Inverse Power =====================
            elif krzywa == 'Inverse Power':

                a_log, b_log, c0 = param_start.loc['Inverse Power', ['a', 'b', 'c']]
                if pd.isna(a_log) or pd.isna(b_log) or pd.isna(c0):
                    continue

                start_curve = np.array([np.exp(a_log), b_log])
                w_sqrt = np.sqrt(weights_dict['Inverse Power'])

                best_cost = np.inf
                best_param = None

                for c in [-0.5, 1, 3, 5]:

                    def residuals(p):
                        a, b = p
                        y_hat = self.curve_predict(xs, a, b, c, 'Inverse Power')
                        if not np.all(np.isfinite(y_hat)):
                            return np.full_like(ys, 1e6)
                        return w_sqrt * (ys - y_hat)

                    res = least_squares(residuals, x0=start_curve, method='lm')

                    if res.success and res.cost < best_cost:
                        best_cost = res.cost
                        best_param = [res.x[0], res.x[1], c]

                if best_param is not None:
                    parametry.loc['Inverse Power'] = best_param
                else:
                    parametry.loc['Inverse Power'] = [*start_curve, c0]

        # ---------- 2. CLEAN ----------
        parametry = (
            parametry
            .replace([np.inf, -np.inf], np.nan)
            .where(pd.notna(parametry), None)
        )

        return parametry

    def sim_data_curve_rezerwy_least_squares(self, x, lista_krzywych, parameters_curve_num):
        x = np.asarray(x, dtype=float)

        factor_value = pd.DataFrame(
            np.nan,
            index=lista_krzywych,
            columns=[f'dp: {j}' for j in range(1, len(x) + 1)]
        )

        for curve in lista_krzywych:

            # ===================== Exponential =====================
            if curve == 'Exponential':
                a, b = parameters_curve_num.loc['Exponential', ['a', 'b']]
                if a is None or b is None:
                    continue

                y = self.curve_predict(x, a, b, c=0, curve='Exponential')
                factor_value.loc['Exponential'] = y

            # ===================== Weibull =====================
            elif curve == 'Weibull':
                a, b = parameters_curve_num.loc['Weibull', ['a', 'b']]
                if a is None or b is None:
                    continue

                y = self.curve_predict(x, a, b, c=0, curve='Weibull')
                factor_value.loc['Weibull'] = y

            # ===================== Power =====================
            elif curve == 'Power':
                a, b = parameters_curve_num.loc['Power', ['a', 'b']]
                if a is None or b is None:
                    continue

                y = self.curve_predict(x, a, b, c=0, curve='Power')
                factor_value.loc['Power'] = y

            # ===================== Inverse Power =====================
            elif curve == 'Inverse Power':
                a, b, c = parameters_curve_num.loc['Inverse Power', ['a', 'b', 'c']]
                if a is None or b is None or c is None:
                    continue

                y = self.curve_predict(x, a, b, c=c, curve='Inverse Power')
                factor_value.loc['Inverse Power'] = y

        return factor_value


    def sim_data_curve_rezerwy_logregression(self, x, lista_krzywych, parameters_curve_num):
        factor_value = pd.DataFrame(np.nan, index=lista_krzywych,
                                    columns=['dp: ' + str(j) for j in range(1, len(x) + 1)])

        for l_curve in lista_krzywych:
            if l_curve == 'Exponential':
                param = parameters_curve_num.loc['Exponential'][0:2]
                y = self.curve_predict(x, np.exp(param.iloc[1]), param.iloc[0], c=0, curve='Exponential')
                factor_value.loc['Exponential'] = y

            elif l_curve == 'Weibull':
                param = parameters_curve_num.loc['Weibull'][0:2]
                y = self.curve_predict(x, np.exp(param.iloc[1]), param.iloc[0], c=0, curve='Weibull')
                factor_value.loc['Weibull'] = y

            elif l_curve == 'Power':
                param = parameters_curve_num.loc['Power'][0:2]
                y = self.curve_predict(x, np.exp(np.exp(param.iloc[1])), np.exp(param.iloc[0]), c=0, curve='Power')
                factor_value.loc['Power'] = y

            elif l_curve == 'Inverse Power':
                param = parameters_curve_num.loc['Inverse Power']
                y = self.curve_predict(x, np.exp(param.iloc[1]), param.iloc[0], param.iloc[2], curve='Inverse Power')
                factor_value.loc['Inverse Power'] = y

        return factor_value
    


    
    def get_r2_numpy_manual(self, x, y):
        zx = (x - np.mean(x)) / np.std(x, ddof=1)
        zy = (y - np.mean(y)) / np.std(y, ddof=1)
        r = np.sum(zx * zy) / (len(x) - 1)
        return r ** 2

    def get_r2_weighted(self, y_true, y_pred, w):
        y_true = np.asarray(y_true, dtype=float)
        y_pred = np.asarray(y_pred, dtype=float)
        w = np.asarray(w, dtype=float)

        y_mean = np.average(y_true, weights=w)
        ss_res = np.sum(w * (y_true - y_pred) ** 2)
        ss_tot = np.sum(w * (y_true - y_mean) ** 2)

        return 1.0 - ss_res / ss_tot if ss_tot > 0 else np.nan


    def r2_curves_logregression(self, f_curves, y_input, weights_df=None):
        """
        R² computed in log-regression space.
        If weights_df is provided -> weighted R² is used.
        """

        r2_value = pd.DataFrame(np.nan, index=["Wartość"], columns=f_curves.index)

        for k, row in enumerate(f_curves.index):

            # ---------- transformacje y ----------
            if row in ["Exponential", "Inverse Power"]:
                y_true = np.log(y_input - 1)
                y_pred = np.log(f_curves.loc[row] - 1)

            elif row == "Weibull":
                y_true = np.log(np.log(y_input / (y_input - 1)))
                y_pred = np.log(np.log(f_curves.loc[row] / (f_curves.loc[row] - 1)))

            elif row == "Power":
                y_true = np.log(np.log(y_input))
                y_pred = np.log(np.log(f_curves.loc[row]))

            else:
                continue

            # ---------- R² ----------
            if weights_df is not None:
                w = weights_df[row].values
                r2 = self.get_r2_weighted(y_true, y_pred, w)
            else:
                r2 = self.get_r2_numpy_manual(y_true, y_pred)

            r2_value.iloc[0, k] = r2

        return r2_value




    def r2_curves_least_squares(self, f_curves, y_input, weights_df=None):
        """
        R² computed in original (least squares) space.
        If weights_df is provided -> weighted R² is used.
        """

        r2_value = pd.DataFrame(np.nan, index=["Wartość"], columns=f_curves.index)

        for k, row in enumerate(f_curves.index):

            y_true = np.asarray(y_input, dtype=float)
            y_pred = np.asarray(f_curves.loc[row], dtype=float)

            if weights_df is not None:
                w = weights_df[row].values
                r2 = self.get_r2_weighted(y_true, y_pred, w)
            else:
                r2 = self.get_r2_numpy_manual(y_true, y_pred)

            r2_value.iloc[0, k] = r2

        return r2_value


    def triangle_forward(self, df_data, f, k_forward_start):
        df_t = df_data.copy()
        data = df_t.values  # numpy array for speed
        m, n = data.shape

        max_len = len(f) + 1
        if max_len > n:
            # dodaj nowe kolumny jeśli trzeba
            extra_cols = max_len - n
            data = np.hstack((data, np.full((m, extra_cols), np.nan)))

        for j in range(k_forward_start - 1, len(f)):
            col_from = data[:, j]
            col_to = data[:, j + 1]
            start_row = max(0, m - j - 1)
            data[start_row:, j + 1] = col_from[start_row:] * f[j]

        col_names = list(df_data.columns) + [f'proj_{i}' for i in range(n, data.shape[1])]
        return pd.DataFrame(data, columns=col_names)