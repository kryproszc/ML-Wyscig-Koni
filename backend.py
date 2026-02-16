import sqlite3
import pandas as pd

conn = sqlite3.connect("baza.db")

df = pd.read_sql("SELECT * FROM SCR_do_Aktyw", conn)

print("\nTabela SCR_do_Aktyw:")
print(df)

conn.close()
