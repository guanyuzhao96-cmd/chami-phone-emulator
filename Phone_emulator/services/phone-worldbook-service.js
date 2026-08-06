'use strict';

import { world_names } from '../../../../../world-info.js';

const DEFAULT_RENDER_MODE = 'debounced';

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeNameList(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item || '').trim()).filter(Boolean);
    }
    if (value && typeof value === 'object') {
        if (Array.isArray(value.names)) return normalizeNameList(value.names);
        if (Array.isArray(value.worldInfoNames)) return normalizeNameList(value.worldInfoNames);
        if (Array.isArray(value.world_names)) return normalizeNameList(value.world_names);
        return Object.keys(value).filter(key => value[key] !== false);
    }
    return [];
}

export class PhoneWorldbookService {
    constructor(context) {
        this.ctx = context;
        this.writeQueue = Promise.resolve();
    }

    get helper() {
        return window.TavernHelper;
    }

    ensureAvailable() {
        const helper = this.helper;
        if (!helper
            || typeof helper.getCharWorldbookNames !== 'function'
            || typeof helper.getWorldbook !== 'function'
            || typeof helper.updateWorldbookWith !== 'function') {
            throw new Error('未检测到可用的酒馆助手世界书接口。请安装酒馆助手并启用“酒馆助手宏”。');
        }
        return helper;
    }

    getCurrentWorldbookNames() {
        const helper = this.ensureAvailable();
        const result = helper.getCharWorldbookNames('current') || {};
        const primary = result.primary || null;
        const additional = Array.isArray(result.additional) ? result.additional.filter(Boolean) : [];
        return { primary, additional };
    }

    async getAllWorldbookNames() {
        const helper = this.ensureAvailable();
        const context = window.SillyTavern?.getContext?.();
        const names = [];

        const providers = [
            () => context?.getWorldInfoNames?.(),
            () => window.SillyTavern?.getWorldInfoNames?.(),
            () => helper.getWorldInfoNames?.(),
            () => helper.getWorldbookNames?.(),
        ];

        for (const provider of providers) {
            try {
                const value = await Promise.resolve(provider());
                names.push(...normalizeNameList(value));
            } catch (error) {
                this.ctx?.warn?.('character-profile', '枚举世界书失败，继续使用兼容来源', error);
            }
        }

        if (Array.isArray(world_names)) {
            names.push(...world_names.map(item => String(item || '').trim()).filter(Boolean));
        }

        const current = this.getCurrentWorldbookNames();
        names.push(current.primary, ...current.additional);

        return [...new Set(names.filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }

    getDefaultWorldbookName() {
        const names = this.getCurrentWorldbookNames();
        return names.primary || names.additional[0] || null;
    }

    async getEntries(bookName) {
        this.ensureAvailable();
        if (!bookName) throw new Error('没有指定世界书。');
        const entries = await this.helper.getWorldbook(bookName);
        return Array.isArray(entries) ? entries : [];
    }

    async getNormalizedEntries(bookName) {
        const entries = await this.getEntries(bookName);
        return entries
            .map((entry, index) => ({
                bookName,
                index,
                uid: entry.uid ?? null,
                name: entry.name || entry.comment || `未命名条目 ${index + 1}`,
                content: typeof entry.content === 'string' ? entry.content : '',
                enabled: entry.enabled !== false,
                raw: entry,
            }))
            .filter(item => (
                item.content.trim()
                && !item.content.includes('<!-- TSP_PROFILE_ID:')
            ));
    }

    async getAllCurrentEntries() {
        const names = this.getCurrentWorldbookNames();
        const bookNames = [names.primary, ...names.additional].filter(Boolean);
        const result = [];

        for (const bookName of [...new Set(bookNames)]) {
            result.push(...await this.getNormalizedEntries(bookName));
        }

        return result;
    }

    async updateEntries(bookName, updater, renderMode = DEFAULT_RENDER_MODE) {
        this.ensureAvailable();
        if (!bookName) throw new Error('没有指定用于写入的世界书。');

        const run = async () => this.helper.updateWorldbookWith(
            bookName,
            entries => {
                const safeEntries = Array.isArray(entries) ? entries : [];
                const updated = updater(safeEntries);
                return Array.isArray(updated) ? updated : safeEntries;
            },
            { render: renderMode },
        );

        this.writeQueue = this.writeQueue.then(run, run);
        return this.writeQueue;
    }

    async resolveFixedSources(sourceRefs) {
        const refs = Array.isArray(sourceRefs) ? sourceRefs : [];
        const grouped = new Map();

        for (const ref of refs) {
            if (!ref?.bookName) continue;
            if (!grouped.has(ref.bookName)) {
                grouped.set(ref.bookName, await this.getEntries(ref.bookName));
            }
        }

        const resolved = [];
        for (const ref of refs) {
            const entries = grouped.get(ref.bookName) || [];
            const entry = entries.find(item => (
                ref.uid !== null
                && ref.uid !== undefined
                && item.uid === ref.uid
            )) || entries.find(item => (
                (item.name || item.comment || '') === ref.entryName
            ));

            if (!entry) {
                resolved.push({
                    ...ref,
                    missing: true,
                    content: '',
                });
                continue;
            }

            resolved.push({
                bookName: ref.bookName,
                uid: entry.uid ?? ref.uid ?? null,
                entryName: entry.name || entry.comment || ref.entryName,
                content: typeof entry.content === 'string' ? entry.content : '',
                missing: false,
            });
        }

        return resolved;
    }

    async findManagedEntry(profileId, preferredBookName = null) {
        const marker = `<!-- TSP_PROFILE_ID: ${profileId} -->`;
        const names = this.getCurrentWorldbookNames();
        const candidates = [
            preferredBookName,
            names.primary,
            ...names.additional,
        ].filter(Boolean);

        for (const bookName of [...new Set(candidates)]) {
            const entries = await this.getEntries(bookName);
            const entry = entries.find(item => (
                typeof item.content === 'string'
                && item.content.includes(marker)
            ));
            if (entry) return { bookName, entry };
        }

        return null;
    }

    async upsertManagedEntry(profile, entryName, content, settings) {
        const existing = await this.findManagedEntry(
            profile.profileId,
            profile.dynamicEntry?.bookName,
        );
        const bookName = existing?.bookName
            || profile.outputWorldbookName
            || this.getDefaultWorldbookName()
            || profile.sourceWorldbookName;
        if (!bookName) {
            throw new Error('没有可用于写入动态资料的世界书。请先绑定主世界书，或在自动生成时选择一本世界书。');
        }

        const aliases = Array.isArray(profile.aliases) ? profile.aliases : [];
        const keys = [...new Set([profile.characterName, ...aliases].map(v => String(v || '').trim()).filter(Boolean))];
        const alwaysInject = Boolean(profile.alwaysInject);
        let savedEntry = null;

        await this.updateEntries(bookName, entries => {
            const marker = `<!-- TSP_PROFILE_ID: ${profile.profileId} -->`;
            const index = entries.findIndex(item => (
                (typeof item.content === 'string' && item.content.includes(marker))
                || (profile.dynamicEntry?.uid !== null
                    && profile.dynamicEntry?.uid !== undefined
                    && item.uid === profile.dynamicEntry.uid)
            ));

            const entryData = {
                name: entryName,
                comment: entryName,
                content,
                enabled: true,
                probability: 100,
                position: {
                    type: settings.insertionPosition || 'after_character_definition',
                    order: Number(settings.insertionOrder) || 100,
                },
                strategy: alwaysInject
                    ? {
                        type: 'constant',
                        keys: [],
                        keys_secondary: { logic: 'and_any', keys: [] },
                        scan_depth: 'same_as_global',
                    }
                    : {
                        type: 'selective',
                        keys,
                        keys_secondary: { logic: 'and_any', keys: [] },
                        scan_depth: 'same_as_global',
                    },
            };

            if (index >= 0) {
                const current = entries[index];
                entries[index] = {
                    ...current,
                    ...entryData,
                    uid: current.uid,
                };
                savedEntry = entries[index];
            } else {
                entries.push(entryData);
                savedEntry = entryData;
            }

            return entries;
        });

        if (savedEntry?.uid === null || savedEntry?.uid === undefined) {
            const refreshed = await this.getEntries(bookName);
            savedEntry = refreshed.find(item => (
                typeof item.content === 'string'
                && item.content.includes(`<!-- TSP_PROFILE_ID: ${profile.profileId} -->`)
            )) || savedEntry;
        }

        return {
            bookName,
            uid: savedEntry?.uid ?? null,
            entryName,
        };
    }

    async renameManagedEntry(profileId, newName, preferredBookName = null) {
        const found = await this.findManagedEntry(profileId, preferredBookName);
        if (!found) return false;

        await this.updateEntries(found.bookName, entries => {
            const marker = `<!-- TSP_PROFILE_ID: ${profileId} -->`;
            const target = entries.find(item => (
                typeof item.content === 'string'
                && item.content.includes(marker)
            ));
            if (target) {
                target.name = newName;
                target.comment = newName;
            }
            return entries;
        });

        return true;
    }

    async deleteManagedEntry(profileId, preferredBookName = null) {
        const found = await this.findManagedEntry(profileId, preferredBookName);
        if (!found) return false;

        const markerPattern = new RegExp(
            `<!--\\s*TSP_PROFILE_ID:\\s*${escapeRegExp(profileId)}\\s*-->`,
        );

        await this.updateEntries(
            found.bookName,
            entries => entries.filter(item => (
                !markerPattern.test(typeof item.content === 'string' ? item.content : '')
            )),
        );

        return true;
    }
}
