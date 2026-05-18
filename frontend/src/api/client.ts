import axios from "axios";
import type {
  User,
  Group,
  Expense,
  SettleUpResponse,
  NLExpenseResponse,
  BillParseResponse,
  SplitMode,
  ShareInput,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

export const usersApi = {
  list: () => api.get<User[]>("/api/users/").then((r) => r.data),
  create: (name: string, email: string) =>
    api.post<User>("/api/users/", { name, email }).then((r) => r.data),
};

export const groupsApi = {
  list: () => api.get<Group[]>("/api/groups/").then((r) => r.data),
  get: (id: string) => api.get<Group>(`/api/groups/${id}`).then((r) => r.data),
  create: (name: string, description: string, member_ids: string[]) =>
    api
      .post<Group>("/api/groups/", { name, description, member_ids })
      .then((r) => r.data),
  delete: (id: string) => api.delete(`/api/groups/${id}`),
  addMember: (groupId: string, userId: string) =>
    api.post(`/api/groups/${groupId}/members/${userId}`).then((r) => r.data),
};

export const expensesApi = {
  list: (
    groupId: string,
    params?: {
      payer_id?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
    }
  ) =>
    api
      .get<Expense[]>(`/api/groups/${groupId}/expenses/`, { params })
      .then((r) => r.data),
  create: (
    groupId: string,
    data: {
      payer_id: string;
      amount_paise: number;
      currency: string;
      description: string;
      split_mode: SplitMode;
      date?: string;
      shares: ShareInput[];
    }
  ) =>
    api
      .post<Expense>(`/api/groups/${groupId}/expenses/`, data)
      .then((r) => r.data),
  getBalances: (groupId: string) =>
    api
      .get<SettleUpResponse>(`/api/groups/${groupId}/expenses/balances`)
      .then((r) => r.data),
};

export const aiApi = {
  parseExpense: (text: string, groupId: string) =>
    api
      .post<NLExpenseResponse>("/api/ai/parse-expense", {
        text,
        group_id: groupId,
      })
      .then((r) => r.data),
  parseBill: (billText: string, groupId: string) =>
    api
      .post<BillParseResponse>("/api/ai/parse-bill", {
        bill_text: billText,
        group_id: groupId,
      })
      .then((r) => r.data),
};
