import sqlite3
from pathlib import Path

conn = sqlite3.connect(r"I:\WOM\Modele\Monitoro\Baza\local_snu_ana.db")
cursor = conn.cursor()

sql_file = Path(r"I:\WOM\Modele\Monitoro\Kod_SQL\Ekspozycja na ryzyko\calkowity_wymog.sql")

with open(sql_file, "r", encoding="utf-8") as f:
    sql = f.read()

cursor.executescript(sql)

conn.commit()
conn.close()
