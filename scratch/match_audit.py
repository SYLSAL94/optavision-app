from sqlalchemy import create_engine, text
import json

engine = create_engine('postgresql://analyst_admin:analyst_password@localhost:5432/datafoot_db')
with engine.connect() as conn:
    print("--- COLUMNS match_configs ---")
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='match_configs'"))
    print({r[0]: r[1] for r in res})
    
    print("\n--- SAMPLE UI_CONFIG ---")
    res = conn.execute(text("SELECT ui_config FROM match_configs WHERE ui_config IS NOT NULL LIMIT 1"))
    val = res.scalar()
    print(json.dumps(val, indent=2) if val else "None")
    
    print("\n--- OTHER TABLES ---")
    res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'opta_%'"))
    print([r[0] for r in res])
