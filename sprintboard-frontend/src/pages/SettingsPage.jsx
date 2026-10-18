import React, { useRef, useState } from "react";
import { Bell, Check, ImagePlus, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import Avatar from "../components/Avatar";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const avatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export default function SettingsPage() {
  const { user, updateProfile, changeAvatar } = useWorkspace();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [success, setSuccess] = useState("");
  const [preferences, setPreferences] = useState({ taskAssignments: true, dueDateReminders: true, weeklySummary: false });
  const fileRef = useRef(null);

  const save = async (event) => {
    event.preventDefault(); setError(""); setSuccess("");
    if (name.trim().length < 2) { setError("Name must contain at least 2 characters."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address."); return; }
    setBusy(true);
    try { await updateProfile({ name: name.trim(), email: email.trim() }); setSuccess("Profile changes saved."); }
    catch (e) { setError(e.message || "Profile could not be saved."); }
    finally { setBusy(false); }
  };

  const onPhoto = async (file) => {
    setPhotoError(""); setSuccess("");
    if (!file) return;
    if (!avatarTypes.has(file.type)) { setPhotoError("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > MAX_AVATAR_SIZE) { setPhotoError("Profile photos must be 2 MB or smaller."); return; }
    setPhotoBusy(true);
    try { await changeAvatar(file); setSuccess("Profile photo updated."); }
    catch (e) { setPhotoError(e.message || "Photo upload failed."); }
    finally { setPhotoBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return <div className="page-content"><div className="page-intro"><div><span className="eyebrow">PREFERENCES</span><h1>Settings</h1><p>Manage your profile, preferences, and workspace configuration.</p></div><span className="settings-secure"><ShieldCheck size={15}/> Account security</span></div><div className="settings-layout"><aside className="panel settings-nav-panel"><a href="#profile" className="settings-nav-item active"><UserRound size={16}/> Profile</a><a href="#notifications" className="settings-nav-item"><Bell size={16}/> Notifications</a><a href="#security" className="settings-nav-item"><LockKeyhole size={16}/> Security</a></aside><div className="settings-main">
    <section id="profile" className="panel settings-card"><div className="settings-card-heading"><div><h2>Profile information</h2><p>Update your personal details and how others see you.</p></div></div><div className="photo-editor"><Avatar user={user} size="2xl"/><div className="photo-editor-copy"><strong>Profile photo</strong><p>Use a clear photo so teammates can recognize you.</p><input ref={fileRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => onPhoto(e.target.files?.[0])}/><button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={photoBusy}><ImagePlus size={15}/>{photoBusy ? "Uploading…" : "Change photo"}</button><small>JPG, PNG, or WebP · maximum 2 MB</small>{photoError && <p className="form-error" role="alert">{photoError}</p>}</div></div><form onSubmit={save}><div className="settings-form-grid"><label className="form-field"><span>Full name</span><input maxLength={100} required value={name} onChange={(e) => setName(e.target.value)}/></label><label className="form-field"><span>Email address</span><input type="email" maxLength={254} autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></label><label className="form-field"><span>Role</span><input value={user?.role || "Employee"} disabled/><small>Roles are managed by workspace administrators.</small></label><label className="form-field"><span>Timezone</span><select defaultValue="Asia/Kolkata"><option value="Asia/Kolkata">Asia/Kolkata (UTC+05:30)</option><option value="UTC">UTC</option><option value="America/New_York">America/New_York</option><option value="Europe/London">Europe/London</option></select></label></div>{error && <p className="form-error" role="alert">{error}</p>}{success && <p className="form-success" role="status"><Check size={15}/>{success}</p>}<div className="settings-save-row"><span><ShieldCheck size={14}/> Profile changes are validated by the server.</span><button className="btn btn-primary" disabled={busy}><Save size={15}/>{busy ? "Saving…" : "Save changes"}</button></div></form></section>
    <section id="notifications" className="panel settings-card"><div className="settings-card-heading"><div><h2>Notification preferences</h2><p>Choose which workspace updates you want to receive.</p></div></div>{[["taskAssignments","Task assignments","When a task is assigned or reassigned to you."],["dueDateReminders","Due-date reminders","Get notified before a task is due."],["weeklySummary","Weekly summary","A recap of activity and completed work."]].map(([key, title, description]) => <label className="preference-row" key={key}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={preferences[key]} onChange={(e) => setPreferences((old) => ({ ...old, [key]: e.target.checked }))}/></label>)}</section>
    <section id="security" className="panel settings-card"><div className="settings-card-heading"><div><h2>Security</h2><p>Keep your account protected.</p></div></div><div className="security-row"><span className="security-icon"><LockKeyhole size={17}/></span><div><strong>Password and sessions</strong><p>Passwords and session tokens are handled by the authentication server, not saved in browser storage.</p></div><span className="security-status"><ShieldCheck size={14}/> Server managed</span></div><div className="security-row"><span className="security-icon"><ShieldCheck size={17}/></span><div><strong>Workspace access</strong><p>Task ownership and role permissions must be checked by the API on every request.</p></div><span className="security-status"><ShieldCheck size={14}/> Role based</span></div></section>
  </div></div></div>;
}
