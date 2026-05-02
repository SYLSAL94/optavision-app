import sqlalchemy
from sqlalchemy import create_engine, text
import json

DATABASE_URL = "postgresql://analyst_admin:Analyst2025!@localhost:5432/datafoot_db"
engine = create_engine(DATABASE_URL)

match_id = 'ytxz0i1eppxxqupm27ktuln8'

query = text("""
    SELECT advanced_metrics 
    FROM opta_events_enriched 
    WHERE match_id = :match_id 
    LIMIT 20
""")

with engine.connect() as conn:
    result = conn.execute(query, {"match_id": match_id}).fetchall()
    print(f"Found {len(result)} events for match {match_id}")
    for row in result:
        metrics = row[0]
        if isinstance(metrics, str):
            metrics = json.loads(metrics)
        print(json.dumps(metrics, indent=2))
        break # just show one
