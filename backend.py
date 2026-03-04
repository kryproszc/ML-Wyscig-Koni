import pyodbc
import pandas as pd
import sqlite3

# połączenie z SQL Server
conn_sql = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DTC-NEWM5-SNU;"
    "DATABASE=SNU_ANA;"
    "Trusted_Connection=yes;"
)

cursor = conn_sql.cursor()

# lista widoków
views_query = """
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.VIEWS
"""

views = [row[0] for row in cursor.execute(views_query)]

print("Znalezione widoki:", len(views))

# lokalna baza
conn_local = sqlite3.connect("local_snu_ana.db")

for view in views:
    print("Pobieram:", view)

    df = pd.read_sql(f"SELECT * FROM {view}", conn_sql)

    df.to_sql(view, conn_local, if_exists="replace", index=False)







runas /netonly /user:IT\ss_snu_qrt "python download_all_views.py"

print("Gotowe! Wszystkie widoki zapisane do local_snu_ana.db")
