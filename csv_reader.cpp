#include "csv_reader.hpp"
#include <fstream>
#include <stdexcept>
#include <string>

// ===============================
//  SZYBKI PARSER LICZB
// ===============================

inline double fast_atof(const char* str, size_t len)
{
    double result = 0.0;
    double frac = 1.0;
    bool negative = false;
    size_t i = 0;

    if (str[0] == '-')
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

    if (str[0] == '-')
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
//  SZYBKI PARSER CSV
// ===============================

CSV_Data read_fast_csv(const std::string& path, size_t reserve_rows)
{
    std::ifstream in(path);

    if (!in.is_open())
        throw std::runtime_error("Nie mogę otworzyć pliku: " + path);

    CSV_Data out;
    out.SU.reserve(reserve_rows);
    out.F.reserve(reserve_rows);
    out.lat.reserve(reserve_rows);
    out.lon.reserve(reserve_rows);
    out.woj.reserve(reserve_rows);
    out.adres.reserve(reserve_rows);

    std::string line;

    // pomijamy nagłówek
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
                case 5: out.F.push_back(fast_atoi(ptr, len)); break;
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
