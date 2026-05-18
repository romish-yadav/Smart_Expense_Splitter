import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";
import { aiApi } from "@/api/client";
import type { NLExpenseResponse } from "@/types";

export default function AIExpensePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NLExpenseResponse | null>(null);

  const handleParse = async () => {
    if (!text.trim() || !groupId) return;
    setParsing(true);
    setError(null);
    setResult(null);

    try {
      const data = await aiApi.parseExpense(text.trim(), groupId);
      setResult(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail ||
          "Failed to parse expense. Try rephrasing or use manual entry."
      );
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!result || !groupId) return;
    const params = new URLSearchParams({
      payer_id: result.payer_id || "",
      amount_paise: String(result.amount_paise),
      description: result.description,
      split_mode: result.split_mode,
      shares: JSON.stringify(result.shares),
    });
    navigate(`/groups/${groupId}/add-expense?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to={`/groups/${groupId}`} className="text-emerald-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-bold text-gray-900">AI Expense Entry</h2>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
        <p className="text-purple-800 text-sm">
          Describe the expense in natural language. The AI will parse it into a
          structured expense for you to review.
        </p>
      </div>

      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Examples:\n• "I paid 2400 for dinner, split between me, Aman and Priya"\n• "Bill from Trupti was 1850, Aman and I shared, reduce his share by 150"\n• "Rahul paid 500 for cab, split equally"`}
          rows={5}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
        />
      </div>

      <button
        onClick={handleParse}
        disabled={parsing || !text.trim()}
        className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
      >
        {parsing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Parsing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Parse Expense
          </>
        )}
      </button>

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

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">
                Parsed Result
              </h3>
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
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Payer</p>
                <p className="text-sm font-medium text-gray-900">
                  {result.payer_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-sm font-medium text-gray-900">
                  ₹{(result.amount_paise / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm font-medium text-gray-900">
                  {result.description}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Split Mode</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {result.split_mode.replace("_", " ")}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">
                Split between ({result.shares.length} people)
              </p>
              <div className="flex flex-wrap gap-1">
                {result.shares.map((s, i) => (
                  <span
                    key={i}
                    className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs"
                  >
                    {s.user_id}
                    {s.amount_paise
                      ? ` (₹${(s.amount_paise / 100).toFixed(2)})`
                      : ""}
                  </span>
                ))}
              </div>
            </div>

            {result.confidence < 0.5 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                <p className="text-yellow-800 text-xs">
                  Low confidence — please review carefully before confirming.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirm}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Confirm & Edit
              </button>
              <Link
                to={`/groups/${groupId}/add-expense`}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors text-center"
              >
                Manual Entry
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
