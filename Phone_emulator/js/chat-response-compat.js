'use strict';

const PATCH_FLAG = '__chamiChatResponseCompatPatched__';

function stripNoise(value) {
    return String(value ?? '')
        .replace(/^\uFEFF/, '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
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

function tryParse(text) {
    const candidate = findBalancedJson(text) || String(text || '').trim();
    if (!candidate) return null;
    for (const attempt of [
        candidate,
        candidate.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1'),
    ]) {
        try { return JSON.parse(attempt); }
        catch { /* try next */ }
    }
    return null;
}

function unwrapProviderResponse(value) {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    if (typeof value !== 'object') return String(value);
    const candidates = [
        value.choices?.[0]?.message?.content,
        value.choices?.[0]?.text,
        value.candidates?.[0]?.content?.parts?.[0]?.text,
        value.message?.content,
        value.content,
        value.text,
        value.response,
        value.result,
        value.output,
        value.data,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
    return value;
}

function collectMessages(value, output = []) {
    if (value === null || value === undefined) return output;
    if (typeof value === 'string') {
        const text = stripNoise(value);
        if (text) output.push(text);
        return output;
    }
    if (Array.isArray(value)) {
        for (const item of value) collectMessages(item, output);
        return output;
    }
    if (typeof value !== 'object') {
        const text = String(value).trim();
        if (text) output.push(text);
        return output;
    }

    for (const key of ['messages', 'replies']) {
        if (Array.isArray(value[key])) {
            collectMessages(value[key], output);
            if (output.length) return output;
        }
    }

    for (const key of ['content', 'message', 'reply', 'response', 'text']) {
        if (typeof value[key] === 'string' && value[key].trim()) {
            collectMessages(value[key], output);
            return output;
        }
    }

    for (const item of Object.values(value)) {
        if (typeof item === 'string') collectMessages(item, output);
    }
    return output;
}

function toLegacyObject(messages) {
    return Object.fromEntries(
        messages
            .map(message => stripNoise(message))
            .filter(Boolean)
            .map((message, index) => [String(index + 1), message]),
    );
}

export function normalizePhoneChatResponse(rawResponse) {
    const unwrapped = unwrapProviderResponse(rawResponse);

    if (typeof unwrapped === 'object' && unwrapped !== null) {
        const messages = collectMessages(unwrapped);
        return JSON.stringify(toLegacyObject(messages));
    }

    const cleaned = stripNoise(unwrapped);
    if (!cleaned) return cleaned;
    const parsed = tryParse(cleaned);
    const messages = parsed === null
        ? collectMessages(cleaned)
        : collectMessages(parsed);
    return JSON.stringify(toLegacyObject(messages));
}

export function patchPhoneChatResponseCompat(aiRequest, context = null) {
    if (!aiRequest || typeof aiRequest.sendChatRequest !== 'function') return false;
    if (aiRequest[PATCH_FLAG]) return true;

    const original = aiRequest.sendChatRequest.bind(aiRequest);
    aiRequest.sendChatRequest = async (...args) => {
        const response = await original(...args);
        const normalized = normalizePhoneChatResponse(response);
        if (!normalized || normalized === '{}') {
            context?.warn?.('chat-response-compat', '聊天AI返回为空，保留原始响应');
            return response;
        }
        return normalized;
    };
    Object.defineProperty(aiRequest, PATCH_FLAG, {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false,
    });
    return true;
}
