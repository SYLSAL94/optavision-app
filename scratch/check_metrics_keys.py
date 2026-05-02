import sqlalchemy
from sqlalchemy import create_engine, text
import json
import sys

# Utilisation de l'URL standard du projet
DATABASE_URL = "postgresql://analyst_admin:Analyst2025!@localhost:5432/datafoot_db"
engine = create_engine(DATABASE_URL)

match_id = 'ytxz0i1eppxxqupm27ktuln8'

query = text("""
    SELECT advanced_metrics 
    FROM opta_events_enriched 
    WHERE match_id = :match_id 
    AND (advanced_metrics->>'sub_sequence_id' IS NOT NULL OR advanced_metrics->>'possession_id' IS NOT NULL)
    LIMIT 1
""")

try:
    with engine.connect() as conn:
        result = conn.execute(query, {"match_id": match_id}).fetchone()
        if result:
            metrics = result[0]
            if isinstance(metrics, str):
                metrics = json.loads(metrics)
            print("--- METRICS KEYS ---")
            print(list(metrics.keys()))
            print("--- FULL METRICS SAMPLE ---")
            print(json.dumps(metrics, indent=2))
        else:
            print("No events with sequence IDs found.")
except Exception as e:
    print(f"Error: {e}")
