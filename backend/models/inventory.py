from pydantic import BaseModel, Field


class InventoryUpdateReq(BaseModel):
    expected_count: int = Field(ge=0)
