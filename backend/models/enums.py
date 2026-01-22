"""Enum type definitions matching database schema."""
from typing import Literal

# Enums matching init.sql
SessionStatus = Literal["RUNNING", "OK", "STOPPED", "EMERGENCY", "ERROR"]
LogLevel = Literal["INFO", "WARN", "ERROR"]
EventCode = Literal["EMERGENCY_STOP", "FOREIGN_OBJECT", "JAM", "SENSOR_FAIL"]
CommandType = Literal["START_CLEANING", "STOP_CLEANING", "RESET_ERROR"]
CommandStatus = Literal["PENDING", "CLAIMED", "FAILED", "SUCCESS"]
