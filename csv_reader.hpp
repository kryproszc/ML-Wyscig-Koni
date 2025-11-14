#pragma once

#include <string>
#include <functional>

struct Record
{
    double sumaUbezpieczenia;
    int    reasekuracjaF;
    double szerokosc;
    double dlugosc;
    int    woj;
};

// Funkcja czytaj¹ca CSV wiersz po wierszu.
// Wywo³uje 'callback' dla ka¿dego poprawnie sparsowanego rekordu.
void for_each_record(
    const std::string& path,
    const std::function<void(const Record&)>& callback);
