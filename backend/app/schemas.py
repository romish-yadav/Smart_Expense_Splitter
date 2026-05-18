from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models import SplitMode


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    member_ids: list[str] = Field(..., min_length=1)


class GroupMemberResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class GroupResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: datetime
    members: list[GroupMemberResponse]

    model_config = {"from_attributes": True}


class ShareInput(BaseModel):
    user_id: str
    amount_paise: Optional[int] = None
    weight: Optional[float] = None


class ExpenseCreate(BaseModel):
    payer_id: str
    amount_paise: int = Field(..., gt=0, description="Amount in paise (integer)")
    currency: str = Field(default="INR", max_length=3)
    description: str = Field(..., min_length=1, max_length=500)
    split_mode: SplitMode
    date: Optional[datetime] = None
    shares: list[ShareInput] = Field(..., min_length=1)

    @field_validator("amount_paise")
    @classmethod
    def amount_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class ExpenseShareResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    share_amount_paise: int

    model_config = {"from_attributes": True}


class ExpenseResponse(BaseModel):
    id: str
    group_id: str
    payer_id: str
    payer_name: str
    amount_paise: int
    currency: str
    description: str
    split_mode: SplitMode
    date: datetime
    created_at: datetime
    shares: list[ExpenseShareResponse]

    model_config = {"from_attributes": True}


class BalanceEntry(BaseModel):
    from_user_id: str
    from_user_name: str
    to_user_id: str
    to_user_name: str
    amount_paise: int


class SettleUpResponse(BaseModel):
    balances: list[BalanceEntry]
    total_transactions: int


class NLExpenseRequest(BaseModel):
    text: str = Field(..., min_length=1)
    group_id: str


class BillParseRequest(BaseModel):
    bill_text: str = Field(..., min_length=1)
    group_id: str


class ParsedLineItem(BaseModel):
    description: str
    amount_paise: int
    assigned_to: list[str] = []


class BillParseResponse(BaseModel):
    line_items: list[ParsedLineItem]
    total_paise: int
    raw_text: str
    confidence: float = Field(ge=0.0, le=1.0)


class NLExpenseResponse(BaseModel):
    payer_id: Optional[str] = None
    payer_name: str
    amount_paise: int
    description: str
    split_mode: SplitMode
    shares: list[ShareInput]
    confidence: float = Field(ge=0.0, le=1.0)
    raw_text: str
