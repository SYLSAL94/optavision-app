import psycopg2
try:
    conn = psycopg2.connect(
        host="localhost",
        database="datafoot_db",
        user="analyst_admin",
        password="SUAOLPostgres1994!",
        port="5432"
    )
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("ALTER TABLE match_configs ADD COLUMN IF NOT EXISTS r2_video_key_m1 VARCHAR;")
    cur.execute("ALTER TABLE match_configs ADD COLUMN IF NOT EXISTS r2_video_key_m2 VARCHAR;")
    cur.execute("UPDATE match_configs SET r2_video_key_m1 = r2_video_key WHERE r2_video_key_m1 IS NULL;")
    print("Migration OK")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
