import pyodbc

server = "DTC-NEWM5-SNU"
database = "SNU_ANA"
username = "ss_snu_qrt"
password = "TWOJE_HASLO"

conn_str = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    f"SERVER={server};"
    f"DATABASE={database};"
    f"UID={username};"
    f"PWD={password};"
)

try:
    conn = pyodbc.connect(conn_str)
    print("Połączenie OK")
except Exception as e:
    print("Błąd:", e)



-----


import pyodbc

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DTC-NEWM5-SNU;"
    "DATABASE=SNU_ANA;"
    "Trusted_Connection=yes;"
)

print("Połączono")
