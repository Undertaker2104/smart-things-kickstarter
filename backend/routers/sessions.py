"""Session endpoints for ESP to API communication."""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query

from database import get_db_connection
from models import StartSessionReq, StopSessionReq, ItemUpsertReq, EventCreateReq

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("/start")
def start_session(body: StartSessionReq):
    """Start a new cleaning session."""
    started_at = body.startedAt or datetime.utcnow().isoformat()

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO cleaning_session (started_at, status)
                VALUES (%s, 'RUNNING')
                RETURNING id, started_at, status
                """,
                (started_at,),
            )
            row = cur.fetchone()
        conn.commit()

    return {
        "sessionId": row["id"],
        "startedAt": row["started_at"],
        "status": row["status"]
    }


@router.post("/{session_id}/items")
def upsert_session_item(session_id: int, body: ItemUpsertReq):
    """Add or update item count for a session."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Validate session exists
            cur.execute("SELECT 1 FROM cleaning_session WHERE id=%s", (session_id,))
            if cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Session not found")

            # Validate ball type exists
            cur.execute("SELECT 1 FROM ball_type WHERE id=%s", (body.ballTypeId,))
            if cur.fetchone() is None:
                raise HTTPException(status_code=400, detail="Ball type not found")

            cur.execute(
                """
                INSERT INTO session_item (session_id, ball_type_id, count)
                VALUES (%s, %s, %s)
                ON CONFLICT (session_id, ball_type_id)
                DO UPDATE SET count = EXCLUDED.count
                """,
                (session_id, body.ballTypeId, body.count),
            )
        conn.commit()

    return {"ok": True}


@router.post("/{session_id}/events")
def add_event(session_id: int, body: EventCreateReq):
    """Add an event to a session."""
    timestamp = body.timestamp or datetime.utcnow().isoformat()

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM cleaning_session WHERE id=%s", (session_id,))
            if cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Session not found")

            cur.execute(
                """
                INSERT INTO event_log (timestamp, level, code, session_id, details)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (timestamp, body.level, body.code, session_id, body.details),
            )
            event_id = cur.fetchone()["id"]
        conn.commit()

    return {"ok": True, "eventId": event_id}


@router.post("/{session_id}/stop")
def stop_session(session_id: int, body: StopSessionReq):
    """Stop a cleaning session."""
    ended_at = body.endedAt or datetime.utcnow().isoformat()

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE cleaning_session
                SET ended_at = %s, status = %s
                WHERE id = %s
                """,
                (ended_at, body.status, session_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Session not found")
        conn.commit()

    return {"ok": True}


@router.get("")
def list_sessions(limit: int = Query(default=20, ge=1, le=200)):
    """List recent cleaning sessions."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, started_at, ended_at, status
                FROM cleaning_session
                ORDER BY id DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()

    return rows


@router.get("/{session_id}")
def get_session_detail(session_id: int):
    """Get detailed information about a specific session."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, started_at, ended_at, status
                FROM cleaning_session
                WHERE id = %s
                """,
                (session_id,),
            )
            session = cur.fetchone()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

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
                ORDER BY timestamp ASC
                """,
                (session_id,),
            )
            events = cur.fetchall()

    return {"session": session, "items": items, "events": events}
