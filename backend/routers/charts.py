from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import Response
from charts import (
    create_expected_vs_counted_chart,
    create_balls_over_time_chart
)

router = APIRouter(prefix="/api/charts", tags=["charts"])


@router.get("/expected-vs-counted")
def get_expected_vs_counted_chart():
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
    try:
        chart_json = create_balls_over_time_chart(days=days)
        return Response(content=chart_json, media_type="application/json")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate chart: {str(e)}"
        )
