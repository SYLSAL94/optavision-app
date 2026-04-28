import psycopg2
import sys

try:
    conn = psycopg2.connect(
        dbname="datafoot_db",
        user="analyst_admin",
        password="SUAOLPostgres1994!",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='opta_matches'")
    for row in cur.fetchall():
        # Using sys.stdout.buffer.write to avoid encoding issues with print
        line = f"COL:{row[0]}|TYPE:{row[1]}\n".encode('ascii', 'ignore')
        sys.stdout.buffer.write(line)
    conn.close()
except Exception as e:
    sys.stdout.buffer.write(b"ERROR_CONNECTING\n")
