import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import User from '../src/models/User.js';
import Team from '../src/models/Team.js';
import Task from '../src/models/Task.js';
import Counter from '../src/models/Counter.js';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed demo accounts in production.');
  await connectDatabase();
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'DemoAdminPass123!';
  const employeePassword = process.env.DEMO_EMPLOYEE_PASSWORD || 'DemoEmployeePass123!';
  for (const [name, password] of [['DEMO_ADMIN_PASSWORD', adminPassword], ['DEMO_EMPLOYEE_PASSWORD', employeePassword]]) {
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error(`${name} must be 12–72 UTF-8 bytes.`);
  }
  if (adminPassword === employeePassword) throw new Error('DEMO_ADMIN_PASSWORD and DEMO_EMPLOYEE_PASSWORD must be different.');
  const passwordHashes = {
    Admin: await bcrypt.hash(adminPassword, 12),
    Employee: await bcrypt.hash(employeePassword, 12)
  };
  const userSpecs = [
    ['Ashish Babbar', 'ashish@example.com', 'Admin', 'Product Design'],
    ['Priya Sharma', 'priya@example.com', 'Employee', 'Engineering'],
    ['Rohan Mehta', 'rohan@example.com', 'Employee', 'Engineering'],
    ['Neha Kapoor', 'neha@example.com', 'Employee', 'Quality Assurance'],
    ['Kabir Singh', 'kabir@example.com', 'Employee', 'Marketing']
  ];
  const users = {};
  for (const [name, email, role, team] of userSpecs) {
    users[email] = await User.findOneAndUpdate({ email }, { $set: { name, role, team, passwordHash: passwordHashes[role], isActive: true, mustResetPassword: false } }, { upsert: true, new: true, setDefaultsOnInsert: true }).select('+passwordHash');
  }
  const admin = users['ashish@example.com'];
  const teamSpecs = [
    ['Product Design', 'Research, UX, and product experience', 'teal'],
    ['Engineering', 'Frontend, backend, and infrastructure', 'blue'],
    ['Marketing', 'Campaigns and product communication', 'purple'],
    ['Quality Assurance', 'Testing, quality, and release checks', 'green'],
    ['Operations', 'Processes and internal workflows', 'orange'],
    ['Customer Success', 'Customer onboarding and support', 'pink']
  ];
  for (const [name, description, color] of teamSpecs) await Team.findOneAndUpdate({ name }, { $set: { description, color, createdBy: admin._id } }, { upsert: true, new: true, setDefaultsOnInsert: true }).collation({ locale: 'en', strength: 2 });
  const specs = [
    ['Redesign landing page', 'Create a polished responsive landing page and refine navigation.', 'Product Design', 'Ashish Babbar', 'High', 'In progress', '2026-10-20'],
    ['API authentication flow', 'Connect login and protected routes to the authentication API.', 'Engineering', 'Priya Sharma', 'High', 'In progress', '2026-10-21'],
    ['Create team settings', 'Build settings for team membership and workspace preferences.', 'Engineering', 'Rohan Mehta', 'Medium', 'Todo', '2026-10-22'],
    ['QA dashboard filters', 'Verify search, sorting, and filter combinations.', 'Quality Assurance', 'Neha Kapoor', 'Low', 'Done', '2026-10-18'],
    ['Prepare release notes', 'Summarize changes planned for the next release.', 'Product Design', 'Ashish Babbar', 'Low', 'Todo', '2026-10-25'],
    ['Mobile responsive QA', 'Check layouts at common phone and tablet widths.', 'Quality Assurance', 'Priya Sharma', 'Medium', 'In progress', '2026-10-26']
  ];
  let seq = Number((await Counter.findById('taskCode').lean())?.seq || 0);
  for (let i = 0; i < specs.length; i++) {
    const [title, description, team, assigneeName, priority, status, dueDate] = specs[i];
    const assignee = Object.values(users).find((u) => u.name === assigneeName);
    let task = await Task.findOne({ title, team });
    if (!task) {
      seq += 1;
      task = await Task.create({ taskCode: `SB-${String(seq).padStart(4, '0')}`, title, description, team, assigneeId: assignee?._id || null, priority, status, dueDate, createdBy: admin._id });
    } else Object.assign(task, { description, assigneeId: assignee?._id || null, priority, status, dueDate, createdBy: admin._id }), await task.save();
  }
  await Counter.findOneAndUpdate({ _id: 'taskCode' }, { $max: { seq } }, { upsert: true, new: true });
  console.info('Demo seed ready. Admin and employee accounts use separate development passwords.');
  console.info('Development only: do not seed demo users into a production database.');
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect().catch(() => {}); });
