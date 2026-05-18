import { useState, useEffect, createContext, useContext } from "react";
import type { User } from "@/types";
import { usersApi } from "@/api/client";
import { ChevronDown } from "lucide-react";

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  users: User[];
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  users: [],
});

export function useCurrentUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    usersApi.list().then((data) => {
      setUsers(data);
      if (data.length > 0 && !currentUser) {
        setCurrentUser(data[0]);
      }
    });
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, users }}>
      {children}
    </UserContext.Provider>
  );
}

export function UserSwitcherDropdown() {
  const { currentUser, setCurrentUser, users } = useCurrentUser();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm hover:bg-gray-50 transition-colors w-full"
      >
        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
          {currentUser.name.charAt(0)}
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900 text-sm">{currentUser.name}</div>
          <div className="text-xs text-gray-500">Acting as</div>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setCurrentUser(user);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm ${
                  user.id === currentUser.id ? "bg-emerald-50" : ""
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="text-gray-800">{user.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
