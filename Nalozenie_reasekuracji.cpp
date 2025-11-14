#include <iostream>
#include <chrono>
#include "csv_reader.hpp"

int main()
{
    try
    {
        auto t_start = std::chrono::high_resolution_clock::now();

        CSV_Data dane = read_fast_csv("D:/Ryzyko_pozaru_ekspozycje/dane_input.csv");

        auto t_end = std::chrono::high_resolution_clock::now();
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(t_end - t_start).count();
        double sec = ms / 1000.0;

        std::cout << "==============================\n";
        std::cout << "   Wczytywanie CSV zakończone\n";
        std::cout << "==============================\n";
        std::cout << "Rekordów: " << dane.SU.size() << "\n";
        std::cout << "Czas: " << ms << " ms (" << sec << " s)\n\n";

        if (!dane.SU.empty())
        {
            std::cout << "Pierwszy rekord:\n";
            std::cout << " SU:   " << dane.SU[0] << "\n";
            std::cout << " F:    " << dane.F[0] << "\n";
            std::cout << " lat:  " << dane.lat[0] << "\n";
            std::cout << " lon:  " << dane.lon[0] << "\n";
            std::cout << " woj:  " << dane.woj[0] << "\n";
            std::cout << " adr:  " << dane.adres[0] << "\n";
        }
    }
    catch (const std::exception& e)
    {
        std::cerr << "Błąd: " << e.what() << "\n";
    }
}
