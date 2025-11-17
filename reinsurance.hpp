#pragma once

#include <string>
#include <vector>
#include "csv_reader.hpp"

// Struktura z wynikami, które main mo¿e dalej wykorzystaæ
struct ReinsuranceResult
{
    CSV_Data dane;                 // wejœciowe dane (SU, F, lat, lon, itd.)
    std::vector<double> reas_for_SU; // SU_Netto dla ka¿dej ekspozycji
    std::size_t n = 0;             // liczba rekordów
    long long ms = 0;              // czas w ms
    double sec = 0.0;              // czas w sekundach
};

// G³ówna funkcja:
//  - reas_path  – œcie¿ka do Reasekuracja_2.csv
//  - dane_path  – œcie¿ka do dane_input.csv (ignorowana w trybie testowym)
//  - use_generated   – jeœli true, zamiast wczytywaæ dane z CSV generujemy je
//  - generated_rows  – liczba generowanych wierszy w trybie testowym
ReinsuranceResult process_reinsurance(const std::string& reas_path,
    const std::string& dane_path,
    bool use_generated = false,
    std::size_t generated_rows = 0);
