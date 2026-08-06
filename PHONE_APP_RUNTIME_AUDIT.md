# Phone chat and moments runtime audit

## Instance methods
```text
_applyPosition
_createFabButton
_createModal
_ensureVisible
_getCurrentCharacterName
_getCurrentTime
_getViewportSize
_initDraggable
_initResizeObserver
_initTimeClickHandler
_listenCharacterChange
_loadAPIConfig
_loadImageModeConfig
_loadPosition
_loadTimeConfig
_openApp
_savePosition
_showTimeSettings
_updateStatusBarColor
_updateTimeDisplay
cleanup
closeModal
constructor
init
openModal
```

- CLICK app chat: DIV.tsp-phone-app-icon
## chat initial

- BUTTON id=- class=tsp-phone-nav-back app=- action=- text=""
- BUTTON id=- class=tsp-phone-nav-btn app=- action=- text=""
- BUTTON id=- class=tsp-phone-bottom-tab active app=- action=- text="消息"
- BUTTON id=- class=tsp-phone-bottom-tab app=- action=- text="联系人"
- BUTTON id=- class=tsp-phone-bottom-tab app=- action=- text="新朋友"
- BUTTON id=- class=tsp-phone-bottom-tab app=- action=- text="世界书"
- BUTTON id=- class= app=- action=- text="角色资料"

```html

            <div class="tsp-phone-chat-list-view">
                <div class="tsp-phone-nav-bar">
                    <div class="tsp-phone-nav-left">
                        <button class="tsp-phone-nav-back" title="返回">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                    </div>
                    <span class="tsp-phone-nav-title">消息</span>
                    <div class="tsp-phone-nav-actions">
                        <button class="tsp-phone-nav-btn" title="新朋友">
                            <i class="fas fa-user-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="tsp-phone-chat-list" id="tsp-phone-chat-list">
                    <div class="tsp-phone-empty-state">
                        <i class="fas fa-comments"></i>
                        <p>暂无消息<br>点击"新朋友"添加联系人</p>
                    </div>
                </div>
                <div class="tsp-phone-bottom-tabs">
                    <button class="tsp-phone-bottom-tab active" data-tab="messages">
                        <i class="fas fa-comment-dots"></i>
                        <span>消息</span>
                    </button>
                    <button class="tsp-phone-bottom-tab" data-tab="contacts">
                        <i class="fas fa-address-book"></i>
                        <span>联系人</span>
                    </button>
                    <button class="tsp-phone-bottom-tab" data-tab="new-friends">
                        <i class="fas fa-user-plus"></i>
                        <span>新朋友</span>
                    </button>
                    <button class="tsp-phone-bottom-tab" data-tab="worldbook">
                        <i class="fas fa-book"></i>
                        <span>世界书</span>
                    </button>
                </div>
            </div>
        <button type="button" data-character-profile-app="1" data-character-profile-fallback="1" aria-label="打开角色资料" title="角色资料" style="position: absolute; right: 12px; bottom: 72px; z-index: 80; width: 64px; min-height: 58px; border: 0px; border-radius: 16px; padding: 8px 6px; background: rgba(255, 255, 255, .92); color: #222; box-shadow: 0 4px 14px rgba(0,0,0,.18); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; cursor: pointer;"><i class="fas fa-id-card" style="font-size: 20px;"></i><span>角色资料</span></button>
```

- CLICK first chat/contact: DIV.tsp-phone-chat-list-view
## chat detail

- BUTTON id=- class=tsp-phone-nav-back app=- action=- text=""
- BUTTON id=- class=tsp-phone-nav-btn app=- action=- text=""
- BUTTON id=- class=tsp-phone-bottom-tab active app=- action=- text="消息"
- BUTTON id=- class=tsp-phone-bottom-tab app=- action=- text="联系人"
- BUTTON id=- class=tsp-phone-bottom-tab app=- action=- text="新朋友"
- BUTTON id=- class=tsp-phone-bottom-tab app=- action=- text="世界书"
- BUTTON id=- class= app=- action=- text="角色资料"

```html

            <div class="tsp-phone-chat-list-view">
                <div class="tsp-phone-nav-bar">
                    <div class="tsp-phone-nav-left">
                        <button class="tsp-phone-nav-back" title="返回">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                    </div>
                    <span class="tsp-phone-nav-title">消息</span>
                    <div class="tsp-phone-nav-actions">
                        <button class="tsp-phone-nav-btn" title="新朋友">
                            <i class="fas fa-user-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="tsp-phone-chat-list" id="tsp-phone-chat-list">
                    <div class="tsp-phone-empty-state">
                        <i class="fas fa-comments"></i>
                        <p>暂无消息<br>点击"新朋友"添加联系人</p>
                    </div>
                </div>
                <div class="tsp-phone-bottom-tabs">
                    <button class="tsp-phone-bottom-tab active" data-tab="messages">
                        <i class="fas fa-comment-dots"></i>
                        <span>消息</span>
                    </button>
                    <button class="tsp-phone-bottom-tab" data-tab="contacts">
                        <i class="fas fa-address-book"></i>
                        <span>联系人</span>
                    </button>
                    <button class="tsp-phone-bottom-tab" data-tab="new-friends">
                        <i class="fas fa-user-plus"></i>
                        <span>新朋友</span>
                    </button>
                    <button class="tsp-phone-bottom-tab" data-tab="worldbook">
                        <i class="fas fa-book"></i>
                        <span>世界书</span>
                    </button>
                </div>
            </div>
        <button type="button" data-character-profile-app="1" data-character-profile-fallback="1" aria-label="打开角色资料" title="角色资料" style="position: absolute; right: 12px; bottom: 72px; z-index: 80; width: 64px; min-height: 58px; border: 0px; border-radius: 16px; padding: 8px 6px; background: rgba(255, 255, 255, .92); color: #222; box-shadow: 0 4px 14px rgba(0,0,0,.18); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; cursor: pointer;"><i class="fas fa-id-card" style="font-size: 20px;"></i><span>角色资料</span></button>
```

### chat image controls

### Missing APIs after app
```json
[]
```

- CLICK chat back: BUTTON.tsp-phone-nav-back
- CLICK app moments: DIV.tsp-phone-app-icon
## moments initial

- BUTTON id=- class=tsp-phone-nav-back app=- action=- text=""
- BUTTON id=- class= app=- action=- text="角色资料"

```html

            <div class="tsp-phone-moments-view">
                <div class="tsp-phone-nav-bar">
                    <div class="tsp-phone-nav-left">
                        <button class="tsp-phone-nav-back" title="返回">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                    </div>
                    <span class="tsp-phone-nav-title">朋友圈</span>
                    <div class="tsp-phone-nav-actions"></div>
                </div>
                <div class="tsp-phone-moments-content" id="tsp-phone-moments-content">
                    <div class="tsp-phone-empty-state">
                        <i class="fas fa-heart"></i>
                        <p>暂无朋友圈内容<br>请先在角色朋友圈中生成</p>
                    </div>
                </div>
            </div>
        <button type="button" data-character-profile-app="1" data-character-profile-fallback="1" aria-label="打开角色资料" title="角色资料" style="position: absolute; right: 12px; bottom: 72px; z-index: 80; width: 64px; min-height: 58px; border: 0px; border-radius: 16px; padding: 8px 6px; background: rgba(255, 255, 255, .92); color: #222; box-shadow: 0 4px 14px rgba(0,0,0,.18); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; cursor: pointer;"><i class="fas fa-id-card" style="font-size: 20px;"></i><span>角色资料</span></button>
```

### moments image controls

### Missing APIs after app
```json
[]
```

- CLICK moments back: BUTTON.tsp-phone-nav-back
## Calls
```json
[
  [
    "fetch",
    "/user/files/tsp-chat-Test_Character-contacts.json"
  ],
  [
    "fetch",
    "/user/files/tsp-chat-Test_Character-wechat_moments.json"
  ],
  [
    "fetch",
    "/user/files/tsp-chat-Test_Character-private-moments.json"
  ],
  [
    "fetch",
    "/user/files/tsp-chat-Test_Character-forum.json"
  ],
  [
    "fetch",
    "/user/files/tsp-chat-Test_Character-livestreaming.json"
  ],
  [
    "fetch",
    "/user/files/tsp-group-chat-Test_Character-groups.json"
  ],
  [
    "fetch",
    "/user/files/tsp-Test_Character-map.json"
  ],
  [
    "fetch",
    "/user/files/tsp-Test_Character-Nearby-characters.json"
  ],
  [
    "fetch",
    "/user/files/tsp-chat-Test_Character-new-friend.json"
  ],
  [
    "fetch",
    "/user/files/tsp-phone-meme-data.json"
  ],
  [
    "fetch",
    "/user/files/tsp-plugin-phone.json"
  ],
  [
    "fetch",
    "/user/files/tsp-plugin-phone.json"
  ],
  [
    "fetch",
    "/user/files/tsp-plugin-phone.json"
  ],
  [
    "fetch",
    "/api/files/upload"
  ],
  [
    "success",
    "独立模拟手机已加载"
  ],
  [
    "event.on",
    "chatLoaded",
    "async (event) => {\n                if (switchDebounceTimer) clearTimeout(switchDebounceTimer);\n\n                const eventDetail = event?.detail || event;\n                const characterFromEvent = eventDetail?.character?.name || eventDetail?.character;\n\n                switchDebounceTimer = setTimeout(async () => {\n                    let characterName = this._getCurrentCharacterName();\n                    if (!characterName && characterFromEvent) {\n                        characterName = this.chatStorage._sanitizeCharacterName(characterFromEvent);\n                    }\n\n                    if (!characterName) return;\n\n                    if (characterName === this.currentCharacter) {\n                        this.ctx.log('phone-emulator', `[角色卡切换] 角色卡未变化: ${characterName}`);\n                        // 同个角色卡切换聊天时，也要重新映射关系数据到世界书\n                        await this.minutesUI.onChatSwitch();\n                        return;\n                    }\n\n                    cleanupBeforeSwitch();\n\n                    runWhenIdle(async () => {\n                        this.ctx.log('phone-emulator', `[角色卡切换] 开始加载角色卡数据: ${characterName}`);\n\n                        this.currentCharacter = characterName;\n\n                        await this.chatStorage.switchCharacter(characterName);\n\n                        const loadedContacts = await this.chatStorage.getContacts();\n                        this.contacts = loadedContacts;\n                        this.ctx.log('phone-emulator', `[角色卡切换] 已加载 ${loadedContacts.length} 个联系人`);\n\n                        this.messageUI.setCurrentCharacter(characterName);\n                        this.settingsUI.setCurrentCharacter(characterName);\n                        this.novelUI.setCurrentCharacter(characterName);\n                        this.minutesUI.setCurrentCharacter(characterName);\n                        this.livestreamingUI.setCurrentCharacter(characterName);\n                        await this.messageUI.setContacts(loadedContacts);\n\n                        // 切换聊天后重新映射关系数据到世界书\n                        await this.minutesUI.onChatSwitch();\n\n                        await this.novelUI.loadNovelData();\n                        if (this.novelUI.novelData && this.novelUI.novelData.books) {\n                            this.ctx.log('phone-emulator', `[角色卡切换] 已加载 ${this.novelUI.novelData.books.length} 本小说`);\n                        }\n\n                        await this.livestreamingUI.loadLivestreamingData();\n                        if (this.livestreamingUI.livestreamingData && this.livestreamingUI.livestreamingData.rooms) {\n                            this.ctx.log('phone-emulator', `[角色卡切换] 已加载 ${this.livestreamingUI.livestreamingData.rooms.length} 个直播间`);\n                        }\n\n                        runWhenIdle(() => {\n                            if (this.modalOverlay && this.modalOverlay.classList.contains('visible')) {\n                                const chatList = document.getElementById('tsp-phone-chat-list');\n                                if (chatList) {\n                                    this.messageUI.loadAndRenderContacts();\n                                } else {\n                                    this.homeUI.renderHomeScreen();\n                                }\n                            }\n\n                            setTimeout(() => {\n                                if (loadedContacts.length > 0) {\n                                    this.ctx.helpers.showToast(`✨ 已加载 ${loadedContacts.length} 个联系人`, 'success');\n                                }\n                            }, 0);\n\n                            setTimeout(() => {\n                                if (this.modalOverlay && this.modalOverlay.classList.contains('visible')) {\n                                    const chatList = document.getElementById('tsp-phone-chat-list');\n                                    if (chatList) {\n                                        this.messageUI.loadAndRenderContacts();\n                                    }\n                                }\n                            }, 3000);\n                        });\n                    });\n                }, 2500);\n            }"
  ]
]
```