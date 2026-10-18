import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, authApi, DEMO_MODE, workspaceApi } from "../services/api";
import { demoMembers, demoNotifications, demoTasks, demoTeams } from "../data/demo";

const WorkspaceContext = createContext(null);
const clone = (value) => JSON.parse(JSON.stringify(value));

export function WorkspaceProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState(clone(demoTasks));
  const [teams, setTeams] = useState(clone(demoTeams));
  const [members, setMembers] = useState(clone(demoMembers));
  const [notifications, setNotifications] = useState(clone(demoNotifications));
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [apiError, setApiError] = useState("");

  const loadWorkspace = useCallback(async () => {
    if (DEMO_MODE) return;
    try {
      const [taskData, teamData, memberData, notificationData] = await Promise.all([
        workspaceApi.tasks(), workspaceApi.teams(), workspaceApi.members(), workspaceApi.notifications()
      ]);
      setTasks(Array.isArray(taskData?.items) ? taskData.items : Array.isArray(taskData) ? taskData : []);
      setTeams(Array.isArray(teamData?.items) ? teamData.items : Array.isArray(teamData) ? teamData : []);
      setMembers(Array.isArray(memberData?.items) ? memberData.items : Array.isArray(memberData) ? memberData : []);
      setNotifications(Array.isArray(notificationData?.items) ? notificationData.items : Array.isArray(notificationData) ? notificationData : []);
      setApiError("");
    } catch (error) {
      setApiError(error.message || "Could not load workspace data.");
      throw error;
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (DEMO_MODE) { setLoading(false); return () => { active = false; }; }
    authApi.me().then(async (data) => {
      if (!active) return;
      const authenticatedUser = data?.user || data || null;
      setUser(authenticatedUser);
      if (authenticatedUser) {
        try { await loadWorkspace(); }
        catch { /* Keep the signed-in state; the workspace API error can be retried. */ }
      }
    }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadWorkspace]);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("sprintboard:unauthorized", onUnauthorized);
    return () => window.removeEventListener("sprintboard:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setApiError("");
    if (DEMO_MODE) {
      const normalizedEmail = email.trim().toLowerCase();
      const role = normalizedEmail === "ashish@example.com" ? "Admin" : "Employee";
      const namePart = normalizedEmail.split("@")[0].replace(/[._-]+/g, " ").trim();
      const name = role === "Admin" ? "Ashish Babbar" : (namePart || "Team member").replace(/\b\w/g, (c) => c.toUpperCase());
      const demoUser = { id: role === "Admin" ? "u1" : "u2", name, email: normalizedEmail, role, team: role === "Admin" ? "Product Design" : "Engineering", avatarUrl: "" };
      setUser(demoUser);
      return demoUser;
    }
    await authApi.login({ email, password });
    const response = await authApi.me();
    const nextUser = response?.user || response;
    if (!nextUser) throw new ApiError("The server did not return a user profile.");
    setUser(nextUser);
    await loadWorkspace();
    return nextUser;
  }, [loadWorkspace]);

  const logout = useCallback(async () => {
    if (!DEMO_MODE) await authApi.logout();
    setUser(null);
  }, []);

  const createTask = useCallback(async (payload) => {
    if (DEMO_MODE) {
      const next = { ...payload, id: `SB-${String(Date.now()).slice(-4)}`, attachments: [], updatedAt: new Date().toISOString(), createdBy: user?.name || "Ashish Babbar" };
      setTasks((old) => [next, ...old]);
      return next;
    }
    const created = await workspaceApi.createTask(payload);
    const task = created?.task || created;
    setTasks((old) => [task, ...old]);
    return task;
  }, [user]);

  const updateTask = useCallback(async (id, patch) => {
    if (DEMO_MODE) {
      let updated;
      setTasks((old) => old.map((task) => {
        if (String(task.id || task._id) !== String(id)) return task;
        updated = { ...task, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      }));
      return updated;
    }
    const response = await workspaceApi.updateTask(id, patch);
    const updated = response?.task || response;
    setTasks((old) => old.map((task) => String(task.id || task._id) === String(id) ? updated : task));
    return updated;
  }, []);

  const updateStatus = useCallback(async (id, status) => {
    if (DEMO_MODE) return updateTask(id, { status });
    const response = await workspaceApi.updateTaskStatus(id, status);
    const updated = response?.task || response;
    setTasks((old) => old.map((task) => String(task.id || task._id) === String(id) ? { ...task, ...updated, status } : task));
    return updated;
  }, [updateTask]);

  const uploadTaskAttachment = useCallback(async (id, file) => {
    if (DEMO_MODE) {
      const item = { name: file.name, size: file.size, url: URL.createObjectURL(file), uploadedAt: new Date().toISOString() };
      await updateTask(id, { attachments: [...((tasks.find((t) => String(t.id || t._id) === String(id))?.attachments) || []), item] });
      return item;
    }
    const response = await workspaceApi.uploadTaskAttachment(id, file);
    await loadWorkspace();
    return response;
  }, [loadWorkspace, tasks, updateTask]);

  const createTeam = useCallback(async (payload) => {
    if (DEMO_MODE) {
      const next = { ...payload, id: `t${Date.now()}`, members: 1, tasks: 0, progress: 0, color: "teal" };
      setTeams((old) => [next, ...old]);
      return next;
    }
    const response = await workspaceApi.createTeam(payload);
    const team = response?.team || response;
    setTeams((old) => [team, ...old]);
    return team;
  }, []);

  const inviteMember = useCallback(async (payload) => {
    if (DEMO_MODE) {
      const next = { ...payload, id: `u${Date.now()}`, avatarUrl: "" };
      setMembers((old) => [next, ...old]);
      return next;
    }
    const response = await workspaceApi.inviteMember(payload);
    const member = response?.user || response;
    setMembers((old) => [member, ...old]);
    return response;
  }, []);

  const updateMember = useCallback(async (id, updates) => {
    let member;
    if (DEMO_MODE) {
      const existing = members.find((item) => String(item.id || item._id) === String(id));
      if (!existing) throw new ApiError("That team member could not be found.");
      member = { ...existing, ...updates };
    } else {
      const response = await workspaceApi.updateMember(id, updates);
      member = response?.user || response;
    }
    setMembers((old) => old.map((item) => String(item.id || item._id) === String(id) ? member : item));
    if (String(user?.id || user?._id) === String(id)) setUser(member);
    return member;
  }, [members, user]);

  const deactivateMember = useCallback(async (id) => {
    if (!DEMO_MODE) await workspaceApi.deactivateMember(id);
    setMembers((old) => old.filter((item) => String(item.id || item._id) !== String(id)));
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    if (!DEMO_MODE) await workspaceApi.markNotificationRead(id);
    setNotifications((old) => old.map((item) => String(item.id || item._id) === String(id) ? { ...item, read: true, isRead: true } : item));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!DEMO_MODE) await workspaceApi.markAllNotificationsRead();
    setNotifications((old) => old.map((item) => ({ ...item, read: true, isRead: true })));
  }, []);

  const updateProfile = useCallback(async (patch) => {
    if (!DEMO_MODE) {
      const response = await workspaceApi.updateProfile(patch);
      setUser(response?.user || response);
    } else {
      setUser((old) => ({ ...old, ...patch }));
    }
  }, []);

  const changeAvatar = useCallback(async (file) => {
    if (DEMO_MODE) {
      const avatarUrl = URL.createObjectURL(file);
      setUser((old) => ({ ...old, avatarUrl }));
      return avatarUrl;
    }
    const response = await workspaceApi.uploadAvatar(file);
    const avatarUrl = response?.avatarUrl || response?.user?.avatarUrl;
    if (!avatarUrl) throw new ApiError("The server did not return the uploaded profile photo URL.");
    setUser((old) => ({ ...old, avatarUrl }));
    return avatarUrl;
  }, []);

  const value = useMemo(() => ({
    user, tasks, teams, members, notifications, loading, apiError, isDemo: DEMO_MODE,
    login, logout, loadWorkspace, createTask, updateTask, updateStatus, uploadTaskAttachment,
    createTeam, inviteMember, updateMember, deactivateMember, markNotificationRead, markAllNotificationsRead, updateProfile, changeAvatar
  }), [user, tasks, teams, members, notifications, loading, apiError, login, logout, loadWorkspace, createTask, updateTask, updateStatus, uploadTaskAttachment, createTeam, inviteMember, updateMember, deactivateMember, markNotificationRead, markAllNotificationsRead, updateProfile, changeAvatar]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return value;
}
