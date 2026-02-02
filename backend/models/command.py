"""Command-related Pydantic models."""
from pydantic import BaseModel, Field
from .enums import CommandType


class CommandCreateReq(BaseModel):
    """
    Request model for creating a new command.

    - **type**: The type of command to execute
    - **session_id**: Optional ID of the cleaning session this command relates to
    """
    type: CommandType
    session_id: int | None = None


class CommandFailedReq(BaseModel):
    """
    Request model for marking a command as failed.

    - **error_message**: Optional description of the failure (max 500 characters)
    """
    error_message: str = Field(default="", max_length=500)
