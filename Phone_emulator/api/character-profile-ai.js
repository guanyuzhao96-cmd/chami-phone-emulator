'use strict';

const DYNAMIC_FIELDS = Object.freeze([
    'currentStatus',
    'currentLocation',
    'currentMood',
    'relationshipWithUser',
    'attitudeTowardUser',
    'currentGoal',
    'currentConflict',
    'recentEvents',
    'importantPromises',
    'secretsRevealed',
    'currentAppearance',
    'currentRelationships',
    'plotProgress',
]);

function emptyDynamicProfile() {
    return {
        currentStatus: '',
        currentLocation: '',
        currentMood: '',
        relationshipWithUser: '',
        attitudeTowardUser: '',
        currentGoal: '',
        currentConflict: '',
        recentEvents: [],
        importantPromises: [],
        secretsRevealed: [],
        currentAppearance: '',
        currentRelationships: [],
        plotProgress: '',
    };
}

function normalizeArray(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        return value
            .split(/\n|；|;/)
            .map(item => item.replace(/^[-*•]\s*/, '').trim())
            .filter(Boolean);
    }
    return [];
}

function normalizeDynamicProfile(value) {
    const source = value && typeof value === 'object' ? value : {};
    const normalized = emptyDynamicProfile();

    for (const field of DYNAMIC_FIELDS) {
        if (Array.isArray(normalized[field])) {
            normalized[field] = normalizeArray(source[field]);
        } else {
            normalized[field] = typeof source[field] === 'string'
                ? source[field].trim()
                : '';
        }
    }

    return normalized;
}

function looksLikePayload(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.prototype.hasOwnProperty.call(value, 'entryIndexes')
        || Object.prototype.hasOwnProperty.call(value, 'aliases')
        || DYNAMIC_FIELDS.some(field => Object.prototype.hasOwnProperty.call(value, field));
}

function unwrapResponseContent(value, seen = new Set()) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        return value
            .map(item => unwrapResponseContent(item, seen))
            .filter(Boolean)
            .join('\n');
    }
    if (typeof value !== 'object' || seen.has(value)) return '';
    if (looksLikePayload(value)) return JSON.stringify(value);

    seen.add(value);

    const preferred = [
        value.content,
        value.text,
        value.output_text,
        value.message?.content,
        value.choices?.[0]?.message?.content,
        value.choices?.[0]?.text,
        value.output?.[0]?.content,
        value.result,
        value.response,
        value.data,
        value.tool_calls?.[0]?.function?.arguments,
    ];

    for (const candidate of preferred) {
        const text = unwrapResponseContent(candidate, seen).trim();
        if (text) return text;
    }

    return '';
}

function extractBalancedObjects(text) {
    const result = [];
    let start = -1;
    let depth = 0;
    let quote = '';
    let escaped = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === quote) {
                quote = '';
            }
            continue;
        }

        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }
        if (char === '{') {
            if (depth === 0) start = index;
            depth += 1;
        } else if (char === '}' && depth > 0) {
            depth -= 1;
            if (depth === 0 && start >= 0) {
                result.push(text.slice(start, index + 1));
                start = -1;
            }
        }
    }

    return result;
}

function repairJsonCandidate(value) {
    return String(value || '')
        .replace(/^\uFEFF/, '')
        .replace(/^```(?:json|javascript|js)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/[“”]/g, '"')
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

function tryParseCandidate(value) {
    const candidate = repairJsonCandidate(value);
    if (!candidate) return null;
    try {
        const parsed = JSON.parse(candidate);
        if (typeof parsed === 'string') {
            return JSON.parse(repairJsonCandidate(parsed));
        }
        return parsed;
    } catch {
        return null;
    }
}

function responsePreview(value) {
    return unwrapResponseContent(value)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 260);
}

function extractTaggedPayload(response, tagName = 'profile_data') {
    if (looksLikePayload(response)) return response;

    const raw = unwrapResponseContent(response)
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
        .trim();

    const safeTag = String(tagName).replace(/[^a-z0-9_-]/gi, '');
    const tagPattern = new RegExp(`<${safeTag}>([\\s\\S]*?)<\\/${safeTag}>`, 'i');
    const tagMatch = raw.match(tagPattern);
    const candidates = [];

    if (tagMatch?.[1]) candidates.push(tagMatch[1]);
    candidates.push(raw);

    for (const fenced of raw.matchAll(/```(?:json|javascript|js)?\s*([\s\S]*?)```/gi)) {
        candidates.push(fenced[1]);
    }
    candidates.push(...extractBalancedObjects(raw));

    for (const candidate of candidates) {
        const parsed = tryParseCandidate(candidate);
        if (parsed && typeof parsed === 'object') return parsed;
    }

    const preview = responsePreview(response);
    const truncationHint = raw.includes('{') && !raw.includes('}')
        ? ' 返回内容可能被截断。'
        : '';
    throw new Error(`模型没有返回可解析的JSON。${truncationHint}${preview ? ` 返回开头：${preview}` : ''}`);
}

function formatMessages(messages) {
    return messages.map((message, index) => {
        const speaker = message.is_user
            ? (window.SillyTavern?.getContext?.()?.name1 || '用户')
            : (message.name || window.SillyTavern?.getContext?.()?.name2 || '角色');
        const content = String(message.mes ?? message.message ?? '')
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
            .replace(/<Analysis>[\s\S]*?<\/Analysis>/gi, '')
            .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi, '')
            .trim();
        return content ? `【第${index + 1}条·${speaker}】\n${content}` : '';
    }).filter(Boolean).join('\n\n');
}

function formatWorldbookEntries(entries, maxChars = 50000) {
    const blocks = [];
    let used = 0;

    for (const entry of entries) {
        const content = String(entry.content || '').trim();
        if (!content) continue;
        const block = [
            `【条目索引：${entry.index}】`,
            `名称：${entry.name}`,
            `UID：${entry.uid ?? '无'}`,
            `启用：${entry.enabled !== false ? '是' : '否'}`,
            content.slice(0, 5000),
        ].join('\n');
        if (used + block.length > maxChars && blocks.length) break;
        blocks.push(block);
        used += block.length;
    }

    return blocks.join('\n\n');
}

function normalizeSourceSelection(value, entries) {
    const source = value && typeof value === 'object' ? value : {};
    const validIndexes = new Set(entries.map(entry => Number(entry.index)));
    const indexes = [...new Set(
        (Array.isArray(source.entryIndexes) ? source.entryIndexes : [])
            .map(item => Number(item))
            .filter(item => Number.isInteger(item) && validIndexes.has(item)),
    )];
    return {
        aliases: normalizeArray(source.aliases),
        entryIndexes: indexes,
    };
}

export class CharacterProfileAI {
    constructor(context) {
        this.ctx = context;
    }

    ensureAvailable() {
        const helper = window.TavernHelper;
        if (!helper || typeof helper.generateRaw !== 'function') {
            throw new Error('未检测到酒馆助手 generateRaw 接口，无法生成动态资料。');
        }
        return helper;
    }

    async selectCharacterSources({
        characterName,
        bookName,
        entries,
        messages,
    }) {
        const helper = this.ensureAvailable();
        const safeEntries = Array.isArray(entries) ? entries : [];
        if (!safeEntries.length) throw new Error(`世界书“${bookName}”没有可读取的有效条目。`);

        const prompts = [
            {
                role: 'system',
                content: `你是角色资料来源筛选器。任务是从用户指定的世界书中，找出与目标角色直接相关的固定资料条目。
规则：
1. 世界书由用户明确选择，不要求与当前角色卡绑定。
2. 只选择能说明目标角色身份、背景、外观、性格、能力、关系、经历或明确约束的条目。
3. 可以选择公共设定条目，但仅限它们会直接约束目标角色时。
4. 不得把聊天中新发生的动态剧情当成固定资料。
5. 结合聊天上下文消除同名或别名歧义。
6. 只输出 <profile_sources> 标签，内部是合法JSON：
{"aliases":["别名"],"entryIndexes":[0,1]}
entryIndexes 必须使用给出的“条目索引”，不要返回UID、名称或解释。`,
            },
            {
                role: 'system',
                content: `【目标角色】\n${characterName}\n\n【用户选择的世界书】\n${bookName}\n\n【世界书条目】\n${formatWorldbookEntries(safeEntries)}`,
            },
            {
                role: 'assistant',
                content: `【当前聊天上下文】\n${formatMessages(messages) || '(没有可用聊天内容)'}`,
            },
            {
                role: 'user',
                content: '筛选固定资料来源，只输出 <profile_sources>JSON</profile_sources>。',
            },
        ];

        const response = await helper.generateRaw({
            user_input: '执行角色固定资料来源筛选任务。',
            max_chat_history: 0,
            should_stream: false,
            should_silence: false,
            ordered_prompts: prompts,
        });

        if (!unwrapResponseContent(response).trim() && !looksLikePayload(response)) {
            throw new Error('模型没有返回固定资料筛选结果。');
        }

        const selected = normalizeSourceSelection(
            extractTaggedPayload(response, 'profile_sources'),
            safeEntries,
        );

        if (!selected.entryIndexes.length) {
            const normalizedName = String(characterName || '').trim().toLowerCase();
            selected.entryIndexes = safeEntries
                .filter(entry => (
                    String(entry.name || '').toLowerCase().includes(normalizedName)
                    || String(entry.content || '').toLowerCase().includes(normalizedName)
                ))
                .map(entry => entry.index);
        }

        if (!selected.entryIndexes.length) {
            throw new Error(`在世界书“${bookName}”中没有识别到与“${characterName}”直接相关的条目。`);
        }

        return selected;
    }

    async generateDynamicProfile({
        characterName,
        fixedContent,
        oldDynamic,
        messages,
    }) {
        const helper = this.ensureAvailable();
        const historyText = formatMessages(messages);

        const systemPrompt = `你是角色动态资料维护器。请严格遵守：
1. “固定资料”来自用户选择的世界书，是不可修改、不可推翻的事实，只能作为约束。
2. 你只能生成“动态资料”，不得复述或改写固定资料。
3. 结合旧动态资料与新增聊天，输出角色此刻的状态。
4. 没有明确变化依据的字段保留旧值；不要凭空制造事件、关系或秘密。
5. 只输出一个 <profile_data> 标签，标签内部必须是合法JSON，不得输出Markdown或解释。
6. JSON字段必须完整包含：
currentStatus, currentLocation, currentMood, relationshipWithUser,
attitudeTowardUser, currentGoal, currentConflict, recentEvents,
importantPromises, secretsRevealed, currentAppearance,
currentRelationships, plotProgress。
其中 recentEvents、importantPromises、secretsRevealed、currentRelationships 必须是字符串数组。`;

        const prompts = [
            { role: 'system', content: systemPrompt },
            {
                role: 'system',
                content: `【目标角色】\n${characterName}\n\n【固定资料·只读】\n${fixedContent || '(未读取到固定世界书资料)'}`,
            },
            {
                role: 'assistant',
                content: `【旧动态资料】\n${JSON.stringify(oldDynamic || emptyDynamicProfile(), null, 2)}`,
            },
            {
                role: 'assistant',
                content: `【本次聊天上下文】\n${historyText || '(没有可用聊天内容)'}`,
            },
            {
                role: 'user',
                content: '现在更新动态资料，只输出 <profile_data>JSON</profile_data>。',
            },
        ];

        const response = await helper.generateRaw({
            user_input: '执行角色动态资料更新任务。',
            max_chat_history: 0,
            should_stream: false,
            should_silence: false,
            ordered_prompts: prompts,
        });

        if (!unwrapResponseContent(response).trim() && !looksLikePayload(response)) {
            throw new Error('模型返回内容为空。');
        }

        return normalizeDynamicProfile(extractTaggedPayload(response, 'profile_data'));
    }
}

export {
    emptyDynamicProfile,
    normalizeDynamicProfile,
    unwrapResponseContent,
    extractTaggedPayload,
};
