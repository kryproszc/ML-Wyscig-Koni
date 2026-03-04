import sqlite3

conn = sqlite3.connect(r"C:\temp\local_snu_ana.db")

cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")

print(cursor.fetchall())
