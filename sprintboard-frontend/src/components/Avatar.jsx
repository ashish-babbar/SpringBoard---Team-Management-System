import React from "react";
export default function Avatar({ user, size = "md", className = "" }) {
  const initials = (user?.name || "SB").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className={`avatar avatar-${size} ${className}`} aria-label={user?.name || "User"} title={user?.name || "User"}>
    {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
  </span>;
}
