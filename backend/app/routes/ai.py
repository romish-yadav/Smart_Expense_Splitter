from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Group, GroupMember, SplitMode
from app.schemas import (
    NLExpenseRequest,
    NLExpenseResponse,
    BillParseRequest,
    BillParseResponse,
    ParsedLineItem,
    ShareInput,
)
from app.services.ai_parser import parse_nl_expense, parse_bill_text

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/parse-expense", response_model=NLExpenseResponse)
def parse_expense_nl(request: NLExpenseRequest, db: Session = Depends(get_db)):
    group = (
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user))
        .filter(Group.id == request.group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = [
        {"id": m.user_id, "name": m.user.name, "email": m.user.email}
        for m in group.members
    ]

    result = parse_nl_expense(request.text, members)
    if not result:
        raise HTTPException(
            status_code=422,
            detail="Could not parse the expense description. Please try rephrasing or use manual entry.",
        )

    confidence = result.get("confidence", 0.0)
    if confidence < 0.3:
        raise HTTPException(
            status_code=422,
            detail="Low confidence in parsing. Please use manual entry instead.",
        )

    payer = result.get("payer")
    payer_id = payer["id"] if payer else None
    payer_name = result.get("payer_name", "Unknown")
    amount_paise = result.get("amount_paise", 0)
    description = result.get("description", "")
    split_mode_str = result.get("split_mode", "equal")

    try:
        split_mode = SplitMode(split_mode_str)
    except ValueError:
        split_mode = SplitMode.EQUAL

    member_map = {m["name"].lower(): m for m in members}
    split_members = result.get("split_members", [])
    custom_amounts = result.get("custom_amounts", {})

    shares: list[ShareInput] = []

    if split_mode == SplitMode.CUSTOM and custom_amounts:
        for name, amt in custom_amounts.items():
            m = member_map.get(name.lower())
            if m:
                shares.append(ShareInput(user_id=m["id"], amount_paise=int(amt)))
    elif split_members:
        for name in split_members:
            m = member_map.get(name.lower())
            if m:
                shares.append(ShareInput(user_id=m["id"]))
    else:
        for m in members:
            shares.append(ShareInput(user_id=m["id"]))

    if not shares:
        for m in members:
            shares.append(ShareInput(user_id=m["id"]))
        split_mode = SplitMode.EQUAL

    return NLExpenseResponse(
        payer_id=payer_id,
        payer_name=payer_name,
        amount_paise=amount_paise,
        description=description,
        split_mode=split_mode,
        shares=shares,
        confidence=confidence,
        raw_text=request.text,
    )


@router.post("/parse-bill", response_model=BillParseResponse)
def parse_bill(request: BillParseRequest, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == request.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    result = parse_bill_text(request.bill_text)
    if not result:
        raise HTTPException(
            status_code=422,
            detail="Could not parse the bill. Please enter items manually.",
        )

    confidence = result.get("confidence", 0.0)
    if confidence < 0.3:
        raise HTTPException(
            status_code=422,
            detail="Low confidence in bill parsing. Please enter items manually.",
        )

    line_items = [
        ParsedLineItem(
            description=item.get("description", "Item"),
            amount_paise=item.get("amount_paise", 0),
        )
        for item in result.get("line_items", [])
    ]

    return BillParseResponse(
        line_items=line_items,
        total_paise=result.get("total_paise", 0),
        raw_text=request.bill_text,
        confidence=confidence,
    )
