import sqlite3
import pandas as pd

conn = sqlite3.connect(r"I:\WOM\Modele\Monitorowanie\Narzędzie_do_monitorowania_modeli\Wskazniki_Baza\Baza\local_snu_ana.db")

df = pd.read_sql_query("SELECT * FROM calkowity_wymog", conn)

print(df)

conn.close()
