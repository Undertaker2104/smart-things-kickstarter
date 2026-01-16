"""State endpoint for dashboard to read current system state."""
from fastapi import APIRouter

from database import get_db_connection

router = APIRouter(prefix="/api", tags=["state"])


@router.get("/state")
def get_state():
    """
    Get current system state: latest session with its items and recent events.
    Used by the dashboard for real-time display.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, started_at, ended_at, status
                FROM cleaning_session
                ORDER BY id DESC
                LIMIT 1
                """
            )
            session = cur.fetchone()

            if not session:
                return {"status": "NO_SESSION"}

            session_id = session["id"]

            cur.execute(
                """
                SELECT si.ball_type_id, bt.name, si.count
                FROM session_item si
                JOIN ball_type bt ON bt.id = si.ball_type_id
                WHERE si.session_id = %s
                ORDER BY si.ball_type_id
                """,
                (session_id,),
            )
            items = cur.fetchall()

            cur.execute(
                """
                SELECT id, timestamp, level, code, details
                FROM event_log
                WHERE session_id = %s
                ORDER BY timestamp DESC
                LIMIT 20
                """,
                (session_id,),
            )
            events = cur.fetchall()

    return {
        "session": session,
        "items": items,
        "events": events,
    }
