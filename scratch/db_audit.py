from sqlalchemy import create_engine, text
import json

engine = create_engine('postgresql://analyst_admin:analyst_password@localhost:5432/datafoot_db')
with engine.connect() as conn:
    print("--- TABLES ---")
    res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
    print([r[0] for r in res])
    
    print("\n--- COLUMNS opta_events_enriched ---")
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='opta_events_enriched'"))
    print({r[0]: r[1] for r in res})
    
    print("\n--- SAMPLE QUALIFIERS ---")
    res = conn.execute(text("SELECT qualifiers FROM opta_events_enriched WHERE qualifiers IS NOT NULL LIMIT 5"))
    for row in res:
        print(row[0])
    
    print("\n--- CHECK FOR MATCHES TABLE ---")
    res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name='match_configs'"))
    print("match_configs exists:", res.scalar() is not None)
