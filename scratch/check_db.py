import os
import sqlalchemy as sa
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('/home/datafoot/.env')
DB_PWD = os.getenv('POSTGRES_PWD')
engine = create_engine(f"postgresql://analyst_admin:{DB_PWD}@localhost:5432/datafoot_db")

with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'match_configs'"))
    cols = [row[0] for row in res]
    print(f"Columns: {cols}")
