"""Inventory endpoints for managing expected ball counts."""
from fastapi import APIRouter, HTTPException
from database import get_db_connection
from models import InventoryUpdateReq

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("")
def get_inventory():
    """
    Get expected inventory counts for all ball types.
    Returns list of ball types with their expected counts.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    bt.id as ball_type_id,
                    bt.name as ball_type_name,
                    COALESCE(ie.expected_count, 0) as expected_count,
                    ie.updated_at
                FROM ball_type bt
                LEFT JOIN inventory_expected ie ON bt.id = ie.ball_type_id
                ORDER BY bt.id
            """)
            results = cur.fetchall()
    return results


@router.put("/{ball_type_id}")
def update_inventory(ball_type_id: int, body: InventoryUpdateReq):
    """
    Update expected count for a specific ball type.
    Creates or updates the inventory_expected record.
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Check if ball_type exists
            cur.execute("SELECT id FROM ball_type WHERE id = %s", (ball_type_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Ball type not found")
            
            # Upsert inventory_expected
            cur.execute("""
                INSERT INTO inventory_expected (ball_type_id, expected_count, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (ball_type_id) 
                DO UPDATE SET 
                    expected_count = EXCLUDED.expected_count,
                    updated_at = NOW()
                RETURNING ball_type_id, expected_count, updated_at
            """, (ball_type_id, body.expected_count))
            result = cur.fetchone()
        conn.commit()
    
    return result
