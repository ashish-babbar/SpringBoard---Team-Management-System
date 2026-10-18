import React, { useState } from "react";
import { Mail, MoreHorizontal, UserPlus, Users } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import Avatar from "../components/Avatar";
import Modal from "../components/Modal";

function MemberActionsModal({ member, teams, isSelf, onClose, onSave, onDeactivate }) {
  const [form, setForm] = useState({ name: member.name || "", email: member.email || "", role: member.role || "Employee", team: member.team || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try { await onSave(form); }
    catch (e) { setError(e.message || "Member details could not be saved."); }
    finally { setBusy(false); }
  };
  const deactivate = async () => {
    if (!window.confirm(`Deactivate ${member.name}'s account? They will lose access to the workspace.`)) return;
    setError("");
    setBusy(true);
    try { await onDeactivate(); }
    catch (e) { setError(e.message || "This member could not be deactivated."); }
    finally { setBusy(false); }
  };

  return <Modal title="Edit team member" subtitle="Update this member’s workspace details and access." onClose={onClose}>
    <form onSubmit={submit}>
      <label className="form-field"><span>Full name</span><input autoFocus maxLength={100} minLength={2} required value={form.name} onChange={change("name")}/></label>
      <label className="form-field"><span>Email address</span><input type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={change("email")}/></label>
      <div className="form-grid-two">
        <label className="form-field"><span>Role</span><select disabled={isSelf} value={form.role} onChange={change("role")}><option>Employee</option><option>Admin</option></select></label>
        <label className="form-field"><span>Team</span><select value={form.team} onChange={change("team")}><option value="">No team</option>{teams.map((team) => <option key={team.id || team._id || team.name} value={team.name}>{team.name}</option>)}</select></label>
      </div>
      {isSelf && <small>You cannot change your own administrator role.</small>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer">
        {!isSelf ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={deactivate}>Deactivate account</button> : <span/>}
        <div><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save changes"}</button></div>
      </div>
    </form>
  </Modal>;
}

export default function MembersPage() {
  const { members, teams, user, updateMember, deactivateMember } = useWorkspace();
  const { setInviteModal } = useOutletContext();
  const [selectedMember, setSelectedMember] = useState(null);
  const admin = user?.role === "Admin";
  return <div className="page-content"><div className="page-intro"><div><span className="eyebrow">PEOPLE</span><h1>Team members</h1><p>People, roles, and team access in one place.</p></div>{admin && <button className="btn btn-primary" onClick={() => setInviteModal(true)}><UserPlus size={16}/> Invite member</button>}</div><div className="members-toolbar"><span><Users size={16}/>{members.length} workspace members</span><span className="members-legend"><i/> Active workspace members</span></div><div className="members-grid">{members.map((member, i) => <article className="member-card panel" key={member.id || member._id || member.email}>{admin && <div className="member-card-menu"><button className="icon-btn" aria-label={`Edit ${member.name}`} title="Edit member" onClick={() => setSelectedMember(member)}><MoreHorizontal size={18}/></button></div>}<Avatar user={member} size="xl" className={`member-avatar-${i % 5}`}/><h2>{member.name}</h2><p className="member-role">{member.role || "Employee"}</p><a className="member-email" href={`mailto:${member.email}`}><Mail size={13}/>{member.email}</a><span className="member-online"><i/> Active workspace member</span><div className="member-card-footer"><span>{member.team || "No team assigned"}</span><span className={`role-chip ${(member.role || "Employee").toLowerCase()}`}>{member.role || "Employee"}</span></div></article>)}</div>{selectedMember && <MemberActionsModal member={selectedMember} teams={teams} isSelf={String(selectedMember.id || selectedMember._id) === String(user?.id || user?._id)} onClose={() => setSelectedMember(null)} onSave={(updates) => updateMember(selectedMember.id || selectedMember._id, updates).then(() => setSelectedMember(null))} onDeactivate={() => deactivateMember(selectedMember.id || selectedMember._id).then(() => setSelectedMember(null))}/>}</div>;
}
