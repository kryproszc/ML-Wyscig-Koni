cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("\nTabele w bazie:")
for t in tables:
    print("-", t[0])
