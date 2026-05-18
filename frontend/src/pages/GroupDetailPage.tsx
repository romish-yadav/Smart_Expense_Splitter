import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Receipt,
  ArrowRightLeft,
  Search,
  Filter,
  Sparkles,
  FileText,
  X,
} from "lucide-react";
import type { Group, Expense, SettleUpResponse } from "@/types";
import { groupsApi, expensesApi } from "@/api/client";

function formatAmount(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Tab = "expenses" | "balances";

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<SettleUpResponse | null>(null);
  const [tab, setTab] = useState<Tab>("expenses");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayer, setFilterPayer] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(() => {
    if (!groupId) return;
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (filterPayer) params.payer_id = filterPayer;

    Promise.all([
      groupsApi.get(groupId),
      expensesApi.list(groupId, params),
      expensesApi.getBalances(groupId),
    ])
      .then(([g, e, b]) => {
        setGroup(g);
        setExpenses(e);
        setBalances(b);
      })
      .catch(() => setError("Failed to load group data"))
      .finally(() => setLoading(false));
  }, [groupId, searchTerm, filterPayer]);

  useEffect(fetchData, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="space-y-4">
        <Link
          to="/"
          className="flex items-center gap-1 text-emerald-600 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error || "Group not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/" className="text-emerald-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {group.name}
          </h2>
          <p className="text-xs text-gray-500">
            {group.members.length} members
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          to={`/groups/${groupId}/add-expense`}
          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Link>
        <Link
          to={`/groups/${groupId}/ai-expense`}
          className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          AI
        </Link>
        <Link
          to={`/groups/${groupId}/parse-bill`}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Bill
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setTab("expenses")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "expenses"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          <Receipt className="h-4 w-4 inline mr-1" />
          Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setTab("balances")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "balances"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500"
          }`}
        >
          <ArrowRightLeft className="h-4 w-4 inline mr-1" />
          Settle Up
        </button>
      </div>

      {tab === "expenses" && (
        <div className="space-y-3">
          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg text-sm ${
                showFilters || filterPayer
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>

          {showFilters && (
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter by payer
              </label>
              <select
                value={filterPayer}
                onChange={(e) => setFilterPayer(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All members</option>
                {group.members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No expenses yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Add an expense to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "balances" && balances && (
        <BalancesView balances={balances} />
      )}
    </div>
  );
}

function ExpenseCard({ expense }: { expense: Expense }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">
            {expense.description}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {expense.payer_name} paid · {formatDate(expense.date)}
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="font-semibold text-gray-900 text-sm">
            {formatAmount(expense.amount_paise)}
          </p>
          <p className="text-xs text-gray-400 capitalize">
            {expense.split_mode.replace("_", " ")}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-1.5">
            Split details:
          </p>
          <div className="space-y-1">
            {expense.shares.map((share) => (
              <div
                key={share.id}
                className="flex justify-between text-xs text-gray-600"
              >
                <span>{share.user_name}</span>
                <span className="font-medium">
                  {formatAmount(share.share_amount_paise)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BalancesView({ balances }: { balances: SettleUpResponse }) {
  if (balances.balances.length === 0) {
    return (
      <div className="text-center py-8">
        <ArrowRightLeft className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p className="text-emerald-600 font-medium text-sm">All settled up!</p>
        <p className="text-gray-400 text-xs mt-1">No pending balances</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        <p className="text-emerald-800 text-sm font-medium">
          {balances.total_transactions} transaction
          {balances.total_transactions !== 1 ? "s" : ""} to settle up
        </p>
        <p className="text-emerald-600 text-xs mt-0.5">
          Minimized from all expenses using greedy debt simplification
        </p>
      </div>

      <div className="space-y-2">
        {balances.balances.map((balance, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {balance.from_user_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {balance.from_user_name}
                  </span>
                  <ArrowRightLeft className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {balance.to_user_name}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  owes{" "}
                  <span className="font-semibold text-emerald-600">
                    {formatAmount(balance.amount_paise)}
                  </span>
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {balance.to_user_name.charAt(0)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
