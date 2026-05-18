from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Group, GroupMember, User
from app.schemas import GroupCreate, GroupResponse, GroupMemberResponse

router = APIRouter(prefix="/api/groups", tags=["groups"])


def _group_to_response(group: Group) -> GroupResponse:
    members = [
        GroupMemberResponse(
            id=m.id,
            user_id=m.user_id,
            user_name=m.user.name,
            user_email=m.user.email,
            joined_at=m.joined_at,
        )
        for m in group.members
    ]
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        members=members,
    )


@router.post("/", response_model=GroupResponse, status_code=201)
def create_group(group_data: GroupCreate, db: Session = Depends(get_db)):
    users = db.query(User).filter(User.id.in_(group_data.member_ids)).all()
    found_ids = {u.id for u in users}
    missing = set(group_data.member_ids) - found_ids
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Users not found: {', '.join(missing)}",
        )

    group = Group(name=group_data.name, description=group_data.description)
    db.add(group)
    db.flush()

    for user_id in group_data.member_ids:
        member = GroupMember(group_id=group.id, user_id=user_id)
        db.add(member)

    db.commit()
    db.refresh(group)
    return _group_to_response(group)


@router.get("/", response_model=list[GroupResponse])
def list_groups(db: Session = Depends(get_db)):
    groups = (
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user))
        .order_by(Group.created_at.desc())
        .all()
    )
    seen = set()
    unique_groups = []
    for g in groups:
        if g.id not in seen:
            seen.add(g.id)
            unique_groups.append(g)
    return [_group_to_response(g) for g in unique_groups]


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(group_id: str, db: Session = Depends(get_db)):
    group = (
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user))
        .filter(Group.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return _group_to_response(group)


@router.post("/{group_id}/members/{user_id}", status_code=201)
def add_member(group_id: str, user_id: str, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="User already in group")

    member = GroupMember(group_id=group_id, user_id=user_id)
    db.add(member)
    db.commit()
    return {"message": "Member added"}


@router.delete("/{group_id}", status_code=204)
def delete_group(group_id: str, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(group)
    db.commit()
