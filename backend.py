-- ======================
-- Usuwanie tabel (bezpieczne przy ponownym uruchomieniu)
-- ======================
DROP TABLE IF EXISTS Aktywa;
DROP TABLE IF EXISTS SCR;
DROP TABLE IF EXISTS SCR_do_Aktyw;

-- ======================
-- Tabele źródłowe
-- ======================
CREATE TABLE Aktywa (
    data INT,
    wartosc REAL
);

CREATE TABLE SCR (
    data INT,
    scr REAL
);

-- ======================
-- Dane przykładowe
-- ======================
INSERT INTO Aktywa (data, wartosc) VALUES
(2016,1000),
(2017,1200),
(2018,1300),
(2019,1500),
(2020,1700),
(2021,1600),
(2022,1800),
(2023,1900),
(2024,1950),
(2025,2000);

INSERT INTO SCR (data, scr) VALUES
(2016,200),
(2017,220),
(2018,240),
(2019,260),
(2020,300),
(2021,310),
(2022,330),
(2023,350),
(2024,370),
(2025,400);

-- ======================
-- Tabela wynikowa
-- ======================
CREATE TABLE SCR_do_Aktyw (
    data INT,
    aktywa REAL,
    scr REAL,
    ratio REAL
);

-- ======================
-- Obliczenia
-- ======================
INSERT INTO SCR_do_Aktyw
SELECT
    a.data,
    a.wartosc AS aktywa,
    s.scr,
    s.scr * 1.0 / a.wartosc AS ratio
FROM Aktywa a
JOIN SCR s ON a.data = s.data
ORDER BY a.data;



import sqlite3

# połączenie z lokalną bazą
conn = sqlite3.connect("baza.db")
cursor = conn.cursor()

# wczytaj plik SQL
with open("sql/scr_pipeline.sql", "r", encoding="utf-8") as f:
    sql_script = f.read()

# wykonaj cały skrypt
cursor.executescript(sql_script)

# sprawdź wynik
cursor.execute("SELECT * FROM SCR_do_Aktyw")
rows = cursor.fetchall()

print("\nSCR_do_Aktyw:")
for r in rows:
    print(r)

conn.commit()
conn.close()

print("\nGotowe.")


