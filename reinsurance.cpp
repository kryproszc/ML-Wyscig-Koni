#include "reinsurance.hpp"

#include <vector>
#include <string>
#include <chrono>
#include <fstream>
#include <iostream>
#include <stdexcept>

#include "csv_reader.hpp"

namespace
{
    // GLOBALNE wektory (ograniczone do tego pliku .cpp)
    std::vector<std::vector<double>> fakultatywna_input_num;
    std::vector<std::vector<std::vector<double>>> fakultatywna_input_val;

    std::vector<std::vector<double>> obligatoryjna_input_risk;
    std::vector<std::vector<double>> obligatoryjna_input_event;

    // pomocnicza tablica: czy dana warstwa fakultatywna jest udzia³owa (1) czy XoL (0)
    std::vector<unsigned char> fakultatywna_is_percent;

    double pasek_postepu_wczytywania_danych = 0.0;
    double step_pasek = 0.0001;

    // ===================================================
    //  Kalkulator obligatoryjny
    // ===================================================
    inline double calc_reas_bligator(const std::vector<double>& v,
        double sum_prem)
    {
        const double p1 = v[0];
        const double p2 = v[1];
        const double share2 = v[2];
        const double share1 = v[3];

        if (sum_prem <= p1)
            return share1 * sum_prem;
        else if (sum_prem <= p2)
            return share2 * p1;
        else
            return sum_prem - (p2 - p1);
    }

    // ===================================================
    //  Kalkulator reasekuracji dla jednej SU
    // ===================================================
    inline double reasecuration_build_fire(double exp_fire_pre, int reas_code)
    {
        const auto& vec_fakul_insur_val = fakultatywna_input_val[0];
        const auto& is_percent_layer = fakultatywna_is_percent;
        const auto& vec_obligat_insur_risk = obligatoryjna_input_risk[0];

        double reas_fakultat = exp_fire_pre;
        double reas_oblig = exp_fire_pre;

        // czêœæ fakultatywna
        if (reas_code >= 0 && reas_code < 999 &&
            static_cast<std::size_t>(reas_code) < vec_fakul_insur_val.size())
        {
            const auto& par = vec_fakul_insur_val[reas_code];

            if (!is_percent_layer.empty() &&
                static_cast<std::size_t>(reas_code) < is_percent_layer.size() &&
                is_percent_layer[reas_code])
            {
                // udzia³ procentowy
                const double b_f = par[0];
                const double ret = par[1];

                const double rest = (1.0 - b_f) * exp_fire_pre - ret;
                reas_fakultat = exp_fire_pre * b_f + (rest > 0.0 ? rest : 0.0);
            }
            else
            {
                // XoL
                const double limit = par[0];
                const double cap = par[1];

                const double below = (exp_fire_pre < limit ? exp_fire_pre : limit);
                const double above = exp_fire_pre - limit - cap;

                reas_fakultat = below + (above > 0.0 ? above : 0.0);
            }

            reas_oblig = reas_fakultat;
        }

        // czêœæ obligatoryjna
        if (!vec_obligat_insur_risk.empty() && vec_obligat_insur_risk[0] >= 0.0)
        {
            reas_oblig = calc_reas_bligator(vec_obligat_insur_risk, reas_fakultat);
        }

        return reas_oblig;
    }

    // ===================================================
    //  Generator danych testowych (zamiast CSV)
    // ===================================================
    CSV_Data generate_test_data(std::size_t n)
    {
        CSV_Data d;

        d.SU.resize(n);
        d.F.resize(n);
        d.lat.resize(n);
        d.lon.resize(n);
        d.woj.resize(n);
        d.adres.resize(n);

        for (std::size_t i = 0; i < n; ++i)
        {
            d.SU[i] = 100000.0 + (i % 50000);         // SU w zakresie 100k–150k
            d.F[i] = static_cast<double>(i % 5);     // reas_code 0–4
            d.lat[i] = 50.0 + (i % 1000) * 0.0001;
            d.lon[i] = 19.0 + (i % 1000) * 0.0001;

            // "woj" i "adres" jako liczby 0–10
            d.woj[i] = static_cast<double>(i % 11);
            d.adres[i] = static_cast<double>(i % 11);
        }

        return d;
    }

} // anonimowa namespace

// ===================================================
//  Funkcja wysokiego poziomu – wywo³ywana z main()
// ===================================================
ReinsuranceResult process_reinsurance(const std::string& reas_path,
    const std::string& dane_path,
    bool use_generated,
    std::size_t generated_rows)
{
    auto t_start = std::chrono::high_resolution_clock::now();

    // 1) Przygotowanie wektorów
    fakultatywna_input_num.resize(1);
    fakultatywna_input_val.resize(1);
    obligatoryjna_input_risk.resize(1);
    obligatoryjna_input_event.resize(1);

    // 2) Wczytanie reasekuracji
    fast_read_reas_file(
        reas_path,
        fakultatywna_input_num[0],
        fakultatywna_input_val[0],
        pasek_postepu_wczytywania_danych,
        step_pasek
    );

    // mapowanie warstw
    {
        const auto& vec_val = fakultatywna_input_val[0];
        const auto& vec_num = fakultatywna_input_num[0];

        fakultatywna_is_percent.assign(vec_val.size(), 0);

        for (double lp : vec_num)
        {
            int idx = static_cast<int>(lp);
            if (idx >= 0 && static_cast<std::size_t>(idx) < fakultatywna_is_percent.size())
                fakultatywna_is_percent[idx] = 1;
        }
    }

    fast_read_oblig_file(
        reas_path,
        obligatoryjna_input_risk[0],
        obligatoryjna_input_event[0],
        pasek_postepu_wczytywania_danych,
        step_pasek
    );

    // 3) Wczytanie ekspozycji lub wygenerowanie testowych danych
    CSV_Data dane;
    if (use_generated)
    {
        dane = generate_test_data(generated_rows);
    }
    else
    {
        dane = read_fast_csv(dane_path);
    }

    const std::size_t n = dane.SU.size();
    std::vector<double> reas_for_SU(n);

    // 4) Liczenie reasekuracji
    for (std::size_t i = 0; i < n; ++i)
    {
        reas_for_SU[i] = reasecuration_build_fire(
            dane.SU[i],
            static_cast<int>(dane.F[i])
        );
    }

    auto t_end = std::chrono::high_resolution_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        t_end - t_start).count();
    double sec = ms / 1000.0;

    std::cout << "OK: " << n << " rekordow, czas " << ms
        << " ms (" << sec << " s)\n";

    ReinsuranceResult result;
    result.dane = std::move(dane);
    result.reas_for_SU = std::move(reas_for_SU);
    result.n = n;
    result.ms = ms;
    result.sec = sec;

    return result;
}


#include <cmath>

inline double haversine_m(double lat1_deg, double lon1_deg,
    double lat2_deg, double lon2_deg,
    double earth_radius = 6378137.0)
{
    // prosta walidacja zakresu
    if (std::fabs(lat1_deg) > 90.0 || std::fabs(lat2_deg) > 90.0 ||
        std::fabs(lon1_deg) > 360.0 || std::fabs(lon2_deg) > 360.0)
    {
        return std::numeric_limits<double>::quiet_NaN();
    }

    const double deg_to_rad = 0.017453292519943295769; // PI / 180
    const double phi1 = lat1_deg * deg_to_rad;
    const double phi2 = lat2_deg * deg_to_rad;
    const double delta_phi = (lat2_deg - lat1_deg) * deg_to_rad;
    const double delta_lambda = (lon2_deg - lon1_deg) * deg_to_rad;

    const double sin_dphi_2 = std::sin(delta_phi * 0.5);
    const double sin_dlam_2 = std::sin(delta_lambda * 0.5);

    const double a = sin_dphi_2 * sin_dphi_2 +
        std::cos(phi1) * std::cos(phi2) * sin_dlam_2 * sin_dlam_2;

    const double c = 2.0 * std::atan2(std::sqrt(a), std::sqrt(1.0 - a));

    return earth_radius * c; // metry
}
