from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Expense, ExpenseShare, Group, GroupMember, User, SplitMode
from app.schemas import (
    ExpenseCreate,
    ExpenseResponse,
    ExpenseShareResponse,
    SettleUpResponse,
    BalanceEntry,
)
from app.services.settle_up import compute_net_balances, minimize_transactions

router = APIRouter(prefix="/api/groups/{group_id}/expenses", tags=["expenses"])


def _expense_to_response(expense: Expense) -> ExpenseResponse:
    shares = [
        ExpenseShareResponse(
            id=s.id,
            user_id=s.user_id,
            user_name=s.user.name,
            share_amount_paise=s.share_amount_paise,
        )
        for s in expense.shares
    ]
    return ExpenseResponse(
        id=expense.id,
        group_id=expense.group_id,
        payer_id=expense.payer_id,
        payer_name=expense.payer.name,
        amount_paise=expense.amount_paise,
        currency=expense.currency,
        description=expense.description,
        split_mode=expense.split_mode,
        date=expense.date,
        created_at=expense.created_at,
        shares=shares,
    )


def _validate_group_membership(
    db: Session, group_id: str, user_ids: list[str]
) -> None:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    member_ids = {
        m.user_id
        for m in db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    }
    invalid = set(user_ids) - member_ids
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Users not in group: {', '.join(invalid)}",
        )


def _compute_shares(
    expense_data: ExpenseCreate, member_count: int
) -> list[dict]:
    """Compute share amounts based on split mode. Returns list of {user_id, amount_paise}."""
    shares = expense_data.shares
    total = expense_data.amount_paise

    if expense_data.split_mode == SplitMode.EQUAL:
        per_person = total // len(shares)
        remainder = total - (per_person * len(shares))
        result = []
        for i, s in enumerate(shares):
            amount = per_person + (1 if i < remainder else 0)
            result.append({"user_id": s.user_id, "amount_paise": amount})
        return result

    elif expense_data.split_mode == SplitMode.EQUAL_SUBSET:
        per_person = total // len(shares)
        remainder = total - (per_person * len(shares))
        result = []
        for i, s in enumerate(shares):
            amount = per_person + (1 if i < remainder else 0)
            result.append({"user_id": s.user_id, "amount_paise": amount})
        return result

    elif expense_data.split_mode == SplitMode.CUSTOM:
        total_shares = sum(s.amount_paise or 0 for s in shares)
        if total_shares != total:
            raise HTTPException(
                status_code=400,
                detail=f"Custom split amounts ({total_shares}) must sum to total ({total})",
            )
        return [
            {"user_id": s.user_id, "amount_paise": s.amount_paise or 0}
            for s in shares
        ]

    elif expense_data.split_mode == SplitMode.WEIGHT:
        total_weight = sum(s.weight or 1.0 for s in shares)
        if total_weight <= 0:
            raise HTTPException(status_code=400, detail="Total weight must be positive")

        result = []
        allocated = 0
        for i, s in enumerate(shares):
            weight = s.weight or 1.0
            if i == len(shares) - 1:
                amount = total - allocated
            else:
                amount = round(total * weight / total_weight)
                allocated += amount
            result.append({"user_id": s.user_id, "amount_paise": amount})
        return result

    raise HTTPException(status_code=400, detail="Invalid split mode")


@router.post("/", response_model=ExpenseResponse, status_code=201)
def create_expense(
    group_id: str,
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
):
    all_user_ids = [s.user_id for s in expense_data.shares]
    if expense_data.payer_id not in all_user_ids:
        all_user_ids.append(expense_data.payer_id)
    _validate_group_membership(db, group_id, all_user_ids)

    member_count = (
        db.query(GroupMember).filter(GroupMember.group_id == group_id).count()
    )
    computed_shares = _compute_shares(expense_data, member_count)

    total_computed = sum(s["amount_paise"] for s in computed_shares)
    if total_computed != expense_data.amount_paise:
        raise HTTPException(
            status_code=400,
            detail=f"Shares sum ({total_computed}) does not equal total ({expense_data.amount_paise})",
        )

    expense = Expense(
        group_id=group_id,
        payer_id=expense_data.payer_id,
        amount_paise=expense_data.amount_paise,
        currency=expense_data.currency,
        description=expense_data.description,
        split_mode=expense_data.split_mode,
        date=expense_data.date or datetime.utcnow(),
    )
    db.add(expense)
    db.flush()

    for share_data in computed_shares:
        share = ExpenseShare(
            expense_id=expense.id,
            user_id=share_data["user_id"],
            share_amount_paise=share_data["amount_paise"],
        )
        db.add(share)

    db.commit()
    db.refresh(expense)

    expense = (
        db.query(Expense)
        .options(
            joinedload(Expense.shares).joinedload(ExpenseShare.user),
            joinedload(Expense.payer),
        )
        .filter(Expense.id == expense.id)
        .first()
    )
    return _expense_to_response(expense)


@router.get("/", response_model=list[ExpenseResponse])
def list_expenses(
    group_id: str,
    payer_id: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    query = (
        db.query(Expense)
        .options(
            joinedload(Expense.shares).joinedload(ExpenseShare.user),
            joinedload(Expense.payer),
        )
        .filter(Expense.group_id == group_id)
    )

    if payer_id:
        query = query.filter(Expense.payer_id == payer_id)
    if date_from:
        query = query.filter(Expense.date >= date_from)
    if date_to:
        query = query.filter(Expense.date <= date_to)
    if search:
        query = query.filter(Expense.description.ilike(f"%{search}%"))

    expenses = query.order_by(Expense.date.desc()).all()
    seen = set()
    unique = []
    for e in expenses:
        if e.id not in seen:
            seen.add(e.id)
            unique.append(e)
    return [_expense_to_response(e) for e in unique]


@router.get("/balances", response_model=SettleUpResponse)
def get_balances(group_id: str, db: Session = Depends(get_db)):
    group = (
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user))
        .filter(Group.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    expenses = (
        db.query(Expense)
        .options(joinedload(Expense.shares))
        .filter(Expense.group_id == group_id)
        .all()
    )

    seen = set()
    unique_expenses = []
    for e in expenses:
        if e.id not in seen:
            seen.add(e.id)
            unique_expenses.append(e)

    expense_dicts = [
        {
            "payer_id": e.payer_id,
            "shares": [
                {"user_id": s.user_id, "share_amount_paise": s.share_amount_paise}
                for s in e.shares
            ],
        }
        for e in unique_expenses
    ]

    net_balances = compute_net_balances(expense_dicts)
    transactions = minimize_transactions(net_balances)

    user_map = {}
    for member in group.members:
        user_map[member.user_id] = member.user.name

    balances = [
        BalanceEntry(
            from_user_id=t["from_user_id"],
            from_user_name=user_map.get(t["from_user_id"], "Unknown"),
            to_user_id=t["to_user_id"],
            to_user_name=user_map.get(t["to_user_id"], "Unknown"),
            amount_paise=t["amount_paise"],
        )
        for t in transactions
    ]

    return SettleUpResponse(
        balances=balances,
        total_transactions=len(balances),
    )
