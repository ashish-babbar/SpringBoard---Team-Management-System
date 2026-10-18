import React from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import TaskTable from "../components/TaskTable";

export default function TasksPage({ mine = false }) {
  const { tasks, user, updateStatus } = useWorkspace();
  const { search, setTaskModal } = useOutletContext();
  const employee = user?.role === "Employee";
  const visible = mine || employee ? tasks.filter((task) => task.assigneeId === user?.id || task.assignee === user?.name) : tasks;
  const title = mine || employee ? "My tasks" : "All tasks";
  const update = async (task, status) => {
    if (user?.role !== "Employee") return;
    try { await updateStatus(task.id || task._id, status); } catch { /* error is surfaced by API error banner when workspace reloads */ }
  };
  return <div className="page-content"><div className="page-intro"><div><span className="eyebrow">{mine || employee ? "YOUR WORKSPACE" : "TASK MANAGEMENT"}</span><h1>{title}</h1><p>{mine || employee ? "Manage your workload and keep things moving." : "Manage, assign, and track every task across your workspace."}</p></div>{!employee && <button className="btn btn-primary" onClick={() => setTaskModal(true)}><Plus size={16}/> Create task</button>}</div>
    {employee && <div className="info-banner"><ShieldCheck size={17}/><span>You can update the status of tasks assigned to you. The API enforces these permissions independently.</span></div>}
    <section className="panel full-table-panel"><div className="panel-heading"><div><h2>{visible.length} {visible.length === 1 ? "task" : "tasks"}</h2><p>Search, filter, and open a task to view its details.</p></div></div><TaskTable tasks={visible} search={search} employeeMode={employee} onStatusChange={update}/></section>
  </div>;
}
