// === تنظیمات قابل تغییر توسط شما (فقط این اعداد را تغییر دهید) ===
const PERSPECTIVE_Y = 0.6;        
const HOUSE_SCALE = 1.1;          
const POWERPLANT_SCALE = 1.2;     
const BASE_Y_RATIO = 0.85;        
const HOUSE_OFFSET_X = 0;         
const HOUSE_OFFSET_Y = 25;        
const POWERPLANT_OFFSET_Y = 10;   
const MUSIC_START_TIME = 5;       
const NEXT_DAY_BTN_TOP = 70;      
const NEXT_DAY_BTN_SIZE = 64;     
const PAUSE_BTN_SIZE = 32;        
const MOBILE_NEXT_DAY_BTN_TOP = 132;  
const MOBILE_NEXT_DAY_BTN_SIZE = 52; 
// =================================================================

let bgMusic = null; 
let deferredPrompt = null;

const gameState = {
    day: 1, population: 5, fuel: 5, food: 30, wood: 20, stone: 20, heat: 0, hope: 30, satisfaction: 50,
    gameOver: false, isPaused: false, isPlacing: false, placingType: 'house', placingSelectedHex: null, isMovingPop: false, isPlacingMigrants: false, migrantsToPlace: 0, migrantTargetHouses: [], mouseX: 0, mouseY: 0, currentSaveName: null,
    buildings: [], constructionSites: [], obstacles: [], clearingSites: [],
    hexes: [], hexSize: 45, clickedHex: null,
    HOUSE_HEXES: [{ q: 0, r: 0, pop: 5, daysOvercrowded: 0, lastReceived: 0, receivedToday: false }],
    POWERPLANT_HEXES: [], tutorialStep: -1, unlockedHexes: [], selectedRegion: null, moveSource: null, moveAmount: 0, expeditions: [], migrantRequests: [], pendingUnlockTarget: null,
    keyBindings: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }, rebindingKey: null, currentLang: 'fa'
};

const camera = { x: 0, y: 0, zoom: 1, dragging: false, dragStartX: 0, dragStartY: 0, startCamX: 0, startCamY: 0 };
let mapAnimId = null;
const keys = {}; 

const houseImg = new Image();
houseImg.src = "house.png";
const powerplantImg = new Image();
powerplantImg.src = "powerplant.png";

function getAllSaves() { try { return JSON.parse(localStorage.getItem('lastWarmthSaves')) || {}; } catch (e) { return {}; } }
function hasSavedGame() { return Object.keys(getAllSaves()).length > 0; }

function saveGame(silent = false, exitAfter = false) {
    if (gameState.gameOver) return false;
    if (!gameState.currentSaveName) { showSaveNameModal(exitAfter); return false; }
    try {
        let saves = getAllSaves();
        saves[gameState.currentSaveName] = { day: gameState.day, population: gameState.population, fuel: gameState.fuel, food: gameState.food, wood: gameState.wood, stone: gameState.stone, heat: gameState.heat, hope: gameState.hope, satisfaction: gameState.satisfaction, HOUSE_HEXES: gameState.HOUSE_HEXES, POWERPLANT_HEXES: gameState.POWERPLANT_HEXES, unlockedHexes: gameState.unlockedHexes, tutorialStep: gameState.tutorialStep };
        localStorage.setItem('lastWarmthSaves', JSON.stringify(saves));
        if (exitAfter) { 
            showNotification("بازی ذخیره شد و به منوی اصلی بازگشتید...", "info"); 
            setTimeout(() => {
                const gs = document.getElementById('game-screen');
                const hero = document.querySelector('.hero');
                const header = document.getElementById('siteHeader');
                const pauseModal = document.getElementById('pauseModal');
                const settingsModal = document.getElementById('settingsModal');
                if (gs) gs.style.display = 'none'; 
                if (hero) hero.style.display = 'flex'; 
                if (header) header.style.display = 'flex'; 
                if (pauseModal) pauseModal.style.display = 'none';
                if (settingsModal) settingsModal.style.display = 'none';
                document.body.style.paddingTop = ''; 
            }, 1000); 
        } 
        else if (!silent) { showNotification("بازی با موفقیت ذخیره شد!", "success"); }
        return true;
    } catch (e) { if (!silent) showNotification("خطا در ذخیره بازی!", "error"); return false; }
}

function showSaveNameModal(exitAfter = false) {
    let modal = document.getElementById('saveNameModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'saveNameModal';
        modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 7000; display: none; justify-content: center; align-items: center; font-family: 'Vazirmatn', sans-serif;";
        modal.innerHTML = `<div style="background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; width: 350px; max-width: 90%; display: flex; flex-direction: column; gap: 20px; text-align: center; box-shadow: 0 0 30px rgba(244, 208, 63, 0.2);"><h3 style="color: #f4d03f; font-size: 1.2rem; margin: 0;">ذخیره بازی جدید</h3><p style="color: #e8dcc8; font-size: 0.95rem; margin: 0; line-height: 1.6;">برای اینکه بعدا دوباره بیای و بقیه بازیات رو ادامه بدی، نامی زیبا برای ذخیره‌ات انتخاب کن:</p><input type="text" id="saveNameInput" style="width: 100%; padding: 10px; background: #111; color: #fff; border: 1px solid #333; border-radius: 6px; text-align: center; font-family: 'Vazirmatn', sans-serif; font-size: 1rem;" placeholder="مثلا: سفرنامه روز دهم"><div style="display: flex; gap: 10px;"><button id="confirmSaveNameBtn" style="flex:1; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer; font-family: 'Vazirmatn', sans-serif;">تایید و ذخیره</button><button id="cancelSaveNameBtn" style="flex:1; padding:10px; background:transparent; border:1px solid #8a7a6a; border-radius:6px; color:#f5e6c8; cursor:pointer; font-family: 'Vazirmatn', sans-serif;">انصراف</button></div></div>`;
        document.body.appendChild(modal);
        document.getElementById('confirmSaveNameBtn').onclick = () => { let name = document.getElementById('saveNameInput').value.trim(); if (name) { gameState.currentSaveName = name; modal.style.display = 'none'; let saved = saveGame(true, exitAfter); if (saved && !exitAfter) showNotification("بازی با موفقیت ذخیره شد!", "success"); } else { showNotification("لطفاً یک نام معتبر وارد کنید.", "warning"); } };
        document.getElementById('cancelSaveNameBtn').onclick = () => { modal.style.display = 'none'; };
    }
    document.getElementById('saveNameInput').value = "سفرنامه روز " + gameState.day;
    modal.style.display = 'flex';
}

function loadGame(saveName) { try { let saves = getAllSaves(); let savedData = saves[saveName]; if (savedData) { gameState.currentSaveName = saveName; gameState.day = savedData.day; gameState.population = savedData.population; gameState.fuel = savedData.fuel; gameState.food = savedData.food; gameState.wood = savedData.wood; gameState.stone = savedData.stone; gameState.heat = savedData.heat; gameState.hope = savedData.hope; gameState.satisfaction = savedData.satisfaction; gameState.HOUSE_HEXES = savedData.HOUSE_HEXES; gameState.POWERPLANT_HEXES = savedData.POWERPLANT_HEXES; gameState.unlockedHexes = savedData.unlockedHexes; gameState.tutorialStep = savedData.tutorialStep !== undefined ? savedData.tutorialStep : 0; return true; } } catch (e) {} return false; }
function deleteGame(saveName) { let saves = getAllSaves(); if (saves[saveName]) { delete saves[saveName]; localStorage.setItem('lastWarmthSaves', JSON.stringify(saves)); } }

function showGameOver() {
    gameState.gameOver = true; if (gameState.currentSaveName) { deleteGame(gameState.currentSaveName); gameState.currentSaveName = null; }
    const gs = document.getElementById('game-screen'); if (gs) gs.style.display = 'none';
    let goScreen = document.getElementById('gameOverScreen');
    if (!goScreen) {
        goScreen = document.createElement('div'); goScreen.id = 'gameOverScreen'; goScreen.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 5000; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #e74c3c; font-family: 'Vazirmatn', sans-serif; gap: 20px; text-align: center;";
        goScreen.innerHTML = `<h1 style="font-size: 4rem; text-shadow: 0 0 30px rgba(231, 76, 60, 0.8); margin: 0;">پایان بازی</h1><p style="color: #f5e6c8; font-size: 1.2rem; max-width: 400px;">شما و تمام شهروندانتان در این سرمای سهم‌گین جان خود را از دست دادید. امید همگانی برای همیشه از بین رفت...</p><button id="btnGoMenu" style="padding: 14px 40px; background: linear-gradient(135deg, #e8451a, #ff6b2b); color: #fff; border: none; border-radius: 4px; font-size: 18px; font-weight: 700; cursor: pointer; box-shadow: 0 0 25px rgba(232,69,26,0.4); margin-top: 20px;">منوی اصلی</button>`;
        document.body.appendChild(goScreen); 
        const btnGoMenu = document.getElementById('btnGoMenu'); 
        if (btnGoMenu) {
            btnGoMenu.onclick = () => {
                const hero = document.querySelector('.hero');
                const header = document.getElementById('siteHeader');
                if (goScreen) goScreen.style.display = 'none'; 
                if (hero) hero.style.display = 'flex'; 
                if (header) header.style.display = 'flex'; 
            };
        }
    } else { goScreen.style.display = 'flex'; }
}

function continueGame() {
    if (!hasSavedGame()) return; let saves = getAllSaves(); let saveNames = Object.keys(saves); let modal = document.getElementById('loadGameModal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'loadGameModal'; modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 6000; display: none; justify-content: center; align-items: center; font-family: 'Vazirmatn', sans-serif;"; document.body.appendChild(modal); }
    let html = `<div style="background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; width: 400px; max-width: 90%; display: flex; flex-direction: column; gap: 20px; max-height: 80vh; overflow-y: auto;"><h3 style="color: #f4d03f; font-size: 1.2rem; margin: 0; text-align: center;">انتخاب بازی برای ادامه</h3><div id="saveListContainer" style="display: flex; flex-direction: column; gap: 10px;">`;
    if (saveNames.length === 0) { html += `<p style="color: #aaa; text-align: center;">در حال حاضر بازی ذخیره شده‌ای وجود ندارد.</p>`; } 
    else { saveNames.forEach(name => { let s = saves[name]; html += `<div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;"><div><div style="color: #f5e6c8; font-weight: 700;">${name}</div><div style="color: #aaa; font-size: 0.8rem;">روز ${s.day} - جمعیت ${s.population}</div></div><div style="display: flex; gap: 8px;"><button class="load-save-btn" data-name="${name}" style="padding: 8px 16px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 6px; cursor: pointer; font-weight: bold; color:#1a1a2e; font-family: 'Vazirmatn', sans-serif;">شروع</button><button class="delete-save-btn" data-name="${name}" style="padding: 8px 16px; background: transparent; border: 1px solid #e74c3c; border-radius: 6px; cursor: pointer; color: #e74c3c; font-family: 'Vazirmatn', sans-serif;">حذف</button></div></div>`; }); }
    html += `</div><button id="closeLoadModal" style="padding: 10px; background: transparent; border: 1px solid #8a7a6a; border-radius: 6px; color: #f5e6c8; cursor: pointer; font-family: 'Vazirmatn', sans-serif;">بستن</button></div>`;
    modal.innerHTML = html; modal.style.display = 'flex'; const closeLoadModal = document.getElementById('closeLoadModal'); if (closeLoadModal) closeLoadModal.onclick = () => { modal.style.display = 'none'; };
    document.querySelectorAll('.load-save-btn').forEach(btn => { btn.onclick = () => { let name = btn.getAttribute('data-name'); if (loadGame(name)) { modal.style.display = 'none'; showStoryScreen(); startActualGame(); } }; });
    document.querySelectorAll('.delete-save-btn').forEach(btn => { btn.onclick = () => { let name = btn.getAttribute('data-name'); if (confirm("آیا از حذف این بازی مطمئن هستید؟")) { deleteGame(name); if (!hasSavedGame()) { modal.style.display = 'none'; } else { continueGame(); } } }; });
}

window.startTutorial = function(val) { gameState.tutorialStep = val ? 1 : 0; const box = document.getElementById('tutorialBox'); if (!val && box) box.style.display = 'none'; if (val) updateTutorialBox(); }
function acceptWaitingMigrants(id) { let req = gameState.migrantRequests.find(r => r.id === id); if (req) { startPlacingMigrants(req.count); gameState.migrantRequests = gameState.migrantRequests.filter(r => r.id !== id); let tracker = document.getElementById('requestTrackerBody'); if (tracker) { let divToRemove = tracker.querySelector(`[data-req-id="req_${id}"]`); if (divToRemove) divToRemove.remove(); if (gameState.migrantRequests.length === 0 && !tracker.querySelector('.no-req-msg')) { tracker.innerHTML = '<p class="no-req-msg" style="color: #aaa; text-align: center; font-size: 0.9rem;">در حال حاضر درخواستی وجود ندارد.</p>'; } } let panel = document.getElementById('panelRequests'); if(panel) panel.classList.remove('panel-open'); } }
window.acceptWaitingMigrants = acceptWaitingMigrants;

function createEmbers() {
    const c = document.getElementById('heroCanvas'); if (!c) return; const ctx = c.getContext('2d'); let W = c.width = window.innerWidth, H = c.height = window.innerHeight;
    window.addEventListener('resize', () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; });
    class Ember { constructor() { this.reset(); } reset() { this.x = Math.random() * W; this.y = H + Math.random() * 50; this.size = Math.random() * 2.5 + 0.5; this.speedY = -(Math.random() * 1.2 + 0.3); this.speedX = (Math.random() - 0.5) * 0.6; this.life = Math.random() * 180 + 60; this.maxLife = this.life; this.hue = Math.random() * 40 + 10; } update() { this.y += this.speedY; this.x += this.speedX; this.life--; this.size *= 0.998; if (this.life <= 0 || this.y < -20) this.reset(); } draw() { const alpha = Math.max(0, (this.life / this.maxLife) * 0.5); const r = this.hue < 25 ? 232 : 255; const g = this.hue < 25 ? 69 : (this.hue < 35 ? 150 : 213); const b = this.hue < 25 ? 26 : (this.hue < 35 ? 60 : 79); ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.1, this.size), 0, Math.PI * 2); ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`; ctx.fill(); } }
    const embers = []; for (let i = 0; i < 60; i++) embers.push(new Ember()); function animate() { ctx.clearRect(0, 0, W, H); embers.forEach(e => { e.update(); e.draw(); }); requestAnimationFrame(animate); } animate();
}
createEmbers();

function initHexGrid() { gameState.hexes = []; const mW = 3000, mH = 3000, cx = mW / 2, cy = mH / 2, size = gameState.hexSize; for (let q = -30; q <= 30; q++) { for (let r = -30; r <= 30; r++) { let x = size * (3/2 * q), y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) * PERSPECTIVE_Y; let absX = x + cx, absY = y + cy; if (absX > -size && absX < mW + size && absY > -size && absY < mH + size) gameState.hexes.push({ q, r, x: absX, y: absY }); } } gameState.hexes.sort((a, b) => a.y - b.y); }
function drawHex(ctx, x, y, size, fill, stroke, lineWidth = 1) { ctx.beginPath(); ctx.lineJoin = 'round'; for (let i = 0; i < 6; i++) { let angle = Math.PI / 3 * i; let px = x + size * Math.cos(angle), py = y + (size * Math.sin(angle)) * PERSPECTIVE_Y; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); } }
function drawEmbeddedLock(ctx, x, y) { ctx.save(); ctx.translate(x, y); const lockColor = '#3a4148'; ctx.fillStyle = lockColor; ctx.fillRect(-7, -1, 14, 11); ctx.lineWidth = 2.5; ctx.strokeStyle = lockColor; ctx.beginPath(); ctx.arc(0, -1, 4.5, Math.PI, 0); ctx.stroke(); ctx.fillStyle = '#15181c'; ctx.fillRect(-1, 2, 2, 5); ctx.restore(); }
function getHoveredHex(mx, my) { const size = gameState.hexSize, cx = 1500, cy = 1500; let relX = mx - cx, relY = (my - cy) / PERSPECTIVE_Y; let q = (2/3 * relX) / size, r = (-1/3 * relX + Math.sqrt(3)/3 * relY) / size, s = -q - r; let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s); let q_diff = Math.abs(rq - q), r_diff = Math.abs(rr - r), s_diff = Math.abs(rs - s); if (q_diff > r_diff && q_diff > s_diff) rq = -rr - rs; else if (r_diff > s_diff) rr = -rq - rs; return { q: rq, r: rr }; }
function hexDistance(a, b) { return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - (b.q + b.r))) / 2; }

let lastTrackerState = 'none';
function updateActionTracker() {
    let currentState = 'none';
    if (gameState.isMovingPop) currentState = 'move';
    else if (gameState.isPlacing) currentState = 'build_' + gameState.placingType;

    if (currentState === lastTrackerState) return;
    
    if (currentState === 'none') {
        const tracker = document.getElementById('actionTracker');
        if (tracker) {
            tracker.style.display = 'none';
            tracker.innerHTML = '';
        }
        lastTrackerState = 'none';
        return;
    }

    lastTrackerState = currentState;

    const tracker = document.getElementById('actionTracker');
    if (!tracker) return;
    let html = '';
    
    if (currentState === 'move') {
        html = `<div style="background: rgba(10,14,26,0.9); padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(244,208,63,0.3); margin-bottom: 5px; font-family: 'Vazirmatn', sans-serif;">
            <div style="color: #f4d03f; font-size: 0.7rem; margin-bottom: 4px; text-align: center;">${gameState.moveAmount} نفر در حال انتقال هستند</div>
            <button id="cancelMoveTrackBtn" style="width: 100%; padding: 3px; background: #e74c3c; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color:#fff; font-size: 0.7rem;">انصراف</button>
        </div>`;
    } else if (currentState.startsWith('build_')) {
        const buildingName = gameState.placingType === 'powerplant' ? 'نیروگاه' : 'خانه';
        html = `<div style="background: rgba(10,14,26,0.9); padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(244,208,63,0.3); margin-bottom: 5px; font-family: 'Vazirmatn', sans-serif;">
            <div style="color: #f4d03f; font-size: 0.7rem; margin-bottom: 4px; text-align: center;">در حال انتخاب موقعیت ${buildingName}</div>
            <button id="cancelBuildTrackBtn" style="width: 100%; padding: 3px; background: #e74c3c; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color:#fff; font-size: 0.7rem;">انصراف</button>
        </div>`;
    }

    tracker.style.display = 'flex';
    tracker.innerHTML = html;

    const cancelMoveBtn = document.getElementById('cancelMoveTrackBtn');
    if (cancelMoveBtn) {
        cancelMoveBtn.addEventListener('click', () => {
            gameState.isMovingPop = false;
            showNotification("انتقال لغو شد", "info");
            lastTrackerState = 'none';
            updateActionTracker();
        });
    }
    const cancelBuildBtn = document.getElementById('cancelBuildTrackBtn');
    if (cancelBuildBtn) {
        cancelBuildBtn.addEventListener('click', () => {
            gameState.isPlacing = false;
            gameState.placingSelectedHex = null;
            showNotification("ساخت لغو شد", "info");
            lastTrackerState = 'none';
            updateActionTracker();
        });
    }
}

function drawMap() {
    if (gameState.gameOver) return;
    const canvas = document.getElementById('gameMap'); if (!canvas) return; const ctx = canvas.getContext('2d'); const container = document.getElementById('map-container'); if(!container) return; const rect = container.getBoundingClientRect(); if (rect.width === 0 || rect.height === 0) return; const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) { canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; } ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
    const mW = 3000, mH = 3000;
    if (!gameState.isPaused) { let moveSpeed = 15 / camera.zoom; if (keys[gameState.keyBindings.up]) camera.y -= moveSpeed; if (keys[gameState.keyBindings.down]) camera.y += moveSpeed; if (keys[gameState.keyBindings.left]) camera.x -= moveSpeed; if (keys[gameState.keyBindings.right]) camera.x += moveSpeed; }
    let minZoom = Math.max(rect.width / mW, rect.height / mH); if (camera.zoom < minZoom) camera.zoom = minZoom; if (camera.zoom > 2) camera.zoom = 2; let viewW = rect.width / camera.zoom, viewH = rect.height / camera.zoom; camera.x = Math.max(0, Math.min(mW - viewW, camera.x)); camera.y = Math.max(0, Math.min(mH - viewH, camera.y));
    ctx.save(); ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom); ctx.scale(camera.zoom, camera.zoom); ctx.fillStyle = '#dce8f0'; ctx.fillRect(0, 0, mW, mH); const hexW = gameState.hexSize * 2;
    gameState.constructionSites = gameState.constructionSites.filter(site => { let timeLeft = Math.ceil((site.endTime - Date.now()) / 1000); if (timeLeft <= 0) { if (!site.completed) { if (site.type === 'powerplant') { gameState.POWERPLANT_HEXES.push({ q: site.q, r: site.r }); showNotification("✅ نیروگاه جدید ساخته شد!", "success"); } else { gameState.HOUSE_HEXES.push({ q: site.q, r: site.r, pop: 0, daysOvercrowded: 0, lastReceived: 0, receivedToday: false }); showNotification("✅ خونه جدید ساخته شد!", "success"); } site.completed = true; updateUI(); } return false; } return true; });
    gameState.hexes.forEach(hex => { let houseData = gameState.HOUSE_HEXES.find(h => h.q === hex.q && h.r === hex.r); let ppData = gameState.POWERPLANT_HEXES.find(p => p.q === hex.q && p.r === hex.r); let isHouse = !!houseData, isPP = !!ppData; let dist = hexDistance(hex, { q: 0, r: 0 }); let isLocked = dist > 1; let isUnlocked = gameState.unlockedHexes.some(u => u.q === hex.q && u.r === hex.r) || dist <= 1; if (isLocked && !isUnlocked) { drawHex(ctx, hex.x, hex.y, gameState.hexSize, '#15181c', '#2a2e33', 1.5); drawEmbeddedLock(ctx, hex.x, hex.y); } else { drawHex(ctx, hex.x, hex.y, gameState.hexSize, '#ffffff', 'rgba(130, 160, 190, 0.4)', 1.5); } if (isHouse && houseImg.complete && houseImg.naturalHeight !== 0) { let imgW = hexW * HOUSE_SCALE, imgH = imgW * (houseImg.naturalHeight / houseImg.naturalWidth); let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + HOUSE_OFFSET_Y; ctx.drawImage(houseImg, drawX, drawY, imgW, imgH); const popText = `${houseData.pop}`; ctx.font = "bold 13px 'Vazirmatn', sans-serif"; const textWidth = ctx.measureText(popText).width; const pillW = textWidth + 30, pillH = 22, pillX = hex.x + 15, pillY = hex.y - 35; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.beginPath(); if (ctx.roundRect) { ctx.roundRect(pillX, pillY, pillW, pillH, 11); } else { ctx.rect(pillX, pillY, pillW, pillH); } ctx.fillStyle = 'rgba(20, 20, 30, 0.9)'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(244, 208, 63, 0.8)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.font = "12px Arial"; ctx.fillStyle = '#f4d03f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('👤', pillX + 6, pillY + pillH/2 + 1); ctx.font = "bold 13px 'Vazirmatn', sans-serif"; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(popText, pillX + pillW/2 + 6, pillY + pillH/2 + 1); ctx.restore(); } if (isPP && powerplantImg.complete && powerplantImg.naturalHeight !== 0) { let imgW = hexW * POWERPLANT_SCALE, imgH = imgW * (powerplantImg.naturalHeight / powerplantImg.naturalWidth); let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + POWERPLANT_OFFSET_Y; ctx.drawImage(powerplantImg, drawX, drawY, imgW, imgH); } let site = gameState.constructionSites.find(s => s.q === hex.q && s.r === hex.r); if (site) { let timeLeft = Math.ceil((site.endTime - Date.now()) / 1000); let progress = 1 - ((site.endTime - Date.now()) / 30000); ctx.beginPath(); ctx.arc(hex.x, hex.y, 20, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fill(); ctx.beginPath(); ctx.arc(hex.x, hex.y, 20, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * progress)); ctx.lineWidth = 4; ctx.strokeStyle = '#f4d03f'; ctx.stroke(); ctx.font = "bold 14px 'Vazirmatn', sans-serif"; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(timeLeft + 's', hex.x, hex.y); } });
    
    if (gameState.isPlacing) {
        let imgToDraw = gameState.placingType === 'powerplant' ? powerplantImg : houseImg; 
        let currentScale = gameState.placingType === 'powerplant' ? POWERPLANT_SCALE : HOUSE_SCALE; 
        let currentOffsetY = gameState.placingType === 'powerplant' ? POWERPLANT_OFFSET_Y : HOUSE_OFFSET_Y;
        
        let targetHex = null;
        
        if (gameState.placingSelectedHex) {
            targetHex = gameState.placingSelectedHex;
        } else {
            targetHex = getHoveredHex(gameState.mouseX, gameState.mouseY);
            if (targetHex) {
                let tIsHouse = gameState.HOUSE_HEXES.some(h => h.q === targetHex.q && h.r === targetHex.r);
                let tIsPP = gameState.POWERPLANT_HEXES.some(p => p.q === targetHex.q && p.r === targetHex.r);
                let tIsOccupied = gameState.constructionSites.some(c => c.q === targetHex.q && c.r === targetHex.r);
                let tIsUnlocked = gameState.unlockedHexes.some(u => u.q === targetHex.q && u.r === targetHex.r) || hexDistance(targetHex, { q: 0, r: 0 }) <= 1;
                let tooClose = false;
                for (let h of gameState.HOUSE_HEXES) { if (hexDistance(targetHex, h) <= 1) { tooClose = true; break; } }
                if (!tooClose) { for (let p of gameState.POWERPLANT_HEXES) { if (hexDistance(targetHex, p) <= 1) { tooClose = true; break; } } }
                
                if (tIsHouse || tIsPP || tIsOccupied || !tIsUnlocked || tooClose) {
                    targetHex = null; 
                }
            }
        }
        
        if (targetHex && imgToDraw.complete && imgToDraw.naturalHeight !== 0) {
            let hex = gameState.hexes.find(h => h.q === targetHex.q && h.r === targetHex.r);
            if (hex) {
                let imgW = hexW * currentScale, imgH = imgW * (imgToDraw.naturalHeight / imgToDraw.naturalWidth);
                let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + currentOffsetY; 
                ctx.globalAlpha = 0.6; ctx.drawImage(imgToDraw, drawX, drawY, imgW, imgH); ctx.globalAlpha = 1;
                
                if (gameState.placingSelectedHex) {
                    const btnRadius = 24; 
                    ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(hex.x + 35, hex.y - 25, btnRadius, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', hex.x + 35, hex.y - 24);
                    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(hex.x - 35, hex.y - 25, btnRadius, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#fff'; ctx.fillText('✕', hex.x - 35, hex.y - 24);
                }
            }
        }
    }
    ctx.restore(); 
    if (!gameState.isPaused) { updateExpeditions(); updateRequests(); }
    updateActionTracker();
}

function setupControls() {
    const canvas = document.getElementById('gameMap'); if(!canvas) return;
    window.addEventListener('keydown', e => { if (e.code === 'Escape') { const gs = document.getElementById('game-screen'); if (gs && gs.style.display === 'block') { const sm = document.getElementById('settingsModal'); if (sm && sm.style.display === 'flex') { sm.style.display = 'none'; const pm = document.getElementById('pauseModal'); if(pm) pm.style.display = 'flex'; } else { togglePauseMenu(); } } return; } if (gameState.rebindingKey) { e.preventDefault(); if (e.code !== 'Escape') { gameState.keyBindings[gameState.rebindingKey] = e.code; updateBindTexts(); showNotification(LANG[gameState.currentLang].keyBindSuccess, "success"); } gameState.rebindingKey = null; return; } if (gameState.isPaused) return; keys[e.code] = true; if (Object.values(gameState.keyBindings).includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    
    let mouseDragged = false;
    let lastTouchTime = 0;
    
    canvas.addEventListener('mousedown', e => {
        if (gameState.isPaused) return;
        camera.dragging = true; camera.dragStartX = e.clientX; camera.dragStartY = e.clientY;
        camera.startCamX = camera.x; camera.startCamY = camera.y; mouseDragged = false; canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect(); gameState.mouseX = camera.x + ((e.clientX - rect.left) / camera.zoom); gameState.mouseY = camera.y + ((e.clientY - rect.top) / camera.zoom);
        if (camera.dragging) {
            camera.x = camera.startCamX - (e.clientX - camera.dragStartX) / camera.zoom; camera.y = camera.startCamY - (e.clientY - camera.dragStartY) / camera.zoom;
            if (Math.abs(e.clientX - camera.dragStartX) > 5 || Math.abs(e.clientY - camera.dragStartY) > 5) { mouseDragged = true; }
        }
    });
    window.addEventListener('mouseup', () => { camera.dragging = false; canvas.style.cursor = 'grab'; });
    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (gameState.isPlacing) { gameState.isPlacing = false; gameState.placingSelectedHex = null; showNotification(LANG[gameState.currentLang].buildCancel, "info"); lastTrackerState = 'none'; updateActionTracker(); }
        if (gameState.isMovingPop) { gameState.isMovingPop = false; showNotification(LANG[gameState.currentLang].moveCancel, "info"); lastTrackerState = 'none'; updateActionTracker(); }
    });
    canvas.addEventListener('wheel', e => { if(gameState.isPaused) return; e.preventDefault(); let newZoom = camera.zoom + (e.deltaY > 0 ? -0.1 : 0.1); const mW = 3000, mH = 3000, rect = canvas.getBoundingClientRect(); let minZoom = Math.max(rect.width / mW, rect.height / mH); camera.zoom = Math.max(minZoom, Math.min(2, newZoom)); }, { passive: false });
    canvas.addEventListener('click', (e) => { 
        if (Date.now() - lastTouchTime < 500) return; 
        e.preventDefault(); 
        if(!gameState.isPaused && !mouseDragged) handleMapClick(); 
        mouseDragged = false; 
    });
    
    let pinchInitialDistance = 0, pinchInitialZoom = 1; function getDistance(touches) { const dx = touches[0].clientX - touches[1].clientX; const dy = touches[0].clientY - touches[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
    canvas.addEventListener('touchstart', e => {
        if (gameState.isPaused) return; e.preventDefault();
        lastTouchTime = Date.now();
        if (e.touches.length === 1) {
            camera.dragging = true; camera.dragStartX = e.touches[0].clientX; camera.dragStartY = e.touches[0].clientY; camera.startCamX = camera.x; camera.startCamY = camera.y;
            mouseDragged = false;
        } else if (e.touches.length === 2) {
            pinchInitialDistance = getDistance(e.touches); pinchInitialZoom = camera.zoom; camera.dragging = false;
        }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        if (gameState.isPaused) return; e.preventDefault();
        if (e.touches.length === 2) {
            const currentDistance = getDistance(e.touches);
            if (pinchInitialDistance > 0) { let zoomFactor = currentDistance / pinchInitialDistance; let newZoom = pinchInitialZoom * zoomFactor; const mW = 3000, mH = 3000, rect = canvas.getBoundingClientRect(); let minZoom = Math.max(rect.width / mW, rect.height / mH); camera.zoom = Math.max(minZoom, Math.min(2, newZoom)); }
        } else if (camera.dragging && e.touches.length === 1) {
            camera.x = camera.startCamX - (e.touches[0].clientX - camera.dragStartX) / camera.zoom; camera.y = camera.startCamY - (e.touches[0].clientY - camera.dragStartY) / camera.zoom;
            if (Math.abs(e.touches[0].clientX - camera.dragStartX) > 5 || Math.abs(e.touches[0].clientY - camera.dragStartY) > 5) {
                mouseDragged = true;
            }
        }
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        lastTouchTime = Date.now();
        if (e.touches.length < 2) pinchInitialDistance = 0;
        if (camera.dragging && e.changedTouches.length === 1 && e.touches.length === 0) {
            if (!mouseDragged) {
                const rect = canvas.getBoundingClientRect(); const tx = e.changedTouches[0].clientX - rect.left, ty = e.changedTouches[0].clientY - rect.top;
                gameState.mouseX = camera.x + (tx / camera.zoom); gameState.mouseY = camera.y + (ty / camera.zoom); handleMapClick();
            }
        }
        if (e.touches.length === 0) camera.dragging = false;
    }, { passive: false });
}

function togglePauseMenu() { gameState.isPaused = !gameState.isPaused; const pm = document.getElementById('pauseModal'); if(pm) pm.style.display = gameState.isPaused ? 'flex' : 'none'; if (!gameState.isPaused) { const sm = document.getElementById('settingsModal'); if(sm) sm.style.display = 'none'; } }
function updateBindTexts() { const elUp = document.getElementById('bindUp'); if(elUp) elUp.innerText = gameState.keyBindings.up.replace('Key', ''); const elDown = document.getElementById('bindDown'); if(elDown) elUp.innerText = gameState.keyBindings.down.replace('Key', ''); const elLeft = document.getElementById('bindLeft'); if(elLeft) elLeft.innerText = gameState.keyBindings.left.replace('Key', ''); const elRight = document.getElementById('bindRight'); if(elRight) elRight.innerText = gameState.keyBindings.right.replace('Key', ''); }
function calculateCanFit(count) { let totalPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0); let totalCapacity = gameState.HOUSE_HEXES.length * 3; return (totalCapacity - totalPop) >= count; }
function startPlacingMigrants(count) { gameState.isPlacingMigrants = true; gameState.migrantsToPlace = count; gameState.migrantTargetHouses = []; showNotification(`${count} مهاجر وارد شد. روی خونه‌ها کلیک کن تا مستقر شوند.`, "info"); }

function executeBuild(target) {
    if (gameState.placingType === 'house') {
        if (gameState.tutorialStep === 4 || gameState.tutorialStep === 0) {
            if (gameState.wood >= 10) { gameState.wood -= 10; updateUI(); gameState.constructionSites.push({ q: target.q, r: target.r, endTime: Date.now() + 30000, completed: false, type: 'house' }); if (gameState.tutorialStep === 4) { gameState.tutorialStep = 5; updateTutorialBox(); } showNotification(LANG[gameState.currentLang].buildStart, "success"); return true; } 
            else { showNotification(LANG[gameState.currentLang].noWood, "warning"); return false; }
        } else if (gameState.tutorialStep > 0) { showNotification("فعلاً طبق آموزش پیش برو!", "warning"); return false; }
    } else if (gameState.placingType === 'powerplant') {
        if (gameState.tutorialStep === 12 || gameState.tutorialStep === 0) { 
            if (gameState.stone >= 10) { gameState.stone -= 10; updateUI(); gameState.constructionSites.push({ q: target.q, r: target.r, endTime: Date.now() + 30000, completed: false, type: 'powerplant' }); if (gameState.tutorialStep === 12) { gameState.tutorialStep = 13; updateTutorialBox(); } showNotification("نیروگاه در حال ساخت است و ۱۰ سنگ کم شد!", "success"); return true; } 
            else { showNotification("سنگ کافی نداری!", "warning"); return false; }
        } else if (gameState.tutorialStep > 0) { showNotification("فعلاً طبق آموزش پیش برو!", "warning"); return false; }
    }
    return false;
}

function handleMapClick() {
    const target = getHoveredHex(gameState.mouseX, gameState.mouseY); let dist = hexDistance(target, { q: 0, r: 0 }); let isLocked = dist > 1; let isUnlocked = gameState.unlockedHexes.some(u => u.q === target.q && u.r === target.r) || dist <= 1; let isHouse = gameState.HOUSE_HEXES.some(h => h.q === target.q && h.r === target.r); let isPP = gameState.POWERPLANT_HEXES.some(p => p.q === target.q && p.r === target.r); let isOccupied = gameState.constructionSites.some(c => c.q === target.q && c.r === target.r);
    
    if (gameState.isPlacingMigrants) { 
        let destHouse = gameState.HOUSE_HEXES.find(h => h.q === target.q && h.r === target.r);
        if (destHouse) {
            if (parseInt(destHouse.pop) < 5) {
                destHouse.pop++; 
                if (!gameState.migrantTargetHouses.includes(destHouse)) gameState.migrantTargetHouses.push(destHouse); 
                gameState.migrantsToPlace--; 
                updateUI(); 
                if (gameState.migrantsToPlace === 0) { 
                    gameState.isPlacingMigrants = false; 
                    let causedOverpopulation = false; 
                    for (let h of gameState.migrantTargetHouses) { 
                        if (h.pop > 3) { causedOverpopulation = true; break; } 
                    } 
                    if (causedOverpopulation) { 
                        gameState.satisfaction = Math.max(0, gameState.satisfaction - 1); 
                        showNotification("خونه‌های پذیرنده شلوغ شد! ۱ درصد رضایت کم شد.", "warning"); 
                    } else { 
                        gameState.satisfaction = Math.min(100, gameState.satisfaction + 1); 
                        showNotification("میزبانی عالی بود! ۱ درصد رضایت بیشتر شد.", "success"); 
                    } 
                    updateUI(); 
                } 
            } else {
                showNotification("ظرفیت این خانه (۵ نفر) پر است!", "warning");
            }
        } else {
            showNotification("لطفاً روی یکی از خانه‌ها کلیک کنید!", "warning");
        }
        return; 
    }
    
    if (gameState.isMovingPop) { 
        let destHouse = gameState.HOUSE_HEXES.find(h => h.q === target.q && h.r === target.r); 
        let sourceHouse = gameState.HOUSE_HEXES.find(h => h.q === gameState.moveSource.q && h.r === gameState.moveSource.r); 
        if (destHouse && sourceHouse && destHouse !== sourceHouse) { 
            if (destHouse.pop + gameState.moveAmount > 5) { 
                showNotification("ظرفیت این خانه پر است! حداکثر ۵ نفر در یک خانه جا می‌گیرند.", "warning"); 
                gameState.isMovingPop = false; 
                lastTrackerState = 'none'; updateActionTracker(); 
                return; 
            } 
            
            if (sourceHouse.receivedToday) { 
                showAngryMoveModal(); 
                sourceHouse.receivedToday = false; 
                gameState.isMovingPop = false; 
                lastTrackerState = 'none'; updateActionTracker(); 
                return; 
            } 
            
            const sourceWasCrowded = sourceHouse.pop >= 4;
            const destWillBeCrowded = destHouse.pop + gameState.moveAmount >= 4;

            let satisfactionChange = 0;
            let moveMessage = "جابه‌جایی انجام شد.";

            if (sourceWasCrowded && !destWillBeCrowded) {
                satisfactionChange = 1;
                moveMessage = "شرایط زندگی بهتر شد! ۱ درصد رضایت بیشتر شد.";
            } else if (!sourceWasCrowded && destWillBeCrowded) {
                satisfactionChange = -1;
                moveMessage = "خونه مقصد شلوغ‌تر شد! ۱ درصد رضایت کم شد.";
            }

            if (satisfactionChange > 0) {
                gameState.satisfaction = Math.min(100, gameState.satisfaction + satisfactionChange);
                showNotification(moveMessage, "success");
            } else if (satisfactionChange < 0) {
                gameState.satisfaction = Math.max(0, gameState.satisfaction + satisfactionChange);
                showNotification(moveMessage, "warning");
            } else {
                showNotification(moveMessage, "info");
            }

            sourceHouse.pop -= gameState.moveAmount; 
            destHouse.pop += gameState.moveAmount; 
            destHouse.receivedToday = true; 
            updateUI(); 
            gameState.isMovingPop = false; 
            lastTrackerState = 'none'; updateActionTracker();
            
            if (gameState.tutorialStep === 16) { 
                gameState.tutorialStep = 17; 
                updateTutorialBox(); 
            } 
        } else {
            if (!destHouse) showNotification("لطفاً روی یک خانه کلیک کنید!", "warning");
            else if (destHouse === sourceHouse) showNotification("لطفاً روی خانه دیگری کلیک کنید!", "warning");
        } 
        return; 
    }
    
    if (gameState.isPlacing) {
        if (gameState.placingSelectedHex) {
            let selectedHexObj = gameState.hexes.find(h => h.q === gameState.placingSelectedHex.q && h.r === gameState.placingSelectedHex.r);
            if (selectedHexObj) {
                let clickX = gameState.mouseX, clickY = gameState.mouseY;
                let distConfirm = Math.sqrt((clickX - (selectedHexObj.x + 35))**2 + (clickY - (selectedHexObj.y - 25))**2);
                let distCancel = Math.sqrt((clickX - (selectedHexObj.x - 35))**2 + (clickY - (selectedHexObj.y - 25))**2);
                const touchRadius = 28; 

                if (distConfirm <= touchRadius) {
                    if (executeBuild(gameState.placingSelectedHex)) {
                        gameState.isPlacing = false;
                        gameState.placingSelectedHex = null;
                        lastTrackerState = 'none'; updateActionTracker();
                    }
                    return;
                } else if (distCancel <= touchRadius) {
                    gameState.isPlacing = false;
                    gameState.placingSelectedHex = null;
                    showNotification(LANG[gameState.currentLang].buildCancel, "info");
                    lastTrackerState = 'none'; updateActionTracker();
                    return;
                }
            }
        }

        let tIsHouse = gameState.HOUSE_HEXES.some(h => h.q === target.q && h.r === target.r);
        let tIsPP = gameState.POWERPLANT_HEXES.some(p => p.q === target.q && p.r === target.r);
        let tIsOccupied = gameState.constructionSites.some(c => c.q === target.q && c.r === target.r);
        let tIsUnlocked = gameState.unlockedHexes.some(u => u.q === target.q && u.r === target.r) || hexDistance(target, { q: 0, r: 0 }) <= 1;

        if (tIsHouse || tIsPP || tIsOccupied) { showNotification(LANG[gameState.currentLang].occupied, "warning"); return; }
        if (!tIsUnlocked) { showNotification("یک مکان باز رو انتخاب کن!", "warning"); return; }

        let tooClose = false;
        for (let h of gameState.HOUSE_HEXES) { if (hexDistance(target, h) <= 1) { tooClose = true; break; } }
        if (!tooClose) { for (let p of gameState.POWERPLANT_HEXES) { if (hexDistance(target, p) <= 1) { tooClose = true; break; } } }
        if (tooClose) { showNotification(LANG[gameState.currentLang].tooClose, "warning"); return; }

        gameState.placingSelectedHex = target;
        return;
    }
    
    if (isHouse && !gameState.isPlacing) { let house = gameState.HOUSE_HEXES.find(h => h.q === target.q && h.r === target.r); let isMainHouse = (house.q === 0 && house.r === 0); let maxTransferable = isMainHouse ? house.pop - 1 : house.pop; if (maxTransferable > 0) { if (gameState.tutorialStep === 14 || gameState.tutorialStep === 0) { gameState.moveSource = target; openMovePopPanel(maxTransferable); if (gameState.tutorialStep === 14) { gameState.tutorialStep = 15; updateTutorialBox(); } } else if (gameState.tutorialStep > 0) { showNotification("لطفاً طبق آموزش پیش برو!", "warning"); } } else { showNotification("آدمی برای انتقال در این خانه نیست!", "info"); } return; }
    
    if (isLocked && !isUnlocked && !isHouse && !isPP && !isOccupied) { 
        const neighbors = [ { q: target.q + 1, r: target.r }, { q: target.q - 1, r: target.r }, { q: target.q, r: target.r + 1 }, { q: target.q, r: target.r - 1 }, { q: target.q + 1, r: target.r - 1 }, { q: target.q - 1, r: target.r + 1 } ]; 
        let isAdjacent = false; 
        for (let n of neighbors) { 
            let nDist = hexDistance(n, { q: 0, r: 0 }); 
            let nIsHouse = gameState.HOUSE_HEXES.some(h => h.q === n.q && h.r === n.r); 
            let nIsUnlocked = gameState.unlockedHexes.some(u => u.q === n.q && u.r === n.r) || nDist <= 1; 
            if (nIsHouse || nIsUnlocked) { isAdjacent = true; break; } 
        } 
        if (!isAdjacent) { showNotification(LANG[gameState.currentLang].noAdjacent, "warning"); return; } 
        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 1 && gameState.tutorialStep !== 9) { showNotification("فعلاً طبق آموزش پیش برو!", "info"); return; } 
        if (gameState.tutorialStep === 9) { 
            let isAdjacentToHouse = false; 
            for (let h of gameState.HOUSE_HEXES) { if (hexDistance(target, h) === 1) { isAdjacentToHouse = true; break; } } 
            if (isAdjacentToHouse) { showNotification("برای نیروگاه، جایی رو انتخاب کن که کنارش خونه نباشه!", "warning"); return; } 
        } 
        gameState.pendingUnlockTarget = target; 
        const um = document.getElementById('unlockModal'); if(um) um.style.display = 'block'; return; 
    }
    
    if (gameState.tutorialStep > 0) { if (gameState.tutorialStep === 1 || gameState.tutorialStep === 9) showNotification("روی یکی از خانه‌های قفل‌شده کلیک کن!", "warning"); else if (gameState.tutorialStep === 2 || gameState
