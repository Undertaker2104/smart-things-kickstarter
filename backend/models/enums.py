from typing import Literal

SessionStatus = Literal["RUNNING", "PAUSED", "FINISHED", "ERROR"]
LogLevel = Literal["INFO", "WARN", "ERROR"]
EventCode = Literal["EMERGENCY_STOP", "FOREIGN_OBJECT", "JAM", "SENSOR_FAIL"]
CommandType = Literal["START_CLEANING", "STOP_CLEANING", "RESET_ERROR"]
CommandStatus = Literal["PENDING", "CLAIMED", "FAILED"]
