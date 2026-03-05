import sqlite3
from pathlib import Path

conn = sqlite3.connect(r"I:\WOM\Modele\Monitorowanie\Narzędzie_do_monitorowania_modeli\Wskazniki_Baza\Baza\local_snu_ana.db")
cursor = conn.cursor()

sql_file = Path(r"I:\WOM\Modele\Monitorowanie\Narzędzie_do_monitorowania_modeli\Wskazniki_Baza\Kod_SQL\Ekspozycja na ryzyko\calkowity_wymog.sql")

with open(sql_file, "r", encoding="utf-8") as f:
    sql = f.read()

# usuwamy schemat SQL Server tylko dla SQLite
sql = sql.replace("SNU_ANA.dbo.", "")

cursor.executescript(sql)

conn.commit()
conn.close()
