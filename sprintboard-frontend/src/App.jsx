import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useWorkspace } from "./context/WorkspaceContext";
import WorkspaceLayout from "./components/WorkspaceLayout";
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from "./pages/AuthPages";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import TeamsPage from "./pages/TeamsPage";
import MembersPage from "./pages/MembersPage";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useWorkspace();
  const location = useLocation();
  if (loading) return <main className="loading-screen"><span className="spinner"/><p>Loading your workspace…</p></main>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace/>;
  if (adminOnly && user.role !== "Admin" && user.role !== "admin") return <Navigate to="/my-tasks" replace/>;
  return children;
}
function LandingRedirect() {
  const { user, loading } = useWorkspace();
  if (loading) return <main className="loading-screen"><span className="spinner"/><p>Loading your workspace…</p></main>;
  return <Navigate to={user ? "/dashboard" : "/login"} replace/>;
}
export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
    <Route path="/reset-password" element={<ResetPasswordPage/>}/>
    <Route path="/" element={<LandingRedirect/>}/>
    <Route element={<ProtectedRoute><WorkspaceLayout/></ProtectedRoute>}>
      <Route path="dashboard" element={<DashboardPage/>}/>
      <Route path="my-tasks" element={<TasksPage mine/>}/>
      <Route path="tasks" element={<ProtectedRoute adminOnly><TasksPage/></ProtectedRoute>}/>
      <Route path="tasks/:taskId" element={<TaskDetailPage/>}/>
      <Route path="teams" element={<ProtectedRoute adminOnly><TeamsPage/></ProtectedRoute>}/>
      <Route path="members" element={<ProtectedRoute adminOnly><MembersPage/></ProtectedRoute>}/>
      <Route path="reports" element={<ProtectedRoute adminOnly><ReportsPage/></ProtectedRoute>}/>
      <Route path="notifications" element={<NotificationsPage/>}/>
      <Route path="settings" element={<SettingsPage/>}/>
      <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
    </Route>
  </Routes>;
}
