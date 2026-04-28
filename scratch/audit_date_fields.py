from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Try to find the password from the router logic if possible, or use a default if it's a known pattern
# Based on optavision_router.py: DATABASE_URL = f"postgresql://analyst_admin:{DB_PWD}@localhost:5432/datafoot_db"

engine = create_engine('postgresql://analyst_admin:analyst_password@localhost:5432/datafoot_db')
try:
    with engine.connect() as conn:
        print("--- COLUMNS opta_matches ---")
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='opta_matches'"))
        cols = {r[0]: r[1] for r in res}
        print(cols)
        
        if 'match_metadata' in cols:
            print("\n--- SAMPLE match_metadata DATE INFO ---")
            # Try to find date in JSONB if not a column
            res = conn.execute(text("SELECT match_metadata -> 'matchInfo' ->> 'date', match_metadata -> 'matchInfo' ->> 'localDate' FROM opta_matches LIMIT 5"))
            for row in res:
                print(row)
except Exception as e:
    print(f"Error: {e}")
