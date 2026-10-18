import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Bell, Check, CheckSquare, ChevronDown, CircleHelp, Copy, FolderKanban, LayoutDashboard, LogOut, Menu, Plus, Search, Settings, ShieldCheck, Users, X } from "lucide-react";
import Avatar from "./Avatar";
import Modal from "./Modal";
import { useWorkspace } from "../context/WorkspaceContext";

const adminNav = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "My Tasks", to: "/my-tasks", icon: CheckSquare, count: "12" },
  { label: "All Tasks", to: "/tasks", icon: CheckSquare },
  { label: "Projects & Teams", to: "/teams", icon: FolderKanban },
  { label: "Team Members", to: "/members", icon: Users },
  { label: "Reports", to: "/reports", icon: BarChart3 }
];
const employeeNav = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "My Tasks", to: "/my-tasks", icon: CheckSquare },
  { label: "Notifications", to: "/notifications", icon: Bell }
];

function Field({ label, children, hint }) {
  return <label className="form-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function TaskModal({ onClose }) {
  const { createTask, teams, members, user } = useWorkspace();
  const [form, setForm] = useState({ title: "", description: "", team: teams[0]?.name || "", assignee: user?.name || "", priority: "Medium", status: "Todo", dueDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const change = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (form.title.trim().length < 3) { setError("Enter a task title with at least 3 characters."); return; }
    if (form.dueDate && Number.isNaN(Date.parse(form.dueDate))) { setError("Choose a valid due date."); return; }
    setSaving(true);
    try {
      const assignee = members.find((m) => m.name === form.assignee);
      await createTask({ ...form, title: form.title.trim(), description: form.description.trim(), assigneeId: assignee?.id || assignee?._id || "", attachments: [] });
      onClose();
    } catch (e) { setError(e.message || "Task could not be created."); }
    finally { setSaving(false); }
  };
  return <Modal title="Create a new task" subtitle="Add a task and assign ownership to keep work moving." onClose={onClose}>
    <form onSubmit={submit}>
      <Field label="Task title"><input autoFocus maxLength={120} required value={form.title} onChange={change("title")} placeholder="e.g. Improve onboarding flow"/></Field>
      <Field label="Description"><textarea maxLength={3000} rows={3} value={form.description} onChange={change("description")} placeholder="What needs to be done?"/></Field>
      <div className="form-grid-two">
        <Field label="Team"><select value={form.team} onChange={change("team")}>{teams.map((t) => <option key={t.id || t._id || t.name}>{t.name}</option>)}</select></Field>
        <Field label="Assignee"><select value={form.assignee} onChange={change("assignee")}><option value="">Unassigned</option>{members.map((m) => <option key={m.id || m._id} value={m.name}>{m.name}</option>)}</select></Field>
        <Field label="Priority"><select value={form.priority} onChange={change("priority")}><option>High</option><option>Medium</option><option>Low</option></select></Field>
        <Field label="Due date"><input type="date" value={form.dueDate} onChange={change("dueDate")} min={new Date().toISOString().slice(0, 10)}/></Field>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer"><span><ShieldCheck size={14}/> Task access is enforced by the API.</span><div><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button disabled={saving} className="btn btn-primary" type="submit">{saving ? "Creating…" : "Create task"}</button></div></div>
    </form>
  </Modal>;
}

function InviteModal({ onClose }) {
  const { inviteMember, teams } = useWorkspace();
  const [form, setForm] = useState({ name: "", email: "", role: "Employee", team: teams[0]?.name || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [setupUrl, setSetupUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const change = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Enter a valid email address."); return; }
    setSaving(true);
    try {
      const result = await inviteMember(form);
      if (result?.setupUrl) setSetupUrl(result.setupUrl);
      else onClose();
    } catch (e) { setError(e.message || "Invitation could not be sent."); }
    finally { setSaving(false); }
  };
  const copySetupUrl = async () => {
    try { await navigator.clipboard.writeText(setupUrl); setCopied(true); }
    catch { setError("Could not access the clipboard. Select the link and copy it manually."); }
  };
  return <Modal title="Invite team member" subtitle="Invite a colleague to collaborate in SprintBoard." onClose={onClose}>
    {setupUrl ? <div>
      <p className="invite-link-message">Invite created for <strong>{form.email}</strong>. Copy this private setup link and share it directly with them. It expires in 30 minutes.</p>
      <Field label="Password setup link"><div className="invite-link-control"><input readOnly value={setupUrl} onFocus={(event) => event.target.select()}/><button type="button" className="icon-btn" onClick={copySetupUrl} aria-label="Copy setup link" title="Copy setup link">{copied ? <Check size={17}/> : <Copy size={17}/>}</button></div></Field>
      {setupUrl.includes("localhost") && <p className="invite-link-warning">This localhost link only works on this computer. For someone on another device, use a deployed app URL in the backend APP_ORIGIN setting.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer"><span><ShieldCheck size={14}/> Keep this one-time link private.</span><div><button type="button" className="btn btn-primary" onClick={onClose}>Done</button></div></div>
    </div> : <form onSubmit={submit}>
      <Field label="Full name"><input maxLength={100} required value={form.name} onChange={change("name")} placeholder="Name"/></Field>
      <Field label="Email address"><input type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={change("email")} placeholder="name@company.com"/></Field>
      <div className="form-grid-two"><Field label="Role"><select value={form.role} onChange={change("role")}><option>Employee</option><option>Admin</option></select></Field><Field label="Team"><select value={form.team} onChange={change("team")}>{teams.map((t) => <option key={t.id || t._id || t.name}>{t.name}</option>)}</select></Field></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer"><span><ShieldCheck size={14}/> Invitations require server-side authorization.</span><div><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button disabled={saving} className="btn btn-primary" type="submit">{saving ? "Sending…" : "Send invite"}</button></div></div>
    </form>}
  </Modal>;
}

export default function WorkspaceLayout() {
  const { user, logout, notifications, apiError, loadWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === "Admin" || user?.role === "admin";
  const navItems = isAdmin ? adminNav : employeeNav;
  const pageTitle = useMemo(() => {
    const map = { "/dashboard": "Overview", "/my-tasks": "My Tasks", "/tasks": "All Tasks", "/teams": "Projects & Teams", "/members": "Team Members", "/reports": "Reports", "/notifications": "Notifications", "/settings": "Settings" };
    if (location.pathname.startsWith("/tasks/")) return "Task Details";
    return map[location.pathname] || "Workspace";
  }, [location.pathname]);
  const unread = notifications.filter((n) => !(n.read ?? n.isRead)).length;

  return <div className="app-shell">
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)}/>}
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-symbol">◈</span><span>Sprint<span>Board</span></span><button className="icon-btn mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <button className="workspace-switch" onClick={() => navigate("/settings")}><span className="workspace-mark">S</span><span className="workspace-copy"><strong>Northstar Studio</strong><small>{isAdmin ? "Admin workspace" : "Team workspace"}</small></span><ChevronDown size={15}/></button>
      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map(({ label, to, icon: Icon, count }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}><Icon size={18}/><span>{label}</span>{count && <span className="nav-count">{count}</span>}</NavLink>)}
      </nav>
      {isAdmin && <><div className="nav-label project-label">YOUR TEAMS <button className="tiny-add" onClick={() => navigate("/teams")} aria-label="View teams"><Plus size={14}/></button></div><div className="project-shortcuts">{["Engineering", "Product Design", "Quality Assurance"].map((name, i) => <button key={name} className="project-shortcut" onClick={() => navigate("/teams")}><i className={`project-dot dot-${["teal", "purple", "green"][i]}`}/><span>{name}</span></button>)}</div></>}
      <div className="sidebar-spacer"/>
      <div className="sidebar-help"><div className="help-icon"><CircleHelp size={17}/></div><strong>Make work flow.</strong><p>Keep your team aligned and moving forward.</p><button onClick={() => navigate(isAdmin ? "/reports" : "/my-tasks")}>Explore workspace <span>↗</span></button></div>
      <NavLink className={({ isActive }) => `nav-item settings-link ${isActive ? "active" : ""}`} to="/settings"><Settings size={18}/><span>Settings</span></NavLink>
      <div className="sidebar-profile"><button className="profile-click" onClick={() => navigate("/settings")} aria-label="Open profile settings"><Avatar user={user} size="sm"/></button><div className="profile-copy"><strong>{user?.name || "Workspace user"}</strong><small>{user?.role || "Employee"}</small></div><button className="icon-btn logout-icon" title="Sign out" onClick={async () => { await logout(); navigate("/login"); }}><LogOut size={17}/></button></div>
    </aside>

    <div className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{pageTitle}</strong></div></div>
        <div className="topbar-actions">
          <label className="global-search"><Search size={16}/><input aria-label="Search tasks" placeholder="Search anything..." value={search} onChange={(e) => setSearch(e.target.value)}/><kbd>⌘ K</kbd></label>
          <div className="notification-wrap"><button className="icon-btn notification-button" onClick={() => setNotificationOpen((v) => !v)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}><Bell size={19}/>{unread > 0 && <i/>}</button>
            {notificationOpen && <div className="notification-popover"><div className="popover-heading"><strong>Notifications</strong><span className="new-tag">{unread} new</span></div>{notifications.slice(0, 4).map((n) => <button className="notification-item" key={n.id || n._id} onClick={() => { setNotificationOpen(false); navigate("/notifications"); }}><span className="notification-symbol"><Bell size={15}/></span><span><strong>{n.title || n.message}</strong><small>{n.message || ""}</small></span></button>)}<button className="view-all" onClick={() => { setNotificationOpen(false); navigate("/notifications"); }}>View all notifications</button></div>}
          </div>
          <button className="top-avatar-button" onClick={() => navigate("/settings")} aria-label="Open profile settings"><Avatar user={user} size="sm"/></button>
          {isAdmin && <button className="btn btn-primary top-create" onClick={() => setTaskModal(true)}><Plus size={16}/><span>New task</span></button>}
        </div>
      </header>
      {apiError && <div className="api-warning" role="alert"><span>{apiError}</span><button onClick={() => loadWorkspace().catch(() => {})}>Retry loading data</button></div>}
      <main className="route-content"><Outlet context={{ search, setTaskModal, setInviteModal }}/></main>
      <footer className="app-footer"><span>© {new Date().getFullYear()} SprintBoard</span><span><ShieldCheck size={13}/> Teamwork, thoughtfully organized</span><span className="footer-env">{import.meta.env.VITE_DEMO_MODE === "false" ? "Connected workspace" : "Demo data"}</span></footer>
    </div>
    {taskModal && <TaskModal onClose={() => setTaskModal(false)}/>}
    {inviteModal && <InviteModal onClose={() => setInviteModal(false)}/>}
  </div>;
}
