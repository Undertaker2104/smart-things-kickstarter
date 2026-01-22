"""Ball Cleaner API - Main application entry point."""
from fastapi import FastAPI

from routers import commands, sessions, state, charts, inventory

app = FastAPI(
    title="Ball Cleaner API",
    description="Ball Cleaner API - Main application entry point.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)


app.include_router(commands.router)
app.include_router(sessions.router)
app.include_router(state.router)
app.include_router(charts.router)
app.include_router(inventory.router)


@app.get("/")
def read_root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "Ball Cleaner API",
        "version": "1.0.0"
    }
