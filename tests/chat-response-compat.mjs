import assert from 'node:assert/strict';
import {
  normalizePhoneChatResponse,
  patchPhoneChatResponseCompat,
} from '../Phone_emulator/js/chat-response-compat.js';

assert.equal(
  normalizePhoneChatResponse('你好，我收到了。'),
  '{"1":"你好，我收到了。"}',
  'plain text should become one legacy chat message',
);
assert.equal(
  normalizePhoneChatResponse('{"1":"你好。","2":"我收到了。"}'),
  '{"1":"你好。","2":"我收到了。"}',
  'legacy numbered object should remain compatible',
);
assert.equal(
  normalizePhoneChatResponse('{"content":"你好，我收到了。","type":"text"}'),
  '{"1":"你好，我收到了。"}',
  'common content/type object must not turn type metadata into a chat message',
);
assert.equal(
  normalizePhoneChatResponse('[{"role":"assistant","content":"第一句"},{"content":"第二句","type":"text"}]'),
  '{"1":"第一句","2":"第二句"}',
  'array response should be flattened into chat messages',
);
assert.equal(
  normalizePhoneChatResponse('```json\n{"reply":"回复内容",}\n```'),
  '{"1":"回复内容"}',
  'markdown and trailing commas should be tolerated',
);
assert.equal(
  normalizePhoneChatResponse({ choices: [{ message: { content: 'OpenAI兼容返回' } }] }),
  '{"1":"OpenAI兼容返回"}',
  'provider response envelopes should be unwrapped',
);

const fakeAI = {
  async sendChatRequest() {
    return '{"role":"assistant","content":"兼容层测试","type":"text"}';
  },
};
assert.equal(patchPhoneChatResponseCompat(fakeAI), true);
assert.equal(
  await fakeAI.sendChatRequest('角色', '消息'),
  '{"1":"兼容层测试"}',
  'patched sendChatRequest should normalize the response before the old chat parser sees it',
);
assert.equal(patchPhoneChatResponseCompat(fakeAI), true, 'patching twice should be harmless');

console.log('Chat response compatibility tests passed.');
