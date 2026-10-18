import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import User from '../src/models/User.js';
import Team from '../src/models/Team.js';

async function main() {
  const name = (process.env.ADMIN_NAME || '').trim();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!name || !email || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD (12–72 UTF-8 bytes) in .env first.');
  await connectDatabase();
  let user = await User.findOne({ email }).select('+passwordHash');
  const hash = await bcrypt.hash(password, 12);
  if (user) {
    user.name = name; user.role = 'Admin'; user.isActive = true; user.team = user.team || 'General';
    user.passwordHash = hash; user.mustResetPassword = false; user.passwordChangedAt = new Date();
    await user.save();
  } else {
    user = await User.create({ name, email, role: 'Admin', team: 'General', passwordHash: hash, isActive: true, mustResetPassword: false, passwordChangedAt: new Date() });
  }
  let team = await Team.findOne({ name: 'General' }).collation({ locale: 'en', strength: 2 });
  if (!team) team = await Team.create({ name: 'General', description: 'Default workspace team', createdBy: user._id });
  console.info(`${user.isNew ? 'Created' : 'Prepared'} administrator account: ${email}`);
  console.info('Remove ADMIN_PASSWORD from your environment after setup, and never commit it.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect().catch(() => {}); });
