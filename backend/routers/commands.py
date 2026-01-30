"""Command endpoints for dashboard to ESP communication."""
from fastapi import APIRouter, HTTPException

from database import get_db_connection
from models import CommandCreateReq, CommandFailedReq

router = APIRouter(prefix="/api/commands", tags=["commands"])


@router.post("")
def create_command(body: CommandCreateReq):
    """
    Create a new command for the device.

    - **type**: Command type (START_CLEANING, STOP_CLEANING, RESET_ERROR)
    - **session_id**: Optional session ID to associate this command with a specific cleaning session

    Returns the created command with ID, timestamps, and status.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Validate session exists if session_id provided
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
    """
    Get the next pending command for the microcontroller to execute.

    Behavior:
    - Prefer *control* commands (START_CLEANING, STOP_CLEANING, RESET_ERROR) — newest first.
    - For non-control work, preserve FIFO (oldest first).
    - Atomically mark the returned command as CLAIMED so it won't be re-delivered (safe for concurrent pollers).

    Returns the claimed command, or {"id": None} if no commands are pending.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Atomically select the highest-priority pending command and mark it CLAIMED.
            # Priority logic:
            #  - control commands are preferred and the newest among them is returned
            #  - non-control commands keep FIFO behavior
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
    """
    Get a specific command by ID.

    Returns the command with all details including session_id and status.
    """
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
    """
    Mark command as failed with optional error message (max 500 chars).

    Side effects:
    - If the failed command is associated with a **running** cleaning session, the session
      will be marked `ERROR` and `ended_at` will be set.
    - An `event_log` entry will be inserted (best-effort event_code derived from message).

    - **error_message**: Optional error description (defaults to empty string)
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Mark the command as FAILED (only if it was CLAIMED)
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

            # If the command references a session, and that session is currently RUNNING,
            # mark the session as ERROR and set ended_at. Also insert an event_log row so
            # the UI / audit trail shows what happened.
            session_id = cmd.get("session_id")
            if session_id is not None:
                # Only transition RUNNING -> ERROR (do not override PAUSED/FINISHED/ERROR)
                cur.execute(
                    """
                    SELECT status FROM cleaning_session WHERE id = %s
                    """,
                    (session_id,),
                )
                sess = cur.fetchone()
                if sess and sess.get("status") == 'RUNNING':
                    # derive an event code from the error message (simple heuristics)
                    em = (body.error_message or "").lower()
                    if 'jam' in em:
                        code = 'JAM'
                    elif 'foreign' in em or 'object' in em:
                        code = 'FOREIGN_OBJECT'
                    elif 'emergency' in em or 'stop' in em:
                        code = 'EMERGENCY_STOP'
                    else:
                        code = 'SENSOR_FAIL'

                    # Update session to ERROR and set ended_at
                    cur.execute(
                        """
                        UPDATE cleaning_session
                        SET status = 'ERROR', ended_at = NOW()
                        WHERE id = %s
                        """,
                        (session_id,),
                    )

                    # Insert an event_log entry for visibility
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
