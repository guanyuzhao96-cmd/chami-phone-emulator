'use strict';

const BRIDGE_ID = 'chami-phone-tavern-scene-image-bridge';
const BUTTON_SELECTOR = '[data-chami-image-generate]';
const DIALOG_SELECTOR = '[data-chami-image-dialog]';
const API_HINT = /(?:tsp|tavern|scene|chami|image|generator|plugin|api)/i;

let observer = null;
let initialized = false;
let lastApiMatch = null;

function toast(message, type = 'info') {
    if (window.toastr && typeof window.toastr[type] === 'function') {
        window.toastr[type](message);
        return;
    }
    console[type === 'error' ? 'error' : 'log'](`[${BRIDGE_ID}] ${message}`);
}

function safeValue(object, key) {
    try {
        return object?.[key];
    } catch {
        return undefined;
    }
}

function managerFrom(value) {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
    const direct = safeValue(value, 'GeneratorManager');
    if (direct && typeof safeValue(direct, 'generate') === 'function') return direct;

    for (const childKey of ['api', 'API', 'publicAPI', 'externalAPI', 'pluginAPI', 'tspAPI']) {
        const child = safeValue(value, childKey);
        const manager = safeValue(child, 'GeneratorManager');
        if (manager && typeof safeValue(manager, 'generate') === 'function') return manager;
    }
    return null;
}

export function findTavernSceneGenerator() {
    if (lastApiMatch) {
        const cached = managerFrom(lastApiMatch.value);
        if (cached) return { manager: cached, globalName: lastApiMatch.name };
        lastApiMatch = null;
    }

    const preferredNames = [
        'TavernScene', 'TavernScenePlugin', 'TavernSceneAPI', 'TSP', 'TSPAPI',
        'tsp', 'tspAPI', 'ChamiTSP', 'ChamiTavernScene', '__TSP_IMAGE_TEST_API__',
    ];
    const inspected = new Set();

    const inspect = name => {
        if (inspected.has(name)) return null;
        inspected.add(name);
        const value = safeValue(window, name);
        const manager = managerFrom(value);
        if (!manager) return null;
        lastApiMatch = { name: String(name), value };
        return { manager, globalName: String(name) };
    };

    for (const name of preferredNames) {
        const match = inspect(name);
        if (match) return match;
    }

    const keys = Reflect.ownKeys(window).filter(key => typeof key === 'string');
    for (const key of keys.filter(key => API_HINT.test(key))) {
        const match = inspect(key);
        if (match) return match;
    }
    for (const key of keys) {
        const match = inspect(key);
        if (match) return match;
    }
    return null;
}

function getSTContext() {
    try {
        return window.SillyTavern?.getContext?.() || null;
    } catch {
        return null;
    }
}

function stripHtml(value) {
    const holder = document.createElement('div');
    holder.innerHTML = String(value || '');
    return (holder.textContent || '').replace(/\s+/g, ' ').trim();
}

function buildDefaultPrompt(source, pageRoot) {
    const context = getSTContext();
    const characterName = context?.name2 || context?.characters?.[context?.characterId]?.name || '当前角色';
    const visibleText = (pageRoot?.querySelector('.tsp-phone-chat-messages, .tsp-phone-moments-content, .tsp-phone-forum-content')?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(-600);
    const recentChat = Array.isArray(context?.chat)
        ? context.chat.slice(-4).map(item => stripHtml(item?.mes)).filter(Boolean).join('；').slice(-800)
        : '';
    const scene = visibleText || recentChat;
    const sourceLabel = source === 'moments' ? '朋友圈配图' : source === 'forum' ? '论坛配图' : '聊天场景';
    return scene
        ? `角色：${characterName}\n${sourceLabel}：${scene}`
        : `角色：${characterName}\n${sourceLabel}：请根据当前剧情生成一张符合人物设定和场景氛围的图片。`;
}

function extractImageUrls(value, depth = 0, visited = new Set()) {
    if (depth > 5 || value == null) return [];
    if (typeof value === 'string') {
        const text = value.trim();
        if (/^(?:data:image\/|blob:|https?:\/\/)/i.test(text)) return [text];
        return [];
    }
    if (typeof value !== 'object' || visited.has(value)) return [];
    visited.add(value);
    if (Array.isArray(value)) return value.flatMap(item => extractImageUrls(item, depth + 1, visited));

    const priorityKeys = ['url', 'imageUrl', 'image_url', 'src', 'image', 'images', 'result', 'results', 'data', 'output', 'outputs'];
    const urls = [];
    for (const key of priorityKeys) urls.push(...extractImageUrls(safeValue(value, key), depth + 1, visited));
    if (!urls.length) {
        for (const key of Reflect.ownKeys(value).slice(0, 80)) {
            urls.push(...extractImageUrls(safeValue(value, key), depth + 1, visited));
        }
    }
    return [...new Set(urls)];
}

function closeElement(element) {
    if (element?.parentNode) element.parentNode.removeChild(element);
}

function showPreview(phoneContainer, urls, prompt) {
    if (!urls.length || !phoneContainer) return;
    phoneContainer.querySelector('[data-chami-image-preview]')?.remove();
    const preview = document.createElement('div');
    preview.className = 'chami-phone-image-preview';
    preview.dataset.chamiImagePreview = '1';
    preview.innerHTML = `
        <div class="chami-phone-image-preview-card">
            <div class="chami-phone-image-preview-header">
                <strong>图片已生成</strong>
                <button type="button" aria-label="关闭预览"><i class="fas fa-times"></i></button>
            </div>
            <div class="chami-phone-image-preview-list"></div>
            <p class="chami-phone-image-preview-prompt"></p>
        </div>`;
    const list = preview.querySelector('.chami-phone-image-preview-list');
    for (const url of urls.slice(0, 4)) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '酒馆场景插件生成图片';
        img.loading = 'lazy';
        list.appendChild(img);
    }
    preview.querySelector('.chami-phone-image-preview-prompt').textContent = prompt;
    preview.querySelector('button').addEventListener('click', () => closeElement(preview));
    phoneContainer.appendChild(preview);
}

function findVisibleGeneratorControl() {
    const candidates = [...document.querySelectorAll('button,[role="button"],a,[data-action]')];
    return candidates.find(element => {
        const text = `${element.textContent || ''} ${element.title || ''}`.replace(/\s+/g, ' ').trim();
        if (!/(?:图像生成|图片生成|文生图|图片生成器|图像生成器)/.test(text)) return false;
        const style = window.getComputedStyle?.(element);
        return style?.display !== 'none' && style?.visibility !== 'hidden';
    }) || null;
}

async function openOriginalGeneratorUI(prompt) {
    window.__CHAMI_PHONE_PENDING_IMAGE_PROMPT__ = prompt;
    const direct = findVisibleGeneratorControl();
    if (direct) {
        direct.click();
        return true;
    }

    const menuButton = document.querySelector('#tsp-open-menu_button, #tsp-open-menu-button, [id*="tsp"][id*="menu"][role="button"], button[id*="tsp"][id*="menu"]');
    if (!menuButton) return false;
    menuButton.click();
    await new Promise(resolve => setTimeout(resolve, 250));
    const control = findVisibleGeneratorControl();
    if (!control) return false;
    control.click();
    return true;
}

export async function generateWithTavernScene(prompt, source = 'chat', phoneContainer = null) {
    const normalizedPrompt = String(prompt || '').trim();
    if (!normalizedPrompt) throw new Error('请输入图片描述。');

    const match = findTavernSceneGenerator();
    if (!match) {
        const opened = await openOriginalGeneratorUI(normalizedPrompt);
        if (opened) {
            toast('已打开酒馆场景插件的图片生成器。提示词已暂存，可直接粘贴使用。', 'info');
            return { openedGeneratorUI: true, prompt: normalizedPrompt };
        }
        throw new Error('未检测到已启用的原版酒馆场景插件。请先启用原版插件并配置图片生成器。');
    }

    const result = await match.manager.generate.call(match.manager, normalizedPrompt, false);
    const urls = extractImageUrls(result);
    showPreview(phoneContainer, urls, normalizedPrompt);
    window.dispatchEvent(new CustomEvent('chami-phone:image-generated', {
        detail: { source, prompt: normalizedPrompt, result, urls, apiGlobal: match.globalName },
    }));
    toast(urls.length ? '图片生成完成' : '已提交到酒馆场景插件生成器', 'success');
    return { result, urls, apiGlobal: match.globalName };
}

function createPromptDialog(source, pageRoot, phoneContainer) {
    phoneContainer.querySelector(DIALOG_SELECTOR)?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'chami-phone-image-dialog-overlay';
    overlay.dataset.chamiImageDialog = '1';
    overlay.innerHTML = `
        <form class="chami-phone-image-dialog">
            <div class="chami-phone-image-dialog-header">
                <strong>调用酒馆场景插件生成图片</strong>
                <button type="button" data-image-dialog-close aria-label="关闭"><i class="fas fa-times"></i></button>
            </div>
            <label>图片描述</label>
            <textarea rows="6" data-image-prompt></textarea>
            <p class="chami-phone-image-dialog-help">使用原版酒馆场景插件中已经配置好的 SD、NAI、ComfyUI 或其他生成渠道。</p>
            <div class="chami-phone-image-dialog-status" aria-live="polite"></div>
            <div class="chami-phone-image-dialog-actions">
                <button type="button" data-image-dialog-cancel>取消</button>
                <button type="submit" class="primary" data-image-dialog-submit><i class="fas fa-wand-magic-sparkles"></i> 生成图片</button>
            </div>
        </form>`;

    const form = overlay.querySelector('form');
    const textarea = overlay.querySelector('[data-image-prompt]');
    const status = overlay.querySelector('.chami-phone-image-dialog-status');
    const submit = overlay.querySelector('[data-image-dialog-submit]');
    textarea.value = buildDefaultPrompt(source, pageRoot);

    const close = () => closeElement(overlay);
    overlay.querySelector('[data-image-dialog-close]').addEventListener('click', close);
    overlay.querySelector('[data-image-dialog-cancel]').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const prompt = textarea.value.trim();
        if (!prompt) {
            status.textContent = '请输入图片描述。';
            textarea.focus();
            return;
        }
        submit.disabled = true;
        submit.classList.add('loading');
        status.textContent = '正在调用酒馆场景插件…';
        try {
            await generateWithTavernScene(prompt, source, phoneContainer);
            close();
        } catch (error) {
            console.error(`[${BRIDGE_ID}] image generation failed`, error);
            status.textContent = error?.message || String(error);
            toast(status.textContent, 'error');
        } finally {
            submit.disabled = false;
            submit.classList.remove('loading');
        }
    });

    phoneContainer.appendChild(overlay);
    setTimeout(() => textarea.focus(), 0);
}

function makeButton(source, pageRoot, phoneContainer) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chami-phone-image-generate-btn';
    button.dataset.chamiImageGenerate = source;
    button.title = '调用酒馆场景插件生成图片';
    button.setAttribute('aria-label', '生成图片');
    button.innerHTML = '<i class="fas fa-image"></i><span>生成图片</span>';
    button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        createPromptDialog(source, pageRoot, phoneContainer);
    });
    return button;
}

function injectIntoPage(pageRoot, source, phoneContainer) {
    if (!pageRoot || pageRoot.querySelector(`${BUTTON_SELECTOR}[data-chami-image-generate="${source}"]`)) return;
    const host = pageRoot.querySelector('.tsp-phone-nav-actions')
        || pageRoot.querySelector('.tsp-phone-chat-input-actions, .tsp-phone-chat-input-area, .tsp-phone-input-area')
        || pageRoot.querySelector('.tsp-phone-nav-bar')
        || pageRoot;
    host.appendChild(makeButton(source, pageRoot, phoneContainer));
}

function scanPhone(phoneContainer) {
    if (!phoneContainer) return;
    const pageConfigs = [
        ['.tsp-phone-chat-list-view, .tsp-phone-chat-view, .tsp-phone-chat-detail-view, .tsp-phone-conversation-view', 'chat'],
        ['.tsp-phone-moments-view, .tsp-phone-private-moments-view', 'moments'],
        ['.tsp-phone-forum-view, .tsp-phone-forum-list-view, .tsp-phone-forum-detail-view', 'forum'],
    ];
    for (const [selector, source] of pageConfigs) {
        phoneContainer.querySelectorAll(selector).forEach(page => injectIntoPage(page, source, phoneContainer));
    }
}

function scanAllPhones() {
    document.querySelectorAll('.tsp-phone-container').forEach(scanPhone);
}

export function initTavernSceneImageBridge() {
    if (initialized) return window.ChamiPhoneImageBridge;
    initialized = true;
    scanAllPhones();
    observer = new MutationObserver(() => scanAllPhones());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.ChamiPhoneImageBridge = {
        id: BRIDGE_ID,
        findGenerator: findTavernSceneGenerator,
        generate: generateWithTavernScene,
        scan: scanAllPhones,
        destroy() {
            observer?.disconnect();
            observer = null;
            document.querySelectorAll(BUTTON_SELECTOR).forEach(element => element.remove());
            document.querySelectorAll(`${DIALOG_SELECTOR}, [data-chami-image-preview]`).forEach(element => element.remove());
            initialized = false;
        },
    };
    return window.ChamiPhoneImageBridge;
}

export default initTavernSceneImageBridge;
