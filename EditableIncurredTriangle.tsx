import numpy as np

# KOMPLETNE SPRAWDZENIE DANYCH - PORÓWNANIE Z DZIAŁAJĄCYM KODEM
print("=== SPRAWDZENIE DANYCH ===")

# Sprawdzenie kształtów i podstawowych statystyk
print(f"dev_inc: shape={dev_inc.shape}, min={np.min(dev_inc):.6f}, max={np.max(dev_inc):.6f}, mean={np.mean(dev_inc):.6f}")
print(f"sigma_inc: shape={sigma_inc.shape}, min={np.min(sigma_inc):.6f}, max={np.max(sigma_inc):.6f}, mean={np.mean(sigma_inc):.6f}")
print(f"sd_inc: shape={sd_inc.shape}, min={np.min(sd_inc):.10f}, max={np.max(sd_inc):.6f}, mean={np.mean(sd_inc):.10f}")
print(f"rj: shape={rj.shape}, min={np.min(rj):.6f}, max={np.max(rj):.6f}, mean={np.mean(rj):.6f}")
print(f"varj: shape={varj.shape}, min={np.min(varj):.6f}, max={np.max(varj):.6f}, mean={np.mean(varj):.6f}")
print(f"r_i_j: shape={r_i_j.shape}")
print(f"lambda_cor: {lambda_cor[0]:.6f}")

# Sprawdzenie trójkątów
print(f"traingle_paid_inf: shape={traingle_paid_inf.shape}")
print(f"traingle_paid_inf - min={np.nanmin(traingle_paid_inf):.2f}, max={np.nanmax(traingle_paid_inf):.2f}")
print(f"traingle_paid_inf - czy są zera: {np.any(traingle_paid_inf == 0)}")
print(f"traingle_paid_inf - czy są NaN: {np.any(np.isnan(traingle_paid_inf))}")

print(f"traingle_incurred_inf: shape={traingle_incurred_inf.shape}")
print(f"traingle_incurred_inf - min={np.nanmin(traingle_incurred_inf):.2f}, max={np.nanmax(traingle_incurred_inf):.2f}")
print(f"traingle_incurred_inf - czy są zera: {np.any(traingle_incurred_inf == 0)}")
print(f"traingle_incurred_inf - czy są NaN: {np.any(np.isnan(traingle_incurred_inf))}")

# Sprawdzenie wag
print(f"data_wagi_cl: shape={data_wagi_cl.shape}")
print(f"data_wagi_cl - unique values: {np.unique(data_wagi_cl)}")
print(f"data_wagi_cl - czy są NaN: {np.any(np.isnan(data_wagi_cl))}")

print(f"data_wagi_pi: shape={data_wagi_pi.shape}")
print(f"data_wagi_pi - unique values: {np.unique(data_wagi_pi)}")
print(f"data_wagi_pi - czy są NaN: {np.any(np.isnan(data_wagi_pi))}")

# Sprawdzenie wykluczeń
print(f"wykluczenia: {wykluczenia}")
print(f"wykluczenia_p_i: {wykluczenia_p_i}")

# Sprawdzenie pozycji
print(f"Poz_CL: {Poz_CL}")
print(f"Poz_CL_p_i: {Poz_CL_p_i}")
print(f"il_ogon: {il_ogon}")

# Sprawdzenie stawek
print(f"discount_rates: shape={discount_rates.shape}, values={discount_rates}")
print(f"netto_brutto: shape={netto_brutto.shape}, values={netto_brutto}")

# Sprawdzenie symulacji
print(f"sim_total: {sim_total}")
print(f"batch_sim: {batch_sim}")

# Sprawdzenie problemowych wartości
print(f"Czy są bardzo małe wartości w sd_inc (< 1e-15): {np.any(sd_inc < 1e-15)}")
print(f"Najmnniejsza wartość sd_inc: {np.min(sd_inc):.20f}")
print(f"Czy są zera w varj: {np.any(varj == 0)}")
print(f"Czy są NaN w r_i_j: {np.any(np.isnan(r_i_j))}")

print("=== KONIEC SPRAWDZENIA ===")s

