'use strict';

const FEATURE_NAME = 'characterProfile';
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
    return Boolean(value && typeof value === 'object' && (
        Array.isArray(value.entryIndexes)
        || Object.prototype.hasOwnProperty.call(value, 'currentStatus')
        || Object.prototype.hasOwnProperty.call(value, 'relationshipWithUser')
    ));
}

function unwrapResponseContent(value, seen = new Set()) {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    if (looksLikePayload(value)) return JSON.stringify(value);
    if (typeof value !== 'object' || seen.has(value)) return String(value || '');
    seen.add(value);

    const directCandidates = [
        value.content,
        value.text,
        value.response,
        value.result,
        value.output,
        value.data,
        value.message?.content,
        value.choices?.[0]?.message?.content,
        value.choices?.[0]?.text,
        value.candidates?.[0]?.content?.parts?.[0]?.text,
        value.candidates?.[0]?.content,
    ];
    for (const candidate of directCandidates) {
        const unwrapped = unwrapResponseContent(candidate, seen);
        if (unwrapped.trim()) return unwrapped;
    }
    return '';
}

function stripModelNoise(text) {
    return String(text || '')
        .replace(/^\uFEFF/, '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
        .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi, '')
        .replace(/```(?:json|JSON)?\s*/g, '')
        .replace(/```/g, '')
        .trim();
}

function findBalancedJson(text) {
    const source = String(text || '');
    for (let start = 0; start < source.length; start += 1) {
        const opening = source[start];
        if (opening !== '{' && opening !== '[') continue;
        const closing = opening === '{' ? '}' : ']';
        let depth = 0;
        let quoted = false;
        let escaped = false;
        for (let index = start; index < source.length; index += 1) {
            const char = source[index];
            if (quoted) {
                if (escaped) escaped = false;
                else if (char === '\\') escaped = true;
                else if (char === '"') quoted = false;
                continue;
            }
            if (char === '"') {
                quoted = true;
                continue;
            }
            if (char === opening) depth += 1;
            if (char === closing) depth -= 1;
            if (depth === 0) return source.slice(start, index + 1);
        }
    }
    return '';
}

function parseJsonCandidate(candidate) {
    const attempts = [
        candidate,
        candidate
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'")
            .replace(/,\s*([}\]])/g, '$1'),
    ];
    let lastError = null;
    for (const attempt of attempts) {
        try {
            return JSON.parse(attempt);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('JSON解析失败');
}

function extractTaggedPayload(value, tagName = 'profile_data') {
    if (looksLikePayload(value)) return value;
    const raw = stripModelNoise(unwrapResponseContent(value));
    const safeTag = String(tagName).replace(/[^a-z0-9_-]/gi, '');
    const tagPattern = new RegExp(`<${safeTag}>([\\s\\S]*?)<\\/${safeTag}>`, 'i');
    const tagMatch = raw.match(tagPattern);
    const tagged = stripModelNoise(tagMatch ? tagMatch[1] : raw);
    const candidate = findBalancedJson(tagged) || tagged;

    try {
        return parseJsonCandidate(candidate);
    } catch (error) {
        const preview = raw.replace(/\s+/g, ' ').slice(0, 220);
        throw new Error(`模型没有返回可用的JSON。实际返回：${preview || '(空内容)'}`);
    }
}

function formatMessages(messages) {
    return messages.map((message, index) => {
        const speaker = message.is_user
            ? (window.SillyTavern?.getContext?.()?.name1 || '用户')
            : (message.name || window.SillyTavern?.getContext?.()?.name2 || '角色');
        const content = stripModelNoise(message.mes ?? message.message ?? '');
        return content ? `【第${index + 1}条·${speaker}】\n${content}` : '';
    }).filter(Boolean).join('\n\n');
}

function formatWorldbookEntries(entries, maxChars = 70000) {
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
            content.slice(0, 6000),
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

function selectJailbreakFrame(messages) {
    const source = Array.isArray(messages) ? messages : [];
    const patterns = [
        /Initialize Stable Diffusion Narrative Weaver/i,
        /SYSTEM OVERRIDE: ROOT ACCESS GRANTED/i,
        /^understand!/i,
        /Operational Context: Internal Creative Studio/i,
        /<ROOT_MODE_ACTIVE>/i,
    ];
    const selected = [];
    for (const pattern of patterns) {
        const item = source.find(message => pattern.test(String(message?.content || '').trim()));
        if (item) selected.push({ role: item.role, content: item.content });
    }
    return selected;
}

export class CharacterProfileAI {
    constructor(context, storage = null) {
        this.ctx = context;
        this.storage = storage;
    }

    getRuntime() {
        const runtime = window.__CHAMI_PHONE_AI_RUNTIME__;
        if (!runtime?.aiRequest || typeof runtime.aiRequest.request !== 'function') {
            throw new Error('手机AI运行时尚未就绪，请刷新页面后重试。');
        }
        return runtime;
    }

    async getApiConfig() {
        const runtime = this.getRuntime();
        const settings = this.storage?.getSettings?.() || {};
        const selectedId = String(settings.apiPresetId || '').trim();
        const configs = typeof runtime.chatStorage?.getAllAPIConfigs === 'function'
            ? await runtime.chatStorage.getAllAPIConfigs()
            : [];
        const usable = (Array.isArray(configs) ? configs : []).filter(config => (
            config && typeof config === 'object' && String(config.apiUrl || '').trim()
        ));

        if (selectedId) {
            const selected = usable.find(config => (
                String(config.configId || config.id || '') === selectedId
            ));
            if (selected) return selected;
            throw new Error('角色资料所选API预设已不存在，请在手机设置→预设配置中重新选择。');
        }

        let activeId = '';
        try {
            activeId = String(await runtime.chatStorage?.getActiveApiConfigId?.() || '');
        } catch { /* 继续使用运行时当前配置 */ }
        const active = usable.find(config => String(config.configId || config.id || '') === activeId);
        if (active) return active;
        if (runtime.aiRequest.settings?.apiUrl) return runtime.aiRequest.settings;
        if (usable[0]) return usable[0];

        throw new Error('没有可用的手机API。请先在手机设置→API配置中添加接口，再到预设配置→角色资料中选择。');
    }

    getJailbreakFrame() {
        const preset = this.getRuntime().aiRequest?.preset;
        if (!preset || typeof preset._getCharacterUpdateMessages !== 'function') return [];
        try {
            return selectJailbreakFrame(preset._getCharacterUpdateMessages({}, {}));
        } catch (error) {
            this.ctx?.warn?.('character-profile-ai', '读取手机破限模板失败，将使用角色资料任务模板', error);
            return [];
        }
    }

    buildMessages(taskMessages) {
        const frame = this.getJailbreakFrame();
        const opening = frame.slice(0, 3);
        const closing = frame.slice(3);
        return [
            ...opening,
            ...taskMessages,
            ...closing,
            {
                role: 'assistant',
                content: '收到。我会严格执行角色资料任务，并只输出指定标签包裹的合法JSON。',
            },
        ];
    }

    async request(taskMessages) {
        const runtime = this.getRuntime();
        const apiConfig = await this.getApiConfig();
        const messages = this.buildMessages(taskMessages);
        return runtime.aiRequest.request(messages, apiConfig);
    }

    async selectCharacterSources({ characterName, bookName, entries, messages }) {
        const safeEntries = Array.isArray(entries) ? entries : [];
        if (!safeEntries.length) throw new Error(`世界书“${bookName}”没有可读取的有效条目。`);

        const response = await this.request([
            {
                role: 'system',
                content: `你是角色资料来源筛选器。任务是从用户指定的世界书中，找出与目标角色直接相关的固定资料条目。
规则：
1. 世界书由用户明确选择，不要求与当前角色卡绑定。
2. 只选择能说明目标角色身份、背景、外观、性格、能力、关系、经历或明确约束的条目。
3. 公共设定只有在直接约束目标角色时才可选择。
4. 不得把聊天中新发生的动态剧情当成固定资料。
5. 结合聊天上下文消除同名或别名歧义。
6. 只输出 <profile_sources> 标签，内部是合法JSON：
{"aliases":["别名"],"entryIndexes":[0,1]}
entryIndexes 必须使用给出的条目索引，不得返回UID、条目名称或解释。`,
            },
            {
                role: 'user',
                content: `【目标角色】\n${characterName}\n\n【用户选择的世界书】\n${bookName}\n\n【世界书条目】\n${formatWorldbookEntries(safeEntries)}\n\n【当前聊天上下文】\n${formatMessages(messages) || '(没有可用聊天内容)'}\n\n筛选固定资料来源，只输出 <profile_sources>JSON</profile_sources>。`,
            },
        ]);

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

    async generateDynamicProfile({ characterName, fixedContent, oldDynamic, messages }) {
        const response = await this.request([
            {
                role: 'system',
                content: `你是角色动态资料维护器。请严格遵守：
1. 固定资料来自用户选择的世界书，是不可修改、不可推翻的事实，只能作为约束。
2. 只能生成会随剧情变化的动态资料，不得复述或改写固定资料。
3. 结合旧动态资料与本次聊天，输出角色此刻的状态。
4. 没有明确变化依据的字段保留旧值，不得凭空制造事件、关系、承诺或秘密。
5. 只输出一个 <profile_data> 标签，内部必须是合法JSON，不得输出Markdown或解释。
6. JSON字段必须完整包含：currentStatus, currentLocation, currentMood, relationshipWithUser, attitudeTowardUser, currentGoal, currentConflict, recentEvents, importantPromises, secretsRevealed, currentAppearance, currentRelationships, plotProgress。
7. recentEvents、importantPromises、secretsRevealed、currentRelationships 必须是字符串数组。`,
            },
            {
                role: 'user',
                content: `【目标角色】\n${characterName}\n\n【固定资料·只读】\n${fixedContent || '(未读取到固定世界书资料)'}\n\n【旧动态资料】\n${JSON.stringify(oldDynamic || emptyDynamicProfile(), null, 2)}\n\n【本次聊天上下文】\n${formatMessages(messages) || '(没有可用聊天内容)'}\n\n现在更新动态资料，只输出 <profile_data>JSON</profile_data>。`,
            },
        ]);

        return normalizeDynamicProfile(extractTaggedPayload(response, 'profile_data'));
    }
}

export {
    FEATURE_NAME,
    emptyDynamicProfile,
    normalizeDynamicProfile,
    unwrapResponseContent,
    extractTaggedPayload,
};
