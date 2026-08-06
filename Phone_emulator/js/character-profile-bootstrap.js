'use strict';

import { PhoneCharacterProfileUI } from '../ui/phone-character-profile.js';
import { CharacterProfilePresetBridge } from './character-profile-preset-bridge.js';

const instances = new WeakMap();
let started = false;

function showToast(message, type = 'info') {
    const toastr = window.toastr;
    if (toastr && typeof toastr[type] === 'function') {
        toastr[type](message);
        return;
    }
    console[type === 'error' ? 'error' : 'log'](`[角色资料] ${message}`);
}

function createContext() {
    return {
        log(scope, ...args) {
            console.log(`[${scope}]`, ...args);
        },
        warn(scope, ...args) {
            console.warn(`[${scope}]`, ...args);
        },
        error(scope, ...args) {
            console.error(`[${scope}]`, ...args);
        },
        helpers: { showToast },
    };
}

function ensureFallbackLauncher(phoneContainer, ui) {
    if (!phoneContainer || phoneContainer.querySelector('[data-character-profile-app]')) return;

    const phoneScreen = phoneContainer.querySelector('.tsp-phone-screen') || phoneContainer;
    if (!phoneScreen || phoneScreen.querySelector('[data-character-profile-fallback]')) return;

    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.dataset.characterProfileApp = '1';
    launcher.dataset.characterProfileFallback = '1';
    launcher.setAttribute('aria-label', '打开角色资料');
    launcher.title = '角色资料';
    launcher.innerHTML = '<i class="fas fa-id-card"></i><span>角色资料</span>';
    Object.assign(launcher.style, {
        position: 'absolute',
        right: '12px',
        bottom: '72px',
        zIndex: '80',
        width: '64px',
        minHeight: '58px',
        border: '0',
        borderRadius: '16px',
        padding: '8px 6px',
        background: 'rgba(255,255,255,.92)',
        color: '#222',
        boxShadow: '0 4px 14px rgba(0,0,0,.18)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        fontSize: '12px',
        cursor: 'pointer',
    });
    launcher.querySelector('i').style.fontSize = '20px';
    launcher.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        ui.renderList();
    });
    phoneScreen.appendChild(launcher);
}

async function attachToPhone(phoneContainer) {
    if (!phoneContainer || instances.has(phoneContainer)) return;

    const context = createContext();
    const ui = new PhoneCharacterProfileUI(context, phoneContainer);
    ui.ai.storage = ui.storage;
    instances.set(phoneContainer, ui);

    ensureFallbackLauncher(phoneContainer, ui);

    try {
        await ui.init();
        ui.__presetBridge = new CharacterProfilePresetBridge(
            phoneContainer,
            ui.storage,
            context,
        ).start();
        console.log('[角色资料] 已挂载到模拟手机并接入手机AI预设');
    } catch (error) {
        console.warn('[角色资料] 首页图标初始化失败，已保留兼容入口', error);
    }

    ensureFallbackLauncher(phoneContainer, ui);
    const observer = new MutationObserver(() => ensureFallbackLauncher(phoneContainer, ui));
    observer.observe(phoneContainer, { childList: true, subtree: true });
    ui.__launcherObserver = observer;
}

function scan() {
    document.querySelectorAll('.tsp-phone-container').forEach(attachToPhone);
}

function start() {
    if (started) {
        scan();
        return;
    }
    started = true;
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__TSP_CHARACTER_PROFILE_OBSERVER__ = observer;
}

start();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
}
