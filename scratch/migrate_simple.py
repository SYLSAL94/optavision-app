import sqlalchemy as sa
from sqlalchemy import create_engine, text

# Hardcoded for safety against env encoding issues
db_url = "postgresql+psycopg2://analyst_admin:SUAOLPostgres1994!@localhost:5432/datafoot_db"
engine = create_engine(db_url)

queries = [
    "ALTER TABLE match_configs ADD COLUMN IF NOT EXISTS r2_video_key_m1 VARCHAR;",
    "ALTER TABLE match_configs ADD COLUMN IF NOT EXISTS r2_video_key_m2 VARCHAR;",
    "UPDATE match_configs SET r2_video_key_m1 = r2_video_key WHERE r2_video_key_m1 IS NULL;"
]

try:
    with engine.begin() as conn:
        for q in queries:
            conn.execute(text(q))
    print("Migration OK")
except Exception as e:
    print(f"Error: {e}")
