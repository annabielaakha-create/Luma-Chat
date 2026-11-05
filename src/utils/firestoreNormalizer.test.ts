import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFirestoreData } from './firestoreNormalizer.js';

test('normalizeFirestoreData strips undefined from top-level and nested objects', () => {
  const input = {
    id: 'msg_1',
    content: 'hello',
    language: undefined,
    metadata: {
      tags: ['a', undefined, 'b'],
      nestedUndef: undefined,
      nestedValid: 'ok'
    }
  };

  const output = normalizeFirestoreData(input);

  assert.equal('language' in output, false);
  assert.equal('nestedUndef' in output.metadata, false);
  assert.equal(output.id, 'msg_1');
  assert.equal(output.content, 'hello');
  assert.equal(output.metadata.nestedValid, 'ok');
  assert.deepEqual(output.metadata.tags, ['a', 'b']);
});

test('normalizeFirestoreData preserves null, false, 0, and empty string', () => {
  const input = {
    zeroVal: 0,
    falseVal: false,
    emptyStr: '',
    nullVal: null,
    undefVal: undefined,
    emptyArr: []
  };

  const output = normalizeFirestoreData(input);

  assert.equal(output.zeroVal, 0);
  assert.equal(output.falseVal, false);
  assert.equal(output.emptyStr, '');
  assert.equal(output.nullVal, null);
  assert.equal('undefVal' in output, false);
  assert.deepEqual(output.emptyArr, []);
});

test('normalizeFirestoreData handles typical artifact and attachment payloads', () => {
  const chatMsg = {
    id: 'msg_123',
    conversationId: 'conv_456',
    role: 'assistant',
    content: 'Here is an SVG diagram',
    artifacts: [
      {
        id: 'art_1',
        conversationId: 'conv_456',
        messageId: 'msg_123',
        title: 'Network Diagram',
        type: 'svg',
        language: undefined, // this previously caused the Firestore crash
        content: '<svg viewBox="0 0 100 100"></svg>',
        version: 1,
        createdAt: '2026-03-31T00:00:00Z'
      }
    ],
    attachments: [
      {
        id: 'att_1',
        name: 'spec.pdf',
        type: 'application/pdf',
        size: 1024,
        dataUrl: undefined,
        extractedText: 'Spec contents'
      }
    ]
  };

  const cleaned = normalizeFirestoreData(chatMsg);

  assert.equal('language' in cleaned.artifacts[0], false);
  assert.equal('dataUrl' in cleaned.attachments[0], false);
  assert.equal(cleaned.artifacts[0].type, 'svg');
  assert.equal(cleaned.attachments[0].name, 'spec.pdf');
});
