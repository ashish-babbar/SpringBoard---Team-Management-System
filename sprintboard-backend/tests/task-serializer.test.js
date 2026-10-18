import test from 'node:test';
import assert from 'node:assert/strict';
import { taskDto } from '../src/utils/serializers.js';

test('task serializer returns every populated assignee', () => {
  const task = taskDto({
    _id: 'task-id',
    taskCode: 'SB-0001',
    title: 'Shared task',
    assigneeId: { _id: 'user-1', name: 'Priya', avatarFileId: 'avatar-1' },
    assigneeIds: [
      { _id: 'user-1', name: 'Priya', avatarFileId: 'avatar-1' },
      { _id: 'user-2', name: 'Rohan', avatarFileId: '' }
    ],
    createdBy: 'creator-id',
    attachments: []
  });

  assert.deepEqual(task.assigneeIds, ['user-1', 'user-2']);
  assert.deepEqual(task.assignees.map(({ id, name }) => ({ id, name })), [
    { id: 'user-1', name: 'Priya' },
    { id: 'user-2', name: 'Rohan' }
  ]);
  assert.equal(task.assigneeId, 'user-1');
  assert.equal(task.assignee, 'Priya');
});

test('task serializer keeps legacy single-assignee records compatible', () => {
  const task = taskDto({
    _id: 'task-id',
    taskCode: 'SB-0002',
    title: 'Legacy task',
    assigneeId: { _id: 'user-1', name: 'Priya', avatarFileId: '' },
    createdBy: 'creator-id',
    attachments: []
  });

  assert.deepEqual(task.assigneeIds, ['user-1']);
  assert.deepEqual(task.assignees.map(({ id, name }) => ({ id, name })), [{ id: 'user-1', name: 'Priya' }]);
  assert.equal(task.assignee, 'Priya');
});
