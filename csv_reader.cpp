#include "csv_reader.hpp"

#include <fstream>
#include <vector>
#include <stdexcept>

static std::vector<std::string> split_semicolon(std::string& line)
{
    std::vector<std::string> cols;
    cols.reserve(10);

    std::size_t start = 0;
    while (true)
    {
        std::size_t pos = line.find(';', start);
        if (pos == std::string::npos)
        {
            cols.emplace_back(line.substr(start));
            break;
        }
        cols.emplace_back(line.substr(start, pos - start));
        start = pos + 1;
    }
    return cols;
}

void for_each_record(
    const std::string& path,
    const std::function<void(const Record&)>& callback)
{
    std::ifstream in(path);
    if (!in.is_open())
    {
        throw std::runtime_error("Nie moge otworzyc pliku: " + path);
    }

    std::string line;

    // pomijamy nag³ówek
    if (!std::getline(in, line))
        return;

    while (std::getline(in, line))
    {
        if (line.empty())
            continue;

        // zamiana przecinków na kropki – dla stod / stoi
        for (char& c : line)
        {
            if (c == ',')
                c = '.';
        }

        std::vector<std::string> cols = split_semicolon(line);
        // oczekujemy min. 9 kolumn wg nag³ówka
        if (cols.size() < 9)
            continue;

        Record r{};
        try
        {
            // 0: DataPoczatku
            // 1: DataKonca
            // 2: SumaUbezpieczenia
            // 3: Odnowione
            // 4: Kraj
            // 5: ReasekuracjaF
            // 6: Szerokosc
            // 7: Dlugosc
            // 8: WojUjednolicone
            // 9: AdresLosowy

            r.sumaUbezpieczenia = std::stod(cols[2]);

            if (!cols[5].empty())
                r.reasekuracjaF = std::stoi(cols[5]);
            else
                r.reasekuracjaF = 0; // lub 99999 jeœli wolisz

            r.szerokosc = std::stod(cols[6]);
            r.dlugosc = std::stod(cols[7]);
            r.woj = std::stoi(cols[8]);
        }
        catch (...)
        {
            // coœ siê nie sparsowa³o – pomijamy ten wiersz
            continue;
        }

        // przekazujemy rekord do callbacka
        callback(r);
    }
}
