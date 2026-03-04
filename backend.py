import pyodbc

server = "DTC-NEWM5-SNU"
database = "SNU_ANA"

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    f"SERVER={server};"
    f"DATABASE={database};"
    "Trusted_Connection=yes;"
)

print("Połączono z bazą!")
