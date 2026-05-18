export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  joined_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  members: GroupMember[];
}

export type SplitMode = "equal" | "equal_subset" | "custom" | "weight";

export interface ShareInput {
  user_id: string;
  amount_paise?: number;
  weight?: number;
}

export interface ExpenseShare {
  id: string;
  user_id: string;
  user_name: string;
  share_amount_paise: number;
}

export interface Expense {
  id: string;
  group_id: string;
  payer_id: string;
  payer_name: string;
  amount_paise: number;
  currency: string;
  description: string;
  split_mode: SplitMode;
  date: string;
  created_at: string;
  shares: ExpenseShare[];
}

export interface BalanceEntry {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount_paise: number;
}

export interface SettleUpResponse {
  balances: BalanceEntry[];
  total_transactions: number;
}

export interface ParsedLineItem {
  description: string;
  amount_paise: number;
  assigned_to: string[];
}

export interface BillParseResponse {
  line_items: ParsedLineItem[];
  total_paise: number;
  raw_text: string;
  confidence: number;
}

export interface NLExpenseResponse {
  payer_id: string | null;
  payer_name: string;
  amount_paise: number;
  description: string;
  split_mode: SplitMode;
  shares: ShareInput[];
  confidence: number;
  raw_text: string;
}
