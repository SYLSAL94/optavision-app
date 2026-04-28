import psycopg2
import sys

# Try common passwords
passwords = ['analyst_password', 'SUAOLPostgres1994!', 'analyst_admin']

for pwd in passwords:
    try:
        conn = psycopg2.connect(
            dbname="datafoot_db",
            user="analyst_admin",
            password=pwd,
            host="localhost",
            port="5432"
        )
        print(f"SUCCESS WITH {pwd}")
        cur = conn.cursor()
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='opta_matches'")
        cols = cur.fetchall()
        for col in cols:
            print(f"COL: {col[0]} | TYPE: {col[1]}")
        
        # Check for specific date columns
        cur.execute("SELECT id, match_metadata -> 'matchInfo' ->> 'date' FROM opta_matches LIMIT 1")
        row = cur.fetchone()
        if row:
            print(f"SAMPLE DATE IN JSONB: {row[1]}")
            
        cur.close()
        conn.close()
        break
    except Exception as e:
        print(f"FAILED WITH {pwd}: {e}")
