"""Chart API endpoints for the Ball Cleaner dashboard."""
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response
from charts import (
    create_expected_vs_counted_chart,
    create_balls_over_time_chart,
    create_low_pressure_chart
)

router = APIRouter(prefix="/api/charts", tags=["charts"])


@router.get("/expected-vs-counted")
def get_expected_vs_counted_chart():
    """
    Get Expected vs Counted bar chart for the latest session.
    Returns Plotly chart as JSON.
    """
    try:
        chart_json = create_expected_vs_counted_chart()
        return Response(content=chart_json, media_type="application/json")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate chart: {str(e)}"
        )


@router.get("/balls-over-time")
def get_balls_over_time_chart(days: int = Query(default=7, ge=1, le=30)):
    """
    Get Balls Over Time line chart (stacked area).
    
    Query params:
    - days: Number of days to show (default: 7, max: 30)
    
    Returns Plotly chart as JSON.
    """
    try:
        chart_json = create_balls_over_time_chart(days=days)
        return Response(content=chart_json, media_type="application/json")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate chart: {str(e)}"
        )


@router.get("/low-pressure")
def get_low_pressure_chart(days: int = Query(default=7, ge=1, le=30)):
    """
    Get Low Pressure bar chart showing soft ball events per type.
    
    Query params:
    - days: Number of days to analyze (default: 7, max: 30)
    
    Returns Plotly chart as JSON.
    """
    try:
        chart_json = create_low_pressure_chart(days=days)
        return Response(content=chart_json, media_type="application/json")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate chart: {str(e)}"
        )
