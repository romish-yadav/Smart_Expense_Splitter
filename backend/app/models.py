import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    Table,
    Text,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship
import enum
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class SplitMode(str, enum.Enum):
    EQUAL = "equal"
    EQUAL_SUBSET = "equal_subset"
    CUSTOM = "custom"
    WEIGHT = "weight"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    memberships = relationship("GroupMember", back_populates="user")
    paid_expenses = relationship("Expense", back_populates="payer")
    expense_shares = relationship("ExpenseShare", back_populates="user")


class Group(Base):
    __tablename__ = "groups"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="group", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(String, primary_key=True, default=generate_uuid)
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=generate_uuid)
    group_id = Column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    payer_id = Column(String, ForeignKey("users.id"), nullable=False)
    amount_paise = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    description = Column(String(500), nullable=False)
    split_mode = Column(SAEnum(SplitMode), nullable=False)
    date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    group = relationship("Group", back_populates="expenses")
    payer = relationship("User", back_populates="paid_expenses")
    shares = relationship("ExpenseShare", back_populates="expense", cascade="all, delete-orphan")


class ExpenseShare(Base):
    __tablename__ = "expense_shares"

    id = Column(String, primary_key=True, default=generate_uuid)
    expense_id = Column(String, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    share_amount_paise = Column(Integer, nullable=False)

    expense = relationship("Expense", back_populates="shares")
    user = relationship("User", back_populates="expense_shares")
