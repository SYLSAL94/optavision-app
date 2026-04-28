import psycopg2

users = ['analyst_admin', 'postgres']
passwords = ['analyst_password', 'SUAOLPostgres1994!', 'analyst_admin']

for user in users:
    for pwd in passwords:
        try:
            conn = psycopg2.connect(
                dbname="datafoot_db",
                user=user,
                password=pwd,
                host="localhost",
                port="5432"
            )
            print(f"AUTH_SUCCESS: {user}:{pwd}")
            cur = conn.cursor()
            cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='opta_matches'")
            for row in cur.fetchall():
                print(f"COLUMN: {row[0]} | TYPE: {row[1]}")
            conn.close()
            exit(0)
        except Exception:
            pass
print("ALL_AUTH_FAILED")
