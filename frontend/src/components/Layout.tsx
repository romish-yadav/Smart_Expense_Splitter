import { Link, useLocation } from "react-router-dom";
import { Home, Users, Receipt, Sparkles } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Groups", icon: Home },
    { path: "/users", label: "Users", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          <h1 className="text-lg font-bold tracking-tight">SplitSmart</h1>
          <Sparkles className="h-4 w-4 text-emerald-200" />
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive
                    ? "text-emerald-600 font-semibold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
