export const demoTasks = [
  { id: "SB-0248", title: "Redesign landing page", description: "Create a polished, responsive landing page for the SprintBoard workspace. Update navigation, hero hierarchy, and responsive layouts.", team: "Product Design", assignee: "Ashish Babbar", assigneeId: "u1", priority: "High", status: "In progress", dueDate: "2026-10-20", createdBy: "Ashish Babbar", attachments: [], updatedAt: "2026-10-17T12:00:00.000Z" },
  { id: "SB-0247", title: "API authentication flow", description: "Connect login and protected routes to the authentication API.", team: "Engineering", assignee: "Priya Sharma", assigneeId: "u2", priority: "High", status: "In progress", dueDate: "2026-10-21", createdBy: "Ashish Babbar", attachments: [], updatedAt: "2026-10-17T10:00:00.000Z" },
  { id: "SB-0246", title: "Create team settings", description: "Build settings for team membership and workspace preferences.", team: "Engineering", assignee: "Rohan Mehta", assigneeId: "u3", priority: "Medium", status: "Todo", dueDate: "2026-10-22", createdBy: "Ashish Babbar", attachments: [], updatedAt: "2026-10-16T10:00:00.000Z" },
  { id: "SB-0245", title: "QA dashboard filters", description: "Verify search, sorting, and filter combinations on the dashboard.", team: "Quality Assurance", assignee: "Neha Kapoor", assigneeId: "u4", priority: "Low", status: "Done", dueDate: "2026-10-18", createdBy: "Ashish Babbar", attachments: [], updatedAt: "2026-10-16T09:00:00.000Z" },
  { id: "SB-0244", title: "Prepare release notes", description: "Summarize the changes planned for the next SprintBoard release.", team: "Product Design", assignee: "Ashish Babbar", assigneeId: "u1", priority: "Low", status: "Todo", dueDate: "2026-10-25", createdBy: "Ashish Babbar", attachments: [], updatedAt: "2026-10-15T09:00:00.000Z" },
  { id: "SB-0243", title: "Mobile responsive QA", description: "Check layouts at common phone and tablet widths.", team: "Quality Assurance", assignee: "Priya Sharma", assigneeId: "u2", priority: "Medium", status: "In progress", dueDate: "2026-10-26", createdBy: "Ashish Babbar", attachments: [], updatedAt: "2026-10-14T09:00:00.000Z" }
];

export const demoTeams = [
  { id: "t1", name: "Product Design", description: "Research, UX, and product experience", members: 8, tasks: 24, progress: 76, color: "teal" },
  { id: "t2", name: "Engineering", description: "Frontend, backend, and infrastructure", members: 12, tasks: 48, progress: 68, color: "blue" },
  { id: "t3", name: "Marketing", description: "Campaigns and product communication", members: 6, tasks: 18, progress: 82, color: "purple" },
  { id: "t4", name: "Quality Assurance", description: "Testing, quality, and release checks", members: 5, tasks: 22, progress: 88, color: "green" },
  { id: "t5", name: "Operations", description: "Processes and internal workflows", members: 4, tasks: 16, progress: 64, color: "orange" },
  { id: "t6", name: "Customer Success", description: "Customer onboarding and support", members: 7, tasks: 20, progress: 73, color: "pink" }
];

export const demoMembers = [
  { id: "u1", name: "Ashish Babbar", email: "ashish@example.com", role: "Admin", team: "Product Design", avatarUrl: "" },
  { id: "u2", name: "Priya Sharma", email: "priya@example.com", role: "Employee", team: "Engineering", avatarUrl: "" },
  { id: "u3", name: "Rohan Mehta", email: "rohan@example.com", role: "Employee", team: "Engineering", avatarUrl: "" },
  { id: "u4", name: "Neha Kapoor", email: "neha@example.com", role: "Employee", team: "Quality Assurance", avatarUrl: "" },
  { id: "u5", name: "Kabir Singh", email: "kabir@example.com", role: "Employee", team: "Marketing", avatarUrl: "" }
];

export const demoNotifications = [
  { id: "n1", title: "New task assigned", message: "Priya assigned you “API authentication flow”.", time: "2 min ago", read: false },
  { id: "n2", title: "Task due soon", message: "“Redesign landing page” is due tomorrow.", time: "1 hour ago", read: false },
  { id: "n3", title: "Comment mention", message: "Neha mentioned you in QA dashboard filters.", time: "3 hours ago", read: true },
  { id: "n4", title: "Task completed", message: "Rohan completed “Create team settings”.", time: "Yesterday", read: true },
  { id: "n5", title: "Team invitation", message: "You were added to the Engineering team.", time: "Yesterday", read: true }
];
