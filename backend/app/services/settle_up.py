"""
Settle-up algorithm: Minimize the number of transactions to settle all debts.

Approach: Greedy algorithm on net balances.
1. Compute net balance for each user (total owed to them - total they owe).
2. Separate into creditors (positive balance) and debtors (negative balance).
3. Sort creditors descending and debtors ascending (by absolute value).
4. Match largest creditor with largest debtor, settle the minimum of the two.
5. Repeat until all balances are zero.

This greedy approach produces optimal or near-optimal results for most cases.
For the general case, it produces at most N-1 transactions where N is the
number of people with non-zero balances.
"""

from collections import defaultdict


def compute_net_balances(
    expenses: list[dict],
) -> dict[str, int]:
    """
    Compute net balance for each user from a list of expenses.
    Each expense has: payer_id, shares: [{user_id, share_amount_paise}]
    Positive balance = owed money (creditor), Negative = owes money (debtor).
    """
    balances: dict[str, int] = defaultdict(int)

    for expense in expenses:
        payer_id = expense["payer_id"]
        for share in expense["shares"]:
            user_id = share["user_id"]
            amount = share["share_amount_paise"]
            if user_id != payer_id:
                balances[payer_id] += amount
                balances[user_id] -= amount

    return dict(balances)


def minimize_transactions(
    net_balances: dict[str, int],
) -> list[dict]:
    """
    Given net balances, compute minimum transactions to settle all debts.
    Returns list of {from_user_id, to_user_id, amount_paise}.
    """
    creditors: list[tuple[str, int]] = []
    debtors: list[tuple[str, int]] = []

    for user_id, balance in net_balances.items():
        if balance > 0:
            creditors.append((user_id, balance))
        elif balance < 0:
            debtors.append((user_id, -balance))

    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)

    transactions: list[dict] = []
    ci = 0
    di = 0

    while ci < len(creditors) and di < len(debtors):
        creditor_id, credit = creditors[ci]
        debtor_id, debt = debtors[di]

        settle_amount = min(credit, debt)
        transactions.append(
            {
                "from_user_id": debtor_id,
                "to_user_id": creditor_id,
                "amount_paise": settle_amount,
            }
        )

        credit -= settle_amount
        debt -= settle_amount

        if credit == 0:
            ci += 1
        else:
            creditors[ci] = (creditor_id, credit)

        if debt == 0:
            di += 1
        else:
            debtors[di] = (debtor_id, debt)

    return transactions
