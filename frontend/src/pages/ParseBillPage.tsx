import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FileText, AlertTriangle, Check } from "lucide-react";
import { aiApi, expensesApi } from "@/api/client";
import type { BillParseResponse, Group } from "@/types";
import { groupsApi } from "@/api/client";
import { useEffect } from "react";
import { useCurrentUser } from "@/components/UserSwitcher";

export default function ParseBillPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();

  const [group, setGroup] = useState<Group | null>(null);
  const [billText, setBillText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BillParseResponse | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [payerId, setPayerId] = useState("");

  useEffect(() => {
    if (!groupId) return;
    groupsApi.get(groupId).then((g) => {
      setGroup(g);
      if (currentUser) {
        const isMember = g.members.some((m) => m.user_id === currentUser.id);
        setPayerId(isMember ? currentUser.id : g.members[0]?.user_id || "");
      } else {
        setPayerId(g.members[0]?.user_id || "");
      }
    });
  }, [groupId, currentUser]);

  const handleParse = async () => {
    if (!billText.trim() || !groupId) return;
    setParsing(true);
    setError(null);
    setResult(null);

    try {
      const data = await aiApi.parseBill(billText.trim(), groupId);
      setResult(data);
      const defaultAssignments: Record<number, string[]> = {};
      data.line_items.forEach((_, i) => {
        defaultAssignments[i] = group?.members.map((m) => m.user_id) || [];
      });
      setAssignments(defaultAssignments);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail ||
          "Failed to parse bill. Please enter items manually."
      );
    } finally {
      setParsing(false);
    }
  };

  const toggleAssignment = (itemIndex: number, userId: string) => {
    setAssignments((prev) => {
      const current = prev[itemIndex] || [];
      const updated = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      return { ...prev, [itemIndex]: updated };
    });
  };

  const handleSaveExpense = async () => {
    if (!result || !groupId || !group) return;
    setSubmitting(true);
    setError(null);

    try {
      const shareMap: Record<string, number> = {};
      result.line_items.forEach((item, i) => {
        const assignedUsers = assignments[i] || [];
        if (assignedUsers.length === 0) return;
        const perPerson = Math.floor(item.amount_paise / assignedUsers.length);
        const remainder = item.amount_paise - perPerson * assignedUsers.length;
        assignedUsers.forEach((uid, j) => {
          shareMap[uid] = (shareMap[uid] || 0) + perPerson + (j < remainder ? 1 : 0);
        });
      });

      const shares = Object.entries(shareMap).map(([user_id, amount_paise]) => ({
        user_id,
        amount_paise,
      }));

      const totalShares = shares.reduce((s, sh) => s + sh.amount_paise, 0);

      await expensesApi.create(groupId, {
        payer_id: payerId,
        amount_paise: totalShares,
        currency: "INR",
        description: "Bill expense (parsed)",
        split_mode: "custom",
        shares,
      });

      navigate(`/groups/${groupId}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "Failed to save expense");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to={`/groups/${groupId}`} className="text-emerald-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-1.5">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Parse Bill</h2>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <p className="text-blue-800 text-sm">
          Paste the text from a restaurant bill or receipt. The AI will extract
          line items for you to assign to people.
        </p>
      </div>

      {!result && (
        <>
          <textarea
            value={billText}
            onChange={(e) => setBillText(e.target.value)}
            placeholder={`Paste bill text here, e.g.:\n\nTrupti Restaurant\n-----------------\nButter Chicken  ₹450\nDal Makhani     ₹280\nNaan (4)        ₹160\nCold Drinks     ₹120\n-----------------\nSubtotal        ₹1010\nGST (5%)        ₹50.50\nTotal           ₹1060.50`}
            rows={10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono"
          />

          <button
            onClick={handleParse}
            disabled={parsing || !billText.trim()}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
          >
            {parsing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Parsing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Parse Bill
              </>
            )}
          </button>
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 text-sm">{error}</p>
            <Link
              to={`/groups/${groupId}/add-expense`}
              className="text-red-600 text-xs underline mt-1 inline-block"
            >
              Use manual entry instead
            </Link>
          </div>
        </div>
      )}

      {result && group && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                Parsed Items
              </h3>
              <p className="text-xs text-gray-500">
                Assign items to group members
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                result.confidence >= 0.8
                  ? "bg-emerald-100 text-emerald-700"
                  : result.confidence >= 0.5
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {Math.round(result.confidence * 100)}% confidence
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Who paid this bill?
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {group.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {result.line_items.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {item.description}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    ₹{(item.amount_paise / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.members.map((m) => {
                    const isAssigned = (assignments[i] || []).includes(
                      m.user_id
                    );
                    return (
                      <button
                        key={m.user_id}
                        onClick={() => toggleAssignment(i, m.user_id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                          isAssigned
                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-gray-100 text-gray-500 border border-transparent"
                        }`}
                      >
                        {isAssigned && <Check className="h-3 w-3" />}
                        {m.user_name.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg px-3 py-2 flex justify-between text-sm">
            <span className="text-gray-600">Bill Total</span>
            <span className="font-semibold text-gray-900">
              ₹{(result.total_paise / 100).toFixed(2)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveExpense}
              disabled={submitting}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving..." : "Save as Expense"}
            </button>
            <button
              onClick={() => {
                setResult(null);
                setAssignments({});
              }}
              className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Re-parse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
