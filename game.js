// === تنظیمات قابل تغییر توسط شما (فقط این اعداد را تغییر دهید) ===
const PERSPECTIVE_Y = 0.6;        
const HOUSE_SCALE = 1.1;          
const POWERPLANT_SCALE = 1.2;     
const BARRACKS_SCALE = 1.1;       
const COUNCIL_SCALE = 1.1;            // اندازه مجلس
const BASE_Y_RATIO = 0.85;        
const HOUSE_OFFSET_X = 0;         
const HOUSE_OFFSET_Y = 15;        
const POWERPLANT_OFFSET_Y = 20;   
const BARRACKS_OFFSET_Y = 25;     
const COUNCIL_OFFSET_Y = 15;          // با این عدد میتونی مجلس رو بالا و پایین کنی
const MUSIC_START_TIME = 5;       
const NEXT_DAY_BTN_TOP = 70;      
const NEXT_DAY_BTN_SIZE = 64;     
const PAUSE_BTN_SIZE = 32;        
const MOBILE_NEXT_DAY_BTN_TOP = 132;  
const MOBILE_NEXT_DAY_BTN_SIZE = 52; 
// =================================================================
// === تنظیمات جایگیری عمودی عکس‌ها در منوی ساخت و ساز ===
const MENU_HOUSE_OFFSET_Y = 0;        // جابجایی عمودی عکس خانه در منو
const MENU_POWERPLANT_OFFSET_Y = 5;   // جابجایی عمودی عکس نیروگاه در منو
const MENU_BARRACKS_OFFSET_Y = 2;     // جابجایی عمودی عکس پادگان در منو
// =================================================================

let bgMusic = null; 
let deferredPrompt = null;

const gameState = {
    day: 1, population: 5, fuel: 5, food: 30, wood: 20, stone: 20, heat: 0, hope: 30, satisfaction: 50,
    gameOver: false, isPaused: false, isPlacing: false, placingType: 'house', placingSelectedHex: null, isMovingPop: false, isPlacingMigrants: false, migrantsToPlace: 0, migrantTargetHouses: [], mouseX: 0, mouseY: 0, currentSaveName: null,
    buildings: [], constructionSites: [], obstacles: [], clearingSites: [],
    hexes: [], hexSize: 45, clickedHex: null,
    HOUSE_HEXES: [{ q: 0, r: 0, pop: 5, daysOvercrowded: 0, lastReceived: 0, receivedToday: false }],
    POWERPLANT_HEXES: [], 
    BARRACKS_HEXES: [], 
    COUNCIL_HEXES: [{ q: 2, r: -1 }], 
    tutorialStep: -1, 
    unlockedHexes: [
        { q: 2, r: -1 }, 
        { q: 3, r: -1 }, { q: 1, r: -1 }, { q: 2, r: 0 }, 
        { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: 0 }
    ], 
    selectedRegion: null, moveSource: null, moveAmount: 0, expeditions: [], migrantRequests: [], pendingUnlockTarget: null,
    keyBindings: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }, rebindingKey: null, currentLang: 'fa',
    soldiersLvl1: 0, soldiersLvl2: 0,
    training: { active: false, remaining: 0, targetTime: 0, isUpgrade: false }
};

const camera = { x: 0, y: 0, zoom: 1, dragging: false, dragStartX: 0, dragStartY: 0, startCamX: 0, startCamY: 0 };
let mapAnimId = null;
const keys = {}; 

const houseImg = new Image();
houseImg.src = "house1.png";
const powerplantImg = new Image();
powerplantImg.src = "powerplant1.png";
const barracksImg = new Image();
barracksImg.src = "barracks.png";
const councilHallImg = new Image();
councilHallImg.src = "council_hall.png";

function getAllSaves() { try { return JSON.parse(localStorage.getItem('lastWarmthSaves')) || {}; } catch (e) { return {}; } }
function hasSavedGame() { return Object.keys(getAllSaves()).length > 0; }

function saveGame(silent = false, exitAfter = false) {
    if (gameState.gameOver) return false;
    if (!gameState.currentSaveName) { showSaveNameModal(exitAfter); return false; }
    try {
        let saves = getAllSaves();
        saves[gameState.currentSaveName] = { day: gameState.day, population: gameState.population, fuel: gameState.fuel, food: gameState.food, wood: gameState.wood, stone: gameState.stone, heat: gameState.heat, hope: gameState.hope, satisfaction: gameState.satisfaction, HOUSE_HEXES: gameState.HOUSE_HEXES, POWERPLANT_HEXES: gameState.POWERPLANT_HEXES, BARRACKS_HEXES: gameState.BARRACKS_HEXES, COUNCIL_HEXES: gameState.COUNCIL_HEXES, unlockedHexes: gameState.unlockedHexes, tutorialStep: gameState.tutorialStep };
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
                
                const heroActions = document.querySelector('.hero-actions');
                const startBtnHero = document.getElementById('startBtnHero');
                if (heroActions && startBtnHero) {
                    let continueBtn = document.getElementById('btnContinueHero');
                    if (hasSavedGame()) {
                        if (!continueBtn) {
                            continueBtn = document.createElement('button');
                            continueBtn.id = 'btnContinueHero';
                            continueBtn.className = 'btn-primary';
                            continueBtn.innerText = 'ادامه بازی';
                            continueBtn.style.marginRight = '15px';
                            continueBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
                            continueBtn.onclick = continueGame;
                            heroActions.insertBefore(continueBtn, startBtnHero);
                        }
                    } else {
                        if (continueBtn) continueBtn.remove();
                    }
                }
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

function loadGame(saveName) { 
    try { 
        let saves = getAllSaves(); let savedData = saves[saveName]; 
        if (savedData) { 
            gameState.currentSaveName = saveName; 
            gameState.day = savedData.day; gameState.population = savedData.population; gameState.fuel = savedData.fuel; gameState.food = savedData.food; gameState.wood = savedData.wood; gameState.stone = savedData.stone; gameState.heat = savedData.heat; gameState.hope = savedData.hope; gameState.satisfaction = savedData.satisfaction; 
            gameState.HOUSE_HEXES = savedData.HOUSE_HEXES; 
            gameState.POWERPLANT_HEXES = savedData.POWERPLANT_HEXES; 
            gameState.BARRACKS_HEXES = savedData.BARRACKS_HEXES || []; 
            gameState.COUNCIL_HEXES = savedData.COUNCIL_HEXES || [{ q: 2, r: -1 }]; 
            gameState.unlockedHexes = savedData.unlockedHexes || [{ q: 2, r: -1 }, { q: 3, r: -1 }, { q: 1, r: -1 }, { q: 2, r: 0 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: 0 }]; 
            gameState.tutorialStep = savedData.tutorialStep !== undefined ? savedData.tutorialStep : 0; 
            return true; 
        } 
    } catch (e) {} return false; 
}
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
                const continueBtn = document.getElementById('btnContinueHero');
                if (continueBtn) continueBtn.remove();
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
    document.querySelectorAll('.delete-save-btn').forEach(btn => { btn.onclick = () => { let name = btn.getAttribute('data-name'); if (confirm("آیا از حذف این بازی مطمئن هستید؟")) { deleteGame(name); if (!hasSavedGame()) { modal.style.display = 'none'; const continueBtn = document.getElementById('btnContinueHero'); if (continueBtn) continueBtn.remove(); } else { continueGame(); } } }; });
}

window.startTutorial = function(val) { gameState.tutorialStep = val ? 1 : 0; const box = document.getElementById('tutorialBox'); if (!val && box) box.style.display = 'none'; if (val) updateTutorialBox(); }
function acceptWaitingMigrants(id) { 
    let req = gameState.migrantRequests.find(r => r.id === id); 
    if (req) { 
        autoPlaceMigrants(req.count); 
        gameState.migrantRequests = gameState.migrantRequests.filter(r => r.id !== id); 
        let tracker = document.getElementById('requestTrackerBody'); 
        if (tracker) { 
            let divToRemove = tracker.querySelector(`[data-req-id="req_${id}"]`); 
            if (divToRemove) divToRemove.remove(); 
            if (gameState.migrantRequests.length === 0 && !tracker.querySelector('.no-req-msg')) { 
                tracker.innerHTML = '<p class="no-req-msg" style="color: #aaa; text-align: center; font-size: 0.9rem;">در حال حاضر درخواستی وجود ندارد.</p>'; 
            } 
        } 
        let panel = document.getElementById('panelRequests'); 
        if(panel) panel.classList.remove('panel-open'); 
    } 
}
window.acceptWaitingMigrants = acceptWaitingMigrants;

function autoPlaceMigrants(count) {
    let causedOverpopulation = false;
    let placed = 0;
    for (let i = 0; i < count; i++) {
        let targetHouse = null;
        let minPop = 6;
        for (let h of gameState.HOUSE_HEXES) {
            if (h.pop < 5 && h.pop < minPop) {
                minPop = h.pop;
                targetHouse = h;
            }
        }
        if (targetHouse) {
            targetHouse.pop++;
            placed++;
            if (targetHouse.pop > 3) causedOverpopulation = true;
        } else {
            showNotification(`${count - placed} پناهنده به دلیل کمبود جا پذیرفته نشدند!`, "warning");
            break;
        }
    }
    if (placed > 0) {
        if (causedOverpopulation) {
            gameState.satisfaction = Math.max(0, gameState.satisfaction - 1);
            showNotification("خونه‌های پذیرنده شلوغ شد! ۱ درصد رضایت کم شد.", "warning");
        } else {
            gameState.satisfaction = Math.min(100, gameState.satisfaction + 1);
            showNotification("میزبانی عالی بود! ۱ درصد رضایت بیشتر شد.", "success");
        }
        updateUI();
    }
}

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
        if (tracker) { tracker.style.display = 'none'; tracker.innerHTML = ''; }
        lastTrackerState = 'none';
        return;
    }
    lastTrackerState = currentState;
    const tracker = document.getElementById('actionTracker');
    if (!tracker) return;
    let html = '';
    if (currentState === 'move') {
        html = `<div style="background: rgba(10,14,26,0.9); padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(244,208,63,0.3); margin-bottom: 5px; font-family: 'Vazirmatn', sans-serif; display: flex; align-items: center; justify-content: space-between; gap: 8px;"><div style="color: #f4d03f; font-size: 0.8rem; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${gameState.moveAmount} نفر در انتقال</div><button id="cancelMoveTrackBtn" style="padding: 4px 8px; background: #e74c3c; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color:#fff; font-size: 0.75rem; flex-shrink: 0;">انصراف</button></div>`;
    } else if (currentState.startsWith('build_')) {
        const buildingName = gameState.placingType === 'powerplant' ? 'نیروگاه' : (gameState.placingType === 'barracks' ? 'پادگان' : 'خانه');
        html = `<div style="background: rgba(10,14,26,0.9); padding: 5px 8px; border-radius: 6px; border: 1px solid rgba(244,208,63,0.3); margin-bottom: 5px; font-family: 'Vazirmatn', sans-serif; display: flex; align-items: center; justify-content: space-between; gap: 8px;"><div style="color: #f4d03f; font-size: 0.8rem; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">ساخت ${buildingName}</div><button id="cancelBuildTrackBtn" style="padding: 4px 8px; background: #e74c3c; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color:#fff; font-size: 0.75rem; flex-shrink: 0;">انصراف</button></div>`;
    }
    tracker.style.display = 'flex'; tracker.innerHTML = html;
    const cancelMoveBtn = document.getElementById('cancelMoveTrackBtn');
    if (cancelMoveBtn) { cancelMoveBtn.addEventListener('click', () => { gameState.isMovingPop = false; showNotification("انتقال لغو شد", "info"); updateActionTracker(); }); }
    const cancelBuildBtn = document.getElementById('cancelBuildTrackBtn');
    if (cancelBuildBtn) { cancelBuildBtn.addEventListener('click', () => { gameState.isPlacing = false; gameState.placingSelectedHex = null; showNotification("ساخت لغو شد", "info"); updateActionTracker(); }); }
}

function updateBarracksProgress() {
    if (!gameState.training.active) return;
    
    const now = Date.now();
    const t = gameState.training;
    const progress = Math.max(0, 1 - ((t.targetTime - now) / 10000));
    
    if (now >= t.targetTime) {
        if (t.isUpgrade) {
            gameState.soldiersLvl2++;
        } else {
            gameState.soldiersLvl1++;
        }
        t.remaining--;
        updateBarracksUI(); 
        
        if (t.remaining > 0) {
            t.targetTime = now + 10000;
        } else {
            t.active = false;
            showNotification("عملیات پادگان با موفقیت تکمیل شد!", "success");
            updateBarracksUI(); 
        }
    } else {
        const bar = document.getElementById('barracksProgressBar');
        if (bar) bar.style.width = (progress * 100) + '%';
    }
}

function updateBarracksUI() {
    const t = gameState.training;
    const container = document.getElementById('barracksProgressBarContainer');
    const txt = document.getElementById('barracksProgressText');
    const bar = document.getElementById('barracksProgressBar');
    
    if (container) {
        if (t.active) {
            container.style.display = 'block';
            if (txt) txt.innerText = (t.isUpgrade ? "در حال ارتقای " : "در حال ایجاد ") + t.remaining + " سرباز";
        } else {
            container.style.display = 'none';
        }
    }
    
    const el1 = document.getElementById('barracksLvl1Count');
    const el2 = document.getElementById('barracksLvl2Count');
    if (el1) el1.innerText = gameState.soldiersLvl1;
    if (el2) el2.innerText = gameState.soldiersLvl2;
}

function drawMap() {
    if (gameState.gameOver) return;
    const canvas = document.getElementById('gameMap'); if (!canvas) return; const ctx = canvas.getContext('2d'); const container = document.getElementById('map-container'); if(!container) return; const rect = container.getBoundingClientRect(); if (rect.width === 0 || rect.height === 0) return; const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) { canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; } ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
    const mW = 3000, mH = 3000;
    if (!gameState.isPaused) { let moveSpeed = 15 / camera.zoom; if (keys[gameState.keyBindings.up]) camera.y -= moveSpeed; if (keys[gameState.keyBindings.down]) camera.y += moveSpeed; if (keys[gameState.keyBindings.left]) camera.x -= moveSpeed; if (keys[gameState.keyBindings.right]) camera.x += moveSpeed; }
    let minZoom = Math.max(rect.width / mW, rect.height / mH); if (camera.zoom < minZoom) camera.zoom = minZoom; if (camera.zoom > 2) camera.zoom = 2; let viewW = rect.width / camera.zoom, viewH = rect.height / camera.zoom; camera.x = Math.max(0, Math.min(mW - viewW, camera.x)); camera.y = Math.max(0, Math.min(mH - viewH, camera.y));
    ctx.save(); ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom); ctx.scale(camera.zoom, camera.zoom); ctx.fillStyle = '#dce8f0'; ctx.fillRect(0, 0, mW, mH); const hexW = gameState.hexSize * 2;
    
    gameState.constructionSites = gameState.constructionSites.filter(site => { 
        let timeLeft = Math.ceil((site.endTime - Date.now()) / 1000); 
        if (timeLeft <= 0) { 
            if (!site.completed) { 
                if (site.type === 'powerplant') { gameState.POWERPLANT_HEXES.push({ q: site.q, r: site.r }); showNotification("✅ نیروگاه جدید ساخته شد!", "success"); } 
                else if (site.type === 'barracks') { gameState.BARRACKS_HEXES.push({ q: site.q, r: site.r }); showNotification("✅ پادگان جدید ساخته شد!", "success"); }
                else { gameState.HOUSE_HEXES.push({ q: site.q, r: site.r, pop: 0, daysOvercrowded: 0, lastReceived: 0, receivedToday: false }); showNotification("✅ خونه جدید ساخته شد!", "success"); } 
                site.completed = true; updateUI(); 
            } return false; 
        } return true; 
    });
    
    gameState.hexes.forEach(hex => { 
        let houseData = gameState.HOUSE_HEXES.find(h => h.q === hex.q && h.r === hex.r); 
        let ppData = gameState.POWERPLANT_HEXES.find(p => p.q === hex.q && p.r === hex.r);
        let councilData = gameState.COUNCIL_HEXES.find(c => c.q === hex.q && c.r === hex.r);
        let barracksData = gameState.BARRACKS_HEXES.find(b => b.q === hex.q && b.r === hex.r);
        let isHouse = !!houseData, isPP = !!ppData, isCouncil = !!councilData, isBarracks = !!barracksData; 
        let dist = hexDistance(hex, { q: 0, r: 0 }); 
        let isLocked = dist > 1; 
        let isUnlocked = gameState.unlockedHexes.some(u => u.q === hex.q && u.r === hex.r) || dist <= 1; 
        if (isLocked && !isUnlocked) { drawHex(ctx, hex.x, hex.y, gameState.hexSize, '#15181c', '#2a2e33', 1.5); drawEmbeddedLock(ctx, hex.x, hex.y); } 
        else { drawHex(ctx, hex.x, hex.y, gameState.hexSize, '#ffffff', 'rgba(130, 160, 190, 0.4)', 1.5); } 
        
        if (isHouse && houseImg.complete && houseImg.naturalHeight !== 0) { 
            let imgW = hexW * HOUSE_SCALE, imgH = imgW * (houseImg.naturalHeight / houseImg.naturalWidth); 
            let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + HOUSE_OFFSET_Y; 
            ctx.drawImage(houseImg, drawX, drawY, imgW, imgH); 
            const popText = `${houseData.pop}`; ctx.font = "bold 13px 'Vazirmatn', sans-serif"; 
            const textWidth = ctx.measureText(popText).width; const pillW = textWidth + 30, pillH = 22, pillX = hex.x + 15, pillY = hex.y - 35; 
            ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.beginPath(); 
            if (ctx.roundRect) { ctx.roundRect(pillX, pillY, pillW, pillH, 11); } else { ctx.rect(pillX, pillY, pillW, pillH); } 
            ctx.fillStyle = 'rgba(20, 20, 30, 0.9)'; ctx.fill(); ctx.shadowColor = 'transparent'; 
            ctx.strokeStyle = 'rgba(244, 208, 63, 0.8)'; ctx.lineWidth = 1.5; ctx.stroke(); 
            ctx.font = "12px Arial"; ctx.fillStyle = '#f4d03f'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('👤', pillX + 6, pillY + pillH/2 + 1); 
            ctx.font = "bold 13px 'Vazirmatn', sans-serif"; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(popText, pillX + pillW/2 + 6, pillY + pillH/2 + 1); 
            ctx.restore(); 
        } 
        if (isPP && powerplantImg.complete && powerplantImg.naturalHeight !== 0) { 
            let imgW = hexW * POWERPLANT_SCALE, imgH = imgW * (powerplantImg.naturalHeight / powerplantImg.naturalWidth); 
            let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + POWERPLANT_OFFSET_Y; 
            ctx.drawImage(powerplantImg, drawX, drawY, imgW, imgH); 
        } 
        if (isCouncil && councilHallImg.complete && councilHallImg.naturalHeight !== 0) { 
            let imgW = hexW * COUNCIL_SCALE, imgH = imgW * (councilHallImg.naturalHeight / councilHallImg.naturalWidth); 
            let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + COUNCIL_OFFSET_Y; 
            ctx.drawImage(councilHallImg, drawX, drawY, imgW, imgH); 
        } 
        if (isBarracks && barracksImg.complete && barracksImg.naturalHeight !== 0) { 
            let imgW = hexW * BARRACKS_SCALE, imgH = imgW * (barracksImg.naturalHeight / barracksImg.naturalWidth); 
            let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + BARRACKS_OFFSET_Y; 
            ctx.drawImage(barracksImg, drawX, drawY, imgW, imgH); 
        } 
        let site = gameState.constructionSites.find(s => s.q === hex.q && s.r === hex.r); 
        if (site) { 
            let timeLeft = Math.ceil((site.endTime - Date.now()) / 1000); let progress = 1 - ((site.endTime - Date.now()) / 30000); 
            ctx.beginPath(); ctx.arc(hex.x, hex.y, 20, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fill(); 
            ctx.beginPath(); ctx.arc(hex.x, hex.y, 20, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * progress)); ctx.lineWidth = 4; ctx.strokeStyle = '#f4d03f'; ctx.stroke(); 
            ctx.font = "bold 14px 'Vazirmatn', sans-serif"; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(timeLeft + 's', hex.x, hex.y); 
        } 
    });
    
    if (gameState.isPlacing) {
        let imgToDraw = gameState.placingType === 'powerplant' ? powerplantImg : (gameState.placingType === 'barracks' ? barracksImg : houseImg); 
        let currentScale = gameState.placingType === 'powerplant' ? POWERPLANT_SCALE : (gameState.placingType === 'barracks' ? BARRACKS_SCALE : HOUSE_SCALE); 
        let currentOffsetY = gameState.placingType === 'powerplant' ? POWERPLANT_OFFSET_Y : (gameState.placingType === 'barracks' ? BARRACKS_OFFSET_Y : HOUSE_OFFSET_Y);
        
        const isMobile = window.innerWidth <= 768;
        let targetHex = null;
        if (gameState.placingSelectedHex) { 
            targetHex = gameState.placingSelectedHex; 
        } else if (!isMobile) { 
            targetHex = getHoveredHex(gameState.mouseX, gameState.mouseY);
            if (targetHex) {
                let tIsHouse = gameState.HOUSE_HEXES.some(h => h.q === targetHex.q && h.r === targetHex.r);
                let tIsPP = gameState.POWERPLANT_HEXES.some(p => p.q === targetHex.q && p.r === targetHex.r);
                let tIsCouncil = gameState.COUNCIL_HEXES.some(c => c.q === targetHex.q && c.r === targetHex.r);
                let tIsBarracks = gameState.BARRACKS_HEXES.some(b => b.q === targetHex.q && b.r === targetHex.r);
                let tIsOccupied = gameState.constructionSites.some(c => c.q === targetHex.q && c.r === targetHex.r);
                let tIsUnlocked = gameState.unlockedHexes.some(u => u.q === targetHex.q && u.r === targetHex.r) || hexDistance(targetHex, { q: 0, r: 0 }) <= 1;
                let tooClose = false;
                for (let h of gameState.HOUSE_HEXES) { if (hexDistance(targetHex, h) <= 1) { tooClose = true; break; } }
                if (!tooClose) { for (let p of gameState.POWERPLANT_HEXES) { if (hexDistance(targetHex, p) <= 1) { tooClose = true; break; } } }
                if (!tooClose) { for (let c of gameState.COUNCIL_HEXES) { if (hexDistance(targetHex, c) <= 1) { tooClose = true; break; } } }
                if (!tooClose) { for (let b of gameState.BARRACKS_HEXES) { if (hexDistance(targetHex, b) <= 1) { tooClose = true; break; } } }
                if (!tooClose) { for (let c of gameState.constructionSites) { if (hexDistance(targetHex, { q: c.q, r: c.r }) <= 1) { tooClose = true; break; } } }
                if (tIsHouse || tIsPP || tIsCouncil || tIsBarracks || tIsOccupied || !tIsUnlocked || tooClose) { targetHex = null; }
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
    if (!gameState.isPaused) { updateExpeditions(); updateRequests(); updateBarracksProgress(); }
    updateActionTracker();
}

function setupControls() {
    const canvas = document.getElementById('gameMap'); if(!canvas) return;
    window.addEventListener('keydown', e => { if (e.code === 'Escape') { const gs = document.getElementById('game-screen'); if (gs && gs.style.display === 'block') { const sm = document.getElementById('settingsModal'); if (sm && sm.style.display === 'flex') { sm.style.display = 'none'; const pm = document.getElementById('pauseModal'); if(pm) pm.style.display = 'flex'; } else { togglePauseMenu(); } } return; } if (gameState.rebindingKey) { e.preventDefault(); if (e.code !== 'Escape') { gameState.keyBindings[gameState.rebindingKey] = e.code; updateBindTexts(); showNotification(LANG[gameState.currentLang].keyBindSuccess, "success"); } gameState.rebindingKey = null; return; } if (gameState.isPaused) return; keys[e.code] = true; if (Object.values(gameState.keyBindings).includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    let mouseDragged = false, lastTouchTime = 0;
    canvas.addEventListener('mousedown', e => { if (gameState.isPaused) return; camera.dragging = true; camera.dragStartX = e.clientX; camera.dragStartY = e.clientY; camera.startCamX = camera.x; camera.startCamY = camera.y; mouseDragged = false; canvas.style.cursor = 'grabbing'; });
    window.addEventListener('mousemove', e => { const rect = canvas.getBoundingClientRect(); gameState.mouseX = camera.x + ((e.clientX - rect.left) / camera.zoom); gameState.mouseY = camera.y + ((e.clientY - rect.top) / camera.zoom); if (camera.dragging) { camera.x = camera.startCamX - (e.clientX - camera.dragStartX) / camera.zoom; camera.y = camera.startCamY - (e.clientY - camera.dragStartY) / camera.zoom; if (Math.abs(e.clientX - camera.dragStartX) > 5 || Math.abs(e.clientY - camera.dragStartY) > 5) { mouseDragged = true; } } });
    window.addEventListener('mouseup', () => { camera.dragging = false; canvas.style.cursor = 'grab'; });
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (gameState.isPlacing) { gameState.isPlacing = false; gameState.placingSelectedHex = null; showNotification(LANG[gameState.currentLang].buildCancel, "info"); updateActionTracker(); } if (gameState.isMovingPop) { gameState.isMovingPop = false; showNotification(LANG[gameState.currentLang].moveCancel, "info"); updateActionTracker(); } });
    canvas.addEventListener('wheel', e => { if(gameState.isPaused) return; e.preventDefault(); let newZoom = camera.zoom + (e.deltaY > 0 ? -0.1 : 0.1); const mW = 3000, mH = 3000, rect = canvas.getBoundingClientRect(); let minZoom = Math.max(rect.width / mW, rect.height / mH); camera.zoom = Math.max(minZoom, Math.min(2, newZoom)); }, { passive: false });
    canvas.addEventListener('click', (e) => { if (Date.now() - lastTouchTime < 500) return; e.preventDefault(); if(!gameState.isPaused && !mouseDragged) handleMapClick(); mouseDragged = false; });
    let pinchInitialDistance = 0, pinchInitialZoom = 1; function getDistance(touches) { const dx = touches[0].clientX - touches[1].clientX; const dy = touches[0].clientY - touches[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
    canvas.addEventListener('touchstart', e => { if (gameState.isPaused) return; e.preventDefault(); lastTouchTime = Date.now(); if (e.touches.length === 1) { camera.dragging = true; camera.dragStartX = e.touches[0].clientX; camera.dragStartY = e.touches[0].clientY; camera.startCamX = camera.x; camera.startCamY = camera.y; mouseDragged = false; } else if (e.touches.length === 2) { pinchInitialDistance = getDistance(e.touches); pinchInitialZoom = camera.zoom; camera.dragging = false; } }, { passive: false });
    canvas.addEventListener('touchmove', e => { if (gameState.isPaused) return; e.preventDefault(); if (e.touches.length === 2) { const currentDistance = getDistance(e.touches); if (pinchInitialDistance > 0) { let zoomFactor = currentDistance / pinchInitialDistance; let newZoom = pinchInitialZoom * zoomFactor; const mW = 3000, mH = 3000, rect = canvas.getBoundingClientRect(); let minZoom = Math.max(rect.width / mW, rect.height / mH); camera.zoom = Math.max(minZoom, Math.min(2, newZoom)); } } else if (camera.dragging && e.touches.length === 1) { camera.x = camera.startCamX - (e.touches[0].clientX - camera.dragStartX) / camera.zoom; camera.y = camera.startCamY - (e.touches[0].clientY - camera.dragStartY) / camera.zoom; if (Math.abs(e.touches[0].clientX - camera.dragStartX) > 5 || Math.abs(e.touches[0].clientY - camera.dragStartY) > 5) { mouseDragged = true; } } }, { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); lastTouchTime = Date.now(); if (e.touches.length < 2) pinchInitialDistance = 0; if (camera.dragging && e.changedTouches.length === 1 && e.touches.length === 0) { if (!mouseDragged) { const rect = canvas.getBoundingClientRect(); const tx = e.changedTouches[0].clientX - rect.left, ty = e.changedTouches[0].clientY - rect.top; gameState.mouseX = camera.x + (tx / camera.zoom); gameState.mouseY = camera.y + (ty / camera.zoom); handleMapClick(); } } if (e.touches.length === 0) camera.dragging = false; }, { passive: false });
}

function togglePauseMenu() { gameState.isPaused = !gameState.isPaused; const pm = document.getElementById('pauseModal'); if(pm) pm.style.display = gameState.isPaused ? 'flex' : 'none'; if (!gameState.isPaused) { const sm = document.getElementById('settingsModal'); if(sm) sm.style.display = 'none'; } }
function updateBindTexts() { const elUp = document.getElementById('bindUp'); if(elUp) elUp.innerText = gameState.keyBindings.up.replace('Key', ''); const elDown = document.getElementById('bindDown'); if(elDown) elUp.innerText = gameState.keyBindings.down.replace('Key', ''); const elLeft = document.getElementById('bindLeft'); if(elLeft) elLeft.innerText = gameState.keyBindings.left.replace('Key', ''); const elRight = document.getElementById('bindRight'); if(elRight) elRight.innerText = gameState.keyBindings.right.replace('Key', ''); }
function calculateCanFit(count) { let totalPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0); let totalCapacity = gameState.HOUSE_HEXES.length * 3; return (totalCapacity - totalPop) >= count; }

function unlockAdjacentHexes(targetHex) {
    const neighbors = [
        { q: targetHex.q + 1, r: targetHex.r },
        { q: targetHex.q - 1, r: targetHex.r },
        { q: targetHex.q, r: targetHex.r + 1 },
        { q: targetHex.q, r: targetHex.r - 1 },
        { q: targetHex.q + 1, r: targetHex.r - 1 },
        { q: targetHex.q - 1, r: targetHex.r + 1 }
    ];
    neighbors.forEach(n => {
        let alreadyUnlocked = gameState.unlockedHexes.some(u => u.q === n.q && u.r === n.r) || hexDistance(n, { q: 0, r: 0 }) <= 1;
        if (!alreadyUnlocked) {
            gameState.unlockedHexes.push(n);
        }
    });
}

function executeBuild(target) {
    if (gameState.placingType === 'house') {
        if (gameState.tutorialStep === 4 || gameState.tutorialStep === 0) {
            if (gameState.wood >= 10) { gameState.wood -= 10; updateUI(); gameState.constructionSites.push({ q: target.q, r: target.r, endTime: Date.now() + 30000, completed: false, type: 'house' }); unlockAdjacentHexes(target); if (gameState.tutorialStep === 4) { gameState.tutorialStep = 5; updateTutorialBox(); } showNotification(LANG[gameState.currentLang].buildStart, "success"); return true; } 
            else { showNotification(LANG[gameState.currentLang].noWood, "warning"); return false; }
        } else if (gameState.tutorialStep > 0) { showNotification("فعلاً طبق آموزش پیش برو!", "warning"); return false; }
    } else if (gameState.placingType === 'powerplant') {
        if (gameState.tutorialStep === 12 || gameState.tutorialStep === 0) { 
            if (gameState.stone >= 10) { gameState.stone -= 10; updateUI(); gameState.constructionSites.push({ q: target.q, r: target.r, endTime: Date.now() + 30000, completed: false, type: 'powerplant' }); unlockAdjacentHexes(target); if (gameState.tutorialStep === 12) { gameState.tutorialStep = 13; updateTutorialBox(); } showNotification("نیروگاه در حال ساخت است و ۱۰ سنگ کم شد!", "success"); return true; } 
            else { showNotification("سنگ کافی نداری!", "warning"); return false; }
        } else if (gameState.tutorialStep > 0) { showNotification("فعلاً طبق آموزش پیش برو!", "warning"); return false; }
    } else if (gameState.placingType === 'barracks') {
        if (gameState.wood >= 15 && gameState.stone >= 10) { 
            gameState.wood -= 15; gameState.stone -= 10; updateUI(); 
            gameState.constructionSites.push({ q: target.q, r: target.r, endTime: Date.now() + 30000, completed: false, type: 'barracks' }); 
            unlockAdjacentHexes(target);
            showNotification("پادگان در حال ساخت است!", "success"); return true; 
        } else { showNotification("چوب یا سنگ کافی نداری! (نیاز: ۱۵ چوب و ۱۰ سنگ)", "warning"); return false; }
    }
    return false;
}

function handleMapClick() {
    const target = getHoveredHex(gameState.mouseX, gameState.mouseY); let dist = hexDistance(target, { q: 0, r: 0 }); let isLocked = dist > 1; let isUnlocked = gameState.unlockedHexes.some(u => u.q === target.q && u.r === target.r) || dist <= 1; let isHouse = gameState.HOUSE_HEXES.some(h => h.q === target.q && h.r === target.r); let isPP = gameState.POWERPLANT_HEXES.some(p => p.q === target.q && p.r === target.r); let isCouncil = gameState.COUNCIL_HEXES.some(c => c.q === target.q && c.r === target.r); let isBarracks = gameState.BARRACKS_HEXES.some(b => b.q === target.q && b.r === target.r); let isOccupied = gameState.constructionSites.some(c => c.q === target.q && c.r === target.r);
    
    if (gameState.isMovingPop) { 
        let destHouse = gameState.HOUSE_HEXES.find(h => h.q === target.q && h.r === target.r); 
        let sourceHouse = gameState.HOUSE_HEXES.find(h => h.q === gameState.moveSource.q && h.r === gameState.moveSource.r); 
        if (destHouse && sourceHouse && destHouse !== sourceHouse) { 
            if (destHouse.pop + gameState.moveAmount > 5) { showNotification("ظرفیت این خانه پر است! حداکثر ۵ نفر در یک خانه جا می‌گیرند.", "warning"); gameState.isMovingPop = false; updateActionTracker(); return; } 
            if (sourceHouse.receivedToday) { showAngryMoveModal(); sourceHouse.receivedToday = false; gameState.isMovingPop = false; updateActionTracker(); return; } 
            const sourceWasCrowded = sourceHouse.pop >= 4; const destWillBeCrowded = destHouse.pop + gameState.moveAmount >= 4;
            let satisfactionChange = 0; let moveMessage = "جابه‌جایی انجام شد.";
            if (sourceWasCrowded && !destWillBeCrowded) { satisfactionChange = 1; moveMessage = "شرایط زندگی بهتر شد! ۱ درصد رضایت بیشتر شد."; } 
            else if (!sourceWasCrowded && destWillBeCrowded) { satisfactionChange = -1; moveMessage = "خونه مقصد شلوغ‌تر شد! ۱ درصد رضایت کم شد."; }
            if (satisfactionChange > 0) { gameState.satisfaction = Math.min(100, gameState.satisfaction + satisfactionChange); showNotification(moveMessage, "success"); } 
            else if (satisfactionChange < 0) { gameState.satisfaction = Math.max(0, gameState.satisfaction + satisfactionChange); showNotification(moveMessage, "warning"); } 
            else { showNotification(moveMessage, "info"); }
            sourceHouse.pop -= gameState.moveAmount; destHouse.pop += gameState.moveAmount; destHouse.receivedToday = true; updateUI(); gameState.isMovingPop = false; updateActionTracker();
            if (gameState.tutorialStep === 16) { gameState.tutorialStep = 17; updateTutorialBox(); } 
        } else { if (!destHouse) showNotification("لطفاً روی یک خانه کلیک کنید!", "warning"); else if (destHouse === sourceHouse) showNotification("لطفاً روی خانه دیگری کلیک کنید!", "warning"); } return; 
    }
    
    if (gameState.isPlacing) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && gameState.placingSelectedHex) {
            let selectedHexObj = gameState.hexes.find(h => h.q === gameState.placingSelectedHex.q && h.r === gameState.placingSelectedHex.r);
            if (selectedHexObj) {
                let clickX = gameState.mouseX, clickY = gameState.mouseY;
                let distConfirm = Math.sqrt((clickX - (selectedHexObj.x + 35))**2 + (clickY - (selectedHexObj.y - 25))**2);
                let distCancel = Math.sqrt((clickX - (selectedHexObj.x - 35))**2 + (clickY - (selectedHexObj.y - 25))**2);
                const touchRadius = 28; 
                if (distConfirm <= touchRadius) { if (executeBuild(gameState.placingSelectedHex)) { gameState.isPlacing = false; gameState.placingSelectedHex = null; updateActionTracker(); } return; } 
                else if (distCancel <= touchRadius) { gameState.isPlacing = false; gameState.placingSelectedHex = null; showNotification(LANG[gameState.currentLang].buildCancel, "info"); updateActionTracker(); return; }
            }
        }
        let tIsHouse = gameState.HOUSE_HEXES.some(h => h.q === target.q && h.r === target.r);
        let tIsPP = gameState.POWERPLANT_HEXES.some(p => p.q === target.q && p.r === target.r);
        let tIsCouncil = gameState.COUNCIL_HEXES.some(c => c.q === target.q && c.r === target.r);
        let tIsBarracks = gameState.BARRACKS_HEXES.some(b => b.q === target.q && b.r === target.r);
        let tIsOccupied = gameState.constructionSites.some(c => c.q === target.q && c.r === target.r);
        let tIsUnlocked = gameState.unlockedHexes.some(u => u.q === target.q && u.r === target.r) || hexDistance(target, { q: 0, r: 0 }) <= 1;
        if (tIsHouse || tIsPP || tIsCouncil || tIsBarracks || tIsOccupied) { showNotification(LANG[gameState.currentLang].occupied, "warning"); return; }
        if (!tIsUnlocked) { showNotification("یک مکان باز رو انتخاب کن!", "warning"); return; }
        let tooClose = false;
        for (let h of gameState.HOUSE_HEXES) { if (hexDistance(target, h) <= 1) { tooClose = true; break; } }
        if (!tooClose) { for (let p of gameState.POWERPLANT_HEXES) { if (hexDistance(target, p) <= 1) { tooClose = true; break; } } }
        if (!tooClose) { for (let c of gameState.COUNCIL_HEXES) { if (hexDistance(target, c) <= 1) { tooClose = true; break; } } }
        if (!tooClose) { for (let b of gameState.BARRACKS_HEXES) { if (hexDistance(target, b) <= 1) { tooClose = true; break; } } }
        if (!tooClose) { for (let c of gameState.constructionSites) { if (hexDistance(target, { q: c.q, r: c.r }) <= 1) { tooClose = true; break; } } }
        if (tooClose) { showNotification(LANG[gameState.currentLang].tooClose, "warning"); return; }
        if (isMobile) { gameState.placingSelectedHex = target; return; } 
        else { if (executeBuild(target)) { gameState.isPlacing = false; gameState.placingSelectedHex = null; updateActionTracker(); } return; }
    }
    
    if (isCouncil && !gameState.isPlacing && !gameState.isMovingPop) { 
        const cm = document.getElementById('councilModal');
        if (cm) {
            cm.style.display = 'flex';
            setTimeout(() => { cm.style.opacity = 1; cm.style.transform = 'translate(-50%, -50%) scale(1)'; }, 10);
        }
        return; 
    }

    if (isBarracks && !gameState.isPlacing && !gameState.isMovingPop) {
        const bm = document.getElementById('barracksModal');
        if (bm) {
            bm.style.display = 'flex';
            setTimeout(() => { bm.style.opacity = 1; bm.style.transform = 'translate(-50%, -50%) scale(1)'; }, 10);
            updateBarracksUI();
        }
        return; 
    }

    if (isHouse && !gameState.isPlacing) { 
        const cm = document.getElementById('councilModal'); if (cm) { cm.style.display = 'none'; cm.style.opacity = 0; cm.style.transform = 'translate(-50%, -50%) scale(0.9)'; }
        let house = gameState.HOUSE_HEXES.find(h => h.q === target.q && h.r === target.r); let isMainHouse = (house.q === 0 && house.r === 0); let maxTransferable = isMainHouse ? house.pop - 1 : house.pop; if (maxTransferable > 0) { if (gameState.tutorialStep === 14 || gameState.tutorialStep === 0) { gameState.moveSource = target; openMovePopPanel(maxTransferable); if (gameState.tutorialStep === 14) { gameState.tutorialStep = 15; updateTutorialBox(); } } else if (gameState.tutorialStep > 0) { showNotification("لطفاً طبق آموزش پیش برو!", "warning"); } } else { showNotification("آدمی برای انتقال در این خانه نیست!", "info"); } return; 
    }
    
    if (isLocked && !isUnlocked && !isHouse && !isPP && !isCouncil && !isBarracks && !isOccupied) { 
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
        gameState.pendingUnlockTarget = target; const um = document.getElementById('unlockModal'); if(um) um.style.display = 'block'; return; 
    }
}

const LANG = { fa: { resume: "ادامه بازی", settings: "تنظیمات", exit: "خروج", pauseTitle: "منوی توقف", settingsTitle: "تنظیمات", video: "ویدیو", audio: "صدا", controls: "کنترل ها", selectLang: "انتخاب زبان:", musicVol: "صدای موسیقی:", mute: "قطع صدا", unmute: "پخش صدا", rebindTxt: "برای تغییر دکمه، روی آن کلیک کنید و دکمه جدید را فشار دهید.", up: "حرکت به بالا", down: "حرکت به پایین", left: "حرکت به چپ", right: "حرکت به راست", back: "بازگشت", explore: "اکتشاف", build: "ساخت و ساز", movePop: "انتقال جمعیت", buildHouse: "ساخت خانه", buildBtn: "ساخت", close: "✕", cancel: "انصراف", moveBtn: "انتقال", movePrompt: "چند نفر منتقل شوند؟", dispatchTroops: "اعزام نیرو", unlockTitle: "باز کردن قفل", unlockQ: "آیا می‌خواهید این قفل را باز کنید؟", unlockCost: "این کار ۱۰ سنگ هزینه دارد.", unlockYes: "بله، باز کن", resultTitle: "گزارش اکتشاف", resultRegion: "منطقه:", resultCasualties: "تلفات:", resultRes: "گزارش منابع:", resultNone: "منابع دریافت نکردید", collect: "دریافت", houseBuilt: "✅ خونه جدید ساخته شد!", buildCancel: "ساخت لغو شد", moveCancel: "انتقال لغو شد", moveSuccess: "جابه‌جایی موفق بود!", moveFail: "جابه‌جایی نامناسب!", moved: "نفر منتقل شدند.", emptyHouse: "آدمی برای انتقال نیست!", noAdjacent: "برای باز کردن این قفل، باید یک منطقه باز در کنارش داشته باشید!", followTut: "فعلاً طبق آموزش پیش برو!", buildStart: "خونه در حال ساخت است و ۱۰ چوب کم شد!", noWood: "چوب کافی نداری!", clickUnlocked: "روی خونه‌ای که قفلش رو باز کردی کلیک کن!", lockedArea: "یک مکان باز رو انتخاب کن!", tooClose: "نمیتوانید به ساختمان‌های دیگر بچسبانید!", occupied: "در این مکان از قبل ساخته شده است!", keyBindSuccess: "کلید با موفقیت تنظیم شد!", langChanged: "زبان به فارسی تغییر یافت", risk: "مقدار تلفات", reward: "پاداش هر بازگشته", dispatchBtn: "اعزام نیرو", wood: "چوب", stone: "سنگ", food: "غذا", fuel: "سوخت", dispatchNotif: "نفر به", temp: "دما" }, en: { resume: "Resume", settings: "Settings", exit: "Exit", pauseTitle: "Pause Menu", settingsTitle: "Settings", video: "Video", audio: "Audio", controls: "Controls", selectLang: "Select Language:", musicVol: "Music Volume:", mute: "Mute", unmute: "Unmute", rebindTxt: "To change a key, click on it and press a new key.", up: "Move Up", down: "Move Down", left: "Move Left", right: "Move Right", back: "Back", explore: "Explore", build: "Build", movePop: "Move Population", buildHouse: "Build New House", buildBtn: "Build", close: "✕", cancel: "Cancel", moveBtn: "Move", movePrompt: "How many to move?", dispatchTroops: "Dispatch Troops", unlockTitle: "Unlock", unlockQ: "Do you want to unlock this?", unlockCost: "This costs 10 stones.", unlockYes: "Yes, Unlock", resultTitle: "Expedition Report", resultRegion: "Region:", resultCasualties: "Casualties:", resultRes: "Resources Report:", resultNone: "No resources found.", collect: "Collect", houseBuilt: "✅ New house built!", buildCancel: "Build canceled", moveCancel: "Move canceled", moveSuccess: "Move successful!", moveFail: "Bad move!", moved: "troops moved.", emptyHouse: "No one to move!", noAdjacent: "You need an adjacent unlocked area to unlock this!", followTut: "Follow the tutorial for now!", buildStart: "House is building, 10 wood deducted!", noWood: "Not enough wood!", clickUnlocked: "Click on the house you just unlocked!", lockedArea: "Select an unlocked area!", tooClose: "Cannot build adjacent to other buildings!", occupied: "This area is already occupied!", keyBindSuccess: "Key binded successfully!", langChanged: "Language changed to English", risk: "Casualties", reward: "Reward per survivor", dispatchBtn: "Dispatch", wood: "Wood", stone: "Stone", food: "Food", fuel: "Fuel", dispatchNotif: "troops to", temp: "Temp" } };
function applyLang(lang) { gameState.currentLang = lang; const t = LANG[lang]; const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; }; set('txtPauseTitle', t.pauseTitle); set('txtResume', t.resume); set('txtSettings1', t.settings); set('txtExit', t.exit); set('txtSettingsTitle', t.settingsTitle); set('txtVideo', t.video); set('txtAudio', t.audio); set('txtControls', t.controls); set('txtLangSel', t.selectLang); set('txtMusicVol', t.musicVol); set('btnMute', bgMusic && bgMusic.volume > 0 ? t.mute : t.unmute); set('txtRebind', t.rebindTxt); set('txtBindUp', t.up); set('txtBindDown', t.down); set('txtBindLeft', t.left); set('txtBindRight', t.right); set('txtBack', t.back); set('txtBuildTitle', t.build); set('txtBuildHouse', t.buildHouse); set('txtBuildBtn', t.buildBtn); set('txtExploreTitle', t.explore); set('txtMovePopTitle', t.movePop); set('txtMovePopBtn', t.moveBtn); set('txtCancelMove', t.cancel); document.querySelectorAll('.dispatch-text').forEach(el => el.innerText = t.dispatchBtn); document.querySelectorAll('.region-risk').forEach(el => el.innerText = t.risk + ': ' + el.getAttribute('data-val')); document.querySelectorAll('.region-reward').forEach(el => el.innerText = t.reward + ': ' + el.getAttribute('data-val')); set('txtUnlockTitle', t.unlockTitle); set('txtUnlockQ', t.unlockQ); set('txtUnlockCost', t.unlockCost); set('txtUnlockYes', t.unlockYes); set('txtCancelUnlock', t.cancel); set('txtResultTitle', t.resultTitle); set('txtCloseResult', t.collect); const heatItem = Array.from(document.querySelectorAll('.resource-item')).find(item => { const valEl = item.querySelector('.resource-value'); return valEl && valEl.id === 'heat'; }); if (heatItem) { const lbl = heatItem.querySelector('.resource-label'); if (lbl) lbl.innerText = t.temp; } }

function updateTutorialBox() { const txt = document.getElementById('tutorialText'); const btn = document.getElementById('tutorialBtn'); const pointer = document.getElementById('tutorialPointer'); const box = document.getElementById('tutorialBox'); if(!txt || !btn || !pointer || !box) return; if (gameState.tutorialStep === 0) { box.style.display = 'none'; btn.style.display = 'none'; pointer.style.display = 'none'; return; } box.style.display = 'flex'; if (gameState.tutorialStep === -1) { txt.innerHTML = "سلام! من راهنمای تو در این سرمای سهم‌گین هستم. می‌خوای آموزش رو ببینی یا خودت بلدی؟<br><br><div style='text-align:center; margin-top:10px;'><button onclick='startTutorial(true)' style='padding: 8px 15px; background: #f4d03f; border:none; border-radius:4px; cursor:pointer; color:#000; font-weight:bold; font-family:Vazirmatn;'>آموزش ببین</button> <button onclick='startTutorial(false)' style='padding: 8px 15px; background: transparent; border:1px solid #aaa; border-radius:4px; cursor:pointer; color:#fff; font-family:Vazirmatn; margin-right:10px;'>بلدم، شروع کن</button></div>"; btn.style.display = 'none'; pointer.style.display = 'none'; } else if (gameState.tutorialStep === 1) { txt.innerHTML = "برای شروع، روی یکی از خانه‌های قفل‌شده اطراف منطقه امن کلیک کن تا با ۱۰ سنگ قفلش رو باز کنی."; btn.style.display = 'none'; pointer.style.display = 'none'; } else if (gameState.tutorialStep === 2) { txt.innerHTML = "آفرین! قفل باز شد. حالا روی دکمه «ساخت و ساز» در پایین صفحه کلیک کن."; btn.style.display = 'none'; movePointer('btnBuild'); } else if (gameState.tutorialStep === 3) { txt.innerHTML = "خوبه! حالا روی دکمه «ساخت» در بخش «ساخت خانه» کلیک کن."; btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم"; pointer.style.display = 'none'; btn.onclick = () => { box.style.display = 'none'; }; } else if (gameState.tutorialStep === 4) { txt.innerHTML = "حالا روی اونجایی که قفلش رو باز کردی کلیک کن و بعد روی تیک سبز (✓) بزن تا خونه ساخته بشه و ۱۰ چوب از تو کم بشه."; btn.style.display = 'none'; pointer.style.display = 'none'; } else if (gameState.tutorialStep === 5) { txt.innerHTML = "خونه در حال ساخت است. حالا وقتشه بریم منابع بیشتری پیدا کنیم. روی دکمه «اکتشاف» در پایین صفحه کلیک کن."; btn.style.display = 'none'; movePointer('btnExplore'); } else if (gameState.tutorialStep === 6) { txt.innerHTML = "اینجا سه منطقه هست. روی منطقه «تخت جمشید» کلیک کن و دکمه «اعزام» اون رو بزن."; btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم"; pointer.style.display = 'none'; btn.onclick = () => { box.style.display = 'none'; }; } else if (gameState.tutorialStep === 7) { txt.innerHTML = "فعلاً در آموزش باید یک نفر رو انتخاب کنی."; btn.style.display = 'none'; pointer.style.display = 'none'; } else if (gameState.tutorialStep === 8) { txt.innerHTML = "آفرین! یادت باشه هر روز به ازای هر نفر یک غذا و به ازای هر نیروگاه یک سوخت مصرف میشه! حالا برای گرم شدن، باید نیروگاه بسازی. روی دکمه متوجه شدم بزن."; btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم"; pointer.style.display = 'none'; btn.onclick = () => { gameState.tutorialStep = 9; updateTutorialBox(); }; } else if (gameState.tutorialStep === 9) { txt.innerHTML = "برای ساخت نیروگاه، باید یه زمین جدید باز کنی. روی یک مکان قفل‌شده کلیک کن که کنارش خونه نباشه (۱۰ سنگ کم میشه)."; btn.style.display = 'none'; pointer.style.display = 'none'; } else if (gameState.tutorialStep === 10) { txt.innerHTML = "آفرین! حالا دوباره روی دکمه «ساخت و ساز» کلیک کن."; btn.style.display = 'none'; movePointer('btnBuild'); } else if (gameState.tutorialStep === 11) { txt.innerHTML = "این بار روی دکمه «ساخت» نیروگاه کلیک کن."; btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم"; pointer.style.display = 'none'; btn.onclick = () => { box.style.display = 'none'; }; } else if (gameState.tutorialStep === 12) { txt.innerHTML = "حالا روی زمینی که تازه باز کردی کلیک کن و روی تیک سبز (✓) بزن تا نیروگاه ساخته بشه (۱۰ سنگ کم میشه)."; btn.style.display = 'none'; pointer.style.display = 'none'; } else if (gameState.tutorialStep === 13) { txt.innerHTML = "نیروگاه در حال ساخت است. حالا باید جمعیت رو بین خونه‌هات پخش کنی. روی دکمه متوجه شدم بزن و بعد روی خونه اصلی کلیک کن."; btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم"; pointer.style.display = 'none'; btn.onclick = () => { gameState.tutorialStep = 14; updateTutorialBox(); }; } else if (gameState.tutorialStep === 14) { box.style.display = 'none'; btn.style.display = 'none'; pointer.style.display = 'none'; } else if (gameState.tutorialStep === 15) { txt.innerHTML = "همونطور که می‌بینی، نمی‌تونی همه آدم‌ها رو انتقال بدی. حداقل یک نفر (یعنی خودت!) باید تو خونه بمونه. پس ۱ تا ۴ نفر رو انتخاب کن و بعد روی دکمه «انتقال» بزن."; btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم"; pointer.style.display = 'none'; btn.onclick = () => { box.style.display = 'none'; }; } else if (gameState.tutorialStep === 16) { txt.innerHTML = "حالا روی خونه جدیدت کلیک کن تا آدم‌ها اونجا مستقر بشن."; btn.style.display = 'none'; pointer.style.display = 'none'; } else if (gameState.tutorialStep === 17) { txt.innerHTML = "عالیه فقط یادت باشه آدم هات رو توی یک خونه نگه نداری کلافه میشن"; btn.style.display = 'inline-block'; btn.innerText = "پایان آموزش"; pointer.style.display = 'none'; btn.onclick = () => { gameState.tutorialStep = 0; box.style.display = 'none'; btn.style.display = 'none'; }; } }
function movePointer(elementId) { const pointer = document.getElementById('tutorialPointer'); const el = document.getElementById(elementId); if (el && pointer) { const rect = el.getBoundingClientRect(); pointer.style.display = 'block'; pointer.style.left = (rect.left + rect.width / 2 - 30) + 'px'; pointer.style.top = (rect.top + rect.height / 2 - 30) + 'px'; } else if (pointer) { pointer.style.display = 'none'; } }

function removeTroopsFromHouses(troops) {
    let toRemove = troops;
    let sortedHouses = [...gameState.HOUSE_HEXES].sort((a, b) => b.pop - a.pop);
    for (let house of sortedHouses) {
        if (toRemove <= 0) break;
        let isMainHouse = (house.q === 0 && house.r === 0);
        let available = isMainHouse ? Math.max(0, house.pop - 1) : house.pop;
        if (available > 0) {
            let take = Math.min(available, toRemove);
            house.pop -= take;
            toRemove -= take;
        }
    }
    return toRemove === 0;
}

function startExpedition(regionName, troops) { 
    const isTutorial = gameState.tutorialStep === 7.5; 
    if (!removeTroopsFromHouses(troops)) return; 
    gameState.expeditions.push({ id: Date.now(), region: regionName, troops: troops, startTime: Date.now(), endTime: Date.now() + (isTutorial ? 10000 : 60000), isTutorial: isTutorial }); 
    updateUI(); showNotification(`${troops} ${LANG[gameState.currentLang].dispatchNotif} ${regionName} اعزام شدند!`, "success"); 
    if (isTutorial) { gameState.tutorialStep = 8; updateTutorialBox(); } 
}

function updateExpeditions() { 
    const tracker = document.getElementById('expeditionTracker'); 
    if(!tracker) return; 
    let html = '', completed = []; 
    gameState.expeditions.forEach(exp => { 
        const timeLeft = exp.endTime - Date.now(); 
        if (timeLeft <= 0) { completed.push(exp); } 
        else { 
            const progress = 1 - (timeLeft / (exp.isTutorial ? 10000 : 60000)); 
            html += `<div style="background: rgba(10,14,26,0.9); padding: 10px; border-radius: 8px; border: 1px solid rgba(244,208,63,0.3); margin-bottom: 5px; font-family: 'Vazirmatn', sans-serif;"><div style="color: #f4d03f; font-size: 0.9rem; margin-bottom: 5px;">${exp.region} (${exp.troops} نفر)</div><div style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden;"><div style="width: ${progress * 100}%; height: 100%; background: #f4d03f; transition: width 0.5s linear;"></div></div></div>`; 
        } 
    }); 
    if (html === '') { tracker.style.display = 'none'; tracker.innerHTML = ''; } else { tracker.style.display = 'flex'; tracker.innerHTML = html; }
    completed.forEach(exp => { 
        const res = calculateExpeditionResult(exp); showExpeditionResult(exp, res); 
        let survivors = exp.troops - res.casualties; 
        if (survivors > 0) { let mainHouse = gameState.HOUSE_HEXES.find(h => h.q === 0 && h.r === 0); if (mainHouse) mainHouse.pop += survivors; } 
        gameState.wood += res.wood; gameState.stone += res.stone; gameState.food += res.food; gameState.fuel += res.fuel; updateUI(); 
    }); 
    if (completed.length > 0) { const completedIds = completed.map(c => c.id); gameState.expeditions = gameState.expeditions.filter(e => !completedIds.includes(e.id)); } 
}

function updateRequests() { 
    const tracker = document.getElementById('requestTrackerBody'); 
    if (!tracker) return; 
    let expiredIds = []; 
    if (gameState.migrantRequests.length === 0) { if (!tracker.querySelector('.no-req-msg')) tracker.innerHTML = '<p class="no-req-msg" style="color: #aaa; text-align: center; font-size: 0.9rem;">در حال حاضر درخواستی وجود ندارد.</p>'; return; } 
    let noMsg = tracker.querySelector('.no-req-msg'); if (noMsg) noMsg.remove(); 
    gameState.migrantRequests.forEach((req) => { 
        let timeLeft = req.endTime - Date.now(); let reqIdStr = `req_${req.id}`; let existingDiv = tracker.querySelector(`[data-req-id="${reqIdStr}"]`); 
        if (timeLeft <= 0) { 
            expiredIds.push(req.id); let canFit = calculateCanFit(req.count); 
            if (canFit) { gameState.satisfaction = Math.max(0, gameState.satisfaction - 1); showNotification("آدم‌های در انتظار کشته شدند! شهروندان ناراحت شدند. ۱ درصد رضایت کم شد.", "warning"); } 
            else { gameState.satisfaction = Math.min(100, gameState.satisfaction + 1); showNotification("آدم‌های در انتظار کشته شدند! اما شهروندان راضی بودند که منابع هدر نرفت. ۱ درصد رضایت بیشتر شد.", "info"); } 
            updateUI(); if (existingDiv) existingDiv.remove(); 
        } else { 
            let progress = 1 - (timeLeft / 180000); 
            if (!existingDiv) { 
                let div = document.createElement('div'); div.setAttribute('data-req-id', reqIdStr); div.style.cssText = "background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(244,208,63,0.3); margin-bottom: 10px;"; 
                div.innerHTML = `<div style="color: #f4d03f; font-size: 0.9rem; margin-bottom: 8px;">${req.count} نفر در انتظار پذیرش</div><div style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden; margin-bottom: 10px;"><div class="req-bar" style="width: 0%; height: 100%; background: #e74c3c; transition: width 1s linear;"></div></div><div style="display: flex; gap: 8px;"><button class="accept-req-btn" data-id="${req.id}" style="flex: 1; padding: 6px; background: #f4d03f; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color:#000;">وارد شوند</button><button class="discard-req-btn" data-id="${req.id}" style="flex: 1; padding: 6px; background: #e74c3c; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color:#fff;">رها کردن</button></div>`; 
                tracker.appendChild(div); 
                div.querySelector('.accept-req-btn').addEventListener('click', function() { let id = parseInt(this.getAttribute('data-id')); acceptWaitingMigrants(id); });
                div.querySelector('.discard-req-btn').addEventListener('click', function() { let id = parseInt(this.getAttribute('data-id')); let req = gameState.migrantRequests.find(r => r.id === id); if (req) { let canFit = calculateCanFit(req.count); if (canFit) { gameState.satisfaction = Math.max(0, gameState.satisfaction - 1); showNotification("شهروندان ناراحت شدند که با وجود داشتن جا، پناهندگان رها شدند. ۱ درصد رضایت کم شد.", "warning"); } else { gameState.satisfaction = Math.min(100, gameState.satisfaction + 1); showNotification("شهروندان خوشحال شدند که منابع تقسیم نشد و بقا تضمین شد. ۱ درصد رضایت بیشتر شد.", "info"); } gameState.migrantRequests = gameState.migrantRequests.filter(r => r.id !== id); div.remove(); updateUI(); if (gameState.migrantRequests.length === 0 && !tracker.querySelector('.no-req-msg')) { tracker.innerHTML = '<p class="no-req-msg" style="color: #aaa; text-align: center; font-size: 0.9rem;">در حال حاضر درخواستی وجود ندارد.</p>'; } } });
            } 
            let bar = tracker.querySelector(`[data-req-id="${reqIdStr}"] .req-bar`); if (bar) bar.style.width = (progress * 100) + '%'; 
        } 
    }); 
    if (expiredIds.length > 0) gameState.migrantRequests = gameState.migrantRequests.filter(r => !expiredIds.includes(r.id)); 
}

function calculateExpeditionResult(exp) { if (exp.isTutorial) return { wood: 10, stone: 10, food: 0, fuel: 0, casualties: 0 }; const regionData = { 'کویر لوت': { pcts: [100, 80, 75, 70, 50, 20, 0], res: { wood: 30, stone: 30, food: 20, fuel: 5 } }, 'آبشار لاتون': { pcts: [70, 60, 50, 40, 20, 0], res: { wood: 0, stone: 20, food: 10, fuel: 0 } }, 'تخت جمشید': { pcts: [40, 30, 20, 15, 10, 0], res: { wood: 10, stone: 10, food: 0, fuel: 0 } } }; const r = regionData[exp.region]; if (!r) return { casualties: exp.troops, wood: 0, stone: 0, food: 0, fuel: 0 }; const pct = r.pcts[Math.floor(Math.random() * r.pcts.length)]; const exact = (pct / 100) * exp.troops; let casualties = Math.floor(exact); if (Math.random() < (exact - casualties)) casualties++; casualties = Math.min(casualties, exp.troops); const survivors = exp.troops - casualties; return { wood: survivors * r.res.wood, stone: survivors * r.res.stone, food: survivors * r.res.food, fuel: survivors * r.res.fuel, casualties }; }

function showExpeditionResult(exp, res) { 
    const modal = document.getElementById('expeditionResultModal'); 
    const txt = document.getElementById('resultText'); 
    if(!modal || !txt) return; 
    const t = LANG[gameState.currentLang]; 
    let html = `<div style="margin-bottom:10px;"><strong style="color:#f4d03f;">${t.resultRegion}</strong> ${exp.region}</div>`; 
    html += `<div style="margin-bottom:10px;"><strong style="color:#e74c3c;">${t.resultCasualties}</strong> ${res.casualties} ${gameState.currentLang === 'en' ? 'troops' : 'نفر'}</div>`; 
    html += `<div style="margin-bottom:10px; border-top:1px solid #333; padding-top:10px;"><strong style="color:#f4d03f;">${t.resultRes}</strong><br>`; 
    
    let foundRes = false, resList = ''; 
    if (res.wood > 0) { resList += `${t.wood}: ${res.wood}<br>`; foundRes = true; } 
    if (res.stone > 0) { resList += `${t.stone}: ${res.stone}<br>`; foundRes = true; } 
    if (res.food > 0) { resList += `${t.food}: ${res.food}<br>`; foundRes = true; } 
    if (res.fuel > 0) { resList += `${t.fuel}: ${res.fuel}<br>`; foundRes = true; } 
    
    if (!foundRes) { html += `${t.resultNone}<br>`; } else { html += resList; } 
    html += `</div>`; 
    txt.innerHTML = html; 
    modal.style.display = 'block'; 
}

function showMigrantModal(count) { const modal = document.getElementById('migrantModal'); const txt = document.getElementById('migrantText'); if(!modal || !txt) return; txt.innerText = `${count} نفر می‌خواهند به منطقه امن شما بپیوندند. آیا اجازه می‌دهید؟`; modal.style.display = 'flex'; const migrantReject = document.getElementById('migrantReject'); if(migrantReject) migrantReject.onclick = () => { modal.style.display = 'none'; let canFit = calculateCanFit(count); if (canFit) { gameState.satisfaction = Math.max(0, gameState.satisfaction - 1); showNotification("شهروندان ناراحت شدند که با وجود داشتن جا، کمک نکردید. ۱ درصد رضایت کم شد.", "warning"); } else { gameState.satisfaction = Math.min(100, gameState.satisfaction + 1); showNotification("شهروندان خوشحال شدند که منابع تقسیم نشد و بقا تضمین شد. ۱ درصد رضایت بیشتر شد.", "info"); } updateUI(); }; const migrantWait = document.getElementById('migrantWait'); if(migrantWait) migrantWait.onclick = () => { modal.style.display = 'none'; gameState.migrantRequests.push({ id: Date.now(), count: count, endTime: Date.now() + 180000 }); showNotification("آدم‌ها در انتظار نگه داشته شدند. به بخش درخواست‌ها مراجعه کنید.", "info"); }; const migrantAccept = document.getElementById('migrantAccept'); if(migrantAccept) migrantAccept.onclick = () => { modal.style.display = 'none'; autoPlaceMigrants(count); }; }
function nextDay() { if (gameState.gameOver || gameState.isPaused) return; gameState.day++; let totalPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0); let starvedCount = 0; if (gameState.food < totalPop) { starvedCount = totalPop - gameState.food; gameState.food = 0; let toKill = starvedCount; while (toKill > 0) { let eligibleHouses = gameState.HOUSE_HEXES.filter(h => h.pop > 0); if (eligibleHouses.length === 0) break; let house = eligibleHouses[Math.floor(Math.random() * eligibleHouses.length)]; house.pop--; toKill--; } let remainingPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0); if (remainingPop <= 0) { showGameOver(); return; } let hopeReduction = Math.ceil(starvedCount / 2); gameState.hope = Math.max(0, gameState.hope - hopeReduction); let modal = document.getElementById('starvationModal'); if (modal) { document.getElementById('starvationText').innerText = `به دلیل کمبود غذا، ${starvedCount} نفر از شهروندان جان باختند. لطفاً منابع غذایی رو مدیریت کن!`; modal.style.display = 'flex'; } } else { gameState.food -= totalPop; } gameState.fuel = Math.max(0, gameState.fuel - gameState.POWERPLANT_HEXES.length); gameState.HOUSE_HEXES.forEach(h => h.receivedToday = false); let hasOvercrowded = gameState.HOUSE_HEXES.some(h => h.pop === 5); let hasSpace = gameState.HOUSE_HEXES.some(h => h.pop < 3); if (hasOvercrowded && hasSpace && gameState.HOUSE_HEXES.length > 1) { const cm = document.getElementById('complaintModal'); if(cm) cm.style.display = 'flex'; } updateUI(); if (Math.random() < 0.33) { let numMigrants = Math.floor(Math.random() * gameState.day) + 1; showMigrantModal(numMigrants); } }
function startGameLoop() {}
function updateUI() { let totalPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0); gameState.population = totalPop; let ppCount = gameState.POWERPLANT_HEXES.length; let heatCapacity = ppCount * 10; if (totalPop > 0) gameState.heat = Math.min(100, Math.round((heatCapacity / totalPop) * 100)); else gameState.heat = 0; const el = id => document.getElementById(id); const updateBar = (id, value, max) => { const valEl = el(id); if (valEl) { const barEl = valEl.parentElement.querySelector('.resource-bar'); if (barEl) { let percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0; barEl.style.width = percentage + '%'; } if (id === 'heat') { const parent = valEl.parentElement; if (parent && (!parent.previousElementSibling || !parent.previousElementSibling.classList.contains('mobile-line-break'))) { const lineBreak = document.createElement('div'); lineBreak.className = 'mobile-line-break'; parent.parentNode.insertBefore(lineBreak, parent); } } } }; if(el('day')) el('day').textContent = gameState.day; if(el('population')) el('population').textContent = gameState.population; if(el('wood')) el('wood').textContent = gameState.wood; if(el('stone')) el('stone').textContent = gameState.stone; if(el('food')) el('food').textContent = Math.floor(gameState.food); if(el('fuel')) el('fuel').textContent = Math.floor(gameState.fuel); if(el('heat')) el('heat').textContent = gameState.heat + '%'; if(el('hope')) el('hope').textContent = gameState.hope + '%'; if(el('satisfaction')) el('satisfaction').textContent = gameState.satisfaction + '%'; updateBar('population', gameState.population, 20); updateBar('wood', gameState.wood, 50); updateBar('stone', gameState.stone, 50); updateBar('food', gameState.food, 50); updateBar('fuel', gameState.fuel, 50); updateBar('heat', gameState.heat, 100); updateBar('hope', gameState.hope, 100); updateBar('satisfaction', gameState.satisfaction, 100); }
function showNotification(text, type = 'info') { let c = document.getElementById('notification-container'); if (!c) { c = document.createElement('div'); c.id = 'notification-container'; c.style.position = 'fixed'; c.style.top = '90px'; c.style.left = '50%'; c.style.transform = 'translateX(-50%)'; c.style.zIndex = '10000'; c.style.display = 'flex'; c.style.flexDirection = 'column'; c.style.alignItems = 'center'; c.style.gap = '6px'; document.body.appendChild(c); } const el = document.createElement('div'); el.className = `notification ${type}`; el.textContent = text; c.appendChild(el); setTimeout(() => { if (el.parentNode) el.remove(); }, 3000); }
function showStoryScreen() { const hero = document.querySelector('.hero'); if(hero) hero.style.display = 'none'; const header = document.getElementById('siteHeader'); if(header) header.style.display = 'none'; document.body.style.paddingTop = '0'; const ss = document.getElementById('story-screen'); if(ss) ss.style.display = 'flex'; }
function startActualGame() { const ss = document.getElementById('story-screen'); if(ss) ss.style.display = 'none'; const gs = document.getElementById('game-screen'); if(gs) gs.style.display = 'block'; initHexGrid(); const cX = 1500, cY = 1500; const container = document.getElementById('map-container'); if(!container) return; const rect = container.getBoundingClientRect(); const mW = 3000, mH = 3000; let minZoom = Math.max(rect.width / mW, rect.height / mH); camera.zoom = Math.max(1, minZoom); camera.x = cX - (rect.width / camera.zoom) / 2; camera.y = cY - (rect.height / camera.zoom) / 2; setupControls(); startGameLoop(); updateUI(); applyLang('fa'); updateTutorialBox(); if (!mapAnimId) { function anim() { drawMap(); mapAnimId = requestAnimationFrame(anim); } anim(); } adjustMapTop(); }
function adjustMapTop() { const topBar = document.getElementById('top-bar'); const mapContainer = document.getElementById('map-container'); if (topBar && mapContainer) mapContainer.style.top = topBar.offsetHeight + 'px'; }
function closeAllPanels(exceptId) { const panels = ['panelBuild', 'panelExplore', 'panelRequests', 'panelMovePop']; panels.forEach(id => { if (id !== exceptId) { const p = document.getElementById(id); if (p) p.classList.remove('panel-open'); } }); }
function openMovePopPanel(maxPop) { closeAllPanels('panelMovePop'); const btnsDiv = document.getElementById('movePopBtns'); if(!btnsDiv) return; btnsDiv.innerHTML = ''; for(let i=1; i<=maxPop; i++) { let b = document.createElement('button'); b.innerText = i; b.style.cssText = "width: 50px; height: 50px; background: #2c3e50; color: #fff; border: 2px solid #f4d03f; border-radius: 8px; cursor: pointer; font-size: 1.2rem; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: 0.2s; font-family: 'Vazirmatn', sans-serif; margin: 5px;"; b.onmouseover = () => { if(b.style.background !== 'rgb(244, 208, 63)') b.style.background = '#34495e'; }; b.onmouseout = () => { if(b.style.background !== 'rgb(244, 208, 63)') b.style.background = '#2c3e50'; }; b.onclick = () => { gameState.moveAmount = i; document.querySelectorAll('#movePopBtns button').forEach(btn => { btn.style.background = '#2c3e50'; btn.style.color = '#fff'; }); b.style.background = '#f4d03f'; b.style.color = '#000'; }; btnsDiv.appendChild(b); } gameState.moveAmount = 1; if(btnsDiv.firstChild) btnsDiv.firstChild.click(); const pmp = document.getElementById('panelMovePop'); if(pmp) pmp.classList.add('panel-open'); }
function showAngryMoveModal() { const modal = document.getElementById('angryMoveModal'); if(modal) modal.style.display = 'flex'; gameState.satisfaction = Math.max(0, gameState.satisfaction - 1); updateUI(); showNotification("۱ درصد رضایت کم شد!", "warning"); }

function isBarracksModalOpen() {
    const sm = document.getElementById('barracksSelectModal');
    const cm = document.getElementById('barracksConfirmModal');
    return (sm && sm.style.display === 'block') || (cm && cm.style.display === 'block');
}

function openBarracksSelect(isUpgrade, maxCount) {
    const modal = document.getElementById('barracksSelectModal');
    const title = document.getElementById('barracksSelectTitle');
    const question = document.getElementById('barracksSelectQuestion');
    const btnsDiv = document.getElementById('barracksSelectBtns');
    
    title.innerText = isUpgrade ? "ارتقای سرباز" : "ایجاد سرباز جدید";
    question.innerHTML = isUpgrade ? `تعداد سربازانی که می‌خواهید ارتقا دهید را انتخاب کنید حداکثر ${maxCount} نفر:` : `تعداد سربازانی که می‌خواهید ایجاد کنید را انتخاب کنید حداکثر ${maxCount} نفر:`;
    
    btnsDiv.innerHTML = '';
    for(let i=1; i<=maxCount; i++) {
        let b = document.createElement('button');
        b.innerText = i;
        b.style.cssText = "width: 40px; height: 40px; background: #2c3e50; color: #fff; border: 2px solid #f4d03f; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; margin: 4px;";
        b.onclick = () => {
            modal.style.display = 'none';
            modal.style.opacity = 0;
            openBarracksConfirm(isUpgrade, i);
        };
        btnsDiv.appendChild(b);
    }
    
    modal.style.display = 'block';
    setTimeout(() => { modal.style.opacity = 1; modal.style.transform = 'translate(-50%, -50%) scale(1)'; }, 10);
}

function openBarracksConfirm(isUpgrade, count) {
    const modal = document.getElementById('barracksConfirmModal');
    const title = document.getElementById('barracksConfirmTitle');
    const question = document.getElementById('barracksConfirmQuestion');
    const cost = count * 3;
    
    title.innerText = isUpgrade ? "تایید ارتقای سرباز" : "تایید ایجاد سرباز";
    
    if (isUpgrade) {
        question.innerHTML = `آیا از ارتقای ${count} سرباز مطمئن هستید؟<br>این کار ${cost} سنگ هزینه دارد.`;
        document.getElementById('barracksConfirmYes').onclick = () => {
            if (gameState.stone < cost) { showNotification("سنگ کافی نداری!", "error"); return; }
            gameState.stone -= cost;
            gameState.soldiersLvl1 -= count;
            gameState.training = { active: true, remaining: count, targetTime: Date.now() + 10000, isUpgrade: true };
            modal.style.display = 'none';
            updateUI();
            updateBarracksUI();
        };
    } else {
        question.innerHTML = `آیا از ایجاد ${count} سرباز جدید مطمئن هستید؟<br>این کار ${cost} چوب هزینه دارد.`;
        document.getElementById('barracksConfirmYes').onclick = () => {
            if (gameState.wood < cost) { showNotification("چوب کافی نداری!", "error"); return; }
            if (!removeTroopsFromHouses(count)) { showNotification("جمعیت کافی نداری!", "error"); return; }
            gameState.wood -= cost;
            gameState.training = { active: true, remaining: count, targetTime: Date.now() + 10000, isUpgrade: false };
            modal.style.display = 'none';
            updateUI();
            updateBarracksUI();
        };
    }
    
    modal.style.display = 'block';
    setTimeout(() => { modal.style.opacity = 1; modal.style.transform = 'translate(-50%, -50%) scale(1)'; }, 10);
}

function initGame() {
    bgMusic = new Audio('music.mp3'); bgMusic.volume = 0.4; 
    function tryPlayMusic() { bgMusic.play().then(() => { bgMusic.currentTime = MUSIC_START_TIME; document.body.removeEventListener('click', tryPlayMusic); document.body.removeEventListener('keydown', tryPlayMusic); document.body.removeEventListener('touchstart', tryPlayMusic); }).catch(e => {}); }
    document.body.addEventListener('click', tryPlayMusic); document.body.addEventListener('keydown', tryPlayMusic); document.body.addEventListener('touchstart', tryPlayMusic);
    bgMusic.addEventListener('ended', () => { bgMusic.currentTime = MUSIC_START_TIME; bgMusic.play(); });
    window.addEventListener('beforeunload', function (e) { const gs = document.getElementById('game-screen'); if (gs && gs.style.display === 'block' && !gameState.gameOver && gameState.currentSaveName) saveGame(true); });
    const startBtnHero = document.getElementById('startBtnHero'); if (startBtnHero) { startBtnHero.onclick = () => { gameState.currentSaveName = null; showStoryScreen(); }; }
    const startActualGameBtn = document.getElementById('startActualGameBtn'); if (startActualGameBtn) { startActualGameBtn.onclick = startActualGame; }
    const heroActions = document.querySelector('.hero-actions'); if (heroActions && startBtnHero) { if (hasSavedGame()) { const continueBtn = document.createElement('button'); continueBtn.id = 'btnContinueHero'; continueBtn.className = 'btn-primary'; continueBtn.innerText = 'ادامه بازی'; continueBtn.style.marginRight = '15px'; continueBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)'; continueBtn.onclick = continueGame; heroActions.insertBefore(continueBtn, startBtnHero); } }
    
    if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed: ', err)); }); }
    const eventCloseBtn = document.getElementById('eventClose'); if (eventCloseBtn) eventCloseBtn.onclick = () => { const ep = document.getElementById('event-panel'); if(ep) ep.classList.replace('event-panel-visible', 'event-panel-hidden'); };
    
    const style = document.createElement('style');
    style.innerHTML = `
        #game-screen, #game-screen * { font-family: 'Vazirmatn', sans-serif !important; }
        button, input, select, textarea { font-family: 'Vazirmatn', sans-serif !important; }
        
        /* زیباسازی اسکرول‌بار در دسکتاپ */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; margin: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(136, 136, 136, 0.7); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #aaa; }
        
        #tutorialPointer { position: fixed; width: 60px; height: 60px; border-radius: 50%; border: 4px solid #f4d03f; box-shadow: 0 0 15px #f4d03f, inset 0 0 15px #f4d03f; z-index: 999; display: none; pointer-events: none; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
        
        #top-bar { height: auto !important; min-height: 0 !important; padding: 8px 15px !important; align-items: center !important; border-bottom: none !important; }
        .top-bar-center { position: relative; padding: 0 20px !important; justify-content: center !important; flex: 1 !important; }
        .resource-icon { font-size: 0.9rem; line-height: 1; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        
        .panel-header { margin: 0 10px !important; border-bottom: 1px solid rgba(201,168,76,0.15) !important; }
        .resource-divider { width: 1px !important; min-height: 15px !important; height: 15px !important; background: rgba(255,255,255,0.2) !important; margin: 0 5px !important; flex-shrink: 0; }
        
        .mobile-line-break { display: none !important; }
        
        /* تثبیت دکمه نصب بازی در هدر برای جلوگیری از تغییر شکل */
        .nav-cta { 
            background: linear-gradient(135deg, #8e44ad, #9b59b6) !important; 
            border: 1px solid #9b59b6 !important; 
            color: #fff !important; 
            border-radius: 4px !important; 
            font-weight: 700 !important; 
            cursor: pointer !important; 
            transition: all 0.3s !important; 
            display: inline-flex !important; 
            align-items: center !important; 
            justify-content: center !important; 
            text-decoration: none !important; 
            font-family: 'Vazirmatn', sans-serif !important; 
        }
        
        @media (min-width: 769px) {
            .floating-panel { width: 400px !important; max-height: 80vh !important; display: flex !important; flex-direction: column !important; }
            .panel-body { overflow-y: auto !important; flex: 1 !important; }
            #rightPanelContainer { width: 250px !important; right: 20px !important; top: 80px !important; display: flex !important; }
            #actionTracker { display: none !important; }
        }

        .floating-panel {
            border: 1px solid #f4d03f !important;
            box-shadow: 0 0 15px rgba(244,208,63,0.2) !important;
        }
        
        @media (max-width: 768px) {
            /* حذف اسکرول‌بار در موبایل */
            * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
            *::-webkit-scrollbar { display: none !important; }
            
            /* اصلاح صفحه داستان برای دیده شدن دکمه شروع */
            #story-screen { 
                justify-content: flex-start !important; 
                padding: 80px 15px 20px 15px !important; 
                overflow-y: auto !important; 
            }
            .story-container { 
                max-height: none !important; 
                margin-bottom: 20px !important; 
                padding: 20px !important;
            }
            
            .nav-cta { 
                left: 10px !important; 
                top: 10px !important; 
                transform: none !important; 
                height: 35px !important; 
                padding: 0 15px !important; 
                font-size: 13px !important; 
            }
            
            #pauseModal > div, #settingsModal > div { width: 95% !important; padding: 20px !important; }
            #dispatchTroopsModal { width: 90% !important; padding: 15px !important; }
            #dispatchTroopsBtns button { width: 50px !important; height: 50px !important; font-size: 1.2rem !important; margin: 5px !important; }
            #tutorialBox { width: 95% !important; padding: 15px !important; bottom: 60px !important; gap: 10px !important; }
            #tutorialBox img { width: 60px !important; height: 60px !important; }
            #tutorialBox p { font-size: 0.8rem !important; line-height: 1.5 !important; }
            #unlockModal, #expeditionResultModal, #migrantModal { width: 90% !important; }
            #rightPanelContainer { right: 10px !important; width: 160px !important; top: 140px !important; }
            #movePopBtns button { width: 45px !important; height: 45px !important; font-size: 1rem !important; }
            .floating-panel { 
                width: 92% !important; 
                max-height: 60vh !important; 
                border-radius: 12px !important; 
                border: 1px solid #f4d03f !important;
                overflow: hidden !important; 
                display: flex !important;
                flex-direction: column !important;
            }
            .panel-body { 
                padding: 8px !important; 
                overflow-y: auto !important; 
                -webkit-overflow-scrolling: touch !important; 
                flex: 1 !important;
            }
            .panel-header { flex-shrink: 0 !important; }
            .build-item-new { padding: 8px !important; margin-bottom: 8px !important; gap: 8px !important; }
            .build-info-text { gap: 2px !important; }
            .build-name { font-size: 0.85rem !important; }
            .build-info-text > div { font-size: 0.65rem !important; }
            .build-btn, .survey-btn { padding: 4px 8px !important; font-size: 0.7rem !important; }
            .build-image { width: 45px !important; height: 45px !important; }
            #top-bar { height: auto !important; min-height: 0 !important; padding: 0 !important; flex-wrap: wrap !important; align-items: flex-start !important; position: fixed !important; top: 0 !important; background: rgba(10, 14, 26, 0.98) !important; border-bottom: none !important; }
            .top-bar-left img { width: 26px !important; height: 26px !important; }
            .top-bar-center { width: 100% !important; margin-top: 40px !important; padding: 8px 5px !important; border-top: 1px solid rgba(244, 208, 63, 0.3) !important; justify-content: center !important; flex-wrap: wrap !important; }
            .resource-item { padding: 2px 5px !important; height: 22px !important; gap: 2px !important; margin-bottom: 3px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; white-space: nowrap !important; }
            .resource-icon { font-size: 0.7rem !important; line-height: 1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; transform: scale(0.75) !important; transform-origin: center !important; margin: 0 -1px !important; }
            .resource-label { display: none !important; }
            .resource-value { font-size: 0.65rem !important; min-width: 10px !important; }
            .resource-bar-container { width: 22px !important; height: 3px !important; display: block !important; }
            .resource-divider { display: none !important; }
            .mobile-line-break { display: block !important; flex-basis: 100% !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
            #notification-container { top: 140px !important; }
            .notification { padding: 5px 10px !important; font-size: 0.7rem !important; max-width: 90vw !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
            #btnNextDay { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; outline: none !important; }
            #btnNextDay img { background: transparent !important; border: none !important; box-shadow: none !important; outline: none !important; }
            #bottom-bar { position: fixed !important; bottom: 0 !important; left: 0 !important; width: 100% !important; height: 45px !important; z-index: 100 !important; background: rgba(10, 14, 26, 0.98) !important; }
            .bottom-btn .btn-icon-large { font-size: 1.1rem !important; }
            .bottom-btn .btn-label { font-size: 0.5rem !important; }
            #map-container { bottom: 45px !important; }
            
            /* استایل‌دهی اختصاصی مدل مجلس در موبایل */
            #councilModal { width: 92% !important; max-width: 350px !important; padding: 15px !important; gap: 10px !important; }
            .party-row { gap: 8px !important; padding: 8px !important; }
            .party-img { width: 40px !important; height: 40px !important; }
            .party-name { font-size: 0.8rem !important; }
            .party-desc { font-size: 0.65rem !important; }
            .view-members-btn { padding: 3px 6px !important; font-size: 0.65rem !important; white-space: nowrap !important; }
        }
    `;
    document.head.appendChild(style);
    const bottomBar = document.getElementById('bottom-bar'); if (bottomBar) { Array.from(bottomBar.children).forEach(btn => { const text = btn.innerText.toLowerCase(); if (text.includes('اکتشاف') || text.includes('گرمایش')) btn.remove(); }); }
    const pointerDiv = document.createElement('div'); pointerDiv.id = 'tutorialPointer'; document.body.appendChild(pointerDiv);
    const topBar = document.getElementById('top-bar'); if (topBar) { const pauseBtn = document.createElement('button'); pauseBtn.id = 'btnPause'; pauseBtn.innerHTML = `<img src="pause_icon.png" style="width: ${PAUSE_BTN_SIZE}px; height: ${PAUSE_BTN_SIZE}px; pointer-events: none; border-radius: 8px;">`; pauseBtn.style.cssText = "position: absolute; left: 15px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 0;"; topBar.appendChild(pauseBtn); pauseBtn.onclick = togglePauseMenu; }
    const nextDayBtn = document.createElement('button'); nextDayBtn.id = 'btnNextDay'; nextDayBtn.innerHTML = `<img src="next_day_icon.png" style="width: ${NEXT_DAY_BTN_SIZE}px; height: ${NEXT_DAY_BTN_SIZE}px; pointer-events: none; border-radius: 12px; background: transparent;">`; nextDayBtn.style.cssText = `position: absolute; top: ${NEXT_DAY_BTN_TOP}px; left: 50%; transform: translateX(-50%); background: none; border: none; cursor: pointer; z-index: 55; padding: 0; box-shadow: none; outline: none;`; const gameScreen = document.getElementById('game-screen'); if (gameScreen) gameScreen.appendChild(nextDayBtn); nextDayBtn.onclick = nextDay;
    window.applyNextDayMobileStyle = function() { const isMobile = window.innerWidth <= 768; const btn = document.getElementById('btnNextDay'); if (btn) { const img = btn.querySelector('img'); if (isMobile) { btn.style.top = MOBILE_NEXT_DAY_BTN_TOP + 'px'; if (img) { img.style.width = MOBILE_NEXT_DAY_BTN_SIZE + 'px'; img.style.height = MOBILE_NEXT_DAY_BTN_SIZE + 'px'; } } else { btn.style.top = NEXT_DAY_BTN_TOP + 'px'; if (img) { img.style.width = NEXT_DAY_BTN_SIZE + 'px'; img.style.height = NEXT_DAY_BTN_SIZE + 'px'; } } } adjustMapTop(); }; window.applyNextDayMobileStyle(); window.addEventListener('resize', window.applyNextDayMobileStyle);
    const exploreBtn = document.createElement('button'); exploreBtn.className = 'bottom-btn'; exploreBtn.id = 'btnExplore'; exploreBtn.innerHTML = '<span class="btn-icon-large">🧭</span><span class="btn-label">اکتشاف</span>'; if (bottomBar) bottomBar.appendChild(exploreBtn);
    const requestsBtn = document.createElement('button'); requestsBtn.className = 'bottom-btn'; requestsBtn.id = 'btnRequests'; requestsBtn.innerHTML = '<span class="btn-icon-large">📜</span><span class="btn-label">درخواست‌ها</span>'; if (bottomBar) bottomBar.appendChild(requestsBtn);
    
    const rightPanelContainer = document.createElement('div'); rightPanelContainer.id = 'rightPanelContainer'; rightPanelContainer.style.cssText = "position: fixed; right: 20px; top: 70px; width: 220px; z-index: 200; display: flex; flex-direction: column; gap: 10px;"; if (gameScreen) gameScreen.appendChild(rightPanelContainer);
    const actionTracker = document.createElement('div'); actionTracker.id = 'actionTracker'; actionTracker.style.cssText = "display: none; flex-direction: column; gap: 5px;"; rightPanelContainer.appendChild(actionTracker);
    const tracker = document.createElement('div'); tracker.id = 'expeditionTracker'; tracker.style.cssText = "display: none; flex-direction: column; gap: 5px;"; rightPanelContainer.appendChild(tracker);

    const angryMoveModal = document.createElement('div'); angryMoveModal.id = 'angryMoveModal'; angryMoveModal.style.cssText = "position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%); width: 400px; max-width: 95%; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 16px; z-index: 500; display: none; flex-direction: row; gap: 15px; padding: 15px; align-items: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);"; angryMoveModal.innerHTML = `<div style="flex: 1; text-align: right;"><h3 style="color: #e74c3c; margin-bottom: 10px; font-size: 0.9rem;">گزارش شهروندان</h3><p style="color: #e8dcc8; font-size: 0.8rem; line-height: 1.6;">بابا ما مگه چقدر جون داریم؟ هی از این خونه به اون خونه می‌بریمون... یه کم آروم باش!</p><button id="angryMoveBtn" style="margin-top: 10px; padding: 6px 15px; background: linear-gradient(145deg, #e74c3c, #c0392b); border: none; border-radius: 6px; color: #fff; font-weight: 700; cursor: pointer; font-size: 0.8rem;">متوجه شدم</button></div><img src="angry_move.png" style="width: 70px; height: 70px; object-fit: contain; border-radius: 10px; background: #111; border: 1px solid #333; flex-shrink: 0;">`; if (gameScreen) gameScreen.appendChild(angryMoveModal); const angryBtn = document.getElementById('angryMoveBtn'); if (angryBtn) angryBtn.onclick = () => angryMoveModal.style.display = 'none';
    const complaintModal = document.createElement('div'); complaintModal.id = 'complaintModal'; complaintModal.style.cssText = "position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%); width: 400px; max-width: 95%; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 16px; z-index: 500; display: none; flex-direction: row; gap: 15px; padding: 15px; align-items: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);"; complaintModal.innerHTML = `<div style="flex: 1; text-align: right;"><h3 style="color: #e74c3c; margin-bottom: 10px; font-size: 0.9rem;">گزارش شهروندان</h3><p id="complaintText" style="color: #e8dcc8; font-size: 0.8rem; line-height: 1.6;">ببین اقام رییس، ما ۵ نفری توی یک خونه زندگی می‌کنیم، دیوونه شدیم! در حالی که خونه ی دیگه ات جمعیتش کمتره! یه کاری بکن لطفاً...</p><button id="complaintBtn" style="margin-top: 10px; padding: 6px 15px; background: linear-gradient(145deg, #e74c3c, #c0392b); border: none; border-radius: 6px; color: #fff; font-weight: 700; cursor: pointer; font-size: 0.8rem;">متوجه شدم</button></div><img src="complaint.png" style="width: 70px; height: 70px; object-fit: contain; border-radius: 10px; background: #111; border: 1px solid #333; flex-shrink: 0;">`; if (gameScreen) gameScreen.appendChild(complaintModal); const complaintBtn = document.getElementById('complaintBtn'); if (complaintBtn) complaintBtn.onclick = () => { complaintModal.style.display = 'none'; gameState.satisfaction = Math.max(0, gameState.satisfaction - 1); updateUI(); showNotification("۱ درصد رضایت کم شد!", "warning"); };
    const starvationModal = document.createElement('div'); starvationModal.id = 'starvationModal'; starvationModal.style.cssText = "position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%); width: 400px; max-width: 95%; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 16px; z-index: 500; display: none; flex-direction: row; gap: 15px; padding: 15px; align-items: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);"; starvationModal.innerHTML = `<div style="flex: 1; text-align: right;"><h3 style="color: #e74c3c; margin-bottom: 10px; font-size: 0.9rem;">گزارش تلفات</h3><p id="starvationText" style="color: #e8dcc8; font-size: 0.8rem; line-height: 1.6;"></p><button id="starvationBtn" style="margin-top: 10px; padding: 6px 15px; background: linear-gradient(145deg, #e74c3c, #c0392b); border: none; border-radius: 6px; color: #fff; font-weight: 700; cursor: pointer; font-size: 0.8rem;">متوجه شدم</button></div><img src="starvation.png" style="width: 70px; height: 70px; object-fit: contain; border-radius: 10px; background: #111; border: 1px solid #333; flex-shrink: 0;">`; if (gameScreen) gameScreen.appendChild(starvationModal); const starvationBtn = document.getElementById('starvationBtn'); if (starvationBtn) starvationBtn.onclick = () => starvationModal.style.display = 'none';
    const unlockModal = document.createElement('div'); unlockModal.id = 'unlockModal'; unlockModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: rgba(10,14,26,0.98); padding: 20px; border-radius: 12px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: center; box-shadow: 0 0 30px rgba(0,0,0,0.8);"; unlockModal.innerHTML = `<h3 id="txtUnlockTitle" style="color: #f4d03f; margin-bottom: 15px;">باز کردن قفل</h3><p id="txtUnlockQ" style="color: #e8dcc8; margin-bottom: 5px;">آیا می‌خواهید این قفل را باز کنید؟</p><p id="txtUnlockCost" style="color: #aaa; font-size: 0.8rem; margin-bottom: 20px;">این کار ۱۰ سنگ هزینه دارد.</p><div style="display: flex; gap: 10px;"><button id="txtUnlockYes" style="flex:1; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">بله، باز کن</button><button id="txtCancelUnlock" style="flex:1; padding:10px; background:transparent; border:1px solid #8a7a6a; border-radius:6px; color:#f5e6c8; cursor:pointer;">انصراف</button></div>`; if (gameScreen) gameScreen.appendChild(unlockModal); const txtUnlockYes = document.getElementById('txtUnlockYes'); if (txtUnlockYes) txtUnlockYes.onclick = () => { unlockModal.style.display = 'none'; if (gameState.stone >= 10) { gameState.stone -= 10; gameState.unlockedHexes.push(gameState.pendingUnlockTarget); updateUI(); showNotification("قفل باز شد و ۱۰ سنگ کم شد!", "success"); if (gameState.tutorialStep === 1) { gameState.tutorialStep = 2; updateTutorialBox(); } else if (gameState.tutorialStep === 9) { gameState.tutorialStep = 10; updateTutorialBox(); } } else { showNotification("سنگ کافی نداری!", "warning"); } }; const txtCancelUnlock = document.getElementById('txtCancelUnlock'); if (txtCancelUnlock) txtCancelUnlock.onclick = () => unlockModal.style.display = 'none';
    const dispatchTroopsModal = document.createElement('div'); dispatchTroopsModal.id = 'dispatchTroopsModal'; dispatchTroopsModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 350px; background: rgba(10,14,26,0.98); padding: 25px; border-radius: 16px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: center; box-shadow: 0 0 40px rgba(0,0,0,0.9); opacity: 0; transition: 0.3s;"; dispatchTroopsModal.innerHTML = `<h3 id="txtDispatchTitle" style="color: #f4d03f; margin-bottom: 5px;">اعزام نیرو</h3><p style="color: #aaa; font-size: 0.85rem; margin-bottom: 20px;"><span id="txtDispatchQ">اعزام شوند؟</span> <span id="modalRegionName" style="color:#f4d03f; font-weight:bold;"></span></p><div id="dispatchTroopsBtns" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;"></div><button id="txtCancelDispatch" style="width: 100%; padding: 10px; background: transparent; border: 1px solid #8a7a6a; border-radius: 6px; color: #f5e6c8; cursor: pointer;">انصراف</button>`; if (gameScreen) gameScreen.appendChild(dispatchTroopsModal); const txtCancelDispatch = document.getElementById('txtCancelDispatch'); if (txtCancelDispatch) txtCancelDispatch.onclick = () => { dispatchTroopsModal.style.display = 'none'; dispatchTroopsModal.style.opacity = 0; };

    // === ایجاد مودال پادگان ===
    const barracksModal = document.createElement('div'); 
    barracksModal.id = 'barracksModal'; 
    barracksModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 90%; max-width: 350px; background: rgba(10,14,26,0.98); padding: 25px; border-radius: 16px; border: 1px solid #f4d03f; z-index: 1000; display: none; flex-direction: column; gap: 20px; box-shadow: 0 0 40px rgba(0,0,0,0.9); opacity: 0; transition: 0.3s;";
    barracksModal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; margin: 0 10px; border-bottom: 1px solid rgba(201,168,76,0.15);">
            <h3 style="color: #f4d03f; margin: 0;">پادگان</h3>
            <button id="closeBarracksModal" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        
        <div style="display: flex; justify-content: space-around; padding: 10px;">
            <div style="text-align: center; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); flex: 1; margin: 0 5px;">
                <img src="soldier_lvl1.png" style="width: 60px; height: 60px; object-fit: cover; margin-bottom: 10px; border-radius: 8px; border: 1px solid #333;">
                <div style="color: #f5e6c8; font-size: 0.9rem;">سربازان سطح ۱</div>
                <div id="barracksLvl1Count" style="color: #f4d03f; font-size: 1.5rem; font-weight: bold; margin-top: 5px;">0</div>
            </div>
            <div style="text-align: center; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); flex: 1; margin: 0 5px;">
                <img src="soldier_lvl2.png" style="width: 60px; height: 60px; object-fit: cover; margin-bottom: 10px; border-radius: 8px; border: 1px solid #333;">
                <div style="color: #f5e6c8; font-size: 0.9rem;">سربازان سطح ۲</div>
                <div id="barracksLvl2Count" style="color: #f4d03f; font-size: 1.5rem; font-weight: bold; margin-top: 5px;">0</div>
            </div>
        </div>

        <div id="barracksProgressBarContainer" style="display: none; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin: 0 10px 15px 10px; text-align: center;">
            <div id="barracksProgressText" style="color: #f4d03f; font-size: 0.9rem; margin-bottom: 8px;">در حال ایجاد سرباز</div>
            <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
                <div id="barracksProgressBar" style="width: 0%; height: 100%; background: #f4d03f; transition: width 0.1s linear;"></div>
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; padding: 0 10px;">
            <button id="btnCreateSoldier" style="padding: 12px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 8px; color: #1a1a2e; font-weight: 700; cursor: pointer; font-size: 1rem;">ایجاد سرباز جدید</button>
            <button id="btnUpgradeSoldier" style="padding: 12px; background: transparent; border: 1px solid #f4d03f; color: #f4d03f; border-radius: 8px; cursor: pointer; font-size: 1rem;">ارتقای سرباز</button>
        </div>
    `;
    if (gameScreen) gameScreen.appendChild(barracksModal); 
    const closeBarracksModal = document.getElementById('closeBarracksModal'); 
    if (closeBarracksModal) closeBarracksModal.onclick = () => { barracksModal.style.display = 'none'; barracksModal.style.opacity = 0; barracksModal.style.transform = 'translate(-50%, -50%) scale(0.9)'; };
    const btnCreateSoldier = document.getElementById('btnCreateSoldier');
    if (btnCreateSoldier) btnCreateSoldier.onclick = () => {
        const max = gameState.population - 1;
        if (max <= 0) { showNotification("جمعیت کافی برای ایجاد سرباز ندارید!", "warning"); return; }
        openBarracksSelect(false, max);
    };
    const btnUpgradeSoldier = document.getElementById('btnUpgradeSoldier');
    if (btnUpgradeSoldier) btnUpgradeSoldier.onclick = () => {
        if (gameState.soldiersLvl1 <= 0) { showNotification("شما هیچ سرباز سطح یکی برای ارتقا ندارید", "error"); return; }
        openBarracksSelect(true, gameState.soldiersLvl1);
    };

    // === ایجاد مودال‌های انتخاب و تایید پادگان ===
    const barracksSelectHTML = `<div id="barracksSelectModal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 90%; max-width: 350px; background: rgba(10,14,26,0.98); padding: 25px; border-radius: 16px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: center; box-shadow: 0 0 40px rgba(0,0,0,0.9); opacity: 0; transition: 0.3s;"><h3 id="barracksSelectTitle" style="color: #f4d03f; margin-bottom: 5px;"></h3><p id="barracksSelectQuestion" style="color: #aaa; font-size: 0.85rem; margin-bottom: 20px;"></p><div id="barracksSelectBtns" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;"></div><button id="barracksSelectCancel" style="width: 100%; padding: 10px; background: transparent; border: 1px solid #8a7a6a; border-radius: 6px; color: #f5e6c8; cursor: pointer;">انصراف</button></div>`;
    if (gameScreen) gameScreen.insertAdjacentHTML('beforeend', barracksSelectHTML);
    const barracksSelectCancel = document.getElementById('barracksSelectCancel'); if (barracksSelectCancel) barracksSelectCancel.onclick = () => { const m = document.getElementById('barracksSelectModal'); m.style.display = 'none'; m.style.opacity = 0; };

    const barracksConfirmHTML = `<div id="barracksConfirmModal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 90%; max-width: 300px; background: rgba(10,14,26,0.98); padding: 20px; border-radius: 12px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: center; box-shadow: 0 0 30px rgba(0,0,0,0.8); opacity: 0; transition: 0.3s;"><h3 id="barracksConfirmTitle" style="color: #f4d03f; margin-bottom: 15px;"></h3><p id="barracksConfirmQuestion" style="color: #e8dcc8; margin-bottom: 20px;"></p><div style="display: flex; gap: 10px;"><button id="barracksConfirmYes" style="flex:1; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">بله، انجام بده</button><button id="barracksConfirmCancel" style="flex:1; padding:10px; background:transparent; border:1px solid #8a7a6a; border-radius:6px; color:#f5e6c8; cursor:pointer;">انصراف</button></div></div>`;
    if (gameScreen) gameScreen.insertAdjacentHTML('beforeend', barracksConfirmHTML);
    const barracksConfirmCancel = document.getElementById('barracksConfirmCancel'); if (barracksConfirmCancel) barracksConfirmCancel.onclick = () => { const m = document.getElementById('barracksConfirmModal'); m.style.display = 'none'; m.style.opacity = 0; };

    // === ایجاد مودال مجلس و احزاب ===
    const councilModal = document.createElement('div'); 
    councilModal.id = 'councilModal'; 
    councilModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 90%; max-width: 400px; background: rgba(10,14,26,0.98); padding: 25px; border-radius: 16px; border: 1px solid #f4d03f; z-index: 1000; display: none; flex-direction: column; gap: 15px; box-shadow: 0 0 40px rgba(0,0,0,0.9); opacity: 0; transition: 0.3s;";
    councilModal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; margin: 0 10px; border-bottom: 1px solid rgba(201,168,76,0.15);">
            <h3 style="color: #f4d03f; margin: 0;">مجلس شهر</h3>
            <button id="closeCouncilModal" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        
        <div class="party-row" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); gap: 10px;">
            <img src="party_steel.png" class="party-img" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; background: #111; border: 1px solid #333; flex-shrink: 0;">
            <div style="flex: 1; text-align: right; min-width: 0;">
                <div class="party-name" style="color: #e74c3c; font-weight: 700; font-size: 0.9rem; white-space: nowrap;">سپاه پولاد</div>
                <div class="party-desc" style="color: #aaa; font-size: 0.75rem; margin-top: 2px; white-space: nowrap;">طرفدار جنگ</div>
            </div>
            <button class="view-members-btn" data-party="سپاه پولاد" style="padding: 4px 10px; background: transparent; border: 1px solid #f4d03f; color: #f4d03f; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-family: 'Vazirmatn', sans-serif; flex-shrink: 0; white-space: nowrap;">مشاهده اعضا</button>
        </div>

        <div class="party-row" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); gap: 10px;">
            <img src="party_reconstruction.png" class="party-img" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; background: #111; border: 1px solid #333; flex-shrink: 0;">
            <div style="flex: 1; text-align: right; min-width: 0;">
                <div class="party-name" style="color: #27ae60; font-weight: 700; font-size: 0.9rem; white-space: nowrap;">دیوان ابادانی</div>
                <div class="party-desc" style="color: #aaa; font-size: 0.75rem; margin-top: 2px; white-space: nowrap;">طرفدار ساخت و ساز</div>
            </div>
            <button class="view-members-btn" data-party="دیوان ابادانی" style="padding: 4px 10px; background: transparent; border: 1px solid #f4d03f; color: #f4d03f; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-family: 'Vazirmatn', sans-serif; flex-shrink: 0; white-space: nowrap;">مشاهده اعضا</button>
        </div>

        <div class="party-row" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); gap: 10px;">
            <img src="party_earthshakers.png" class="party-img" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; background: #111; border: 1px solid #333; flex-shrink: 0;">
            <div style="flex: 1; text-align: right; min-width: 0;">
                <div class="party-name" style="color: #3498db; font-weight: 700; font-size: 0.9rem; white-space: nowrap;">انجمن زمین‌شکافان</div>
                <div class="party-desc" style="color: #aaa; font-size: 0.75rem; margin-top: 2px; white-space: nowrap;">طرفدار اکتشاف</div>
            </div>
            <button class="view-members-btn" data-party="انجمن زمین‌شکافان" style="padding: 4px 10px; background: transparent; border: 1px solid #f4d03f; color: #f4d03f; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-family: 'Vazirmatn', sans-serif; flex-shrink: 0; white-space: nowrap;">مشاهده اعضا</button>
        </div>
    `;
    if (gameScreen) gameScreen.appendChild(councilModal); 
    const closeCouncilModal = document.getElementById('closeCouncilModal'); 
    if (closeCouncilModal) closeCouncilModal.onclick = () => { councilModal.style.display = 'none'; councilModal.style.opacity = 0; councilModal.style.transform = 'translate(-50%, -50%) scale(0.9)'; };
    document.querySelectorAll('.view-members-btn').forEach(btn => {
        btn.onclick = () => {
            let partyName = btn.getAttribute('data-party');
            showNotification(`لیست اعضای حزب «${partyName}» در حال آماده‌سازی است...`, "info");
        };
    });

    const panelExplore = document.createElement('div'); panelExplore.className = 'floating-panel'; panelExplore.id = 'panelExplore'; panelExplore.innerHTML = `<div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px;"><h3 id="txtExploreTitle" style="font-size:1rem; color:#f4d03f;">اکتشاف</h3><button id="closeExplorePanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button></div><div class="panel-body" style="padding:16px; max-height: 400px; overflow-y: auto;"><div class="build-item-new" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px; padding:12px;"><div style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">کویر لوت</div><div class="region-risk" data-val="۰ تا ۱۰۰ درصد" style="font-size:0.8rem; color:#aaa;">مقدار تلفات: ۰ تا ۱۰۰ درصد</div><div class="region-reward" data-val="۳۰ چوب، ۳۰ سنگ، ۲۰ غذا، ۵ سوخت" style="font-size:0.8rem; color:#f4d03f;">پاداش هر بازگشته: ۳۰ چوب، ۳۰ سنگ، ۲۰ غذا، ۵ سوخت</div><button id="dispatchLut" class="build-btn dispatch-text" style="width:100%; margin-top:10px; padding: 8px 16px; font-size: 1rem;">اعزام نیرو</button></div><div class="build-item-new" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px; padding:12px;"><div style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">آبشار لاتون</div><div class="region-risk" data-val="۰ تا ۷۰ درصد" style="font-size:0.8rem; color:#aaa;">مقدار تلفات: ۰ تا ۷۰ درصد</div><div class="region-reward" data-val="۱۰ غذا، ۲۰ سنگ" style="font-size:0.8rem; color:#f4d03f;">پاداش هر بازگشته: ۱۰ غذا، ۲۰ سنگ</div><button id="dispatchLaton" class="build-btn dispatch-text" style="width:100%; margin-top:10px; padding: 8px 16px; font-size: 1rem;">اعزام نیرو</button></div><div class="build-item-new" style="display:flex; flex-direction:column; gap:8px; padding:12px;"><div style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">تخت جمشید</div><div class="region-risk" data-val="۰ تا ۴۰ درصد" style="font-size:0.8rem; color:#aaa;">مقدار تلفات: ۰ تا ۴۰ درصد</div><div class="region-reward" data-val="۱۰ چوب، ۱۰ سنگ" style="font-size:0.8rem; color:#f4d03f;">پاداش هر بازگشته: ۱۰ چوب، ۱۰ سنگ</div><button id="dispatchPersepolis" class="build-btn dispatch-text" style="width:100%; margin-top:10px; padding: 8px 16px; font-size: 1rem;">اعزام نیرو</button></div></div>`; if (gameScreen) gameScreen.appendChild(panelExplore);
    const panelRequests = document.createElement('div'); panelRequests.className = 'floating-panel'; panelRequests.id = 'panelRequests'; panelRequests.innerHTML = `<div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px;"><h3 style="font-size:1rem; color:#f4d03f;">درخواست‌ها</h3><button id="closeRequestsPanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button></div><div class="panel-body" id="requestTrackerBody" style="padding:16px; max-height: 400px; overflow-y: auto;"><p class="no-req-msg" style="color: #aaa; text-align: center; font-size: 0.9rem;">در حال حاضر درخواستی وجود ندارد.</p></div>`; if (gameScreen) gameScreen.appendChild(panelRequests); const closeRequestsPanel = document.getElementById('closeRequestsPanel'); if (closeRequestsPanel) closeRequestsPanel.onclick = () => panelRequests.classList.remove('panel-open');
    
    const panelBuild = document.getElementById('panelBuild'); 
    if (panelBuild) panelBuild.innerHTML = `<div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px;"><h3 id="txtBuildTitle" style="font-size:1rem; color:#f4d03f;">ساخت و ساز</h3><button id="closeBuildPanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button></div><div class="panel-body" style="padding:16px;">
        <div class="build-item-new" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:15px; border:1px solid rgba(255,255,255,0.1); margin-bottom: 15px;"><div class="build-info-text" style="display:flex; flex-direction:column; gap:5px;"><div id="txtBuildHouse" class="build-name" style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">ساخت خانه</div><div style="font-size:0.8rem; color:#aaa;">هزینه: ۱۰ چوب</div><div class="build-buttons" style="display:flex; gap:8px; margin-top:5px;"><button id="txtBuildBtn" class="build-btn" style="padding:8px 16px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">ساخت</button></div></div><div style="width:80px; height:80px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#111; border:1px solid #333; flex-shrink:0; overflow:hidden;"><img src="house1.png" style="width:100%; height:100%; object-fit:contain; object-position:center; transform: translateY(${MENU_HOUSE_OFFSET_Y}px);"></div></div>
        <div class="build-item-new" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:15px; border:1px solid rgba(255,255,255,0.1); margin-bottom: 15px;"><div class="build-info-text" style="display:flex; flex-direction:column; gap:5px;"><div class="build-name" style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">ساخت نیروگاه</div><div style="font-size:0.8rem; color:#aaa;">هزینه: ۱۰ سنگ</div><div class="build-buttons" style="display:flex; gap:8px; margin-top:5px;"><button id="selectPowerPlant" class="build-btn" style="padding:8px 16px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">ساخت</button></div></div><div style="width:80px; height:80px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#111; border:1px solid #333; flex-shrink:0; overflow:hidden;"><img src="powerplant1.png" style="width:100%; height:100%; object-fit:contain; object-position:center; transform: translateY(${MENU_POWERPLANT_OFFSET_Y}px);"></div></div>
        <div class="build-item-new" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:15px; border:1px solid rgba(255,255,255,0.1); margin-bottom: 15px;"><div class="build-info-text" style="display:flex; flex-direction:column; gap:5px;"><div class="build-name" style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">ساخت پادگان</div><div style="font-size:0.8rem; color:#aaa;">هزینه: ۱۵ چوب و ۱۰ سنگ</div><div class="build-buttons" style="display:flex; gap:8px; margin-top:5px;"><button id="selectBarracks" class="build-btn" style="padding:8px 16px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">ساخت</button></div></div><div style="width:80px; height:80px; display:flex; align-items:center; justify-content:center; border-radius:8px; background:#111; border:1px solid #333; flex-shrink:0; overflow:hidden;"><img src="barracks.png" style="width:100%; height:100%; object-fit:contain; object-position:center; transform: translateY(${MENU_BARRACKS_OFFSET_Y}px);"></div></div>
    </div>`;
    
    const panelMovePop = document.createElement('div'); panelMovePop.className = 'floating-panel'; panelMovePop.id = 'panelMovePop'; panelMovePop.innerHTML = `<div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px;"><h3 id="txtMovePopTitle" style="font-size:1rem; color:#f4d03f;">انتقال جمعیت</h3><button id="closeMovePopPanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button></div><div class="panel-body" style="padding:16px; text-align:center;"><p id="txtMovePrompt" style="color:#f5e6c8; margin-bottom:10px;">چند نفر منتقل شوند؟</p><div id="movePopBtns" style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin:15px 0;"></div><button id="txtMovePopBtn" class="build-btn" style="width:100%; margin-top:10px;">انتقال</button></div>`; if (gameScreen) gameScreen.appendChild(panelMovePop);
    const resultModal = document.createElement('div'); resultModal.id = 'expeditionResultModal'; resultModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: rgba(10,14,26,0.98); padding: 20px; border-radius: 12px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: right; box-shadow: 0 0 30px rgba(0,0,0,0.8);"; resultModal.innerHTML = `<h3 id="txtResultTitle" style="color: #f4d03f; text-align: center; margin-bottom: 15px;">گزارش اکتشاف</h3><div id="resultText" style="color: #e8dcc8; font-size: 1rem; line-height: 1.8;"></div><button id="txtCloseResult" style="margin-top: 15px; width: 100%; padding: 10px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 6px; color: #1a1a2e; font-weight: 700; cursor: pointer;">دریافت</button>`; if (gameScreen) gameScreen.appendChild(resultModal); const txtCloseResult = document.getElementById('txtCloseResult'); if (txtCloseResult) txtCloseResult.onclick = () => resultModal.style.display = 'none';
    const migrantModal = document.createElement('div'); migrantModal.id = 'migrantModal'; migrantModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 350px; max-width: 90%; background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; z-index: 1000; display: none; flex-direction: column; align-items: center; gap: 20px; box-shadow: 0 0 40px rgba(0,0,0,0.9); text-align: center;"; migrantModal.innerHTML = `<h3 style="color: #f4d03f; font-size: 1.2rem; margin: 0;">درخواست پناهندگی</h3><p id="migrantText" style="color: #e8dcc8; margin: 0; font-size: 0.95rem; line-height: 1.8;"></p><div style="display: flex; flex-direction: column; gap: 10px; width: 100%;"><button id="migrantAccept" style="padding: 12px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 8px; color: #1a1a2e; font-weight: 700; cursor: pointer; font-size: 1rem;">پذیرش و میزبانی</button><button id="migrantWait" style="padding: 10px; background: transparent; border: 1px solid #8a7a6a; border-radius: 8px; color: #f5e6c8; cursor: pointer; font-size: 0.9rem;">فعلاً در انتظار بمانند</button><button id="migrantReject" style="padding: 10px; background: transparent; border: 1px solid #e74c3c; border-radius: 8px; color: #e74c3c; cursor: pointer; font-size: 0.9rem;">رد کردن و رها کردن</button></div>`; if (gameScreen) gameScreen.appendChild(migrantModal);
    const menuHTML = `<div id="pauseModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 2000; display: none; justify-content: center; align-items: center;"><div style="background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; text-align: center; width: 300px;"><h2 id="txtPauseTitle" style="color: #f4d03f; margin-bottom: 20px;">منوی توقف</h2><button id="txtResume" style="display:block; width:100%; margin-bottom:10px; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">ادامه بازی</button><button id="txtSettings1" style="display:block; width:100%; margin-bottom:10px; padding:10px; background:transparent; border:1px solid #8a7a6a; border-radius:6px; color:#f5e6c8; cursor:pointer;">تنظیمات</button><button id="txtExit" style="display:block; width:100%; padding:10px; background:transparent; border:1px solid #e74c3c; border-radius:6px; color:#e74c3c; cursor:pointer;">خروج</button></div></div><div id="settingsModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2001; display: none; justify-content: center; align-items: center;"><div style="background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; width: 400px;"><h2 id="txtSettingsTitle" style="color: #f4d03f; margin-bottom: 20px; text-align: center;">تنظیمات</h2><div style="display: flex; justify-content: space-around; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;"><button id="tabVideo" style="background:none; border:none; color:#aaa; font-weight:bold; cursor:pointer; font-size: 1rem;">ویدیو</button><button id="tabAudio" style="background:none; border:none; color:#f4d03f; font-weight:bold; cursor:pointer; font-size: 1rem;">صدا</button><button id="tabControls" style="background:none; border:none; color:#aaa; font-weight:bold; cursor:pointer; font-size: 1rem;">کنترل ها</button></div><div id="contentVideo" style="display:none; text-align:center;"><p id="txtLangSel" style="color:#f5e6c8; margin-bottom:10px;">انتخاب زبان:</p><select id="langSelect" style="width:100%; padding:10px; background:#111; color:#fff; border:1px solid #333; border-radius:6px;"><option value="fa">فارسی</option><option value="en">English</option></select></div><div id="contentAudio" style="display:block; text-align:center;"><p id="txtMusicVol" style="color:#f5e6c8; margin-bottom:10px;">صدای موسیقی:</p><input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="0.4" style="width:100%; cursor:pointer;"><button id="btnMute" style="margin-top:10px; padding:5px 15px; background:transparent; border:1px solid #e74c3c; color:#e74c3c; border-radius:4px; cursor:pointer;">قطع صدا</button></div><div id="contentControls" style="display:none; text-align:center;"><p id="txtRebind" style="color:#f5e6c8; margin-bottom:10px;">برای تغییر دکمه، روی آن کلیک کنید و دکمه جدید را فشار دهید.</p><div style="display:flex; flex-direction:column; gap:10px; align-items:center;"><div style="color:#fff; display:flex; align-items:center; gap:10px;"><span id="txtBindUp">حرکت به بالا</span><button id="bindUp" style="padding:5px 15px; background:#111; color:#fff; border:1px solid #f4d03f; border-radius:4px; cursor:pointer;">W</button></div><div style="color:#fff; display:flex; align-items:center; gap:10px;"><span id="txtBindDown">حرکت به پایان</span><button id="bindDown" style="padding:5px 15px; background:#111; color:#fff; border:1px solid #f4d03f; border-radius:4px; cursor:pointer;">S</button></div><div style="color:#fff; display:flex; align-items:center; gap:10px;"><span id="txtBindLeft">حرکت به چپ</span><button id="bindLeft" style="padding:5px 15px; background:#111; color:#fff; border:1px solid #f4d03f; border-radius:4px; cursor:pointer;">A</button></div><div style="color:#fff; display:flex; align-items:center; gap:10px;"><span id="txtBindRight">حرکت به راست</span><button id="bindRight" style="padding:5px 15px; background:#111; color:#fff; border:1px solid #f4d03f; border-radius:4px; cursor:pointer;">D</button></div></div></div><button id="txtBack" style="display:block; width:100%; margin-top:20px; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">بازگشت</button></div></div>`;
    if (gameScreen) gameScreen.insertAdjacentHTML('beforeend', menuHTML);
    const txtResume = document.getElementById('txtResume'); if (txtResume) txtResume.onclick = togglePauseMenu;
    const txtExit = document.getElementById('txtExit'); if (txtExit) txtExit.onclick = () => { saveGame(false, true); };
    const txtSettings1 = document.getElementById('txtSettings1'); if (txtSettings1) txtSettings1.onclick = () => { const pm = document.getElementById('pauseModal'); if(pm) pm.style.display = 'none'; const sm = document.getElementById('settingsModal'); if(sm) sm.style.display = 'flex'; };
    const txtBack = document.getElementById('txtBack'); if (txtBack) txtBack.onclick = () => { const sm = document.getElementById('settingsModal'); if(sm) sm.style.display = 'none'; const pm = document.getElementById('pauseModal'); if(pm) pm.style.display = 'flex'; };
    function switchTab(tab) { const v = document.getElementById('contentVideo'); if(v) v.style.display = tab === 'video' ? 'block' : 'none'; const a = document.getElementById('contentAudio'); if(a) a.style.display = tab === 'audio' ? 'block' : 'none'; const c = document.getElementById('contentControls'); if(c) c.style.display = tab === 'controls' ? 'block' : 'none'; const tv = document.getElementById('tabVideo'); if(tv) tv.style.color = tab === 'video' ? '#f4d03f' : '#aaa'; const ta = document.getElementById('tabAudio'); if(ta) ta.style.color = tab === 'audio' ? '#f4d03f' : '#aaa'; const tc = document.getElementById('tabControls'); if(tc) tc.style.color = tab === 'controls' ? '#f4d03f' : '#aaa'; }
    const tabVideo = document.getElementById('tabVideo'); if (tabVideo) tabVideo.onclick = () => switchTab('video');
    const tabAudio = document.getElementById('tabAudio'); if (tabAudio) tabAudio.onclick = () => switchTab('audio');
    const tabControls = document.getElementById('tabControls'); if (tabControls) tabControls.onclick = () => switchTab('controls');
    const volumeSlider = document.getElementById('volumeSlider'); if (volumeSlider) { volumeSlider.value = bgMusic.volume; volumeSlider.oninput = () => { bgMusic.volume = parseFloat(volumeSlider.value); const bm = document.getElementById('btnMute'); if(bm) bm.innerText = bgMusic.volume === 0 ? LANG[gameState.currentLang].unmute : LANG[gameState.currentLang].mute; }; }
    const btnMute = document.getElementById('btnMute'); if (btnMute) btnMute.onclick = () => { if (bgMusic.volume > 0) { bgMusic.volume = 0; if (volumeSlider) volumeSlider.value = 0; btnMute.innerText = LANG[gameState.currentLang].unmute; } else { bgMusic.volume = 0.4; if (volumeSlider) volumeSlider.value = 0.4; btnMute.innerText = LANG[gameState.currentLang].mute; } };
    const langSelect = document.getElementById('langSelect'); if (langSelect) langSelect.onchange = (e) => { applyLang(e.target.value); showNotification(LANG[gameState.currentLang].langChanged, "info"); };
    updateBindTexts(); const bindUp = document.getElementById('bindUp'); if (bindUp) bindUp.onclick = () => { gameState.rebindingKey = 'up'; bindUp.innerText = '...'; }; const bindDown = document.getElementById('bindDown'); if (bindDown) bindDown.onclick = () => { gameState.rebindingKey = 'down'; bindDown.innerText = '...'; }; const bindLeft = document.getElementById('bindLeft'); if (bindLeft) bindLeft.onclick = () => { gameState.rebindingKey = 'left'; bindLeft.innerText = '...'; }; const bindRight = document.getElementById('bindRight'); if (bindRight) bindRight.onclick = () => { gameState.rebindingKey = 'right'; bindRight.innerText = '...'; };
    
    const closeCouncilModalFn = () => { const cm = document.getElementById('councilModal'); if (cm) { cm.style.display = 'none'; cm.style.opacity = 0; cm.style.transform = 'translate(-50%, -50%) scale(0.9)'; } };
    const closeBarracksModalFn = () => { const bm = document.getElementById('barracksModal'); if (bm) { bm.style.display = 'none'; bm.style.opacity = 0; bm.style.transform = 'translate(-50%, -50%) scale(0.9)'; } };
    const btnBuild = document.getElementById('btnBuild');
    if (btnBuild) btnBuild.onclick = () => { 
        if (isBarracksModalOpen()) { showNotification("ابتدا کار با پادگان را تمام کنید!", "warning"); return; }
        closeCouncilModalFn(); closeBarracksModalFn();
        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 2 && gameState.tutorialStep !== 10) { showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return; } 
        if (panelBuild.classList.contains('panel-open') && (gameState.tutorialStep === 0 || gameState.tutorialStep === -1)) {
            panelBuild.classList.remove('panel-open'); return;
        }
        closeAllPanels('panelBuild'); if (panelBuild) panelBuild.classList.add('panel-open'); 
        if (gameState.tutorialStep === 2) { gameState.tutorialStep = 3; updateTutorialBox(); } else if (gameState.tutorialStep === 10) { gameState.tutorialStep = 11; updateTutorialBox(); } 
    };
    const closeBuildPanel = document.getElementById('closeBuildPanel'); if (closeBuildPanel) closeBuildPanel.onclick = () => { if (panelBuild) panelBuild.classList.remove('panel-open'); };
    const txtBuildBtn = document.getElementById('txtBuildBtn');
    if (txtBuildBtn) txtBuildBtn.onclick = () => { if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 3) { showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return; } gameState.isPlacing = true; gameState.placingType = 'house'; gameState.placingSelectedHex = null; if (panelBuild) panelBuild.classList.remove('panel-open'); updateActionTracker(); if (gameState.tutorialStep === 3) { gameState.tutorialStep = 4; updateTutorialBox(); } };
    const selectPowerPlant = document.getElementById('selectPowerPlant');
    if (selectPowerPlant) selectPowerPlant.onclick = () => { if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 11) { showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return; } gameState.isPlacing = true; gameState.placingType = 'powerplant'; gameState.placingSelectedHex = null; if (panelBuild) panelBuild.classList.remove('panel-open'); updateActionTracker(); if (gameState.tutorialStep === 11) { gameState.tutorialStep = 12; updateTutorialBox(); } };
    const selectBarracks = document.getElementById('selectBarracks');
    if (selectBarracks) selectBarracks.onclick = () => { gameState.isPlacing = true; gameState.placingType = 'barracks'; gameState.placingSelectedHex = null; if (panelBuild) panelBuild.classList.remove('panel-open'); updateActionTracker(); };
    
    if (exploreBtn) exploreBtn.onclick = () => { 
        if (isBarracksModalOpen()) { showNotification("ابتدا کار با پادگان را تمام کنید!", "warning"); return; }
        closeCouncilModalFn(); closeBarracksModalFn();
        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 5) { showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return; } 
        if (panelExplore.classList.contains('panel-open') && (gameState.tutorialStep === 0 || gameState.tutorialStep === -1)) {
            panelExplore.classList.remove('panel-open'); return;
        }
        closeAllPanels('panelExplore'); if (panelExplore) panelExplore.classList.add('panel-open'); 
        if (gameState.tutorialStep === 5) { gameState.tutorialStep = 6; updateTutorialBox(); } 
    };
    const closeExplorePanel = document.getElementById('closeExplorePanel'); if (closeExplorePanel) closeExplorePanel.onclick = () => { if (panelExplore) panelExplore.classList.remove('panel-open'); };
    
    if (requestsBtn) requestsBtn.onclick = () => { 
        if (isBarracksModalOpen()) { showNotification("ابتدا کار با پادگان را تمام کنید!", "warning"); return; }
        closeCouncilModalFn(); closeBarracksModalFn();
        if (gameState.tutorialStep > 0 && gameState.tutorialStep < 17) { showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return; } 
        if (panelRequests.classList.contains('panel-open')) {
            panelRequests.classList.remove('panel-open'); return;
        }
        closeAllPanels('panelRequests'); if (panelRequests) panelRequests.classList.add('panel-open'); 
    };
    const openDispatchModal = (regionName) => { 
        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 6) { showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return; } 
        if (gameState.tutorialStep === 6 && regionName !== 'تخت جمشید') { showNotification("در آموزش فقط تخت جمشید رو انتخاب کن!", "warning"); return; } 
        if (gameState.population <= 1) { showNotification("شهروند کافی برای اعزام ندارید! (حداقل ۲ نفر در کل بازی لازم است)", "warning"); if (panelExplore) panelExplore.classList.remove('panel-open'); return; } 
        const maxTroops = Math.max(1, gameState.population - 1); 
        if (gameState.tutorialStep === 6) { gameState.tutorialStep = 7; updateTutorialBox(); } 
        gameState.selectedRegion = regionName; const mrn = document.getElementById('modalRegionName'); if(mrn) mrn.innerText = regionName; 
        const btnsDiv = document.getElementById('dispatchTroopsBtns'); if(btnsDiv) btnsDiv.innerHTML = '';
        const isMobileView = window.innerWidth <= 768;
        const btnSize = isMobileView ? 50 : 40;
        const btnFontSize = isMobileView ? '1.2rem' : '1rem';
        const btnMargin = isMobileView ? 5 : 4;
        for(let i=1; i<=maxTroops; i++) { 
            let b = document.createElement('button'); b.innerText = i; b.style.cssText = `width: ${btnSize}px; height: ${btnSize}px; background: #2c3e50; color: #fff; border: 2px solid #f4d03f; border-radius: 8px; cursor: pointer; font-size: ${btnFontSize}; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: 0.2s; margin: ${btnMargin}px;`; b.onmouseover = () => b.style.background = '#34495e'; b.onmouseout = () => b.style.background = '#2c3e50'; b.onclick = () => { if (gameState.tutorialStep === 7 && i !== 1) { showNotification("در آموزش باید ۱ نفر را اعزام کنی!", "warning"); return; } if (gameState.tutorialStep === 7) gameState.tutorialStep = 7.5; startExpedition(gameState.selectedRegion, i); dispatchTroopsModal.style.display = 'none'; dispatchTroopsModal.style.opacity = 0; if (panelExplore) panelExplore.classList.remove('panel-open'); }; if(btnsDiv) btnsDiv.appendChild(b); } dispatchTroopsModal.style.display = 'block'; setTimeout(() => { dispatchTroopsModal.style.opacity = 1; dispatchTroopsModal.style.transform = 'translate(-50%, -50%) scale(1)'; }, 10); 
    };
    const dispatchLut = document.getElementById('dispatchLut'); if (dispatchLut) dispatchLut.onclick = () => openDispatchModal('کویر لوت');
    const dispatchLaton = document.getElementById('dispatchLaton'); if (dispatchLaton) dispatchLaton.onclick = () => openDispatchModal('آبشار لاتون');
    const dispatchPersepolis = document.getElementById('dispatchPersepolis'); if (dispatchPersepolis) dispatchPersepolis.onclick = () => openDispatchModal('تخت جمشید');
    const closeMovePopPanel = document.getElementById('closeMovePopPanel'); if (closeMovePopPanel) closeMovePopPanel.onclick = () => { if (panelMovePop) panelMovePop.classList.remove('panel-open'); if (gameState.tutorialStep === 15) { gameState.tutorialStep = 14; updateTutorialBox(); } };
    const txtMovePopBtn = document.getElementById('txtMovePopBtn'); if (txtMovePopBtn) txtMovePopBtn.onclick = () => { if (gameState.moveAmount > 0) { gameState.isMovingPop = true; if (panelMovePop) panelMovePop.classList.remove('panel-open'); updateActionTracker(); showNotification("حالا روی خونه مقصد کلیک کن", "info"); if (gameState.tutorialStep === 15) { gameState.tutorialStep = 16; updateTutorialBox(); } } };
    const tutorialHTML = `<div id="tutorialBox" style="position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%); width: 400px; max-width: 95%; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(201, 168, 76, 0.2); border-radius: 16px; z-index: 400; display: none; flex-direction: row; gap: 15px; padding: 15px; align-items: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);"><div style="flex: 1; text-align: right;"><h3 style="color: #f4d03f; margin-bottom: 10px; font-size: 0.9rem;">آموزش بازی</h3><p id="tutorialText" style="color: #e8dcc8; font-size: 0.8rem; line-height: 1.6;"></p><button id="tutorialBtn" style="margin-top: 10px; padding: 6px 15px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 6px; color: #1a1a2e; font-weight: 700; cursor: pointer; display: none; font-size: 0.8rem;">متوجه شدم</button></div><img src="guide.png" style="width: 70px; height: 70px; object-fit: contain; border-radius: 10px; background: #111; border: 1px solid #333; flex-shrink: 0;"></div>`;
    if (gameScreen) gameScreen.insertAdjacentHTML('beforeend', tutorialHTML);
}
window.onload = initGame;
