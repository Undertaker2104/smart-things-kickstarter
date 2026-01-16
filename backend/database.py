"""Database connection and utilities."""
from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row
from config import DATABASE_URL


@contextmanager
def get_db_connection():
    """Context manager for database connections with dict-like rows."""
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()
