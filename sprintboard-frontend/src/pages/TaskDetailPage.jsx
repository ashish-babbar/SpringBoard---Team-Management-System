import React, { useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Clock3, FileText, Flag, ShieldCheck, Upload, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import Avatar from "../components/Avatar";
import { PriorityBadge, StatusBadge } from "../components/Badge";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const safeAttachmentUrl = (value) => {
  if (!value) return "";
  try {
    const parsed = new URL(value, window.location.origin);
    return ["http:", "https:", "blob:"].includes(parsed.protocol) ? parsed.href : "";
  } catch { return ""; }
};
export default function TaskDetailPage() {
  const { taskId } = useParams();
  const { tasks, user, updateStatus, uploadTaskAttachment } = useWorkspace();
  const task = useMemo(() => tasks.find((item) => String(item.id || item._id) === String(taskId)), [tasks, taskId]);
  const [status, setStatus] = useState(task?.status || "Todo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);
  const isEmployee = user?.role === "Employee";
  if (!task) return <div className="page-content"><Link to={isEmployee ? "/my-tasks" : "/tasks"} className="back-link"><ArrowLeft size={15}/> Back to tasks</Link><div className="panel not-found-panel"><h1>Task not found</h1><p>This task may have been removed or you may not have access to it.</p><Link to={isEmployee ? "/my-tasks" : "/tasks"} className="btn btn-primary">Return to tasks</Link></div></div>;
  const isOwner = task.assigneeId === user?.id || task.assignee === user?.name;
  const canUpdate = !isEmployee || isOwner;
  if (isEmployee && !isOwner) return <div className="page-content"><Link to="/my-tasks" className="back-link"><ArrowLeft size={15}/> Back to my tasks</Link><div className="panel not-found-panel"><h1>Task unavailable</h1><p>Employees can only view tasks assigned to them.</p><Link to="/my-tasks" className="btn btn-primary">Return to my tasks</Link></div></div>;
  const changeStatus = async (nextStatus) => {
    if (!canUpdate) { setError("You can only update tasks assigned to you."); return; }
    setBusy(true); setError(""); setSuccess("");
    try { await updateStatus(task.id || task._id, nextStatus); setStatus(nextStatus); setSuccess("Task status updated."); }
    catch (e) { setError(e.message || "Status could not be updated."); }
    finally { setBusy(false); }
  };
  const upload = async (file) => {
    if (!file) return;
    setError(""); setSuccess("");
    if (!allowedTypes.has(file.type)) { setError("Use a JPG, PNG, WebP, or PDF file."); return; }
    if (file.size > MAX_ATTACHMENT_BYTES) { setError("Attachments must be 10 MB or smaller."); return; }
    if (isEmployee && !isOwner) { setError("You can only attach files to tasks assigned to you."); return; }
    setBusy(true);
    try { await uploadTaskAttachment(task.id || task._id, file); setSuccess("Attachment uploaded."); }
    catch (e) { setError(e.message || "Upload failed."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const due = task.dueDate ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Not set";
  return <div className="page-content detail-page"><Link to={isEmployee ? "/my-tasks" : "/tasks"} className="back-link"><ArrowLeft size={15}/> Back to tasks</Link><div className="page-intro detail-intro"><div><span className="eyebrow">TASK / {task.id || task._id}</span><h1>{task.title}</h1><p>{task.team || "General"} · Created by {task.createdBy || "Workspace admin"}</p></div>{!isEmployee && <span className="detail-action-note"><ShieldCheck size={15}/> Admin controls</span>}</div>
    <div className="task-detail-grid"><section className="panel detail-main-panel"><div className="detail-status-row"><StatusBadge status={status}/><PriorityBadge priority={task.priority}/><span className="task-updated"><Clock3 size={14}/> Updated recently</span></div><div className="detail-section"><h3>Description</h3><p>{task.description || "No description has been added for this task."}</p></div><div className="detail-section"><h3>Task attachments</h3><div className="attachment-list">{(task.attachments || []).map((attachment, index) => <a href={safeAttachmentUrl(attachment.url) || undefined} target={safeAttachmentUrl(attachment.url) ? "_blank" : undefined} rel="noopener noreferrer" key={`${attachment.name}-${index}`} className="attachment-item"><FileText size={18}/><span><strong>{attachment.name}</strong><small>{attachment.size ? `${(attachment.size / 1024).toFixed(0)} KB` : "Uploaded file"}</small></span></a>)}{(!task.attachments || task.attachments.length === 0) && <p className="muted">No attachments yet.</p>}</div>
      <input ref={fileRef} className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => upload(e.target.files?.[0])}/><button type="button" className="upload-dropzone" onClick={() => fileRef.current?.click()} disabled={busy || !canUpdate}><Upload size={19}/><strong>{busy ? "Working…" : "Upload attachment"}</strong><span>JPG, PNG, WebP, or PDF · up to 10 MB</span></button></div>
      {error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status"><Check size={15}/>{success}</p>}
      <div className="detail-section activity-section"><h3>Activity</h3><div className="activity-row"><span className="activity-icon activity-teal"><Check size={15}/></span><div><p><strong>{task.createdBy || "Workspace admin"}</strong> created this task</p><small>{task.updatedAt ? new Date(task.updatedAt).toLocaleString() : "Recently"}</small></div></div><div className="activity-row"><span className="activity-icon activity-blue"><Flag size={15}/></span><div><p>Priority set to <strong>{task.priority}</strong></p><small>Task details</small></div></div></div>
    </section><aside className="panel detail-properties"><div className="panel-heading"><div><h2>Task properties</h2><p>Ownership and delivery</p></div></div><div className="property-row"><span>Assignee</span><div className="property-value"><Avatar user={{ name: task.assignee, avatarUrl: task.assigneeAvatar }} size="xs"/><strong>{task.assignee || "Unassigned"}</strong></div></div><div className="property-row"><span>Team</span><strong>{task.team || "General"}</strong></div><div className="property-row"><span>Priority</span><PriorityBadge priority={task.priority}/></div><div className="property-row"><span>Due date</span><strong><CalendarDays size={14}/>{due}</strong></div><div className="property-row"><span>Created by</span><strong><UserRound size={14}/>{task.createdBy || "Workspace admin"}</strong></div><div className="property-status"><label className="form-field"><span>Update status</span><select disabled={busy || !canUpdate} value={status} onChange={(e) => changeStatus(e.target.value)}><option>Todo</option><option>In progress</option><option>Done</option></select></label><small>{isEmployee ? "Employees can update status and add attachments to their assigned tasks." : "Status changes are saved to the workspace."}</small></div></aside></div>
  </div>;
}
