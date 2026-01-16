"""Command endpoints for dashboard to ESP communication."""
from fastapi import APIRouter, HTTPException
from psycopg.types.json import Jsonb

from config import DEFAULT_DEVICE_ID
from database import get_db_connection
from models import CommandCreateReq, CommandAckReq

router = APIRouter(prefix="/api/commands", tags=["commands"])


@router.post("")
def create_command(body: CommandCreateReq):
    """Create a new command for the device."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO command (type, payload, device_id)
                VALUES (%s, %s, %s)
                RETURNING id, created_at, type, payload, device_id
                """,
                (body.type, Jsonb(body.payload), body.deviceId),
            )
            cmd = cur.fetchone()
        conn.commit()
    return cmd


@router.get("/next")
def get_next_command(deviceId: str = DEFAULT_DEVICE_ID):
    """
    ESP polls this endpoint to get the next command.
    Claims the oldest unacknowledged command for this device atomically.
    Returns {id: null} if no commands available.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH next_cmd AS (
                  SELECT id
                  FROM command
                  WHERE device_id = %s
                    AND acked_at IS NULL
                    AND claimed_at IS NULL
                  ORDER BY created_at ASC
                  LIMIT 1
                  FOR UPDATE SKIP LOCKED
                )
                UPDATE command c
                SET claimed_at = NOW()
                FROM next_cmd
                WHERE c.id = next_cmd.id
                RETURNING c.id, c.created_at, c.type, c.payload, c.device_id;
                """,
                (deviceId,),
            )
            cmd = cur.fetchone()
        conn.commit()

    if not cmd:
        return {"id": None}
    return cmd


@router.post("/{command_id}/ack")
def ack_command(command_id: int, body: CommandAckReq):
    """Acknowledge that a command has been processed by the device."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE command
                SET acked_at = NOW()
                WHERE id = %s AND device_id = %s
                """,
                (command_id, body.deviceId),
            )
            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Command not found for device"
                )
        conn.commit()
    return {"ok": True}
