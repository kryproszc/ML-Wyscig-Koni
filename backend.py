import pyodbc

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DTC-NEWM5-SNU;"
    "DATABASE=SNU_ANA;"
    "Trusted_Connection=yes;"
)

cursor = conn.cursor()
cursor.execute("SELECT TOP 5 * FROM dbo.V_S_02_01_01_01_DIU")

for row in cursor.fetchall():
    print(row)
