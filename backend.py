import sqlite3

# =========================
# 1. Połączenie z bazą SQLite
# =========================
conn = sqlite3.connect("baza.db")
cursor = conn.cursor()

print("Połączono z bazą SQLite")

# =========================
# 2. Tworzymy przykładowe tabele (symulacja danych od kolegi)
# =========================

cursor.executescript("""
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS indicators;

CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name TEXT,
    region TEXT
);

CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    amount REAL,
    order_date TEXT
);
""")

print("Utworzono tabele")

# =========================
# 3. Wstawiamy przykładowe dane
# =========================

cursor.executemany(
    "INSERT INTO customers VALUES (?, ?, ?)",
    [
        (1, "Anna", "North"),
        (2, "Jan", "South"),
        (3, "Ola", "North"),
        (4, "Piotr", "West"),
    ]
)

cursor.executemany(
    "INSERT INTO orders VALUES (?, ?, ?, ?)",
    [
        (1, 1, 100, "2025-01-10"),
        (2, 1, 200, "2025-02-01"),
        (3, 2, 150, "2025-02-03"),
        (4, 3, 300, "2025-02-10"),
        (5, 4, 50,  "2025-02-11"),
    ]
)

print("Dodano dane")

# =========================
# 4. Tworzymy tabelę wynikową
# =========================

cursor.execute("""
CREATE TABLE indicators (
    region TEXT,
    orders_cnt INTEGER,
    total_sales REAL,
    avg_sales REAL
);
""")

# =========================
# 5. Liczymy wskaźniki SQL-em i zapisujemy
# =========================

cursor.executescript("""
INSERT INTO indicators
SELECT
    c.region,
    COUNT(o.order_id) AS orders_cnt,
    SUM(o.amount) AS total_sales,
    AVG(o.amount) AS avg_sales
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
GROUP BY c.region;
""")

print("Policzono wskaźniki")

# =========================
# 6. Sprawdzamy wynik
# =========================

cursor.execute("SELECT * FROM indicators")
rows = cursor.fetchall()

print("\nWyniki:")
for r in rows:
    print(r)

# =========================
# 7. Zapis i zamknięcie
# =========================
conn.commit()
conn.close()

print("\nGotowe! Plik baza.db utworzony.")
