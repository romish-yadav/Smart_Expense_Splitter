import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { Group, SplitMode, ShareInput } from "@/types";
import { groupsApi, expensesApi } from "@/api/client";
import { useCurrentUser } from "@/components/UserSwitcher";

function formatAmount(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AddExpensePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useCurrentUser();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payerId, setPayerId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [weights, setWeights] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!groupId) return;
    groupsApi
      .get(groupId)
      .then((g) => {
        setGroup(g);
        setSelectedMembers(g.members.map((m) => m.user_id));
        if (currentUser) {
          const isMember = g.members.some((m) => m.user_id === currentUser.id);
          setPayerId(isMember ? currentUser.id : g.members[0]?.user_id || "");
        } else {
          setPayerId(g.members[0]?.user_id || "");
        }
      })
      .catch(() => setError("Failed to load group"))
      .finally(() => setLoading(false));
  }, [groupId, currentUser]);

  // Pre-fill from AI parsed data via URL params
  useEffect(() => {
    const prefillPayer = searchParams.get("payer_id");
    const prefillAmount = searchParams.get("amount_paise");
    const prefillDesc = searchParams.get("description");
    const prefillMode = searchParams.get("split_mode");
    const prefillShares = searchParams.get("shares");

    if (prefillPayer) setPayerId(prefillPayer);
    if (prefillAmount) setAmountStr(String(Number(prefillAmount) / 100));
    if (prefillDesc) setDescription(prefillDesc);
    if (prefillMode) setSplitMode(prefillMode as SplitMode);
    if (prefillShares) {
      try {
        const shares: ShareInput[] = JSON.parse(prefillShares);
        setSelectedMembers(shares.map((s) => s.user_id));
        if (prefillMode === "custom") {
          const ca: Record<string, string> = {};
          shares.forEach((s) => {
            if (s.amount_paise !== undefined) {
              ca[s.user_id] = String(s.amount_paise / 100);
            }
          });
          setCustomAmounts(ca);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !group) return;

    const amountPaise = Math.round(parseFloat(amountStr) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description");
      return;
    }

    if (selectedMembers.length === 0) {
      setError("Select at least one member");
      return;
    }

    let shares: ShareInput[] = [];

    if (splitMode === "equal" || splitMode === "equal_subset") {
      shares = selectedMembers.map((uid) => ({ user_id: uid }));
    } else if (splitMode === "custom") {
      let totalCustom = 0;
      shares = selectedMembers.map((uid) => {
        const amt = Math.round(parseFloat(customAmounts[uid] || "0") * 100);
        totalCustom += amt;
        return { user_id: uid, amount_paise: amt };
      });
      if (totalCustom !== amountPaise) {
        setError(
          `Custom amounts (${formatAmount(totalCustom)}) must equal total (${formatAmount(amountPaise)})`
        );
        return;
      }
    } else if (splitMode === "weight") {
      shares = selectedMembers.map((uid) => ({
        user_id: uid,
        weight: parseFloat(weights[uid] || "1"),
      }));
    }

    setSubmitting(true);
    setError(null);

    expensesApi
      .create(groupId, {
        payer_id: payerId,
        amount_paise: amountPaise,
        currency: "INR",
        description: description.trim(),
        split_mode: splitMode,
        shares,
      })
      .then(() => navigate(`/groups/${groupId}`))
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to create expense");
        setSubmitting(false);
      });
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
        Group not found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to={`/groups/${groupId}`} className="text-emerald-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-lg font-bold text-gray-900">Add Expense</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Who paid?
          </label>
          <select
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {group.members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (₹)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Dinner at restaurant"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Split mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "equal", label: "Equal (all)" },
                { value: "equal_subset", label: "Equal (some)" },
                { value: "custom", label: "Custom amounts" },
                { value: "weight", label: "By weights" },
              ] as const
            ).map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setSplitMode(mode.value)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  splitMode === mode.value
                    ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                    : "bg-gray-50 text-gray-600 border border-gray-200"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {(splitMode === "equal_subset" ||
          splitMode === "custom" ||
          splitMode === "weight") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Split between
            </label>
            <div className="space-y-1">
              {group.members.map((m) => (
                <div
                  key={m.user_id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    selectedMembers.includes(m.user_id)
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-gray-50 border border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(m.user_id)}
                    onChange={() => toggleMember(m.user_id)}
                    className="rounded border-gray-300 text-emerald-600"
                  />
                  <span className="flex-1 text-sm text-gray-800">
                    {m.user_name}
                  </span>
                  {splitMode === "custom" &&
                    selectedMembers.includes(m.user_id) && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customAmounts[m.user_id] || ""}
                        onChange={(e) =>
                          setCustomAmounts((prev) => ({
                            ...prev,
                            [m.user_id]: e.target.value,
                          }))
                        }
                        placeholder="₹0.00"
                        className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    )}
                  {splitMode === "weight" &&
                    selectedMembers.includes(m.user_id) && (
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={weights[m.user_id] || "1"}
                        onChange={(e) =>
                          setWeights((prev) => ({
                            ...prev,
                            [m.user_id]: e.target.value,
                          }))
                        }
                        placeholder="1"
                        className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {splitMode === "custom" && amountStr && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
            <span className="text-gray-600">Remaining: </span>
            <span
              className={`font-medium ${
                Math.round(parseFloat(amountStr) * 100) -
                  selectedMembers.reduce(
                    (sum, uid) =>
                      sum +
                      Math.round(parseFloat(customAmounts[uid] || "0") * 100),
                    0
                  ) ===
                0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {formatAmount(
                Math.round(parseFloat(amountStr) * 100) -
                  selectedMembers.reduce(
                    (sum, uid) =>
                      sum +
                      Math.round(parseFloat(customAmounts[uid] || "0") * 100),
                    0
                  )
              )}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm"
        >
          {submitting ? "Adding..." : "Add Expense"}
        </button>
      </form>
    </div>
  );
}
