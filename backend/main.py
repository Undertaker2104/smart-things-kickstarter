"""Ball Cleaner API - Main application entry point."""
from fastapi import FastAPI

from routers import commands, sessions, state

app = FastAPI(
    title="Ball Cleaner API",
    description="Ball Cleaner API - Main application entry point.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)


# Include routers
app.include_router(commands.router)
app.include_router(sessions.router)
app.include_router(state.router)


@app.get("/")
def read_root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "Ball Cleaner API",
        "version": "1.0.0"
    }
