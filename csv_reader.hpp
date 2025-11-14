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

CSV_Data read_fast_csv(const std::string& path, size_t reserve_rows = 5'000'000);
