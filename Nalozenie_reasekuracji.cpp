#include <iostream>
#include <string>
#include <fstream>

#include "reinsurance.hpp"

int main()
{
    try
    {
        const std::string base = "D:/Ryzyko_pozaru_ekspozycje/";
        const std::string reas_path = base + "Reasekuracja_2.csv";
        const std::string dane_path = base + "dane_input.csv";
        const std::string out_path = base + "dane_output.csv";

        bool use_generated = false;
        std::size_t generated_n = 1000000;

        ReinsuranceResult res = process_reinsurance(
            reas_path,
            dane_path,
            use_generated,
            generated_n
        );

        std::ofstream out(out_path);
        if (!out)
        {
            std::cerr << "Nie moge otworzyc pliku do zapisu: " << out_path << "\n";
            return 1;
        }

        out << "SU;F;lat;lon;woj;adres;SU_Netto\n";

        for (std::size_t i = 0; i < res.n; ++i)
        {
            out << res.dane.SU[i] << ';'
                << res.dane.F[i] << ';'
                << res.dane.lat[i] << ';'
                << res.dane.lon[i] << ';'
                << res.dane.woj[i] << ';'
                << res.dane.adres[i] << ';'
                << res.reas_for_SU[i] << '\n';
        }

        out.close();

        std::cout << "OK: zapisano " << res.n
            << " rekordow do pliku: " << out_path << "\n";
    }
    catch (const std::exception& e)
    {
        std::cerr << "Blad: " << e.what() << "\n";
        return 1;
    }

    return 0;
}
