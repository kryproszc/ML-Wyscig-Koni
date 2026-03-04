import pyodbc
import pandas as pd

server = "ADRES_SERWERA"
database = "NAZWA_BAZY"
username = "LOGIN"
password = "HASLO"

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    f"SERVER={server};"
    f"DATABASE={database};"
    f"UID={username};"
    f"PWD={password}"
)

query = "SELECT * FROM dbo.NAZWA_WIDOKU"

df = pd.read_sql(query, conn)

print(df.head())
