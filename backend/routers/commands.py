"""Command endpoints for dashboard to ESP communication."""
from fastapi import APIRouter, HTTPException

from database import get_db_connection
from models import CommandCreateReq

router = APIRouter(prefix="/api/commands", tags=["commands"])


@router.post("")
def create_command(body: CommandCreateReq):
    """Create a new command for the device."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO command (type, command_status)
                VALUES (%s, 'PENDING')
                RETURNING id, created_at, type, command_status
                """,
                (body.type,),
            )
            cmd = cur.fetchone()
        conn.commit()
    return cmd


@router.get("/next")
def get_next_command():
    """
    ESP polls this endpoint to get the next command.
    Claims the oldest pending command atomically.
    Returns {id: null} if no commands available.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH next_cmd AS (
                  SELECT id
                  FROM command
                  WHERE command_status = 'PENDING'
                  ORDER BY created_at ASC
                  LIMIT 1
                  FOR UPDATE SKIP LOCKED
                )
                UPDATE command c
                SET command_status = 'CLAIMED'
                FROM next_cmd
                WHERE c.id = next_cmd.id
                RETURNING c.id, c.created_at, c.type, c.command_status;
                """
            )
            cmd = cur.fetchone()
        conn.commit()

    if not cmd:
        return {"id": None}
    return cmd


@router.post("/{command_id}/success")
def mark_command_success(command_id: int):
    """Mark command as successfully executed (sets acked_at)."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE command
                SET command_status = 'SUCCESS', acked_at = NOW()
                WHERE id = %s AND command_status = 'CLAIMED'
                RETURNING id, type, command_status, acked_at
                """,
                (command_id,),
            )
            cmd = cur.fetchone()
            if not cmd:
                raise HTTPException(
                    status_code=404,
                    detail="Command not found or not in CLAIMED state"
                )
        conn.commit()
    return cmd


@router.post("/{command_id}/failed")
def mark_command_failed(command_id: int, error_message: str = ""):
    """Mark command as failed with optional error message."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE command
                SET command_status = 'FAILED', error_message = %s
                WHERE id = %s AND command_status = 'CLAIMED'
                RETURNING id, type, command_status, error_message
                """,
                (error_message, command_id),
            )
            cmd = cur.fetchone()
            if not cmd:
                raise HTTPException(
                    status_code=404,
                    detail="Command not found or not in CLAIMED state"
                )
        conn.commit()
    return cmd
