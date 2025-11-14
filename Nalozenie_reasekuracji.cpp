#include <iostream>
#include <chrono>
#include "csv_reader.hpp"

// TUTAJ ustaw úcieøkÍ do swojego pliku CSV:
const std::string CSV_PATH =
"D:/Ryzyko_pozaru_ekspozycje/dane_input.csv";

int main()
{
    try
    {
        std::size_t licznik = 0;
        double suma_SU = 0.0;

        auto t0 = std::chrono::high_resolution_clock::now();

        for_each_record(CSV_PATH,
            [&](const Record& r)
            {
                ++licznik;
                suma_SU += r.sumaUbezpieczenia;

                // TU P”èNIEJ WSTAWIMY Twojπ logikÍ:
                // np. liczenie ekspozycji, agregacje po wojewÛdztwach, itd.
            });

        auto t1 = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> dt = t1 - t0;

        std::cout << "Wczytano rekordow: " << licznik << "\n";
        std::cout << "Suma SU: " << suma_SU << "\n";
        std::cout << "Czas: " << dt.count() << " s\n";
    }
    catch (const std::exception& e)
    {
        std::cerr << "Blad: " << e.what() << "\n";
    }

    return 0;
}
