import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, ChevronRight, Wallet } from "lucide-react";
import type { Group } from "@/types";
import { groupsApi, usersApi } from "@/api/client";
import { UserSwitcherDropdown } from "@/components/UserSwitcher";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchGroups = () => {
    setLoading(true);
    groupsApi
      .list()
      .then(setGroups)
      .catch(() => setError("Failed to load groups"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchGroups, []);

  return (
    <div className="space-y-4">
      <UserSwitcherDropdown />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Your Groups</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Group
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No groups yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Create a group to start splitting expenses
          </p>
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group) => (
          <Link
            key={group.id}
            to={`/groups/${group.id}`}
            className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {group.description}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                  <Users className="h-3 w-3" />
                  <span>{group.members.length} members</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchGroups();
          }}
        />
      )}
    </div>
  );
}

function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi.list().then((data) => {
      setUsers(data.map((u) => ({ id: u.id, name: u.name })));
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedIds.length === 0) {
      setError("Name and at least one member required");
      return;
    }
    setSubmitting(true);
    setError(null);
    groupsApi
      .create(name.trim(), description.trim(), selectedIds)
      .then(() => onCreated())
      .catch((err) =>
        setError(err.response?.data?.detail || "Failed to create group")
      )
      .finally(() => setSubmitting(false));
  };

  const toggleUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-30 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Create Group</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Goa Trip 2026"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Annual beach trip"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Members ({selectedIds.length} selected)
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${
                    selectedIds.includes(user.id)
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-gray-50 border border-transparent hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-800">{user.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm"
          >
            {submitting ? "Creating..." : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  );
}
