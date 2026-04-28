from sqlalchemy import create_engine, text
import json

pwd = 'SUAOLPostgres1994!'
engine = create_engine(f'postgresql://analyst_admin:{pwd}@localhost:5432/datafoot_db')
output = []
try:
    with engine.connect() as conn:
        output.append("--- COLUMNS opta_matches ---")
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='opta_matches'"))
        for row in res:
            output.append(f"COL: {row[0]} | TYPE: {row[1]}")
        
        output.append("\n--- SAMPLE DATES ---")
        res = conn.execute(text("SELECT id, match_metadata -> 'matchInfo' ->> 'date' as info_date FROM opta_matches LIMIT 5"))
        for row in res:
            output.append(f"ID: {row[0]} | INFO_DATE: {row[1]}")
            
except Exception as e:
    output.append(f"Error: {str(e)}")

with open('scratch/audit_output.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(output))
