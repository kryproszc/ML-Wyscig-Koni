#pragma once
#include <string>
#include <vector>

struct CSV_Data
{
    std::vector<double> SU;
    std::vector<int>    F;
    std::vector<double> lat;
    std::vector<double> lon;
    std::vector<int>    woj;
    std::vector<int>    adres;
};

// szybki reader dla starego formatu
CSV_Data read_fast_csv(const std::string& path,
    size_t reserve_rows = 5'000'000);

// ===============================
//  NOWY FORMAT REAS/OBLIG
// ===============================

// jeden plik „fakultatywny”
void fast_read_reas_file(const std::string& path,
    std::vector<double>& fakultatywna_input_num,
    std::vector<std::vector<double>>& fakultatywna_input_val,
    double& pasek_postepu_wczytywania_danych,
    double  step_pasek);

// jeden plik „obligatoryjny”
void fast_read_oblig_file(const std::string& path,
    std::vector<double>& obligatoryjna_input_risk,
    std::vector<double>& obligatoryjna_input_event,
    double& pasek_postepu_wczytywania_danych,
    double  step_pasek);