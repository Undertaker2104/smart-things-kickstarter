"""Ball Cleaner API - Main application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import commands, sessions, state, charts, inventory

app = FastAPI(
    title="Ball Cleaner API",
    description="Ball Cleaner API - Main application entry point.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS middleware configuratie
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://145.24.237.126",
        "http://145.24.237.126:80"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
