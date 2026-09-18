'use strict';

import { PhoneWorldbookService } from '../services/phone-worldbook-service.js';

const TEMPLATE_LOREBOOK_NAME = '角色生成模板';
const ROOT_ID = 'tsp-campus-helper-page';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function showToast(message, type = 'info') {
    if (window.toastr?.[type]) window.toastr[type](message);
    else console[type === 'error' ? 'error' : 'log'](`[校园小帮手] ${message}`);
}

function getChatMessages() {
    return window.SillyTavern?.getContext?.()?.chat || [];
}

function extractTaggedContent(message) {
    const text = String(message?.mes ?? message?.message ?? message ?? '');
    return {
        content: text.match(/<all_char>([\s\S]*?)<\/all_char>/i)?.[1]?.trim() || '',
        keywords: text.match(/<key\s*words>([\s\S]*?)<\/key\s*words>/i)?.[1]?.trim() || '',
    };
}

function entryName(entry, fallback) {
    return String(entry?.name || entry?.comment || fallback || '').trim();
}

function entryKeys(entry) {
    const keys = entry?.strategy?.keys ?? entry?.keys ?? entry?.key ?? [];
    return Array.isArray(keys) ? keys.filter(Boolean) : [];
}

function extractCharacterName(content) {
    const patterns = [
        /^\s*name\s*:\s*["']?([^"'\r\n]+?)["']?\s*$/im,
        /^\s*\[name\]\s*:\s*(.+?)\s*$/im,
        /^\s*姓名\s*[:：]\s*(.+?)\s*$/im,
        /<name>\s*([^<\r\n]+?)\s*<\/name>/i,
    ];
    for (const pattern of patterns) {
        const match = String(content || '').match(pattern);
        if (match?.[1]) return match[1].trim();
    }
    return '';
}

export class CampusHelperUI {
    constructor(context) {
        this.ctx = context;
        this.worldbook = new PhoneWorldbookService(context);
        this.activeView = 'template';
        this.contentToSave = '';
        this.root = null;
    }

    init() {
        if (this.root) return;
        this.render();
        this.addLauncher();
    }

    addLauncher() {
        if (document.getElementById('tsp-campus-helper-launcher')) return;
        const launcher = document.createElement('button');
        launcher.id = 'tsp-campus-helper-launcher';
        launcher.type = 'button';
        launcher.className = 'tsp-campus-helper-launcher';
        launcher.innerHTML = '<i class="fas fa-book-open"></i><span>校园小帮手</span>';
        launcher.title = '打开校园小帮手';
        launcher.addEventListener('click', () => this.open());

        const target = document.querySelector('#extensionsMenu')
            || document.querySelector('#extensions_settings')
            || document.body;
        target.appendChild(launcher);
    }

    render() {
        if (document.getElementById(ROOT_ID)) {
            this.root = document.getElementById(ROOT_ID);
            return;
        }
        const root = document.createElement('section');
        root.id = ROOT_ID;
        root.className = 'tsp-campus-helper-page';
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML = `
            <header class="tsp-ch-topbar">
                <button type="button" class="tsp-ch-icon" data-action="close" aria-label="关闭">×</button>
                <div><h2>校园小帮手</h2><p data-role="worldbook-name">世界书管理</p></div>
                <button type="button" class="tsp-ch-icon" data-action="refresh" aria-label="刷新">↻</button>
            </header>
            <main class="tsp-ch-content">
                <nav class="tsp-ch-tabs" aria-label="世界书选择">
                    <button type="button" data-view="template" class="active">角色模板</button>
                    <button type="button" data-view="primary">世界书控制</button>
                </nav>
                <section class="tsp-ch-card">
                    <div class="tsp-ch-card-head"><h3>世界书条目</h3><span>开关即时保存</span></div>
                    <div class="tsp-ch-entries" data-role="entries"><p class="tsp-ch-empty">加载中…</p></div>
                </section>
                <section class="tsp-ch-card">
                    <label class="tsp-ch-label" for="tsp-ch-instruction">发送生成指令</label>
                    <textarea id="tsp-ch-instruction" placeholder="请输入角色生成指令"></textarea>
                    <button type="button" class="tsp-ch-button primary" data-action="send">生成角色</button>
                </section>
                <section class="tsp-ch-card tsp-ch-save-card">
                    <div><h3>保存最新角色设定</h3><p>自动读取最新回复中的角色内容和关键词。</p></div>
                    <button type="button" class="tsp-ch-button secondary" data-action="open-save">保存设定</button>
                </section>
                <div class="tsp-ch-status" data-role="status" role="status"></div>
            </main>
            <div class="tsp-ch-sheet-mask" data-role="sheet">
                <section class="tsp-ch-sheet" role="dialog" aria-modal="true" aria-label="保存角色设定">
                    <div class="tsp-ch-sheet-title"><h3>保存设定</h3><button type="button" class="tsp-ch-icon" data-action="cancel-save" aria-label="关闭">×</button></div>
                    <label class="tsp-ch-label">条目名称<input data-role="comment" placeholder="默认使用角色姓名或首个关键词"></label>
                    <label class="tsp-ch-label">触发关键词<input data-role="keys" placeholder="用英文逗号分隔"></label>
                    <fieldset class="tsp-ch-fieldset"><legend>触发方式</legend><label><input type="radio" name="tsp-ch-trigger" value="constant"> 蓝灯</label><label><input type="radio" name="tsp-ch-trigger" value="selective" checked> 绿灯</label></fieldset>
                    <label class="tsp-ch-label">插入位置<select data-role="position"><option value="at_depth" selected>指定深度</option><option value="after_character_definition">角色定义后</option><option value="before_character_definition">角色定义前</option></select></label>
                    <label class="tsp-ch-label" data-role="depth-wrap">插入深度<input data-role="depth" type="number" min="0" value="6"></label>
                    <label class="tsp-ch-label">世界书顺序<input data-role="order" type="number" value="100"></label>
                    <div class="tsp-ch-sheet-actions"><button type="button" class="tsp-ch-button muted" data-action="cancel-save">取消</button><button type="button" class="tsp-ch-button primary" data-action="confirm-save">确认保存</button></div>
                </section>
            </div>`;
        document.body.appendChild(root);
        this.root = root;
        this.bindEvents();
    }

    find(role) { return this.root?.querySelector(`[data-role="${role}"]`); }

    bindEvents() {
        this.root.addEventListener('click', async event => {
            const action = event.target.closest('[data-action]')?.dataset.action;
            if (action === 'close') this.close();
            if (action === 'refresh') await this.renderEntries();
            if (action === 'open-save') this.openSaveSheet();
            if (action === 'cancel-save') this.closeSaveSheet();
            if (action === 'confirm-save') await this.saveEntry();
            if (action === 'send') await this.sendInstruction();
            if (event.target === this.find('sheet')) this.closeSaveSheet();
        });
        this.root.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', async () => {
            this.activeView = button.dataset.view;
            this.root.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item === button));
            await this.renderEntries();
        }));
        this.find('position').addEventListener('change', () => {
            this.find('depth-wrap').hidden = this.find('position').value !== 'at_depth';
        });
    }

    open() {
        this.root.classList.add('open');
        this.root.setAttribute('aria-hidden', 'false');
        document.body.classList.add('tsp-ch-page-open');
        this.renderEntries();
    }

    close() {
        this.closeSaveSheet();
        this.root.classList.remove('open');
        this.root.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('tsp-ch-page-open');
    }

    showStatus(message, isError = false) {
        const status = this.find('status');
        status.textContent = message;
        status.className = `tsp-ch-status ${isError ? 'error' : 'success'}`;
        clearTimeout(this.statusTimer);
        this.statusTimer = setTimeout(() => { status.className = 'tsp-ch-status'; }, 4500);
    }

    getBookName() {
        return this.activeView === 'template'
            ? TEMPLATE_LOREBOOK_NAME
            : this.worldbook.getDefaultWorldbookName();
    }

    async renderEntries() {
        const list = this.find('entries');
        const bookName = this.getBookName();
        this.find('worldbook-name').textContent = bookName ? `当前：${bookName}` : '当前角色未绑定世界书';
        if (!bookName) {
            list.innerHTML = '<p class="tsp-ch-empty">当前角色未绑定独立主世界书。</p>';
            return;
        }
        try {
            const entries = await this.worldbook.getEntries(bookName);
            const visible = entries.filter(entry => entryName(entry));
            if (!visible.length) {
                list.innerHTML = '<p class="tsp-ch-empty">此世界书没有已命名条目。</p>';
                return;
            }
            list.innerHTML = visible.map((entry, index) => `
                <article class="tsp-ch-entry">
                    <div><strong>${escapeHtml(entryName(entry, `未命名条目 ${index + 1}`))}</strong><small>${escapeHtml(entryKeys(entry).join('、') || '未设置关键词')}</small></div>
                    <label class="tsp-ch-switch"><input type="checkbox" data-entry-index="${index}" ${entry.enabled !== false ? 'checked' : ''}><span></span></label>
                </article>`).join('');
            list.querySelectorAll('[data-entry-index]').forEach(input => input.addEventListener('change', async event => {
                const entry = visible[Number(event.currentTarget.dataset.entryIndex)];
                try {
                    await this.worldbook.updateEntries(bookName, all => all.map(item => item === entry ? { ...item, enabled: event.currentTarget.checked } : item));
                    this.showStatus(`“${entryName(entry)}”已${event.currentTarget.checked ? '启用' : '禁用'}。`);
                } catch (error) {
                    event.currentTarget.checked = !event.currentTarget.checked;
                    this.showStatus(`切换失败：${error.message}`, true);
                }
            }));
        } catch (error) {
            list.innerHTML = `<p class="tsp-ch-empty">读取失败：${escapeHtml(error.message)}</p>`;
        }
    }

    openSaveSheet() {
        const { content, keywords } = extractTaggedContent(getChatMessages().at(-1));
        if (!content) {
            this.showStatus('最新消息中未找到 <all_char> 标签。', true);
            return;
        }
        if (!this.worldbook.getDefaultWorldbookName()) {
            this.showStatus('当前角色未绑定主世界书。', true);
            return;
        }
        this.contentToSave = content;
        this.find('comment').value = extractCharacterName(content);
        this.find('keys').value = keywords;
        this.find('position').value = 'at_depth';
        this.find('depth').value = '6';
        this.find('order').value = '100';
        this.find('depth-wrap').hidden = false;
        this.find('sheet').classList.add('open');
    }

    closeSaveSheet() { this.find('sheet').classList.remove('open'); }

    async saveEntry() {
        try {
            const bookName = this.worldbook.getDefaultWorldbookName();
            if (!bookName || !this.contentToSave) throw new Error('没有可保存的角色内容或主世界书。');
            const keys = this.find('keys').value.split(',').map(item => item.trim()).filter(Boolean);
            const comment = this.find('comment').value.trim() || extractCharacterName(this.contentToSave) || keys[0] || '未命名角色';
            const trigger = this.root.querySelector('input[name="tsp-ch-trigger"]:checked').value;
            const positionType = this.find('position').value;
            const entry = {
                name: comment,
                comment,
                content: this.contentToSave,
                enabled: true,
                probability: 100,
                position: { type: positionType, order: Number(this.find('order').value) || 100 },
                strategy: {
                    type: trigger,
                    keys: trigger === 'selective' ? keys : [],
                    keys_secondary: { logic: 'and_any', keys: [] },
                    scan_depth: 'same_as_global',
                },
            };
            if (positionType === 'at_depth') entry.position.depth = Math.max(0, Number(this.find('depth').value) || 6);
            await this.worldbook.updateEntries(bookName, entries => [...entries, entry]);
            this.closeSaveSheet();
            this.showStatus(`已保存“${comment}”到《${bookName}》。`);
            if (this.activeView === 'primary') await this.renderEntries();
        } catch (error) {
            this.showStatus(`保存失败：${error.message}`, true);
        }
    }

    async sendInstruction() {
        const textarea = this.root.querySelector('#tsp-ch-instruction');
        const instruction = textarea.value.trim();
        if (!instruction) { this.showStatus('生成指令不能为空。', true); return; }
        try {
            const helper = window.TavernHelper;
            const context = window.SillyTavern?.getContext?.();
            if (typeof helper?.triggerSlash === 'function') {
                await helper.triggerSlash(`/send ${instruction}`);
                await helper.triggerSlash('/trigger');
            } else if (typeof context?.executeSlashCommands === 'function') {
                await context.executeSlashCommands(`/send ${instruction}`);
                await context.executeSlashCommands('/trigger');
            } else {
                throw new Error('未检测到可用的斜杠命令接口。');
            }
            textarea.value = '';
            this.showStatus('生成指令已发送。');
        } catch (error) {
            this.showStatus(`发送失败：${error.message}`, true);
        }
    }
}

export function initCampusHelperPage(context) {
    if (window.__TSP_CAMPUS_HELPER__) return window.__TSP_CAMPUS_HELPER__;
    const ui = new CampusHelperUI(context);
    ui.init();
    window.__TSP_CAMPUS_HELPER__ = ui;
    showToast('校园小帮手独立页面已加载', 'success');
    return ui;
}
