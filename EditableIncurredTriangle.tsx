



import numpy as np
from numba import njit


@njit
def Dev_prem(data_paid: np.ndarray, wagi: np.ndarray) -> np.ndarray:
    n_row, n_col = data_paid.shape
    dev = np.empty(n_col - 1)
    for j in range(n_col - 1):
        num = den = 0.0
        for i in range(n_row):
            val_curr = data_paid[i, j]
            val_next = data_paid[i, j + 1]
            w = wagi[i, j]
            if not (np.isnan(val_next)):
                num += val_next * w
                den += val_curr * w
        dev[j] = num / den if den != 0.0 else 1.0
    return dev


@njit
def elementwise_division(data_paid: np.ndarray) -> np.ndarray:

    n_rows, n_cols = data_paid.shape
    out = np.empty((n_rows, n_cols - 1))
    for i in range(n_rows):
        for j in range(n_cols - 1):
            a = data_paid[i, j]
            b = data_paid[i, j + 1]
            if a != 0.0 and not np.isnan(b):
                val = b / a
                out[i, j] = val if np.isfinite(val) else 1.0
            else:
                out[i, j] = 1.0
    return out


@njit
def calculate_sigma(p_ij, l_ij, w_ij, dev_j):
    n_rows, n_cols = l_ij.shape
    sigmas = np.empty(n_cols)
    sds = np.empty(n_cols)
    for j in range(n_cols):
        dev = dev_j[j]
        num = den = den_sd = 0.0
        cnt = 0
        for i in range(n_rows):
            w = w_ij[i, j]
            p = p_ij[i, j]
            l = l_ij[i, j]
            if not (np.isnan(w)):
                diff = l - dev
                num += w * p * diff * diff
                den += w
                den_sd += w * p
                cnt += 1
        if  den > 1.0 and num > 0:
            sigma = num / (den - 1.0)
        else:
            sigma = 0
        sd_val = sigma / den_sd if den_sd > 0.0 else 0
        sigmas[j] = sigma
        sds[j] = np.sqrt(sd_val)
    return sigmas, sds

from numba import njit

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



@njit
def fit_curve_factor_cl(data_input, sd_input, x_k):
    n = len(data_input)
    se2 = sd_input **2
    w = np.empty(n)
    for i in range(n):
        denom = (data_input[i] - 1) ** 2
        w[i] = 1.0 / np.sqrt(np.log(1.0 + se2[i] / denom)) if denom > 0.0 else 0
    y = np.log(data_input - 1.0)
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
        out[i] = 1.0 + np.exp(a_coef * k + b_coef)
    return out
    
@njit
def triangle_forward_one_np(triangle_input, f, k_forward_start):
    mm, nn = triangle_input.shape
    req_cols = len(f)
    tri = np.zeros((mm, req_cols))
    # kopiuj istniejące dane
    for i in range(mm):
        for j in range(nn):
            tri[i, j] = triangle_input[i, j]
    # projekcja
    for j in range(k_forward_start - 1, len(f)):
        if j + 1 >= req_cols:
            continue
        max_row = max(0, mm - j - 1)
        for i in range(max_row, mm):
            tri[i, j + 1] = tri[i, j] * f[j]
    return tri



@njit
def fit_curve_factor_P_to_I(data_input, x_k):
    factor_input = np.log(1.0 - data_input)
    w_k_sqr = np.ones(len(data_input))

    A = np.sum(w_k_sqr)
    A_x = np.sum(w_k_sqr * x_k)
    A_xx = np.sum(w_k_sqr * x_k * x_k)
    A_y = np.sum(w_k_sqr * factor_input)
    A_xy = np.sum(w_k_sqr * x_k * factor_input)

    Delta = A * A_xx - A_x * A_x
    a_num = (A * A_xy - A_x * A_y) / Delta
    b_num = (A_xx * A_y - A_x * A_xy) / Delta

    return a_num, b_num

@njit
def vector_reverse_diagonal(data: np.ndarray):
    """Zwraca wektor elementów odwrotnej przekątnej (ostatniej pełnej diagonali)."""
    rows, cols = data.shape
    result = []
    for i in range(rows):
        j = cols - 1 - i
        if 0 <= j < cols:
            v = data[i, j]
            if not np.isnan(v):
                result.append(v)
    return np.array(result)


@njit
def wspolczynnik_reg_factor_P_to_I(a, b, k_start, k_stop):
    k_values = np.arange(k_start, k_stop + 1)
    exponent = np.exp(a * k_values + b)
    wartosci_reg = 1.0 - exponent
    return wartosci_reg







import numpy as np
from numba import njit


@njit
def Dev_prem(data_paid: np.ndarray, wagi: np.ndarray) -> np.ndarray:
    n_row, n_col = data_paid.shape
    dev = np.empty(n_col - 1)
    for j in range(n_col - 1):
        num = den = 0.0
        for i in range(n_row):
            val_curr = data_paid[i, j]
            val_next = data_paid[i, j + 1]
            w = wagi[i, j]
            if not (np.isnan(val_next)):
                num += val_next * w
                den += val_curr * w
        dev[j] = num / den if den != 0.0 else 1.0
    return dev


@njit
def elementwise_division(data_paid: np.ndarray) -> np.ndarray:

    n_rows, n_cols = data_paid.shape
    out = np.empty((n_rows, n_cols - 1))
    for i in range(n_rows):
        for j in range(n_cols - 1):
            a = data_paid[i, j]
            b = data_paid[i, j + 1]
            if a != 0.0 and not np.isnan(b):
                val = b / a
                out[i, j] = val if np.isfinite(val) else 1.0
            else:
                out[i, j] = 1.0
    return out


@njit
def calculate_sigma(p_ij, l_ij, w_ij, dev_j):
    n_rows, n_cols = l_ij.shape
    sigmas = np.empty(n_cols)
    sds = np.empty(n_cols)
    for j in range(n_cols):
        dev = dev_j[j]
        num = den = den_sd = 0.0
        cnt = 0
        for i in range(n_rows):
            w = w_ij[i, j]
            p = p_ij[i, j]
            l = l_ij[i, j]
            if not (np.isnan(w)):
                diff = l - dev
                num += w * p * diff * diff
                den += w
                den_sd += w * p
                cnt += 1
        if  den > 1.0 and num > 0:
            sigma = num / (den - 1.0)
        else:
            sigma = 0
        sd_val = sigma / den_sd if den_sd > 0.0 else 0
        sigmas[j] = sigma
        sds[j] = np.sqrt(sd_val)
    return sigmas, sds

from numba import njit

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



@njit
def fit_curve_factor_cl(data_input, sd_input, x_k):
    n = len(data_input)
    se2 = sd_input **2
    w = np.empty(n)
    for i in range(n):
        denom = (data_input[i] - 1) ** 2
        w[i] = 1.0 / np.sqrt(np.log(1.0 + se2[i] / denom)) if denom > 0.0 else 0
    y = np.log(data_input - 1.0)
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
        out[i] = 1.0 + np.exp(a_coef * k + b_coef)
    return out
    
@njit
def triangle_forward_one_np(triangle_input, f, k_forward_start):
    mm, nn = triangle_input.shape
    req_cols = len(f)
    tri = np.zeros((mm, req_cols))
    # kopiuj istniejące dane
    for i in range(mm):
        for j in range(nn):
            tri[i, j] = triangle_input[i, j]
    # projekcja
    for j in range(k_forward_start - 1, len(f)):
        if j + 1 >= req_cols:
            continue
        max_row = max(0, mm - j - 1)
        for i in range(max_row, mm):
            tri[i, j + 1] = tri[i, j] * f[j]
    return tri



@njit
def fit_curve_factor_P_to_I(data_input, x_k):
    factor_input = np.log(1.0 - data_input)
    w_k_sqr = np.ones(len(data_input))

    A = np.sum(w_k_sqr)
    A_x = np.sum(w_k_sqr * x_k)
    A_xx = np.sum(w_k_sqr * x_k * x_k)
    A_y = np.sum(w_k_sqr * factor_input)
    A_xy = np.sum(w_k_sqr * x_k * factor_input)

    Delta = A * A_xx - A_x * A_x
    a_num = (A * A_xy - A_x * A_y) / Delta
    b_num = (A_xx * A_y - A_x * A_xy) / Delta

    return a_num, b_num

@njit
def vector_reverse_diagonal(data: np.ndarray):
    """Zwraca wektor elementów odwrotnej przekątnej (ostatniej pełnej diagonali)."""
    rows, cols = data.shape
    result = []
    for i in range(rows):
        j = cols - 1 - i
        if 0 <= j < cols:
            v = data[i, j]
            if not np.isnan(v):
                result.append(v)
    return np.array(result)


@njit
def wspolczynnik_reg_factor_P_to_I(a, b, k_start, k_stop):
    k_values = np.arange(k_start, k_stop + 1)
    exponent = np.exp(a * k_values + b)
    wartosci_reg = 1.0 - exponent
    return wartosci_reg









@njit
def run_simulation_numba( dev_inc, sigma_inc, sd_inc,
                         rj, varj,r_i_j, lambda_cor, data_paid_np, data_inc_np,weights_np, wykluczenia,
                         Poz_CL,  data_wagi_pi,  wykluczenia_p_i,
                         Poz_CL_p_i,dop_ogo_p_i,
                         il_ogon,discount_factors,net_to_gross,
                         sim_total=1, batch_sim=1, main_seed=42):
    latest = vector_reverse_diagonal(data_paid_np)
    mm, n_cols_orig = data_paid_np.shape
    r_j_sim_mean = np.zeros(n_cols_orig)
    #r_j_sim_mean[0] = 0.814554021011695
    n_dev = len(dev_inc)
    r_j_sim = np.zeros((sim_total,n_cols_orig))
    all_incurred_triangles = np.zeros((sim_total, mm, n_dev))
    all_paid_triangles = np.zeros((sim_total, mm, n_dev+1))
    results = np.zeros((sim_total, 3))
    num_batches = sim_total // batch_sim
    results = np.zeros((sim_total, 3))
    for batch in range(num_batches):
        seed = main_seed + batch
        np.random.seed(seed)
        normal_shocks = np.random.normal(loc=0.0, scale=1.0, size=(batch_sim, mm, n_dev))
        mu_part_inc = np.empty((batch_sim, n_dev))
        sigma_part_inc = np.empty((batch_sim, n_dev))
        for jj in range(n_dev):
            mu_part_inc[:, jj] = np.random.normal(loc=dev_inc[jj], scale=sd_inc[jj], size=batch_sim)
            df = max(1, mm - jj-2)
            chi_list = np.random.chisquare(df, size=batch_sim)
            for s in range(batch_sim):
                sigma_part_inc[s, jj] = (chi_list[s] * sigma_inc[jj]) / df
        for i in range(batch_sim):
            empty_row = np.full((1, weights_np.shape[1]), np.nan)
            wagi_modified_row = np.vstack((weights_np, empty_row))
            empty_column = np.full((wagi_modified_row.shape[0], 1), np.nan)
            wagi_modified = np.hstack((wagi_modified_row, empty_column))
            
            empty_column = np.full((data_wagi_pi.shape[0], 1), np.nan)
            data_wagi_pi_modifited = np.hstack((data_wagi_pi, empty_column))

            r_i_j_modifited = np.hstack((data_wagi_pi, empty_column))

            
            m_i_inc = mu_part_inc[i, :]
            sigma_i_inc = sigma_part_inc[i, :]
            data_paid_copy = data_paid_np.copy()
            data_incurred_to_paid_copy = data_paid_np.copy()
            data_incurred_copy = data_inc_np.copy()

            data_paid_to_one = data_paid_np.copy()
            data_incurred_to_one = data_inc_np.copy()
            n_cols_current = data_paid_copy.shape[1]
            if n_cols_current < n_dev + 1:
                extra_cols = (n_dev + 1) - n_cols_current
                data_paid_copy = np.concatenate((data_paid_copy, np.zeros((mm, extra_cols))), axis=1)
                data_incurred_copy = np.concatenate((data_incurred_copy, np.zeros((mm, extra_cols))), axis=1)
                data_incurred_copy_cl = np.concatenate((data_incurred_copy, np.zeros((mm, extra_cols))), axis=1)

                data_incurred_to_paid_copy = np.concatenate((data_incurred_to_paid_copy, np.zeros((mm, extra_cols))), axis=1)

                data_paid_to_one = data_paid_np.copy()
                data_paid_to_one = np.concatenate((data_paid_to_one, np.zeros((mm,1))), axis=1)
                data_incurred_to_one = np.concatenate((data_incurred_to_one, np.zeros((mm, 1))), axis=1)

                n_cols_current = data_paid_copy.shape[1]
            for j in range(n_dev):
                max_ind_row = max(0, mm - j-1)
                for r in range(max_ind_row, mm):
                    base_val = data_incurred_to_paid_copy[r, j]
                    base_val_inc = data_incurred_copy[r, j]

                    if base_val_inc == 0:
                        continue
                    var_ij_inc = sigma_i_inc[j] / base_val_inc
                    m_sq_inc = m_i_inc[j] * m_i_inc[j]

                    denom_inc = np.sqrt(m_sq_inc + var_ij_inc)
                    dev_con = dev_inc[j]
                    std_con = sd_inc[j]
                    lmean_inc = np.log(m_sq_inc / denom_inc)
                    lstdev_inc = np.sqrt(np.log(1 + (var_ij_inc / m_sq_inc)))
                    cl_ij_inc = np.random.lognormal(lmean_inc, lstdev_inc)

                    if (varj[j]==0):
                        res_before = 0
                    else:
                        res_before = (((base_val / base_val_inc) - rj[j])/(np.sqrt(varj[j] / (base_val_inc ))))
                    data_incurred_copy[r, j + 1] = base_val_inc * cl_ij_inc
                    data_incurred_copy_cl[r, j + 1] = cl_ij_inc
                    val_paid = base_val_inc * cl_ij_inc * (
                        rj[j + 1]
                        +
                        (np.sqrt(varj[j + 1] / (base_val_inc * cl_ij_inc))) *
                        (normal_shocks[i, r, j] + res_before * lambda_cor[0])
                    )
                    data_incurred_to_paid_copy[r, j + 1] = val_paid
                    if r == mm - j - 1:
                        r_i_j_sim = (
                        rj[j + 1]
                        +
                        (np.sqrt(varj[j + 1] / (base_val_inc * cl_ij_inc))) *
                        (normal_shocks[i, r, j] + res_before * lambda_cor[0])
                        )
                        val_paid = base_val_inc * cl_ij_inc * r_i_j_sim
                        data_paid_to_one[r, j + 1] = val_paid
                        data_incurred_to_one[r, j + 1] = base_val_inc * cl_ij_inc
                        data_paid_copy[r, j + 1] = val_paid
                    if r == mm - j - 1 and (j<(mm)):
                        if dev_con - 2 * std_con <= cl_ij_inc <= dev_con + 2 * std_con:
                            wagi_modified[r,j] = 1
                            data_wagi_pi_modifited[r,j+1] = 1
                        elif (dev_con - 3 * std_con <= cl_ij_inc < dev_con - 2 * std_con) or (dev_con +2 * std_con < cl_ij_inc <= dev_con + 3 * std_con):
                            wagi_modified[r,j] = 0.5
                            data_wagi_pi_modifited[r,j+1] = 0.5

                        else:
                            wagi_modified[r,j] = 0
                            data_wagi_pi_modifited[r,j+1] = 0
            
            
            ############## JEDNOROCZNE ###################
            data_incurred_to_one[1:,  n_cols_orig ] = np.nan
            data_paid_to_one[1:,  n_cols_orig ] = np.nan
            dev_j = Dev_prem(data_incurred_to_one, wagi_modified)
            l_ij = elementwise_division(data_incurred_to_one)
            sigma_all = calculate_sigma(data_incurred_to_one, l_ij, wagi_modified, dev_j)
            sd_sim = sigma_all[1]
            dev_sel,ind_choode = choose_value_list(dev_j, wykluczenia,1,10)
            sd_sel = sd_sim[ind_choode]
            sd_sel_ind = np.array([i for i, x in enumerate(sd_sel) if x>0], dtype = np.int64)
            sd_sel = sd_sel[sd_sel_ind]
            dev_sel = dev_sel[sd_sel_ind]
            x_k = ind_choode+1
            a_coef, b_coef = fit_curve_factor_cl(dev_sel, sd_sel, x_k)
            total_f_len = len(dev_j) + il_ogon
            if Poz_CL-1>0:
                vec_f = np.empty(total_f_len-2)
                vec_f[:(Poz_CL - 1)] = dev_j[1:(Poz_CL)]
                vec_f[(Poz_CL-1):] = 1
            else:
                vec_f = wspolczynnik_reg_factor_cl(
                    a_coef, b_coef,
                    2,
                    total_f_len-1
                )
            data_paid_to_one_new = data_paid_to_one[:, 1:]
            data_incurred_to_one_new = data_incurred_to_one[:, 1:(n_cols_orig + 1)]
            tri_proj_tmp = triangle_forward_one_np(data_incurred_to_one_new, vec_f, 1)
            ############################################################################
          #  pd.DataFrame(data_paid_to_one).to_excel("data_paid_to_one.xlsx")
          #  pd.DataFrame(data_incurred_to_one).to_excel("data_incurred_to_one.xlsx")

            mm, nn = data_paid_to_one_new.shape
            for jjj in range(0, nn):
                licznik = 0
                mianownik = 0
                for iii in range(0, mm):
                    if data_wagi_pi_modifited[iii, jjj]!=0 and not np.isnan(data_wagi_pi_modifited[iii, jjj]):
                        licznik = licznik + data_wagi_pi_modifited[iii, jjj]*data_paid_to_one[iii, jjj]
                        mianownik = mianownik + data_wagi_pi_modifited[iii, jjj]*data_incurred_to_one[iii, jjj]
                if mianownik == 0:
                    r_j_sim[batch * batch_sim + i,jjj] = 1
                else:
                    r_j_sim[batch * batch_sim + i,jjj] = licznik / mianownik
    ####################### koniec jednoroczne
            u_i = data_incurred_to_paid_copy[:, data_incurred_to_paid_copy.shape[1]-1]
            results[batch * batch_sim + i ,0] = np.sum(u_i)
            u_i_one_brutto = tri_proj_tmp[:, tri_proj_tmp.shape[1]-1]
            all_incurred_triangles[batch * batch_sim + i] = tri_proj_tmp
            all_paid_triangles[batch * batch_sim + i] = data_paid_copy
    for i in range(1,n_cols_orig):
        suma = 0.0
        for j in range(sim_total):
            suma += r_j_sim[j, i]
        r_j_sim_mean[i] = suma / sim_total
    rj_choose, ind_choose = choose_value_list(r_j_sim_mean, wykluczenia_p_i, 0, 1)
    a_num, b_num = fit_curve_factor_P_to_I(rj_choose, ind_choose + 1)
    if Poz_CL_p_i - 1 > 0:
        vec_p_i = np.empty(total_f_len - 1)
        vec_p_i[:(Poz_CL_p_i - 2)] = r_j_sim_mean[2:(Poz_CL_p_i)]
        if dop_ogo_p_i == True:
            vec_p_i[(Poz_CL_p_i - 2):] = 1
        else:
             vec_p_i[(Poz_CL_p_i - 2):] = [1]*(total_f_len-Poz_CL_p_i+1)
    else:
        vec_p_i = wspolczynnik_reg_factor_cl(
            float(a_num), float(b_num),
            2,
            total_f_len
        )
    for trian_sim_num in range(all_incurred_triangles.shape[0]):
        trian_sim = all_incurred_triangles[trian_sim_num,:,:]
        trian_sim_paid_one = all_paid_triangles[trian_sim_num,:,1:]
        for j_col in range(1, trian_sim_paid_one.shape[1]):
            max_ind_row = max(0, trian_sim_paid_one.shape[0] - j_col)
            for i in range(max_ind_row, trian_sim.shape[0]):
                trian_sim_paid_one[i, j_col ] = trian_sim[i, j_col]*vec_p_i[j_col]
        cols_tmp = trian_sim_paid_one.shape[1]
        tri_proj = np.empty((mm, cols_tmp + 1))
        tri_proj[:, 0] = data_incurred_to_paid_copy[:, 0]
        for r in range(mm):
            for c in range(cols_tmp):
                tri_proj[r, c + 1] = trian_sim_paid_one[r, c]
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

        cum_disc_ost = cum_disc[:, - 1]
        ult_gross_disc = np.sum(cum_disc[:,  - 1])

        ult_net_disc = 0
        for i_net in range(len(latest)):
            ult_net_disc += cum_disc_ost[i_net] * net_to_gross[i_net]
        results[trian_sim_num,1] = ult_gross_disc
        results[trian_sim_num,2] = ult_net_disc

    return results

