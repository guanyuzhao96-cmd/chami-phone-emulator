# Phone image runtime audit

## Initialization

- Status: {"stage":"ready","error":null,"missingApiMethods":[],"accessTrace":[{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"api","type":"object"},{"scope":"api","property":"getValue","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"api","type":"object"},{"scope":"api","property":"getValue","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"events","type":"object"},{"scope":"events","property":"on","type":"function"},{"scope":"context","property":"events","type":"object"},{"scope":"events","property":"on","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"events","type":"object"},{"scope":"events","property":"on","type":"function"},{"scope":"context","property":"events","type":"object"},{"scope":"events","property":"on","type":"function"},{"scope":"context","property":"events","type":"object"},{"scope":"events","property":"on","type":"function"},{"scope":"context","property":"events","type":"object"},{"scope":"events","property":"on","type":"function"},{"scope":"context","property":"events","type":"object"},{"scope":"events","property":"on","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"warn","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"warn","type":"function"},{"scope":"context","property":"warn","type":"function"},{"scope":"context","property":"warn","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"warn","type":"function"},{"scope":"context","property":"warn","type":"function"},{"scope":"context","property":"warn","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"registerModule","type":"function"},{"scope":"context","property":"log","type":"function"},{"scope":"context","property":"getModule","type":"function"}],"timestamp":1786000909246}
- Instance: true

## Home controls

- BUTTON id=- class=tsp-phone-fab action=- text=""
- BUTTON id=- class=tsp-phone-close-btn action=- text=""
- DIV id=- class=tsp-phone-app-icon action=- text="消息"
- DIV id=- class=tsp-phone-app-icon action=- text="论坛"
- DIV id=- class=tsp-phone-app-icon action=- text="朋友圈"
- DIV id=- class=tsp-phone-app-icon action=- text="地图"
- DIV id=- class=tsp-phone-app-icon action=- text="音乐"
- DIV id=- class=tsp-phone-app-icon action=- text="人生重开"
- DIV id=- class=tsp-phone-app-icon action=- text="阅读"
- DIV id=- class=tsp-phone-app-icon action=- text="直播"
- DIV id=- class=tsp-phone-app-icon action=- text="剧情百科"
- DIV id=- class=tsp-phone-app-icon action=- text="云宠物"
- DIV id=- class=tsp-phone-app-icon action=- text="设置"
- BUTTON id=- class= action=- text="角色资料"

## Text-bearing elements

- SPAN.tsp-phone-status-time: "07:21"
- SPAN.: "消息"
- SPAN.: "论坛"
- SPAN.: "朋友圈"
- SPAN.: "地图"
- SPAN.: "音乐"
- SPAN.: "人生重开"
- SPAN.: "阅读"
- SPAN.: "直播"
- SPAN.: "剧情百科"
- SPAN.: "云宠物"
- SPAN.: "设置"
- SPAN.: "角色资料"

## Missing APIs
```json
[]
```

## Body
```html
<button class="tsp-phone-fab" title="打开手机模拟器" style="position: fixed; transition: transform 0.2s ease; left: 0px; top: 0px; transform: none;"><i class="fas fa-mobile-alt"></i></button><div class="tsp-phone-modal-overlay visible">
            <div class="tsp-phone-container">
                <div class="tsp-phone-notch"></div>
                <button class="tsp-phone-close-btn" title="关闭">
                    <i class="fas fa-times"></i>
                </button>
                <div class="tsp-phone-status-bar">
                    <div class="tsp-phone-status-bar-left">
                        <span class="tsp-phone-status-time" style="color: white;">07:21</span>
                    </div>
                    <div class="tsp-phone-status-bar-right">
                        <i class="fas fa-signal tsp-phone-status-icon-svg" style="color: white;"></i>
                        <i class="fas fa-wifi tsp-phone-status-icon-svg" style="color: white;"></i>
                        <i class="fas fa-battery-three-quarters tsp-phone-status-icon-svg" style="color: white;"></i>
                    </div>
                </div>
                <div class="tsp-phone-screen">
            <div class="tsp-phone-home-screen" id="tsp-phone-home-screen">
                <div class="tsp-phone-app-grid">
                    <div class="tsp-phone-app-icon" data-app="chat">
                        <div class="tsp-phone-app-icon-box chat">
                            <i class="fas fa-comments"></i>
                            
                        </div>
                        <span>消息</span>
                    </div>
                    <div class="tsp-phone-app-icon" data-app="forum">
                        <div class="tsp-phone-app-icon-box forum">
                            <i class="fas fa-users"></i>
                            
                        </div>
                        <span>论坛</span>
                    </div>
                    <div class="tsp-phone-app-icon" data-app="moments">
                        <div class="tsp-phone-app-icon-box moments">
                            <i class="fas fa-heart"></i>
                            
                        </div>
                        <span>朋友圈</span>
                    </div>
                    <div class="tsp-phone-app-icon" data-app="map">
                        <div class="tsp-phone-app-icon-box map">
                            <i class="fas fa-map"></i>
                        </div>
                        <span>地图</span>
                    </div>
                    <div class="tsp-phone-app-icon" data-app="music">
                        <div class="tsp-phone-app-icon-box music">
                            <i class="fas fa-music"></i>
                        </div>
                        <span>音乐</span>
                    </div>
                    <div class="tsp-phone-app-icon" data-app="remake">
                        <div class="tsp-phone-app-icon-box remake">
                            <i class="fas fa-redo-alt"></i>
                        </div>
                        <span>人生重开</span>
                    </div>
                    <div class="tsp-phone-app-icon" data-app="novel">
                        <div class="tsp-phone-app-icon-box novel">
                            <i class="fas fa-book"></i>
                        </div>
                        <span>阅读</span>
                    </div>
                    <div class="tsp-phone-app-icon" data-app="livestreaming">
                        <div class="tsp-phone-app-icon-box livestreaming">
                            <i class="fas fa-video"></i>
                        </div>
                        <span>直播</span>
                    </div>
                    <div class="tsp-phone-app-icon" data-app="minutes">
                        <div class="tsp-phone-app-icon-box minutes">
                            <i class="fas fa-sticky-note"></i>
                        </div>
                        <span>剧情百科</span>
                    </div>
                    <div class="tsp-phone-app-icon" data-app="virtualpet">
                        <div class="tsp-phone-app-icon-box virtualpet">
                            <i class="fas fa-cat"></i>
                        </div>
                        <span>云宠物</span>
                    </div>
                    <!-- <div class="tsp-phone-app-icon" data-app="keepalive">
                        <div class="tsp-phone-app-icon-box keepalive">
                            <i class="fas fa-heartbeat"></i>
                        </div>
                        <span>保活</span>
                    </div> -->
                    <div class="tsp-phone-app-icon" data-app="settings">
                        <div class="tsp-phone-app-icon-box settings">
                            <i class="fas fa-cog"></i>
                        </div>
                        <span>设置</span>
                    </div>
                </div>
            </div>
        <button type="button" data-character-profile-app="1" data-character-profile-fallback="1" aria-label="打开角色资料" title="角色资料" style="position: absolute; right: 12px; bottom: 72px; z-index: 80; width: 64px; min-height: 58px; border: 0px; border-radius: 16px; padding: 8px 6px; background: rgba(255, 255, 255, .92); color: #222; box-shadow: 0 4px 14px rgba(0,0,0,.18); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; cursor: pointer;"><i class="fas fa-id-card" style="font-size: 20px;"></i><span>角色资料</span></button></div>
            </div>
        </div>
```