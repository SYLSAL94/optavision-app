import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        database="datafoot_db",
        user="analyst_admin",
        password="analyst_password"
    )
    cur = conn.cursor()
    
    print("--- COLUMNS match_configs ---")
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='match_configs'")
    cols = cur.fetchall()
    print({c[0]: c[1] for c in cols})
    
    print("\n--- SAMPLE UI_CONFIG ---")
    cur.execute("SELECT ui_config FROM match_configs WHERE ui_config IS NOT NULL LIMIT 1")
    row = cur.fetchone()
    if row:
        print(row[0])
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
