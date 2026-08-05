// === تنظیمات قابل تغییر توسط شما (فقط این اعداد را تغییر دهید) ===
const PERSPECTIVE_Y = 0.6;        // زاویه شش ضلعی ها
const HOUSE_SCALE = 1.1;          // بزرگنمایی خانه
const POWERPLANT_SCALE = 1.2;     // بزرگنمایی نیروگاه
const BASE_Y_RATIO = 0.85;        // موقعیت پایه ساختمان ها
const HOUSE_OFFSET_X = 0;         // جابجایی چپ و راست
const HOUSE_OFFSET_Y = 25;        // جابجایی بالا و پایین خانه
const POWERPLANT_OFFSET_Y = 10;   // جابجایی بالا و پایین نیروگاه
const MUSIC_START_TIME = 15;      // ثانیه شروع موسیقی
// --- تنظیمات دکمه‌های عکسی ---
const NEXT_DAY_BTN_TOP = 80;      // فاصله دکمه روز بعد از بالا (پایین هدر) در دسکتاپ
const NEXT_DAY_BTN_SIZE = 56;     // اندازه عکس دکمه روز بعد (پیکسل) در دسکتاپ
const PAUSE_BTN_SIZE = 32;        // اندازه عکس دکمه استوپ (پیکسل)
// --- تنظیمات مخصوص موبایل برای دکمه روز بعد ---
const MOBILE_NEXT_DAY_BTN_TOP = 138;  // فاصله دکمه روز بعد از بالا (فقط برای موبایل)
const MOBILE_NEXT_DAY_BTN_SIZE = 48; // اندازه عکس دکمه روز بعد (فقط برای موبایل)
// =================================================================

let bgMusic = null; 
let deferredPrompt = null;

const gameState = {
    day: 1, population: 5, fuel: 5, food: 30, wood: 20, stone: 20, heat: 0, hope: 30, satisfaction: 50,
    gameOver: false, isPaused: false, isPlacing: false, placingType: 'house', isMovingPop: false, isPlacingMigrants: false, migrantsToPlace: 0, migrantTargetHouses: [], mouseX: 0, mouseY: 0, currentSaveName: null,
    buildings: [], constructionSites: [], obstacles: [], clearingSites: [],
    hexes: [], hexSize: 45, clickedHex: null,
    HOUSE_HEXES: [{ q: 0, r: 0, pop: 5, daysOvercrowded: 0, lastReceived: 0, receivedToday: false }],
    POWERPLANT_HEXES: [], 
    tutorialStep: -1, 
    unlockedHexes: [],
    selectedRegion: null,
    moveSource: null,
    moveAmount: 0,
    expeditions: [],
    migrantRequests: [],
    pendingUnlockTarget: null,
    keyBindings: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' },
    rebindingKey: null,
    currentLang: 'fa'
};

const camera = { x: 0, y: 0, zoom: 1, dragging: false, dragStartX: 0, dragStartY: 0, startCamX: 0, startCamY: 0 };
let mapAnimId = null;

const keys = {}; 

const houseImg = new Image();
houseImg.src = "house.png?t=" + new Date().getTime();

const powerplantImg = new Image();
powerplantImg.src = "powerplant.png?t=" + new Date().getTime();

function getAllSaves() { try { return JSON.parse(localStorage.getItem('lastWarmthSaves')) || {}; } catch (e) { return {}; } }
function hasSavedGame() { return Object.keys(getAllSaves()).length > 0; }

function saveGame(silent = false, exitAfter = false) {
    if (gameState.gameOver) return false;
    if (!gameState.currentSaveName) { showSaveNameModal(exitAfter); return false; }
    try {
        let saves = getAllSaves();
        saves[gameState.currentSaveName] = {
            day: gameState.day, population: gameState.population, fuel: gameState.fuel, food: gameState.food, wood: gameState.wood, stone: gameState.stone, heat: gameState.heat, hope: gameState.hope, satisfaction: gameState.satisfaction,
            HOUSE_HEXES: gameState.HOUSE_HEXES, POWERPLANT_HEXES: gameState.POWERPLANT_HEXES, unlockedHexes: gameState.unlockedHexes, tutorialStep: gameState.tutorialStep
        };
        localStorage.setItem('lastWarmthSaves', JSON.stringify(saves));
        if (exitAfter) { showNotification("بازی ذخیره شد و به منوی اصلی بازگشتید...", "info"); setTimeout(() => window.location.reload(), 1500); } 
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
        document.body.appendChild(goScreen); const btnGoMenu = document.getElementById('btnGoMenu'); if (btnGoMenu) btnGoMenu.onclick = () => window.location.reload();
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

function drawMap() {
    if (gameState.gameOver) return;
    const canvas = document.getElementById('gameMap'); if (!canvas) return; const ctx = canvas.getContext('2d'); const container = document.getElementById('map-container'); if(!container) return; const rect = container.getBoundingClientRect(); if (rect.width === 0 || rect.height === 0) return; const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) { canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; } ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
    const mW = 3000, mH = 3000;
    if (!gameState.isPaused) { let moveSpeed = 15 / camera.zoom; if (keys[gameState.keyBindings.up]) camera.y -= moveSpeed; if (keys[gameState.keyBindings.down]) camera.y += moveSpeed; if (keys[gameState.keyBindings.left]) camera.x -= moveSpeed; if (keys[gameState.keyBindings.right]) camera.x += moveSpeed; }
    let minZoom = Math.max(rect.width / mW, rect.height / mH); if (camera.zoom < minZoom) camera.zoom = minZoom; if (camera.zoom > 2) camera.zoom = 2; let viewW = rect.width / camera.zoom, viewH = rect.height / camera.zoom; camera.x = Math.max(0, Math.min(mW - viewW, camera.x)); camera.y = Math.max(0, Math.min(mH - viewH, camera.y));
    ctx.save(); ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom); ctx.scale(camera.zoom, camera.zoom); ctx.fillStyle = '#dce8f0'; ctx.fillRect(0, 0, mW, mH); const hexW = gameState.hexSize * 2;
    gameState.constructionSites = gameState.constructionSites.filter(site => { let timeLeft = Math.ceil((site.endTime - Date.now()) / 1000); if (timeLeft <= 0) { if (!site.completed) { if (site.type === 'powerplant') { gameState.POWERPLANT_HEXES.push({ q: site.q, r: site.r }); showNotification("✅ نیروگاه جدید ساخته شد!", "success"); } else { gameState.HOUSE_HEXES.push({ q: site.q, r: site.r, pop: 0, daysOvercrowded: 0, lastReceived: 0, receivedToday: false }); showNotification("✅ خونه جدید ساخته شد!", "success"); } site.completed = true; updateUI(); } return false; } return true; });
    gameState.hexes.forEach(hex => { let houseData = gameState.HOUSE_HEXES.find(h => h.q === hex.q && h.r === hex.r); let ppData = gameState.POWERPLANT_HEXES.find(p => p.q === hex.q && p.r === hex.r); let isHouse = !!houseData, isPP = !!ppData; let dist = hexDistance(hex, { q: 0, r: 0 }); let isLocked = dist > 1; let isUnlocked = gameState.unlockedHexes.some(u => u.q === hex.q && u.r === hex.r) || dist <= 1; if (isLocked && !isUnlocked) { drawHex(ctx, hex.x, hex.y, gameState.hexSize, '#15181c', '#2a2e33', 1.5); drawEmbeddedLock(ctx, hex.x, hex.y); } else { drawHex(ctx, hex.x, hex.y, gameState.hexSize, '#ffffff', 'rgba(130, 160, 190, 0.4)', 1.5); } if (isHouse && houseImg.complete && houseImg.naturalHeight !== 0) { let imgW = hexW * HOUSE_SCALE, imgH = imgW * (houseImg.naturalHeight / houseImg.naturalWidth); let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + HOUSE_OFFSET_Y; ctx.drawImage(houseImg, drawX, drawY, imgW, imgH); const popText = `${houseData.pop}`; ctx.font = "bold 13px 'Vazirmatn', sans-serif"; const textWidth = ctx.measureText(popText).width; const pillW = textWidth + 30, pillH = 22, pillX = hex.x + 15, pillY = hex.y - 35; ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.beginPath(); if (ctx.roundRect) { ctx.roundRect(pillX, pillY, pillW, pillH, 11); } else { ctx.rect(pillX, pillY, pillW, pillH); } ctx.fillStyle = 'rgba(20, 20, 30, 0.9)'; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(244, 208, 63, 0.8)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.font = "12px Arial"; ctx.fillStyle = '#f4d03f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('👤', pillX + 6, pillY + pillH/2 + 1); ctx.font = "bold 13px 'Vazirmatn', sans-serif"; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(popText, pill
