DataPoczatku;DataKonca;SumaUbezpieczenia;Odnowione;Kraj;ReasekuracjaF;Szerokosc;Dlugosc;WojUjednolicone;AdresLosowy
23.08.2023;22.08.2024;105000;1;PL;;54,083755;15,029115;7;1
18.10.2023;17.10.2024;818000;0;PL;;53,90800945;14,2587638499269;7;0
09.03.2023;08.03.2024;760000;1;PL;;53,9335106;14,4529102;7;0
21.07.2023;20.07.2024;213000;0;PL;;51,578165;21,772185;1;1
11.06.2023;10.06.2024;442000;1;PL;;53,9133085;14,2347218;7;0
27.10.2023;26.10.2024;435000;1;PL;;53,5582483;16,1333356400891;7;0
08.08.2023;07.08.2024;729500;1;PL;;53,91453255;14,2472324107875;7;0
12.04.2023;11.04.2024;317000;1;PL;;54,181282;15,5901019;7;0
31.12.2023;30.12.2024;582000;1;PL;;54,0091471;14,6951537;7;0



Lp;ZachowekKwota;ZachowekProcent;Pojemnosc;;Od(ryzyko);Do(ryzyko);Udzial(ryzyko);;Od(zdarzenie);Do(zdarzenie);Udzial(zdarzenie)
0;35000000;;999999999999;;0;35000000;1;;0;200000000;1
1;13772500;;999999999999;;35000000;1000000000;1;;200000000;1200000000;1
2;15218000;;999999999999;;;;;;;;
3;100000000;;999999999999;;;;;;;;
4;15000000;;999999999999;;;;;;;;
5;;0;999999999999;;;;;;;;
6;;0,090452261;999999999999;;;;;;;;
7;;0,1;999999999999;;;;;;;;
8;;0,127272727;999999999999;;;;;;;;
9;;0,13;999999999999;;;;;;;;
10;;0,15;999999999999;;;;;;;;
11;;0,2;999999999999;;;;;;;;
12;;0,234999708;999999999999;;;;;;;;
13;;0,25;999999999999;;;;;;;;
14;;0,3;999999999999;;;;;;;;
15;;0,4;999999999999;;;;;;;;
16;;0,425;999999999999;;;;;;;;
17;;0,4375;999999999999;;;;;;;;
18;;0,5;999999999999;;;;;;;;
19;;0,55;999999999999;;;;;;;;
20;;0,555555556;999999999999;;;;;;;;
21;;0,571428571;999999999999;;;;;;;;
22;;0,6;999999999999;;;;;;;;
23;;0,65;999999999999;;;;;;;;
24;;0,7;999999999999;;;;;;;;
25;;0,75;999999999999;;;;;;;;
26;;0,76;999999999999;;;;;;;;
27;;0,8;999999999999;;;;;;;;
28;;0,85;999999999999;;;;;;;;
29;;0,869565217;999999999999;;;;;;;;
30;;0,9;999999999999;;;;;;;;




double calc_reas_bligator(std::vector<double> vec_obligat_insur_risk, double sum_prem)
{
    double out_obl = 0.0;
    if (sum_prem <= vec_obligat_insur_risk[0])
    {
        out_obl = vec_obligat_insur_risk[3] * sum_prem;
    }
    else if (sum_prem > vec_obligat_insur_risk[0] && sum_prem <= vec_obligat_insur_risk[1])
    {
        out_obl = vec_obligat_insur_risk[2] * vec_obligat_insur_risk[0];
    }
    else if (sum_prem > vec_obligat_insur_risk[1])
    {
        out_obl = sum_prem - (vec_obligat_insur_risk[1] - vec_obligat_insur_risk[0]);
    }
    return (out_obl);



double reasecuration_build_fire(double exp_fire_pre, int woj, int mies, int nr_budynku)
{

    double reas = exponsure_reassurance[woj][mies][nr_budynku];
    std::vector<double> vec_fakul_insur_num = fakultatywna_input_num[exponsure_insurance[woj][mies][nr_budynku]];
    std::vector<std::vector<double>> vec_fakul_insur_val = fakultatywna_input_val[exponsure_insurance[woj][mies][nr_budynku]];
    std::vector<double> vec_obligat_insur_risk = obligatoryjna_input_risk[exponsure_insurance[woj][mies][nr_budynku]];
    double reas_oblig;
    double b_f;
    double reas_fakultat;
    reas_fakultat = exp_fire_pre;
    reas_oblig = exp_fire_pre;
    if ((reas < 999))
    {
        if (std::find(vec_fakul_insur_num.begin(), vec_fakul_insur_num.end(), reas) != vec_fakul_insur_num.end())
        {
            b_f = vec_fakul_insur_val[reas][0];

            reas_fakultat = exp_fire_pre * b_f + std::max(0.0, (1 - b_f) * exp_fire_pre - vec_fakul_insur_val[reas][1]);
            reas_oblig = reas_fakultat;
        }
        else
        {
            reas_fakultat = std::min(exp_fire_pre, vec_fakul_insur_val[reas][0]) +
                std::max(0.0,
                    exp_fire_pre - vec_fakul_insur_val[reas][0] - vec_fakul_insur_val[reas][1]);
            reas_oblig = reas_fakultat;
        }
    }
    if (floor(vec_obligat_insur_risk[0]) >= 0)
    {
        reas_oblig = calc_reas_bligator(vec_obligat_insur_risk, reas_fakultat);
    }
    return (reas_oblig);
}



void processOblig(const std::string& FOLDER_REAS, const std::vector<std::string>& filename)
{

    for (int i = 0; i < filename.size(); i++)
    {
        obligatoryjna_input_risk.push_back(std::vector<double>());
        obligatoryjna_input_event.push_back(std::vector<double>());

        for (int j = 0; j < 4; j++)
        {
            obligatoryjna_input_risk[i].push_back(0);
            obligatoryjna_input_event[i].push_back(0);
        }
    }

    for (int i = 0; i < filename.size(); i++)
    {
        csvstream csvin(FOLDER_REAS + filename[i] + ".csv");

        std::map<std::string, std::string> row;

        int cnt = 0;
        while (csvin >> row)
        {
            if (cnt == 0)
            {
                obligatoryjna_input_risk[i][3] = std::stod(row["Udzial(ryzyko)"]);
                obligatoryjna_input_event[i][3] = std::stod(row["Udzial(zdarzenie)"]);
            }
            else
            {
                obligatoryjna_input_risk[i][2] = std::stod(row["Udzial(ryzyko)"]);
                obligatoryjna_input_event[i][2] = std::stod(row["Udzial(zdarzenie)"]);

                obligatoryjna_input_risk[i][0] = std::stod(row["Od(ryzyko)"]);
                obligatoryjna_input_risk[i][1] = std::stod(row["Do(ryzyko)"]);

                obligatoryjna_input_event[i][0] = std::stod(row["Od(zdarzenie)"]);
                obligatoryjna_input_event[i][1] = std::stod(row["Do(zdarzenie)"]);
            }



            cnt++;
            pasek_postepu_wczytywania_danych += step_pasek;

            if (cnt == 2)
                break;
        }
    }
}



int extractMonth(const std::string& date)
{
    std::istringstream dateStream(date);
    std::string segment;
    std::getline(dateStream, segment, '.');
    std::getline(dateStream, segment, '.');
    return std::stoi(segment);
}

void processRow(const std::string& startDate, const std::string& endDate, int region, double latitude, double longitude, int reassurance, double sumValue, int insurance)
{
    int startMonth = extractMonth(startDate) - 1;
    int endMonth = extractMonth(endDate) - 1;

    for (int month = startMonth; month <= endMonth; ++month)
    {
        exponsure_latitude[region][month].push_back(latitude);
        exponsure_longitude[region][month].push_back(longitude);
        exponsure_insurance[region][month].push_back(insurance);
        exponsure_reassurance[region][month].push_back(reassurance);
        exponsure_sum_value[region][month].push_back(sumValue);
    }
}


void processBudynki(const std::string FOLDER_UBEZP, const std::string ubezp, const std::vector<std::string>& filename, std::string year, std::string odnowienia)
{

    for (int i = 0; i < filename.size(); i++)
    {
        std::cout << FOLDER_UBEZP + ubezp + filename[i] + ".csv" << std::endl;
        csvstream csvin(FOLDER_UBEZP + ubezp + filename[i] + ".csv");

        std::map<std::string, std::string> row;
        std::vector<std::vector<double>> odnowienia_vec_data = read_odnowienia(FOLDER_UBEZP + "/Parametryzacja/Odnowienia/" + filename[i]);

        int id_ubezp = i;
        try
        {
            while (csvin >> row)
            {

                if (row["Szerokosc"].empty() || row["Dlugosc"].empty())
                {
                    continue;
                }

                std::string dataPoczatku = row["DataPoczatku"];
                std::string dataKonca = row["DataKonca"];
                int reasekuracjaf = 99999;
                try
                {
                    reasekuracjaf = std::stoi(row["ReasekuracjaF"]);
                }
                catch (const std::invalid_argument& e)
                {
                    reasekuracjaf = 99999;
                }

                if (odnowienia == "tak")
                {
                    std::string StartlastFour = dataPoczatku.substr(dataPoczatku.length() - 4);
                    std::string EndlastFour = dataKonca.substr(dataKonca.length() - 4);

                    // konwersja na int
                    int StartYearnum = std::stoi(StartlastFour);
                    int EndYearnum = std::stoi(EndlastFour);
                    int policy_end_year_cop = calc_odnowienia(EndYearnum, odnowienia_vec_data, std::stoi(row["Odnowione"]), std::stod(row["SumaUbezpieczenia"]));
                    dataKonca = dataKonca.replace(dataKonca.length() - 4, 4, std::to_string(policy_end_year_cop)); // zastąpienie ostatnich 4 znaków
                }

                get_dates_within_year(dataPoczatku, dataKonca, std::stoi(year));
                processRow(
                    dataPoczatku,
                    dataKonca,
                    std::stoi(row["WojUjednolicone"]),
                    std::stod(row["Szerokosc"]),
                    std::stod(row["Dlugosc"]),
                    reasekuracjaf,
                    std::stod(row["SumaUbezpieczenia"]),
                    id_ubezp);
                pasek_postepu_wczytywania_danych += step_pasek;
            }
        }
        catch (const std::invalid_argument& e)
        {
            std::cerr << "Error: Invalid argument for stoi or stod conversion 1." << std::endl;
        }
    }
}



void processReas(const std::string FOLDER_REAS, const std::vector<std::string>& filename)
{

    fakultatywna_input_num.resize(filename.size());
    for (int i = 0; i < filename.size(); i++)
    {
        csvstream csvin(FOLDER_REAS + filename[i] + ".csv");

        std::map<std::string, std::string> row;

        std::vector<std::vector<double>> first_outer_vector;

        while (csvin >> row)
        {
            if ((row["ZachowekKwota"]) == "")
            {

                fakultatywna_input_num[i].push_back(std::stoi(row["Lp"]));
                first_outer_vector.push_back({ std::stod(row["ZachowekProcent"]), std::stod(row["Pojemnosc"]) });
            }
            else
            {
                first_outer_vector.push_back({ std::stod(row["ZachowekKwota"]), std::stod(row["Pojemnosc"]) });
            }
            pasek_postepu_wczytywania_danych += step_pasek;
        }

        fakultatywna_input_val.push_back(first_outer_vector);
    }
}

std::vector<std::vector<std::vector<long double>>> exponsure_longitude(numRegions);
std::vector<std::vector<std::vector<long double>>> exponsure_latitude(numRegions);
std::vector<std::vector<long double>> list_list_wyb(numRegions);
std::vector<std::vector<long double>> fire_spread_prob_vec(4);
std::vector<double> conditional_mean_trend_parameters(3);
std::vector<double> conditional_Cov(3);
std::vector<std::vector<std::vector<int>>> exponsure_insurance(numRegions);
std::vector<std::vector<std::vector<int>>> exponsure_reassurance(numRegions);
std::vector<std::vector<std::vector<double>>> exponsure_sum_value(numRegions);
std::vector<std::vector<double>> wielkosc_pozaru(2);
std::vector<std::vector<double>> fakultatywna_input_num;
std::vector<std::vector<std::vector<double>>> fakultatywna_input_val;
std::vector<std::vector<double>> obligatoryjna_input_risk;
std::vector<std::vector<double>> obligatoryjna_input_event;
int liczba_symulacji = 100;
