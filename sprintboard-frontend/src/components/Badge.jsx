import React from "react";
export function StatusBadge({ status }) {
  const value = (status || "Todo").toLowerCase().replace(/\s+/g, "-");
  return <span className={`badge status-${value}`}><i />{status || "Todo"}</span>;
}
export function PriorityBadge({ priority }) {
  return <span className={`badge priority-${(priority || "Low").toLowerCase()}`}>{priority || "Low"}</span>;
}
