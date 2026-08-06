'use strict';

const SELECT_ID = 'tsp-phone-preset-character-profile';

function setLabel(group) {
    const label = group.querySelector('.tsp-phone-form-label, label');
    if (!label) return;
    label.innerHTML = '<i class="fas fa-id-card"></i> 角色资料';
}

export class CharacterProfilePresetBridge {
    constructor(phoneContainer, storage, context = null) {
        this.phoneContainer = phoneContainer;
        this.storage = storage;
        this.ctx = context;
        this.observer = null;
        this.scanning = false;
    }

    start() {
        this.scan();
        this.observer = new MutationObserver(() => this.scan());
        this.observer.observe(this.phoneContainer, { childList: true, subtree: true });
        return this;
    }

    async scan() {
        if (this.scanning || this.phoneContainer.querySelector(`#${SELECT_ID}`)) return;
        const sourceSelect = this.phoneContainer.querySelector('select[id^="tsp-phone-preset-"]');
        if (!sourceSelect) return;

        this.scanning = true;
        try {
            const sourceGroup = sourceSelect.closest('.tsp-phone-form-group') || sourceSelect.parentElement;
            if (!sourceGroup?.parentElement) return;

            const group = sourceGroup.cloneNode(true);
            group.dataset.characterProfilePreset = '1';
            setLabel(group);

            const select = group.querySelector('select');
            if (!select) return;
            select.id = SELECT_ID;
            select.name = 'characterProfilePreset';
            select.dataset.feature = 'characterProfile';
            select.removeAttribute('data-action');

            const settings = this.storage.getSettings();
            const selectedId = String(settings.apiPresetId || '');
            select.value = [...select.options].some(option => option.value === selectedId)
                ? selectedId
                : '';

            select.addEventListener('change', async () => {
                try {
                    await this.storage.saveSettings({
                        ...this.storage.getSettings(),
                        apiPresetId: select.value || null,
                    });
                    this.ctx?.helpers?.showToast?.(
                        select.value ? '角色资料API预设已保存' : '角色资料将使用手机当前主预设',
                        'success',
                    );
                } catch (error) {
                    this.ctx?.error?.('character-profile-preset', error);
                    this.ctx?.helpers?.showToast?.('角色资料预设保存失败', 'error');
                }
            });

            const saveButton = sourceGroup.parentElement.querySelector(
                '.tsp-phone-btn-primary, .tsp-phone-save-btn, button[type="submit"]',
            );
            if (saveButton?.parentElement === sourceGroup.parentElement) {
                sourceGroup.parentElement.insertBefore(group, saveButton);
            } else {
                sourceGroup.parentElement.appendChild(group);
            }
        } finally {
            this.scanning = false;
        }
    }

    cleanup() {
        this.observer?.disconnect();
        this.observer = null;
        this.phoneContainer.querySelector(`[data-character-profile-preset="1"]`)?.remove();
    }
}
