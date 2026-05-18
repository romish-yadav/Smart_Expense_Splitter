import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import { UserProvider } from "@/components/UserSwitcher";
import GroupsPage from "@/pages/GroupsPage";
import GroupDetailPage from "@/pages/GroupDetailPage";
import AddExpensePage from "@/pages/AddExpensePage";
import AIExpensePage from "@/pages/AIExpensePage";
import ParseBillPage from "@/pages/ParseBillPage";
import UsersPage from "@/pages/UsersPage";

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<GroupsPage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
            <Route path="/groups/:groupId/add-expense" element={<AddExpensePage />} />
            <Route path="/groups/:groupId/ai-expense" element={<AIExpensePage />} />
            <Route path="/groups/:groupId/parse-bill" element={<ParseBillPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Routes>
        </Layout>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
