import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import User from '../src/models/User.js';
import Session from '../src/models/Session.js';
import Team from '../src/models/Team.js';
import Counter from '../src/models/Counter.js';
import FileAsset from '../src/models/FileAsset.js';
import Task from '../src/models/Task.js';
import Notification from '../src/models/Notification.js';
import ActivityLog from '../src/models/ActivityLog.js';
import PasswordReset from '../src/models/PasswordReset.js';

async function main() {
  await connectDatabase();
  // createIndexes adds indexes declared by these schemas without dropping unrelated indexes.
  for (const model of [User, Session, Team, Counter, FileAsset, Task, Notification, ActivityLog, PasswordReset]) {
    await model.createIndexes();
    console.info(`Indexes verified: ${model.modelName}`);
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect().catch(() => {}); });
