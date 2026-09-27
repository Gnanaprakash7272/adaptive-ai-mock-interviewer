import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'interview_reports';")
for row in cur.fetchall():
    print(row)
