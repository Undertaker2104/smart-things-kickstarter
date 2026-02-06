from fastapi import APIRouter, HTTPException

from database import get_db_connection
from models import CommandCreateReq, CommandFailedReq

router = APIRouter(prefix="/api/commands", tags=["commands"])


@router.post("")
def create_command(body: CommandCreateReq):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            if body.session_id is not None:
                cur.execute("SELECT 1 FROM cleaning_session WHERE id=%s", (body.session_id,))
                if cur.fetchone() is None:
                    raise HTTPException(status_code=400, detail="Session not found")

            cur.execute(
                """
                INSERT INTO command (type, command_status, session_id)
                VALUES (%s, 'PENDING', %s)
                RETURNING id, created_at, type, command_status, session_id
                """,
                (body.type, body.session_id),
            )
            cmd = cur.fetchone()
        conn.commit()
    return cmd


@router.post("/next")
def get_next_command():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH c AS (
                  SELECT id
                  FROM command
                  WHERE command_status = 'PENDING'
                  ORDER BY (type IN ('START_CLEANING','STOP_CLEANING','RESET_ERROR')) DESC,
                           -- for control commands prefer newest; for others prefer oldest
                           CASE WHEN (type IN ('START_CLEANING','STOP_CLEANING','RESET_ERROR')) THEN created_at END DESC,
                           CASE WHEN NOT (type IN ('START_CLEANING','STOP_CLEANING','RESET_ERROR')) THEN created_at END ASC
                  LIMIT 1
                  FOR UPDATE SKIP LOCKED
                )
                UPDATE command
                SET command_status = 'CLAIMED'
                WHERE id IN (SELECT id FROM c)
                RETURNING id, created_at, type, command_status, session_id
                """
            )
            cmd = cur.fetchone()
        conn.commit()

    if not cmd:
        return {"id": None}
    return cmd


@router.get("/{command_id}")
def get_command(command_id: int):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, created_at, type, command_status, session_id, acked_at, error_message FROM command WHERE id = %s",
                (command_id,),
            )
            cmd = cur.fetchone()

            if not cmd:
                raise HTTPException(
                    status_code=404,
                    detail="Command not found"
                )

        conn.commit()
    return cmd


@router.post("/{command_id}/failed")
def mark_command_failed(command_id: int, body: CommandFailedReq):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE command
                SET command_status = 'FAILED', error_message = %s
                WHERE id = %s AND command_status = 'CLAIMED'
                RETURNING id, type, command_status, error_message, session_id
                """,
                (body.error_message, command_id),
            )
            cmd = cur.fetchone()
            if not cmd:
                raise HTTPException(
                    status_code=404,
                    detail="Command not found or not in CLAIMED state"
                )

            session_id = cmd.get("session_id")
            if session_id is not None:
                cur.execute(
                    """
                    SELECT status FROM cleaning_session WHERE id = %s
                    """,
                    (session_id,),
                )
                sess = cur.fetchone()
                if sess and sess.get("status") == 'RUNNING':
                    em = (body.error_message or "").lower()
                    if 'jam' in em:
                        code = 'JAM'
                    elif 'foreign' in em or 'object' in em:
                        code = 'FOREIGN_OBJECT'
                    elif 'emergency' in em or 'stop' in em:
                        code = 'EMERGENCY_STOP'
                    else:
                        code = 'SENSOR_FAIL'

                    cur.execute(
                        """
                        UPDATE cleaning_session
                        SET status = 'ERROR', ended_at = NOW()
                        WHERE id = %s
                        """,
                        (session_id,),
                    )

                    cur.execute(
                        """
                        INSERT INTO event_log (level, code, session_id, details)
                        VALUES ('ERROR', %s, %s, %s)
                        RETURNING id
                        """,
                        (code, session_id, body.error_message or ''),
                    )
                    _ = cur.fetchone()

        conn.commit()
    return cmd
