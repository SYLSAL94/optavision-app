import sys
try:
    from sqlalchemy import create_engine, text
    pwd = 'SUAOLPostgres1994!'
    engine = create_engine(f'postgresql://analyst_admin:{pwd}@localhost:5432/datafoot_db')
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='opta_matches'"))
        rows = res.fetchall()
        print("COLUMNS FOUND")
        for row in rows:
            print(row[0], row[1])
except Exception as e:
    print(f"EXCEPTION TYPE: {type(e)}")
    print(f"EXCEPTION REPR: {repr(e)}")
