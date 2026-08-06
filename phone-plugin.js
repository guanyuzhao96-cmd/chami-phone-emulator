'use strict';

import { pluginContext as legacyContext } from './core/plugin-context.js';
import { initPhoneEmulator } from './Phone_emulator/index.js';

const PLUGIN_ID = 'chami-phone-emulator';
const VERSION = '1.0.1';
const MODULE_NAME = 'phoneEmulator';
const STORAGE_PREFIX = 'chami_phone_fallback:';

let initialized = false;
let phoneInstance = null;
let contextReady = false;

function traceAccess(scope, property, value) {
    const trace = window.__CHAMI_PHONE_ACCESS_TRACE__ = window.__CHAMI_PHONE_ACCESS_TRACE__ || [];
    trace.push({ scope, property: String(property), type: typeof value });
    if (trace.length > 60) trace.shift();
}

function setStatus(stage, error = null) {
    window.__CHAMI_PHONE_STATUS__ = {
        stage,
        error: error ? String(error?.stack || error?.message || error) : null,
        missingApiMethods: [...(window.__CHAMI_PHONE_MISSING_API_METHODS__ || [])],
        accessTrace: [...(window.__CHAMI_PHONE_ACCESS_TRACE__ || [])],
        timestamp: Date.now(),
    };
}

function getSTContext() { return window.SillyTavern?.getContext?.() || null; }

function showToast(message, type = 'info') {
    if (window.toastr?.[type]) { window.toastr[type](message); return; }
    console[type === 'error' ? 'error' : 'log'](`[${PLUGIN_ID}] ${message}`);
}

function fallbackStorageKey(method, args) {
    return `${STORAGE_PREFIX}${String(method)}:${args.length ? String(args[0]) : 'default'}`;
}

function createFallbackMethod(method) {
    return async (...args) => {
        const name = String(method);
        const key = fallbackStorageKey(name, args);
        if (/^(get|load|read)/i.test(name)) {
            const fallback = args.length > 1 ? args[1] : null;
            try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
            catch { return fallback; }
        }
        if (/^(delete|remove|clear)/i.test(name)) { localStorage.removeItem(key); return true; }
        if (/^(set|save|write|update|create)/i.test(name)) {
            const value = args.length > 1 ? args[1] : args[0];
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        }
        return null;
    };
}

function traceObject(scope, object, allowFallback = false) {
    const missing = allowFallback
        ? (window.__CHAMI_PHONE_MISSING_API_METHODS__ = window.__CHAMI_PHONE_MISSING_API_METHODS__ || new Set())
        : null;
    return new Proxy(object || {}, {
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);
            traceAccess(scope, property, value);
            if (typeof value === 'function') return value.bind(target);
            if (value !== undefined && value !== null) return value;
            if (allowFallback && typeof property === 'string') {
                missing.add(property);
                return createFallbackMethod(property);
            }
            return value;
        },
    });
}

async function ensurePhoneContext() {
    if (contextReady) return;
    setStatus('initializing-context');
    if (typeof legacyContext?.init === 'function') await legacyContext.init();
    else if (legacyContext?.db && typeof legacyContext.db.init === 'function') await legacyContext.db.init();
    else throw new Error('手机基础上下文不可用。');
    if (!legacyContext.api || !legacyContext.db || !legacyContext.events) throw new Error('手机基础上下文初始化不完整。');
    contextReady = true;
    setStatus('context-ready');
}

function createPhoneContext() {
    const modules = new Map();
    const context = {
        PLUGIN_NAME: PLUGIN_ID,
        VERSION,
        version: VERSION,
        api: traceObject('api', legacyContext.api, true),
        events: traceObject('events', legacyContext.events),
        db: traceObject('db', legacyContext.db),
        helpers: traceObject('helpers', { ...legacyContext.helpers, showToast }),
        getSTContext,
        getContext: getSTContext,
        registerModule(name, module) { modules.set(name, module); },
        getModule(name) { return modules.get(name) || null; },
        log(scope, ...args) { console.log(`[ChamiPhone/${scope}]`, ...args); },
        warn(scope, ...args) { console.warn(`[ChamiPhone/${scope}]`, ...args); },
        error(scope, ...args) { console.error(`[ChamiPhone/${scope}]`, ...args); },
        async cleanup() {
            for (const module of modules.values()) {
                try { await module?.cleanup?.(); } catch (error) { console.error('[ChamiPhone/cleanup]', error); }
            }
            modules.clear();
        },
    };
    return traceObject('context', context);
}

async function waitForSillyTavern(timeoutMs = 30000) {
    setStatus('waiting-for-sillytavern');
    const start = Date.now();
    while (!window.SillyTavern?.getContext) {
        if (Date.now() - start > timeoutMs) throw new Error('等待 SillyTavern 初始化超时。');
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    setStatus('sillytavern-ready');
}

async function initializeStandalonePhone() {
    if (initialized || window.__CHAMI_STANDALONE_PHONE_LOADED__) return;
    setStatus('starting');
    await waitForSillyTavern();
    if (document.querySelector('.tsp-phone-fab')) {
        setStatus('duplicate-phone-detected');
        showToast('检测到另一个模拟手机实例。请在原酒馆场景插件中关闭“手机模拟器”，然后刷新页面。', 'warning');
        return;
    }
    await ensurePhoneContext();
    const phoneContext = createPhoneContext();
    setStatus('initializing-phone');
    await initPhoneEmulator(phoneContext);
    phoneInstance = phoneContext.getModule(MODULE_NAME);
    if (!phoneInstance || !document.querySelector('.tsp-phone-fab')) throw new Error('手机主体初始化完成，但未创建悬浮按钮。');
    setStatus('loading-character-profile');
    await import('./Phone_emulator/js/character-profile-bootstrap.js');
    initialized = true;
    window.__CHAMI_STANDALONE_PHONE_LOADED__ = true;
    window.ChamiPhoneEmulator = {
        id: PLUGIN_ID, version: VERSION, context: phoneContext, instance: phoneInstance,
        open: () => phoneInstance?.openModal?.(), close: () => phoneInstance?.closeModal?.(),
    };
    setStatus('ready');
    showToast('独立模拟手机已加载', 'success');
}

initializeStandalonePhone().catch(error => {
    setStatus('failed', error);
    console.error('[ChamiPhone/bootstrap]', error);
    showToast(`独立模拟手机初始化失败：${error.message}`, 'error');
});

window.addEventListener('beforeunload', () => {
    try { phoneInstance?.cleanup?.(); } catch { /* 页面卸载阶段忽略清理异常。 */ }
});
