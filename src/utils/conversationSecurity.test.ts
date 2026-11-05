import test from 'node:test';
import assert from 'node:assert/strict';

// Helper representing the security invariant in useConversations
function sanitizeMessagePayload(msg: any, userId: string) {
  const sanitized: Record<string, any> = {
    id: msg.id,
    conversationId: msg.conversationId,
    userId: userId,
    role: msg.role,
    content: msg.content || '',
    createdAt: msg.createdAt || new Date().toISOString()
  };
  if (msg.model) sanitized.model = msg.model;
  if (msg.attachments && msg.attachments.length > 0) sanitized.attachments = msg.attachments;
  if (msg.artifacts && msg.artifacts.length > 0) sanitized.artifacts = msg.artifacts;
  if (msg.isStreaming !== undefined) sanitized.isStreaming = Boolean(msg.isStreaming);
  return sanitized;
}

test('sanitizeMessagePayload enforces authenticated userId and eliminates undefined fields', () => {
  const authUid = 'user_google_12345';
  const rawMsg = {
    id: 'msg_9876',
    conversationId: 'conv_1234',
    userId: 'active_user', // previously buggy hardcoded value
    role: 'user',
    content: 'Create a dashboard',
    artifacts: undefined,
    model: undefined
  };

  const clean = sanitizeMessagePayload(rawMsg, authUid);
  assert.equal(clean.userId, authUid);
  assert.equal(clean.id, 'msg_9876');
  assert.equal(clean.role, 'user');
  assert.equal(clean.content, 'Create a dashboard');
  assert.equal('artifacts' in clean, false);
  assert.equal('model' in clean, false);
});

test('sanitizeMessagePayload assigns authenticated userId to assistant messages', () => {
  const authUid = 'user_google_12345';
  const rawAssistantMsg = {
    id: 'msg_9877',
    conversationId: 'conv_1234',
    userId: 'assistant', // previously buggy hardcoded value
    role: 'assistant',
    content: 'Here is your dashboard',
    model: 'LUMA 1.0',
    artifacts: [{ id: 'art_1', title: 'Dashboard' }]
  };

  const clean = sanitizeMessagePayload(rawAssistantMsg, authUid);
  assert.equal(clean.userId, authUid);
  assert.equal(clean.role, 'assistant');
  assert.equal(clean.model, 'LUMA 1.0');
  assert.equal(clean.artifacts.length, 1);
});
