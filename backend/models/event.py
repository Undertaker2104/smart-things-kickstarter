from typing import Optional
from pydantic import BaseModel, Field
from .enums import LogLevel, EventCode


class EventCreateReq(BaseModel):
    level: LogLevel
    code: EventCode
    details: str = ""
    timestamp: Optional[str] = Field(None, description="ISO8601 timestamp", examples=["2026-01-22T12:00:00"])
