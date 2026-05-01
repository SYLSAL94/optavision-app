import os
import sqlalchemy as sa
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('/home/datafoot/.env')
DB_PWD = os.getenv('POSTGRES_PWD')
# Use raw string for password to avoid issues
engine = create_engine(f"postgresql://analyst_admin:{DB_PWD}@localhost:5432/datafoot_db")

migration_queries = [
    "ALTER TABLE match_configs ADD COLUMN IF NOT EXISTS r2_video_key_m1 VARCHAR;",
    "ALTER TABLE match_configs ADD COLUMN IF NOT EXISTS r2_video_key_m2 VARCHAR;",
    "UPDATE match_configs SET r2_video_key_m1 = r2_video_key WHERE r2_video_key_m1 IS NULL;",
]

try:
    with engine.begin() as conn:
        for q in migration_queries:
            print(f"Executing: {q}")
            conn.execute(text(q))
    print("✅ Migration SQL terminée avec succès.")
except Exception as e:
    print(f"❌ Erreur lors de la migration : {e}")
