from pydantic import BaseModel, Field
from .enums import CommandType


class CommandCreateReq(BaseModel):
    type: CommandType
    session_id: int | None = None


class CommandFailedReq(BaseModel):
    error_message: str = Field(default="", max_length=500)
