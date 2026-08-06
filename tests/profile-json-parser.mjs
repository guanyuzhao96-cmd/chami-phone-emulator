import {
  extractTaggedPayload,
  unwrapResponseContent,
} from '../Phone_emulator/api/character-profile-ai.js';

const wrappedSourceResponse = {
  choices: [{
    message: {
      content: `<think>先分析角色。</think>
\`\`\`json
<profile_sources>
{
  "aliases": ["调查员"],
  "entryIndexes": [0,],
}
</profile_sources>
\`\`\``,
    },
  }],
};

const source = extractTaggedPayload(wrappedSourceResponse, 'profile_sources');
if (source.aliases?.[0] !== '调查员' || source.entryIndexes?.[0] !== 0) {
  throw new Error(`Wrapped source response was not parsed: ${JSON.stringify(source)}`);
}

const contentArrayResponse = {
  content: [
    { type: 'reasoning', text: '' },
    {
      type: 'text',
      text: '<profile_data>{“currentStatus”:“正在调查”,“recentEvents”:[“观察窗外”],}</profile_data>',
    },
  ],
};

const profile = extractTaggedPayload(contentArrayResponse, 'profile_data');
if (profile.currentStatus !== '正在调查' || profile.recentEvents?.[0] !== '观察窗外') {
  throw new Error(`Content-array response was not parsed: ${JSON.stringify(profile)}`);
}

const directObject = { aliases: ['小名'], entryIndexes: [3] };
if (extractTaggedPayload(directObject, 'profile_sources') !== directObject) {
  throw new Error('Direct structured object should be accepted without string conversion.');
}

const toolCallResponse = {
  choices: [{
    message: {
      tool_calls: [{ function: { arguments: '{"aliases":[],"entryIndexes":[2]}' } }],
    },
  }],
};

if (!unwrapResponseContent(toolCallResponse).includes('entryIndexes')) {
  throw new Error('Tool-call arguments were not unwrapped.');
}

console.log('Profile JSON parser test passed.');
