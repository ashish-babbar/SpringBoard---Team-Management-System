import React, { useState } from "react";
import { ArrowUpRight, FolderKanban, Plus, Users } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import Modal from "../components/Modal";

const tones = ["teal", "blue", "purple", "green", "orange", "pink"];
function CreateTeamModal({ onClose }) {
  const { createTeam } = useWorkspace();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (name.trim().length < 2) { setError("Team name must be at least 2 characters."); return; }
    setBusy(true);
    try { await createTeam({ name: name.trim(), description: description.trim() }); onClose(); }
    catch (e) { setError(e.message || "Team could not be created."); }
    finally { setBusy(false); }
  };
  return <Modal title="Create a team" subtitle="Give your team a name and a shared focus." onClose={onClose}><form onSubmit={submit}><label className="form-field"><span>Team name</span><input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering"/></label><label className="form-field"><span>Description</span><textarea maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this team work on?"/></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-footer"><span>Members can be invited after creation.</span><div><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create team"}</button></div></div></form></Modal>;
}
export default function TeamsPage() {
  const { teams, user } = useWorkspace();
  const { setInviteModal } = useOutletContext();
  const [createOpen, setCreateOpen] = useState(false);
  const admin = user?.role === "Admin";
  return <div className="page-content"><div className="page-intro"><div><span className="eyebrow">WORKSPACE ORGANIZATION</span><h1>Projects & teams</h1><p>Organize people and work into focused teams.</p></div>{admin && <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16}/> Create team</button>}</div><div className="teams-summary"><div><span className="summary-icon"><FolderKanban size={18}/></span><div><strong>{teams.length}</strong><small>Teams</small></div></div><div><span className="summary-icon summary-blue"><Users size={18}/></span><div><strong>{teams.reduce((n, t) => n + Number(t.members || 0), 0)}</strong><small>Team memberships</small></div></div><div><span className="summary-icon summary-purple"><FolderKanban size={18}/></span><div><strong>{teams.reduce((n, t) => n + Number(t.tasks || 0), 0)}</strong><small>Tracked tasks</small></div></div></div><div className="teams-grid">{teams.map((team, i) => <article className="team-card panel" key={team.id || team._id || team.name}><div className="team-card-top"><span className={`team-icon team-${team.color || tones[i % tones.length]}`}><FolderKanban size={21}/></span><button className="icon-btn" onClick={() => setInviteModal(true)} aria-label={`Invite member to ${team.name}`}><ArrowUpRight size={17}/></button></div><h2>{team.name}</h2><p>{team.description || "A focused team workspace."}</p><div className="team-card-meta"><span><Users size={14}/>{team.members || 0} members</span><span><FolderKanban size={14}/>{team.tasks || 0} tasks</span></div><div className="team-progress-label"><span>Completion</span><strong>{team.progress || 0}%</strong></div><div className="progress-track"><i style={{ width: `${Math.max(0, Math.min(100, Number(team.progress || 0)))}%` }}/></div><button className="text-link team-view" onClick={() => setInviteModal(true)}>Manage team <ArrowUpRight size={14}/></button></article>)}</div>{createOpen && <CreateTeamModal onClose={() => setCreateOpen(false)}/>}</div>;
}
