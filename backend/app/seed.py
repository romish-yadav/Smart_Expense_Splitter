"""Seed the database with sample data: 8 users, 3 groups, 25 realistic expenses."""

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import User, Group, GroupMember, Expense, ExpenseShare, SplitMode


def seed_database(db: Session) -> None:
    if db.query(User).count() > 0:
        return

    users = [
        User(id="u1", name="Aman Sharma", email="aman@example.com"),
        User(id="u2", name="Priya Patel", email="priya@example.com"),
        User(id="u3", name="Rahul Verma", email="rahul@example.com"),
        User(id="u4", name="Sneha Gupta", email="sneha@example.com"),
        User(id="u5", name="Vikram Singh", email="vikram@example.com"),
        User(id="u6", name="Neha Joshi", email="neha@example.com"),
        User(id="u7", name="Arjun Reddy", email="arjun@example.com"),
        User(id="u8", name="Kavita Nair", email="kavita@example.com"),
    ]
    for u in users:
        db.add(u)
    db.flush()

    now = datetime.now(timezone.utc)

    # Group 1: Goa Trip (5 members)
    g1 = Group(id="g1", name="Goa Trip 2026", description="Annual beach trip with friends")
    db.add(g1)
    db.flush()
    for uid in ["u1", "u2", "u3", "u4", "u5"]:
        db.add(GroupMember(group_id="g1", user_id=uid))
    db.flush()

    # Group 2: Flat 4B (4 members)
    g2 = Group(id="g2", name="Flat 4B - Monthly", description="Shared flat expenses")
    db.add(g2)
    db.flush()
    for uid in ["u1", "u3", "u6", "u7"]:
        db.add(GroupMember(group_id="g2", user_id=uid))
    db.flush()

    # Group 3: Office Lunch Group (6 members)
    g3 = Group(id="g3", name="Office Lunch Crew", description="Daily lunch expenses at work")
    db.add(g3)
    db.flush()
    for uid in ["u2", "u4", "u5", "u6", "u7", "u8"]:
        db.add(GroupMember(group_id="g3", user_id=uid))
    db.flush()

    expenses_data = [
        # Goa Trip expenses (10 expenses)
        {
            "group_id": "g1", "payer_id": "u1", "amount": 1200000,
            "desc": "Flight tickets booking", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=10),
            "split_users": ["u1", "u2", "u3", "u4", "u5"],
        },
        {
            "group_id": "g1", "payer_id": "u2", "amount": 850000,
            "desc": "Hotel booking - 3 nights", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=9),
            "split_users": ["u1", "u2", "u3", "u4", "u5"],
        },
        {
            "group_id": "g1", "payer_id": "u3", "amount": 240000,
            "desc": "Dinner at Trupti Restaurant", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=8),
            "split_users": ["u1", "u2", "u3", "u4", "u5"],
        },
        {
            "group_id": "g1", "payer_id": "u1", "amount": 180000,
            "desc": "Water sports - banana boat & parasailing", "mode": SplitMode.EQUAL_SUBSET,
            "date": now - timedelta(days=7),
            "split_users": ["u1", "u2", "u3"],
        },
        {
            "group_id": "g1", "payer_id": "u4", "amount": 320000,
            "desc": "Scooter rentals for 2 days", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=7),
            "split_users": ["u1", "u2", "u3", "u4", "u5"],
        },
        {
            "group_id": "g1", "payer_id": "u5", "amount": 95000,
            "desc": "Beach shack lunch", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=6),
            "split_users": ["u1", "u2", "u3", "u4", "u5"],
        },
        {
            "group_id": "g1", "payer_id": "u2", "amount": 45000,
            "desc": "Cab from airport", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=10),
            "split_users": ["u1", "u2", "u3", "u4", "u5"],
        },
        {
            "group_id": "g1", "payer_id": "u3", "amount": 150000,
            "desc": "Sunset cruise tickets", "mode": SplitMode.EQUAL_SUBSET,
            "date": now - timedelta(days=5),
            "split_users": ["u2", "u3", "u4", "u5"],
        },
        {
            "group_id": "g1", "payer_id": "u1", "amount": 72000,
            "desc": "Souvenirs and gifts", "mode": SplitMode.CUSTOM,
            "date": now - timedelta(days=4),
            "custom": {"u1": 20000, "u2": 15000, "u3": 12000, "u4": 10000, "u5": 15000},
        },
        {
            "group_id": "g1", "payer_id": "u4", "amount": 38000,
            "desc": "Late night snacks", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=5),
            "split_users": ["u1", "u2", "u3", "u4", "u5"],
        },
        # Flat 4B expenses (8 expenses)
        {
            "group_id": "g2", "payer_id": "u1", "amount": 2500000,
            "desc": "May rent", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=15),
            "split_users": ["u1", "u3", "u6", "u7"],
        },
        {
            "group_id": "g2", "payer_id": "u6", "amount": 350000,
            "desc": "Electricity bill - May", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=12),
            "split_users": ["u1", "u3", "u6", "u7"],
        },
        {
            "group_id": "g2", "payer_id": "u3", "amount": 120000,
            "desc": "WiFi bill - May", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=11),
            "split_users": ["u1", "u3", "u6", "u7"],
        },
        {
            "group_id": "g2", "payer_id": "u7", "amount": 85000,
            "desc": "Grocery run - weekly", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=3),
            "split_users": ["u1", "u3", "u6", "u7"],
        },
        {
            "group_id": "g2", "payer_id": "u1", "amount": 45000,
            "desc": "Water purifier service", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=8),
            "split_users": ["u1", "u3", "u6", "u7"],
        },
        {
            "group_id": "g2", "payer_id": "u6", "amount": 28000,
            "desc": "Cooking gas cylinder", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=6),
            "split_users": ["u1", "u3", "u6", "u7"],
        },
        {
            "group_id": "g2", "payer_id": "u3", "amount": 65000,
            "desc": "House cleaning supplies", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=4),
            "split_users": ["u1", "u3", "u6", "u7"],
        },
        {
            "group_id": "g2", "payer_id": "u7", "amount": 150000,
            "desc": "New microwave oven", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=2),
            "split_users": ["u1", "u3", "u6", "u7"],
        },
        # Office Lunch Crew expenses (7 expenses)
        {
            "group_id": "g3", "payer_id": "u2", "amount": 186000,
            "desc": "Biryani Paradise - team lunch", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=5),
            "split_users": ["u2", "u4", "u5", "u6", "u7", "u8"],
        },
        {
            "group_id": "g3", "payer_id": "u5", "amount": 132000,
            "desc": "Pizza Hut order", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=4),
            "split_users": ["u2", "u4", "u5", "u6", "u7", "u8"],
        },
        {
            "group_id": "g3", "payer_id": "u8", "amount": 96000,
            "desc": "South Indian thali lunch", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=3),
            "split_users": ["u2", "u4", "u5", "u6", "u7", "u8"],
        },
        {
            "group_id": "g3", "payer_id": "u4", "amount": 54000,
            "desc": "Chai and samosas - evening snack", "mode": SplitMode.EQUAL_SUBSET,
            "date": now - timedelta(days=2),
            "split_users": ["u2", "u4", "u6", "u8"],
        },
        {
            "group_id": "g3", "payer_id": "u6", "amount": 210000,
            "desc": "Chinese restaurant - team dinner", "mode": SplitMode.EQUAL,
            "date": now - timedelta(days=1),
            "split_users": ["u2", "u4", "u5", "u6", "u7", "u8"],
        },
        {
            "group_id": "g3", "payer_id": "u7", "amount": 78000,
            "desc": "Subway sandwich order", "mode": SplitMode.EQUAL,
            "date": now - timedelta(hours=12),
            "split_users": ["u2", "u4", "u5", "u6", "u7", "u8"],
        },
        {
            "group_id": "g3", "payer_id": "u2", "amount": 42000,
            "desc": "Coffee from Blue Tokai", "mode": SplitMode.EQUAL_SUBSET,
            "date": now - timedelta(hours=6),
            "split_users": ["u2", "u5", "u8"],
        },
    ]

    for exp in expenses_data:
        expense = Expense(
            group_id=exp["group_id"],
            payer_id=exp["payer_id"],
            amount_paise=exp["amount"],
            currency="INR",
            description=exp["desc"],
            split_mode=exp["mode"],
            date=exp["date"],
        )
        db.add(expense)
        db.flush()

        if exp["mode"] == SplitMode.CUSTOM and "custom" in exp:
            for uid, amt in exp["custom"].items():
                db.add(ExpenseShare(
                    expense_id=expense.id,
                    user_id=uid,
                    share_amount_paise=amt,
                ))
        else:
            split_users = exp["split_users"]
            per_person = exp["amount"] // len(split_users)
            remainder = exp["amount"] - (per_person * len(split_users))
            for i, uid in enumerate(split_users):
                amt = per_person + (1 if i < remainder else 0)
                db.add(ExpenseShare(
                    expense_id=expense.id,
                    user_id=uid,
                    share_amount_paise=amt,
                ))

    db.commit()
