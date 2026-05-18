# Architecture — Smart Expense Splitter

## Tech Stack Decision

### Backend: Python + FastAPI
**Why Python over Node.js for this problem:**
- **AI integration**: Python has first-class support for the Google Generative AI SDK, making LLM integration seamless. The structured output parsing, JSON validation, and error handling patterns are more natural in Python.
- **FastAPI advantages**: Auto-generated OpenAPI docs, Pydantic validation (server-side validation for free), async support, and type hints throughout.
- **Rapid prototyping**: For a 5-hour build, Python + FastAPI is faster to stand up a validated REST API than Express (which needs manual validation middleware).

**Trade-off acknowledged**: Node.js would give a single-language stack (JS everywhere), which has deployment and team-familiarity benefits. For a production app with a larger team, this would matter more.

### Frontend: React + Vite + TypeScript + Tailwind CSS
- **React**: Industry standard, huge ecosystem, well-suited for the component-based UI needed here.
- **Vite**: Fast dev server with HMR, quick builds.
- **TypeScript**: Type safety across the frontend, especially important for the expense/money types.
- **Tailwind CSS**: Utility-first CSS for rapid mobile-first responsive design without writing custom CSS.

### Database: SQLite + SQLAlchemy ORM
- **SQLite**: Zero-config, file-based, perfect for a demo/MVP. No external DB process needed.
- **SQLAlchemy**: Mature ORM with proper relationship management, easy migration to PostgreSQL/MySQL in production.
- **Production path**: Swap `DATABASE_URL` to PostgreSQL connection string — no code changes needed.

### AI: Google Gemini 2.5 Flash
- **Why Gemini 2.5 Flash**: Fast, free tier available, excellent at structured output extraction. For parsing natural language into JSON schemas, it's reliable.
- **Structured output approach**: Prompts define exact JSON schemas. Uses `response_mime_type="application/json"` for guaranteed valid JSON output. `max_output_tokens=8192` prevents truncation.
- **Graceful degradation**: If API is down or confidence is low, users fall back to manual entry with clear messaging.

---

## Database Schema

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    users     │     │  group_members   │     │    groups     │
├──────────────┤     ├──────────────────┤     ├──────────────┤
│ id (PK)      │◄────│ user_id (FK)     │────►│ id (PK)      │
│ name         │     │ group_id (FK)    │     │ name         │
│ email        │     │ id (PK)          │     │ description  │
│ created_at   │     │ joined_at        │     │ created_at   │
└──────┬───────┘     └──────────────────┘     └──────┬───────┘
       │                                             │
       │         ┌──────────────────┐                │
       │         │    expenses      │                │
       │         ├──────────────────┤                │
       ├────────►│ payer_id (FK)    │◄───────────────┤
       │         │ group_id (FK)    │
       │         │ id (PK)          │
       │         │ amount_paise     │  ← Integer, never float
       │         │ currency         │
       │         │ description      │
       │         │ split_mode       │  ← enum: equal|equal_subset|custom|weight
       │         │ date             │
       │         │ created_at       │
       │         └──────┬───────────┘
       │                │
       │         ┌──────────────────┐
       │         │ expense_shares   │
       │         ├──────────────────┤
       └────────►│ user_id (FK)     │
                 │ expense_id (FK)  │
                 │ id (PK)          │
                 │ share_amount_paise│ ← Integer, never float
                 └──────────────────┘
```

### Key Design Decisions:
- **Money as integers (paise)**: 1 INR = 100 paise. All money fields stored as `INTEGER` type. This avoids floating-point precision errors entirely. Frontend converts for display (`paise / 100`).
- **Split mode enum**: `equal` (all members), `equal_subset` (selected members), `custom` (explicit amounts per person), `weight` (ratio-based split).
- **Shares always sum to total**: Server-side validation rejects any expense where `SUM(share_amount_paise) != amount_paise`.
- **Equal split remainder handling**: When amount doesn't divide evenly, extra paise distributed one-per-person from first to last. E.g., ₹100.01 split 3 ways = 3334, 3334, 3333 paise.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/` | List all users |
| POST | `/api/users/` | Create a user |
| GET | `/api/users/{id}` | Get user by ID |
| GET | `/api/groups/` | List all groups with members |
| POST | `/api/groups/` | Create group with member IDs |
| GET | `/api/groups/{id}` | Get group with members |
| POST | `/api/groups/{id}/members/{uid}` | Add member to group |
| DELETE | `/api/groups/{id}` | Delete group (cascades) |
| GET | `/api/groups/{id}/expenses/` | List expenses (filterable) |
| POST | `/api/groups/{id}/expenses/` | Create expense with splits |
| GET | `/api/groups/{id}/expenses/balances` | Get settle-up transactions |
| POST | `/api/ai/parse-expense` | NL expense parsing |
| POST | `/api/ai/parse-bill` | Bill text parsing |

### Filters on GET expenses:
- `?payer_id=` — filter by who paid
- `?date_from=` / `?date_to=` — date range
- `?search=` — text search on description

---

## Settle-Up Algorithm

**Approach: Greedy on Net Balances**

1. **Compute net balance** for each user across all group expenses:
   - For each expense, the payer is owed their share by each other participant
   - `net_balance[user] = total_owed_to_them - total_they_owe`

2. **Separate into creditors** (positive balance) and **debtors** (negative balance)

3. **Sort** creditors descending, debtors descending by absolute value

4. **Greedy matching**: Match largest creditor with largest debtor, settle the minimum of the two amounts. Repeat until all balances are zero.

**Complexity**: O(n log n) for sorting, O(n) for settlement where n = number of users with non-zero balances.

**Optimality**: This greedy approach produces at most N-1 transactions where N is the number of people with non-zero balances. For most practical cases (small groups), this is optimal. The truly optimal solution (minimum transactions) is NP-hard in the general case, but the greedy approach is sufficient for groups of 5-8 people.

**Example**:
- Aman owes ₹500, Priya is owed ₹300, Rahul is owed ₹200
- Transaction 1: Aman → Priya ₹300
- Transaction 2: Aman → Rahul ₹200
- Result: 2 transactions instead of potentially many more

---

## Component Structure (Frontend)

```
src/
├── api/
│   └── client.ts          # Axios API client with typed methods
├── components/
│   ├── Layout.tsx          # App shell with nav bar
│   └── UserSwitcher.tsx    # User context + dropdown switcher
├── pages/
│   ├── GroupsPage.tsx      # Group list + create modal
│   ├── GroupDetailPage.tsx  # Expenses list, balances, settle-up
│   ├── AddExpensePage.tsx   # Manual expense form (all split modes)
│   ├── AIExpensePage.tsx    # NL expense parsing UI
│   ├── ParseBillPage.tsx   # Bill text parsing + item assignment
│   └── UsersPage.tsx       # User list + create form
├── types/
│   └── index.ts            # TypeScript interfaces
└── App.tsx                 # Router setup
```

---

## AI Feature: Failure Handling

### Natural Language Expense Parsing
1. User types free-text → sent to Gemini with group member context
2. Response parsed as JSON with defined schema
3. **Confidence scoring**: AI returns 0.0–1.0 confidence
   - `>= 0.8`: Show parsed result with green badge
   - `0.5–0.8`: Show with yellow warning badge
   - `0.3–0.5`: Show with red badge + "review carefully" warning
   - `< 0.3`: Reject entirely, show error + link to manual entry
4. **API failure**: Catch all exceptions, show user-friendly error with manual entry fallback
5. **No silent saves**: Parsed result is always shown for review. User must click "Confirm & Edit" which redirects to the manual form pre-filled with parsed values.

### Bill Text Parsing
1. User pastes raw bill text → sent to Gemini
2. Returns line items with amounts
3. User assigns each item to group members via toggle buttons
4. Custom split amounts computed from assignments
5. Same confidence scoring and failure handling as NL parsing

---

## What I'd Improve With More Time

1. **Real authentication**: JWT-based auth with proper login/signup instead of user-switcher
2. **WebSocket real-time updates**: Push balance changes to all group members instantly
3. **Image-based bill parsing**: Use GPT-4o vision to OCR photos of bills
4. **Multi-currency support**: Store currency per expense, convert using live exchange rates
5. **Recurring expenses**: Cron-based automatic monthly expense creation for rent/subscriptions
6. **Export**: CSV/PDF export of group ledger
7. **Activity feed**: Timeline of who did what when
8. **Dark mode**: CSS variable-based theming with system preference detection
9. **Offline support**: Service worker + IndexedDB for offline expense entry
10. **PostgreSQL migration**: Move from SQLite to PostgreSQL for production scale
11. **Rate limiting**: Protect AI endpoints from abuse
12. **Comprehensive test suite**: Unit tests for settle-up algorithm, integration tests for API
