#include "csv_reader.hpp"
#include <fstream>
#include <stdexcept>
#include <string>
#include <cmath>

// ===============================
//  SZYBKI PARSER LICZB
// ===============================

inline double fast_atof(const char* str, size_t len)
{
    double result = 0.0;
    double frac = 1.0;
    bool negative = false;
    size_t i = 0;

    if (len > 0 && str[0] == '-')
    {
        negative = true;
        i = 1;
    }

    for (; i < len; i++)
    {
        char c = str[i];
        if (c == '.') break;
        if (c >= '0' && c <= '9')
            result = result * 10.0 + (c - '0');
    }

    size_t dot_pos = i;

    for (i = dot_pos + 1; i < len; i++)
    {
        char c = str[i];
        if (c < '0' || c > '9') break;
        frac *= 0.1;
        result += (c - '0') * frac;
    }

    return negative ? -result : result;
}

inline int fast_atoi(const char* str, size_t len)
{
    int result = 0;
    bool negative = false;
    size_t i = 0;

    if (len > 0 && str[0] == '-')
    {
        negative = true;
        i = 1;
    }

    for (; i < len; i++)
    {
        char c = str[i];
        if (c < '0' || c > '9') break;
        result = result * 10 + (c - '0');
    }

    return negative ? -result : result;
}

// ===============================
//  STARY SZYBKI PARSER CSV
// ===============================

CSV_Data read_fast_csv(const std::string& path, size_t reserve_rows)
{
    std::ifstream in(path);

    if (!in.is_open())
        throw std::runtime_error("Nie mogê otworzyæ pliku: " + path);

    CSV_Data out;
    out.SU.reserve(reserve_rows);
    out.F.reserve(reserve_rows);
    out.lat.reserve(reserve_rows);
    out.lon.reserve(reserve_rows);
    out.woj.reserve(reserve_rows);
    out.adres.reserve(reserve_rows);

    std::string line;

    // pomijamy nag³ówek
    std::getline(in, line);

    while (std::getline(in, line))
    {
        if (line.empty())
            continue;

        // Zamiana przecinków na kropki
        for (char& c : line)
            if (c == ',') c = '.';

        int col = 0;
        size_t start = 0;
        const size_t N = line.size();

        for (size_t pos = 0; pos <= N; ++pos)
        {
            if (pos == N || line[pos] == ';')
            {
                size_t len = pos - start;
                const char* ptr = line.c_str() + start;

                switch (col)
                {
                case 2: out.SU.push_back(fast_atof(ptr, len)); break;
                case 5: // reasekuracja F
                    // jeœli pole puste -> 1 000 000
                    out.F.push_back(len == 0 ? 1000000 : fast_atoi(ptr, len));
                break;
                case 6: out.lat.push_back(fast_atof(ptr, len)); break;
                case 7: out.lon.push_back(fast_atof(ptr, len)); break;
                case 8: out.woj.push_back(fast_atoi(ptr, len)); break;
                case 9: out.adres.push_back(fast_atoi(ptr, len)); break;
                }

                start = pos + 1;
                col++;

                if (col > 9)
                    break;
            }
        }
    }







    return out;
}

// ===============================
//  NOWY FORMAT: pliki REAS
// ===============================

void fast_read_reas_file(const std::string& path,
    std::vector<double>& fakultatywna_input_num,
    std::vector<std::vector<double>>& fakultatywna_input_val,
    double& pasek_postepu_wczytywania_danych,
    double  step_pasek)
{
    std::ifstream in(path);
    if (!in.is_open())
        throw std::runtime_error("Nie mogê otworzyæ pliku: " + path);

    std::string line;

    // nag³ówek
    std::getline(in, line);

    while (std::getline(in, line))
    {
        if (line.empty())
            continue;

        // zamiana przecinków na kropki
        for (char& c : line)
            if (c == ',') c = '.';

        int    lp = 0;
        double zach_kwota = 0.0;
        bool   has_zach_kwota = false;
        double zach_proc = 0.0;
        double pojemnosc = 0.0;

        int col = 0;
        size_t start = 0;
        const size_t N = line.size();

        for (size_t pos = 0; pos <= N; ++pos)
        {
            if (pos == N || line[pos] == ';')
            {
                size_t len = pos - start;
                const char* ptr = line.c_str() + start;

                if (len > 0)
                {
                    switch (col)
                    {
                    case 0: // Lp
                        lp = fast_atoi(ptr, len);
                        break;
                    case 1: // ZachowekKwota (mo¿e byæ puste)
                        zach_kwota = fast_atof(ptr, len);
                        has_zach_kwota = true;
                        break;
                    case 2: // ZachowekProcent
                        zach_proc = fast_atof(ptr, len);
                        break;
                    case 3: // Pojemnosc
                        pojemnosc = fast_atof(ptr, len);
                        break;
                    default:
                        break; // reszta nas tu nie interesuje
                    }
                }

                start = pos + 1;
                ++col;
            }
        }

        if (!has_zach_kwota)
        {
            fakultatywna_input_num.push_back(static_cast<double>(lp));
            fakultatywna_input_val.push_back({ zach_proc, pojemnosc });
        }
        else
        {
            fakultatywna_input_val.push_back({ zach_kwota, pojemnosc });
        }

        pasek_postepu_wczytywania_danych += step_pasek;
    }
}

// ===============================
//  NOWY FORMAT: pliki OBLIG
// ===============================

void fast_read_oblig_file(const std::string& path,
    std::vector<double>& obligatoryjna_input_risk,
    std::vector<double>& obligatoryjna_input_event,
    double& pasek_postepu_wczytywania_danych,
    double  step_pasek)
{
    std::ifstream in(path);
    if (!in.is_open())
        throw std::runtime_error("Nie mogê otworzyæ pliku: " + path);

    if (obligatoryjna_input_risk.size() < 4) obligatoryjna_input_risk.assign(4, 0.0);
    if (obligatoryjna_input_event.size() < 4) obligatoryjna_input_event.assign(4, 0.0);

    std::string line;

    // nag³ówek
    std::getline(in, line);

    int cnt = 0;
    while (cnt < 2 && std::getline(in, line))
    {
        if (line.empty())
            continue;

        for (char& c : line)
            if (c == ',') c = '.';

        double od_r = 0.0, do_r = 0.0, udz_r = 0.0;
        double od_z = 0.0, do_z = 0.0, udz_z = 0.0;

        int col = 0;
        size_t start = 0;
        const size_t N = line.size();

        for (size_t pos = 0; pos <= N; ++pos)
        {
            if (pos == N || line[pos] == ';')
            {
                size_t len = pos - start;
                const char* ptr = line.c_str() + start;

                if (len > 0)
                {
                    switch (col)
                    {
                        // UWAGA: przesuniête indeksy
                    case 5: od_r = fast_atof(ptr, len); break; // Od(ryzyko)
                    case 6: do_r = fast_atof(ptr, len); break; // Do(ryzyko)
                    case 7: udz_r = fast_atof(ptr, len); break; // Udzial(ryzyko)

                    case 9:  od_z = fast_atof(ptr, len); break; // Od(zdarzenie)
                    case 10: do_z = fast_atof(ptr, len); break; // Do(zdarzenie)
                    case 11: udz_z = fast_atof(ptr, len); break; // Udzial(zdarzenie)
                    default: break;
                    }
                }

                start = pos + 1;
                ++col;
            }
        }

        if (cnt == 0)
        {
            // pierwszy wiersz: tylko udzia³y
            obligatoryjna_input_risk[3] = udz_r;
            obligatoryjna_input_event[3] = udz_z;
        }
        else
        {
            // drugi wiersz: od/do + udzia³y
            obligatoryjna_input_risk[2] = udz_r;
            obligatoryjna_input_event[2] = udz_z;

            obligatoryjna_input_risk[0] = od_r;
            obligatoryjna_input_risk[1] = do_r;

            obligatoryjna_input_event[0] = od_z;
            obligatoryjna_input_event[1] = do_z;
        }

        ++cnt;
        pasek_postepu_wczytywania_danych += step_pasek;
    }
}
