# Smart Expense Splitter

A Splitwise-style full-stack application for groups of friends, flatmates, and travel groups to track shared expenses. Features AI-powered natural language expense entry and bill parsing using Google Gemini.

## Demo Video

A 4-minute video walkthrough demonstrating all features is available — covering group creation, member management, manual expense entry, AI natural-language parsing (two different sentences), bill-text parsing, balances view, and settle-up view.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy, Pydantic |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Database** | SQLite (swappable to PostgreSQL via `DATABASE_URL`) |
| **AI** | Google Gemini 2.5 Flash (`gemini-2.5-flash`) |
| **Money Handling** | Integer paise (1 INR = 100 paise) — no floats |

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Poetry (Python package manager)
- A Google Gemini API key (for AI features) — get one free at [Google AI Studio](https://aistudio.google.com/app/apikey)

### Backend Setup

```bash
cd backend
poetry install

# Set your Gemini API key
echo "GEMINI_API_KEY=your-key-here" > .env

# Start the server
poetry run uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173` with the API at `http://localhost:8000`.

### Seed Data

The database is seeded automatically on first run with:
- **8 sample users** — Aman, Priya, Rahul, Sneha, Vikram, Neha, Arjun, Kavya
- **3 groups** — Goa Trip 2026, Flat 4B Monthly, Office Lunch Crew
- **25 realistic expenses** across the groups with various split modes

## Features

### Core Features

- **Group Management** — Create groups, add/remove members, view all groups at a glance
- **Manual Expense Entry** — Full form with 4 split modes:
  - **Equal** — Split equally among all group members
  - **Equal Subset** — Split equally among selected members only
  - **Custom** — Enter specific amounts per person (validated to sum to total)
  - **Weight-based** — Ratio-based split (e.g., 2:1:1)
- **Balance View** — Who owes whom, displayed per group with net amounts
- **Settle-Up Algorithm** — Computes minimum number of transactions to clear all debts using a greedy approach on net balances
- **Expense History** — Filterable by payer, date range, and description search
- **User Switcher** — Switch between users to simulate different perspectives (no auth required)
- **Money as Integers** — All amounts stored as paise (1 INR = 100 paise), eliminating floating-point errors
- **Mobile-First Responsive Design** — Optimized for phone screens, works on all devices
- **REST API** — Clean endpoints with server-side validation, proper HTTP status codes, and auto-generated Swagger docs at `/docs`

### AI-Powered Features (requires Gemini API key)

- **Natural Language Expense Entry** — Type sentences like:
  - *"I paid 2400 for dinner, split between me, Aman and Priya"*
  - *"Priya paid 600 for cab, equal split among all"*
  - The AI parses it into a structured expense with payer, amount, split mode, and members
- **Bill Text Parsing** — Paste a restaurant bill or receipt text, and the AI extracts individual line items with amounts. Then assign each item to specific group members for precise splitting.
- **Confidence Scoring** — AI self-assesses parsing quality (0.0 to 1.0):
  - `>= 0.8` — Green badge, high confidence
  - `0.5 - 0.8` — Yellow warning badge
  - `0.3 - 0.5` — Red badge, review carefully
  - `< 0.3` — Rejected, falls back to manual entry
- **Graceful Failure Handling** — API errors, low confidence, or unparseable input all fall back to manual entry with clear user messaging. No data is ever saved without explicit user confirmation.

### What Could Be Improved

- Real JWT-based authentication instead of user-switcher
- WebSocket real-time updates for live balance changes
- Image-based bill OCR using vision models
- Multi-currency support with live exchange rates
- Recurring expenses for rent/subscriptions
- CSV/PDF export of group ledger
- Dark mode with system preference detection

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/` | List all users |
| `POST` | `/api/users/` | Create a new user |
| `GET` | `/api/users/{id}` | Get user by ID |
| `GET` | `/api/groups/` | List all groups with members |
| `POST` | `/api/groups/` | Create group with initial member IDs |
| `GET` | `/api/groups/{id}` | Get group details with members |
| `POST` | `/api/groups/{id}/members/{uid}` | Add a member to a group |
| `DELETE` | `/api/groups/{id}` | Delete group (cascades expenses) |
| `GET` | `/api/groups/{id}/expenses/` | List expenses (supports filters) |
| `POST` | `/api/groups/{id}/expenses/` | Create expense with split shares |
| `GET` | `/api/groups/{id}/expenses/balances` | Get settle-up transactions |
| `POST` | `/api/ai/parse-expense` | Parse natural language expense |
| `POST` | `/api/ai/parse-bill` | Parse bill/receipt text |

### Query Filters (GET expenses)

- `?payer_id=` — Filter by who paid
- `?date_from=` / `?date_to=` — Date range filter
- `?search=` — Text search on expense description

Full interactive API documentation is available at `http://localhost:8000/docs` (Swagger UI).

## Settle-Up Algorithm

**Approach**: Greedy on Net Balances

1. **Compute net balance** for each user across all group expenses
2. **Separate** into creditors (positive balance) and debtors (negative balance)
3. **Sort** each list by absolute value (descending)
4. **Greedy match**: Pair largest creditor with largest debtor, settle the minimum of the two. Repeat until all balances are zero.

**Complexity**: O(n log n) sort + O(n) settlement, where n = users with non-zero balances.

**Example**:
- Aman owes ₹500, Priya is owed ₹300, Rahul is owed ₹200
- Transaction 1: Aman → Priya ₹300
- Transaction 2: Aman → Rahul ₹200
- Result: 2 transactions (minimum possible)

## Design Decisions

- **Money as integers (paise)**: Eliminates floating-point precision errors. All amounts stored as `INTEGER` in the database. Frontend converts for display (`paise / 100`).
- **Equal split remainder handling**: When an amount doesn't divide evenly, extra paise are distributed one-per-person from first to last. E.g., ₹100.01 split 3 ways = 3334, 3334, 3333 paise.
- **Shares validation**: Server rejects any expense where `SUM(share_amount_paise) != amount_paise`.
- **AI confirmation flow**: Parsed results are always shown for review. Users must explicitly confirm before any expense is saved — no silent saves of AI-generated data.
- **Gemini structured output**: Uses `response_mime_type="application/json"` for reliable JSON responses with `max_output_tokens=8192` to prevent truncation.

## Project Structure

```
Smart_Expense_Splitter/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, lifespan, seed trigger
│   │   ├── database.py          # SQLAlchemy engine + session factory
│   │   ├── models.py            # ORM models (User, Group, Expense, ExpenseShare)
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── seed.py              # Sample data seeder (8 users, 3 groups, 25 expenses)
│   │   ├── routes/
│   │   │   ├── users.py         # User CRUD endpoints
│   │   │   ├── groups.py        # Group CRUD + membership management
│   │   │   ├── expenses.py      # Expense CRUD + balances + settle-up
│   │   │   └── ai.py            # AI parsing endpoints (NL + bill)
│   │   └── services/
│   │       ├── settle_up.py     # Minimum transaction algorithm
│   │       └── ai_parser.py     # Google Gemini integration
│   ├── pyproject.toml           # Python dependencies (Poetry)
│   └── poetry.lock
├── frontend/
│   ├── src/
│   │   ├── api/client.ts        # Typed Axios API client
│   │   ├── types/index.ts       # TypeScript interfaces
│   │   ├── components/
│   │   │   ├── Layout.tsx       # App shell with navigation bar
│   │   │   └── UserSwitcher.tsx # User context switcher dropdown
│   │   ├── pages/
│   │   │   ├── GroupsPage.tsx       # Group list + create modal
│   │   │   ├── GroupDetailPage.tsx  # Expenses, balances, settle-up tabs
│   │   │   ├── AddExpensePage.tsx   # Manual expense form (4 split modes)
│   │   │   ├── AIExpensePage.tsx    # Natural language expense parsing
│   │   │   ├── ParseBillPage.tsx   # Bill text parsing + item assignment
│   │   │   └── UsersPage.tsx       # User list + create form
│   │   └── App.tsx              # React Router setup
│   ├── package.json             # Frontend dependencies
│   └── package-lock.json
├── ARCHITECTURE.md              # Detailed design decisions & DB schema
├── PROMPTS.md                   # AI prompt documentation & rationale
└── README.md                    # This file
```

## License

This project was built as part of a technical assessment.
