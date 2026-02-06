from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row
from config import DATABASE_URL


@contextmanager
def get_db_connection():
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()
