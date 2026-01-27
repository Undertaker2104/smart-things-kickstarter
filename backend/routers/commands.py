"""Command endpoints for dashboard to ESP communication."""
from fastapi import APIRouter, HTTPException

from database import get_db_connection
from models import CommandCreateReq, CommandFailedReq

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


@router.post("/{command_id}/claim")
def claim_command(command_id: int):
    """
    Claim a specific command by ID.
    Only allows claiming if command status is PENDING.
    Returns 409 Conflict if command is already claimed or finished.
    Returns 404 if command doesn't exist.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # First check if command exists and get its current status
            cur.execute(
                "SELECT command_status FROM command WHERE id = %s",
                (command_id,),
            )
            existing_cmd = cur.fetchone()

            if not existing_cmd:
                raise HTTPException(
                    status_code=404,
                    detail="Command not found"
                )

            if existing_cmd['command_status'] != 'PENDING':
                raise HTTPException(
                    status_code=409,
                    detail="Command already claimed or finished"
                )

            # Atomically update the command to CLAIMED
            cur.execute(
                """
                UPDATE command
                SET command_status = 'CLAIMED'
                WHERE id = %s AND command_status = 'PENDING'
                RETURNING id, created_at, type, command_status
                """,
                (command_id,),
            )
            updated_cmd = cur.fetchone()

            if not updated_cmd:
                # This should not happen if our check above was correct,
                # but it's a safety net for race conditions
                raise HTTPException(
                    status_code=409,
                    detail="Command already claimed or finished"
                )

        conn.commit()
    return updated_cmd


@router.post("/{command_id}/failed")
def mark_command_failed(command_id: int, body: CommandFailedReq):
    """Mark command as failed with optional error message (max 500 chars)."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE command
                SET command_status = 'FAILED', error_message = %s
                WHERE id = %s AND command_status = 'CLAIMED'
                RETURNING id, type, command_status, error_message
                """,
                (body.error_message, command_id),
            )
            cmd = cur.fetchone()
            if not cmd:
                raise HTTPException(
                    status_code=404,
                    detail="Command not found or not in CLAIMED state"
                )
        conn.commit()
    return cmd
