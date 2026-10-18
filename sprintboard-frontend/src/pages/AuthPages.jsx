import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import { authApi, DEMO_MODE } from "../services/api";

function BrandPanel({ subtitle = "Your work, in sync." }) {
  return <section className="auth-brand-panel"><div className="auth-brand"><span className="brand-symbol">◈</span>Sprint<span>Board</span></div><div className="auth-brand-copy"><span className="auth-eyebrow">ONE FOCUSED WORKSPACE</span><h1>Make teamwork<br/>feel effortless.</h1><p>{subtitle}</p><div className="auth-feature-list"><span><i>✓</i> Clear priorities</span><span><i>✓</i> Better collaboration</span><span><i>✓</i> Work that moves forward</span></div></div><span className="auth-copyright">© {new Date().getFullYear()} SprintBoard</span><span className="auth-orb auth-orb-one"/><span className="auth-orb auth-orb-two"/></section>;
}

export function LoginPage() {
  const { user, login, isDemo } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (user) return <Navigate to="/dashboard" replace/>;
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    try { const next = await login({ email, password }); navigate(next.role === "Employee" ? "/my-tasks" : "/dashboard", { replace: true }); }
    catch (e) { setError(e.message || "Sign in failed. Check your details and try again."); }
    finally { setBusy(false); }
  };
  return <div className="auth-layout"><BrandPanel/><section className="auth-form-side"><div className="auth-form-card"><div className="mobile-auth-brand"><span className="brand-symbol">◈</span>Sprint<span>Board</span></div><div className="auth-form-heading"><span className="eyebrow">WELCOME BACK</span><h2>Sign in to SprintBoard</h2><p>Pick up where you and your team left off.</p></div>
    {isDemo && <div className="demo-note"><ShieldCheck size={16}/><span><strong>Demo mode</strong><small>Use the sample credentials or any valid email and 8+ character password.</small></span></div>}
    <form onSubmit={submit} className="auth-form">
      <label className="form-field"><span>Email address</span><div className="input-with-icon"><Mail size={16}/><input type="email" autoComplete="username" maxLength={254} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"/></div></label>
      <label className="form-field"><span>Password</span><div className="input-with-icon"><LockKeyhole size={16}/><input type={showPassword ? "text" : "password"} autoComplete="current-password" minLength={8} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"/><button type="button" className="input-icon-action" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
      <div className="auth-row"><label className="remember-control"><input type="checkbox"/> Remember this device</label><Link to="/forgot-password">Forgot password?</Link></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-wide" disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"} <ArrowRight size={16}/></button>
    </form><div className="auth-bottom-note"><ShieldCheck size={15}/><span>Your session is protected. Passwords are never stored in this browser.</span></div>
  </div></section></div>;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { isDemo } = useWorkspace();
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address."); return; }
    setBusy(true);
    try { if (!isDemo) await authApi.forgotPassword(email); setDone(true); }
    catch (e) { setError(e.message || "Could not request a reset link."); }
    finally { setBusy(false); }
  };
  return <div className="auth-layout"><BrandPanel subtitle="Get back to the work that matters."/><section className="auth-form-side"><div className="auth-form-card"><div className="mobile-auth-brand"><span className="brand-symbol">◈</span>Sprint<span>Board</span></div><Link className="back-link" to="/login"><ArrowLeft size={15}/> Back to sign in</Link>{done ? <div className="auth-form-heading"><span className="success-icon"><Mail size={22}/></span><h2>Check your inbox</h2><p>If an account exists for <strong>{email}</strong>, password reset instructions will be sent.</p></div> : <><div className="auth-form-heading"><span className="eyebrow">ACCOUNT RECOVERY</span><h2>Reset your password</h2><p>Enter your account email and we’ll send a reset link.</p></div><form onSubmit={submit} className="auth-form"><label className="form-field"><span>Email address</span><div className="input-with-icon"><Mail size={16}/><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"/></div></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary btn-wide" disabled={busy} type="submit">{busy ? "Sending…" : "Send reset link"} <ArrowRight size={16}/></button></form></>}</div></section></div>;
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useWorkspace();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) { setError("This setup link is missing. Request a new link."); return; }
    if (password.length < 12) { setError("Use at least 12 characters for your password."); return; }
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const result = await authApi.resetPassword(token, password);
      setAccountEmail(result?.email || "");
      setDone(true);
    } catch (e) { setError(e.message || "This setup link is invalid or expired. Request a new one."); }
    finally { setBusy(false); }
  };

  const goToSignIn = async () => {
    setError("");
    setBusy(true);
    try {
      if (user) await logout();
      navigate("/login", { replace: true, state: { email: accountEmail } });
    } catch (e) { setError(e.message || "Sign out of the current account, then sign in with the new password."); }
    finally { setBusy(false); }
  };

  return <div className="auth-layout"><BrandPanel subtitle="Secure your account and get started."/><section className="auth-form-side"><div className="auth-form-card"><div className="mobile-auth-brand"><span className="brand-symbol">◈</span>Sprint<span>Board</span></div><Link className="back-link" to="/login"><ArrowLeft size={15}/> Back to sign in</Link>{done ? <div className="auth-form-heading"><span className="success-icon"><ShieldCheck size={22}/></span><h2>Password set</h2><p>Your password is ready. Continue to sign in as <strong>{accountEmail}</strong>.</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary btn-wide" disabled={busy} onClick={goToSignIn} type="button">{busy ? "Signing out…" : "Go to sign in"} <ArrowRight size={16}/></button></div> : <><div className="auth-form-heading"><span className="eyebrow">ACCOUNT SETUP</span><h2>Choose a password</h2><p>Use at least 12 characters to secure your account.</p></div><form onSubmit={submit} className="auth-form"><label className="form-field"><span>New password</span><div className="input-with-icon"><LockKeyhole size={16}/><input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 12 characters"/></div></label><label className="form-field"><span>Confirm password</span><div className="input-with-icon"><LockKeyhole size={16}/><input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Enter the password again"/></div></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-primary btn-wide" disabled={busy || !token} type="submit">{busy ? "Saving password…" : "Set password"} <ArrowRight size={16}/></button></form></>}</div></section></div>;
}
