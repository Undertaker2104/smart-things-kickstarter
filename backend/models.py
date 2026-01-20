"""Pydantic models and type definitions."""
from typing import Optional, Literal, Any, Dict
from pydantic import BaseModel, Field

# Enums matching init.sql
SessionStatus = Literal["RUNNING", "OK", "STOPPED", "EMERGENCY", "ERROR"]
LogLevel = Literal["INFO", "WARN", "ERROR"]
EventCode = Literal["EMERGENCY_STOP", "FOREIGN_OBJECT", "JAM", "SENSOR_FAIL", "LOW_PRESSURE"]
CommandType = Literal["START_CLEANING", "STOP_CLEANING", "RESET_ERROR"]
CommandStatus = Literal["PENDING", "CLAIMED", "FAILED", "SUCCESS"]


class CommandCreateReq(BaseModel):
    type: CommandType


class StartSessionReq(BaseModel):
    startedAt: Optional[str] = None  # ISO8601


class StopSessionReq(BaseModel):
    status: SessionStatus
    endedAt: Optional[str] = None  # ISO8601


class ItemUpsertReq(BaseModel):
    ballTypeId: int
    count: int = Field(ge=0)


class EventCreateReq(BaseModel):
    level: LogLevel
    code: EventCode
    details: str = ""
    timestamp: Optional[str] = None  # ISO8601
