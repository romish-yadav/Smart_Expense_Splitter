# AI Prompt Log — Smart Expense Splitter

## Production Prompts (Inside the AI Feature)

### 1. Natural Language Expense Parser Prompt

```
You are an expense parser for a group expense splitting app.
Given a natural language description of an expense, extract structured data.

The group has these members:
{members}

Extract:
- payer_name: Who paid (must match a member name exactly, case-insensitive)
- amount_paise: Total amount in paise (1 INR = 100 paise). If the user says "2400", that means 2400 INR = 240000 paise
- description: Brief description of the expense
- split_mode: One of "equal", "equal_subset", "custom", "weight"
- split_members: List of member names who share this expense
- custom_amounts: If split_mode is "custom", map of member_name -> amount in paise
- confidence: 0.0 to 1.0, how confident you are in the parsing

IMPORTANT RULES:
- Currency amounts mentioned without unit are assumed to be INR
- Convert all amounts to paise (multiply INR by 100)
- If someone says "reduce X's share by Y", compute the custom amounts accordingly
- If the text says "split between me, A and B", identify who "me" is from context
- If you cannot parse the input reliably, set confidence below 0.5
```

**Why this prompt design:**
- **Member context injection**: The prompt receives the actual group member names so the AI can match "me", "Aman", etc. to real user IDs.
- **Paise conversion rule**: Explicitly stated because users say "2400" meaning INR, but we need paise internally. Without this rule, the AI sometimes returns the raw number.
- **Confidence field**: Forces the model to self-assess. We use this server-side to decide whether to show results or fall back to manual entry.
- **JSON-only response**: "Respond ONLY with valid JSON" prevents markdown wrapping that would break parsing.
- **Edge case rules**: The "reduce X's share" rule handles the exact client brief example. The "me" pronoun rule handles first-person references.

### 2. Bill/Receipt Parser Prompt

```
You are a bill/receipt parser. Given raw text from a restaurant bill or receipt, extract line items and total.

Extract:
- line_items: Array of {description, amount_paise}
- total_paise: Total bill amount in paise
- confidence: 0.0 to 1.0

IMPORTANT:
- Convert all amounts to paise (multiply INR by 100)
- Include taxes, service charges as separate line items if present
- If the total doesn't match sum of items, use the explicitly stated total
- If you cannot reliably parse the bill, set confidence below 0.5
```

**Why this prompt design:**
- **Separate line items**: Enables per-item assignment to people (the key UX feature for bill splitting)
- **Tax handling**: Restaurant bills in India always have GST — treating these as line items lets users assign tax fairly
- **Total mismatch rule**: Real bills sometimes have rounding. We trust the stated total over computed sum.
- **Low confidence fallback**: Same pattern as NL parser — graceful degradation to manual entry.

## Coding Tool Prompts (Used During Development)

### Prompt 1: Project Architecture Planning
**Asked**: "I need to build a Splitwise-style expense splitter with FastAPI backend, React frontend, SQLite, and OpenAI for NL parsing. Help me plan the database schema with proper relationships for users, groups, expenses, and expense shares. Money must be integers (paise)."
**Got**: Schema design with the 5-table structure used in the final app.

### Prompt 2: Settle-Up Algorithm
**Asked**: "Implement a minimum-transaction settle-up algorithm for group expenses. Given a list of expenses with payer and shares, compute who owes whom with minimum transactions. Use greedy approach on net balances."
**Got**: The `compute_net_balances` + `minimize_transactions` functions. Reviewed and verified the greedy matching logic handles edge cases (single debtor, equal balances).

### Prompt 3: Frontend Component Structure
**Asked**: "Create a mobile-first React UI for an expense splitter app with: groups list, group detail with expenses/balances tabs, manual expense form with 4 split modes, AI expense entry page, bill parsing page. Use Tailwind CSS, lucide-react icons."
**Got**: Component structure and page layouts. Modified extensively for proper error/loading/empty states and mobile UX polish.

### Prompt 4: AI Integration Error Handling
**Asked**: "How should I handle failures in the OpenAI API call for expense parsing? I need graceful degradation — never save hallucinated data, always show manual entry fallback."
**Got**: The confidence-based approach with tiered UI feedback (green/yellow/red badges) and explicit confirmation flow before saving.
