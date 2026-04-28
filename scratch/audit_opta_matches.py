from sqlalchemy import create_engine, text
import json

# Try both common passwords
passwords = ['analyst_password', 'analyst_admin']

for pwd in passwords:
    engine = create_engine(f'postgresql://analyst_admin:{pwd}@localhost:5432/datafoot_db')
    try:
        with engine.connect() as conn:
            print(f"--- SUCCESS WITH PWD: {pwd} ---")
            print("--- COLUMNS opta_matches ---")
            res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='opta_matches'"))
            for row in res:
                print(f"COL: {row[0]} | TYPE: {row[1]}")
            
            print("\n--- SAMPLE match_metadata ---")
            res = conn.execute(text("SELECT match_metadata::text FROM opta_matches LIMIT 1"))
            for row in res:
                # Print only first 500 chars to avoid overflow/encoding issues
                print(row[0][:500])
            break
    except Exception as e:
        print(f"Failed with {pwd}: {str(e)[:100]}")
