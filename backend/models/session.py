from typing import Optional
from pydantic import BaseModel, Field
from .enums import SessionStatus


class StartSessionReq(BaseModel):
    startedAt: Optional[str] = Field(None, description="ISO8601 timestamp", examples=["2026-01-22T12:00:00"])


class StopSessionReq(BaseModel):
    status: SessionStatus
    endedAt: Optional[str] = Field(None, description="ISO8601 timestamp", examples=["2026-01-22T12:30:00"])


class ItemUpsertReq(BaseModel):
    ballTypeId: int
    count: int = Field(ge=0)
