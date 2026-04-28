from sqlalchemy import create_engine, text
import json

pwd = 'SUAOLPostgres1994!'
engine = create_engine(f'postgresql://analyst_admin:{pwd}@localhost:5432/datafoot_db')
try:
    with engine.connect() as conn:
        print("--- COLUMNS opta_matches ---")
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='opta_matches'"))
        for row in res:
            print(f"COL: {row[0]} | TYPE: {row[1]}")
        
        print("\n--- SAMPLE DATES ---")
        # Checking for common date columns and JSONB content
        res = conn.execute(text("SELECT id, match_metadata -> 'matchInfo' ->> 'date' as info_date FROM opta_matches LIMIT 5"))
        for row in res:
            print(f"ID: {row[0]} | INFO_DATE: {row[1]}")
            
except Exception as e:
    print(f"Error: {e}")
