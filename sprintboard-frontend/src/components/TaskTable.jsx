import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ExternalLink, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import { PriorityBadge, StatusBadge } from "./Badge";

const dateLabel = (value) => {
  if (!value) return "No date";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function TaskTable({ tasks, search = "", showFilters = true, employeeMode = false, onStatusChange }) {
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] = useState("All priorities");
  const [sort, setSort] = useState("dueDate");
  const visible = useMemo(() => tasks.filter((task) => {
    const query = search.toLowerCase().trim();
    const text = `${task.title} ${task.id} ${task.team} ${task.assignees?.map((assignee) => assignee.name).join(" ") || task.assignee}`.toLowerCase();
    return (!query || text.includes(query))
      && (status === "All statuses" || task.status === status)
      && (priority === "All priorities" || task.priority === priority);
  }).sort((a, b) => {
    if (sort === "priority") return ["High", "Medium", "Low"].indexOf(a.priority) - ["High", "Medium", "Low"].indexOf(b.priority);
    if (sort === "title") return a.title.localeCompare(b.title);
    return String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"));
  }), [tasks, search, status, priority, sort]);

  return <div className="table-card">
    {showFilters && <div className="table-toolbar">
      <div className="filter-control"><Search size={15}/><span>{visible.length} tasks</span></div>
      <div className="filter-actions">
        <label><span className="sr-only">Filter status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All statuses</option><option>Todo</option><option>In progress</option><option>Done</option></select><ChevronDown size={13}/></label>
        <label><span className="sr-only">Filter priority</span><select value={priority} onChange={(e) => setPriority(e.target.value)}><option>All priorities</option><option>High</option><option>Medium</option><option>Low</option></select><ChevronDown size={13}/></label>
        <label><span className="sr-only">Sort tasks</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="dueDate">Due date</option><option value="priority">Priority</option><option value="title">Title</option></select><ChevronDown size={13}/></label>
      </div>
    </div>}
    <div className="table-scroll"><table className="tasks-table">
      <thead><tr><th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due date</th><th aria-label="Actions" /></tr></thead>
      <tbody>{visible.map((task) => <tr key={task.id || task._id}>
        <td><Link to={`/tasks/${task.id || task._id}`} className="task-link"><span className="task-id">{task.id || task._id}</span><strong>{task.title}</strong><small>{task.team || "General"}</small></Link></td>
        <td><span className="assignee-cell"><Avatar user={{ name: task.assignees?.[0]?.name || task.assignee, avatarUrl: task.assignees?.[0]?.avatarUrl || task.assigneeAvatar }} size="xs"/><span>{task.assignees?.map((assignee) => assignee.name).join(", ") || task.assignee || "Unassigned"}</span></span></td>
        <td><PriorityBadge priority={task.priority}/></td>
        <td>{employeeMode && onStatusChange ? <label className="inline-status"><span className="sr-only">Update task status</span><select value={task.status} onChange={(e) => onStatusChange(task, e.target.value)}><option>Todo</option><option>In progress</option><option>Done</option></select></label> : <StatusBadge status={task.status}/>}</td>
        <td><span className="date-cell"><CalendarDays size={14}/>{dateLabel(task.dueDate)}</span></td>
        <td><Link className="row-open" to={`/tasks/${task.id || task._id}`} aria-label={`Open ${task.title}`}><ExternalLink size={15}/></Link></td>
      </tr>)}
      {visible.length === 0 && <tr><td colSpan="6"><div className="empty-state"><Search size={22}/><strong>No matching tasks</strong><span>Try changing your search or filters.</span></div></td></tr>}
      </tbody>
    </table></div>
    <div className="table-foot"><span>Showing {visible.length} of {tasks.length} tasks</span><span>Sorted by {sort === "dueDate" ? "due date" : sort}</span></div>
  </div>;
}
