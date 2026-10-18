import React, { useEffect, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, ListTodo, Plus } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import { workspaceApi } from "../services/api";
import TaskTable from "../components/TaskTable";

function Stat({ title, value, caption, tone = "teal", icon: Icon, delta }) {
  return <article className="stat-card"><div className="stat-top"><span>{title}</span><span className={`stat-icon tone-${tone}`}><Icon size={17}/></span></div><div className="stat-value-row"><strong>{value}</strong>{delta && <span className={`stat-delta ${delta.startsWith("-") ? "negative" : ""}`}>{delta.startsWith("-") ? <ArrowDownRight size={13}/> : <ArrowUpRight size={13}/>} {delta}</span>}</div><div className="stat-caption">{caption}</div></article>;
}
function CompletionChart({ tasks }) {
  const bars = [
    { label: "To do", count: tasks.filter((task) => task.status === "Todo").length },
    { label: "In progress", count: tasks.filter((task) => ["In progress", "In Progress"].includes(task.status)).length },
    { label: "Done", count: tasks.filter((task) => ["Done", "Completed"].includes(task.status)).length }
  ];
  const maxCount = Math.max(...bars.map((bar) => bar.count));
  if (!maxCount) return <div className="empty-state"><ListTodo size={24}/><strong>No task data yet</strong><span>Task status totals will appear here.</span></div>;
  return <div className="chart-wrap"><div className="chart-grid"><i/><i/><i/><i/></div><div className="chart-bars">{bars.map((bar) => <div className="chart-bar-wrap" key={bar.label}><strong>{bar.count}</strong><span className="chart-bar" style={{ height: `${Math.max(10, (bar.count / maxCount) * 86)}%` }}/><small>{bar.label}</small></div>)}</div></div>;
}
export default function DashboardPage() {
  const { tasks, user, isDemo } = useWorkspace();
  const { search, setTaskModal } = useOutletContext();
  const [activity, setActivity] = useState({ items: [], loading: !isDemo, error: false });
  useEffect(() => {
    if (isDemo) {
      setActivity({ items: [], loading: false, error: false });
      return undefined;
    }
    let active = true;
    setActivity((current) => ({ ...current, loading: true, error: false }));
    workspaceApi.dashboard().then((data) => {
      if (active) setActivity({ items: Array.isArray(data?.recentActivity) ? data.recentActivity : [], loading: false, error: false });
    }).catch(() => {
      if (active) setActivity({ items: [], loading: false, error: true });
    });
    return () => { active = false; };
  }, [isDemo]);
  const employee = user?.role === "Employee";
  const mine = tasks.filter((t) => t.assigneeId === user?.id || t.assignee === user?.name);
  const visible = employee ? mine : tasks;
  const done = visible.filter((t) => ["Done", "Completed"].includes(t.status)).length;
  const active = visible.filter((t) => t.status === "In progress" || t.status === "In Progress").length;
  const overdue = visible.filter((t) => t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10) && !["Done", "Completed"].includes(t.status)).length;
  return <div className="page-content">
    <div className="page-intro"><div><span className="eyebrow">{employee ? "YOUR WORKSPACE" : "WORKSPACE OVERVIEW"}</span><h1>{employee ? `Welcome back, ${user?.name?.split(" ")[0] || "there"} 👋` : `Good evening, ${user?.name?.split(" ")[0] || "Ashish"} 👋`}</h1><p>{employee ? "Here’s your personal workload and upcoming deadlines." : "Here’s what’s happening across your workspace today."}</p></div><div className="intro-actions"><span className="date-chip"><CalendarDays size={15}/> {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>{!employee && <button className="btn btn-primary" onClick={() => setTaskModal(true)}><Plus size={16}/> Create task</button>}</div></div>
    <div className="stats-grid"><Stat title={employee ? "Assigned to me" : "Total tasks"} value={visible.length} caption={employee ? "Tasks assigned to your account" : "All workspace tasks"} icon={ListTodo} tone="teal"/><Stat title="In progress" value={active} caption="Current workload" icon={Clock3} tone="blue"/><Stat title="Completed" value={done} caption="Tasks marked done" icon={CheckCircle2} tone="green"/><Stat title="Overdue" value={overdue} caption={overdue ? "Needs attention" : "Nothing overdue"} icon={Activity} tone="red"/></div>
    <div className="dashboard-grid">
      <section className="panel chart-panel"><div className="panel-heading"><div><h2>Tasks by status</h2><p>Current task distribution</p></div></div><CompletionChart tasks={visible}/></section>
      <section className="panel focus-panel"><div className="panel-heading"><div><h2>My tasks</h2><p>Your focus for today</p></div><Link to="/my-tasks" className="text-link">View all ↗</Link></div><div className="focus-list">{visible.filter((t) => !["Done", "Completed"].includes(t.status)).slice(0, 4).map((task) => <Link to={`/tasks/${task.id || task._id}`} className="focus-item" key={task.id || task._id}><span className="focus-check"/><span className="focus-copy"><strong>{task.title}</strong><small>{task.dueDate ? `Due ${new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "No due date"}</small></span><span className={`mini-priority priority-${(task.priority || "Low").toLowerCase()}`}>{task.priority}</span></Link>)}{visible.filter((t) => !["Done", "Completed"].includes(t.status)).length === 0 && <div className="empty-state"><CheckCircle2 size={24}/><strong>All caught up</strong><span>No open tasks to focus on.</span></div>}</div></section>
      <section className="panel recent-panel"><div className="panel-heading"><div><h2>{employee ? "Assigned tasks" : "Recent tasks"}</h2><p>{employee ? "Your assigned work" : "Latest updates from your workspace"}</p></div><Link to={employee ? "/my-tasks" : "/tasks"} className="text-link">View all ↗</Link></div><TaskTable tasks={visible} search={search} showFilters={false} employeeMode={employee}/></section>
      <section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Recorded workspace updates</p></div><Activity size={18} className="muted"/></div><div className="activity-list">{activity.loading ? <div className="empty-state"><span>Loading activity…</span></div> : activity.error ? <div className="empty-state"><strong>Activity unavailable</strong><span>Could not load recorded updates.</span></div> : isDemo ? <div className="empty-state"><strong>Live activity unavailable</strong><span>Connect the backend to see recorded updates.</span></div> : activity.items.length ? activity.items.slice(0, 4).map((item) => <div className="activity-row" key={item.id}><span className="activity-icon activity-teal"><Activity size={15}/></span><div><p>{item.summary}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</small></div></div>) : <div className="empty-state"><strong>No activity yet</strong><span>Recorded workspace updates will appear here.</span></div>}</div></section>
    </div>
  </div>;
}
