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

// === سیستم ذخیره و بارگذاری چندگانه ===
function getAllSaves() {
    try {
        return JSON.parse(localStorage.getItem('lastWarmthSaves')) || {};
    } catch (e) {
        return {};
    }
}

function hasSavedGame() {
    return Object.keys(getAllSaves()).length > 0;
}

function saveGame(silent = false, exitAfter = false) {
    if (gameState.gameOver) return false;
    
    if (!gameState.currentSaveName) {
        showSaveNameModal(exitAfter); 
        return false; 
    }

    try {
        let saves = getAllSaves();
        saves[gameState.currentSaveName] = {
            day: gameState.day,
            population: gameState.population,
            fuel: gameState.fuel,
            food: gameState.food,
            wood: gameState.wood,
            stone: gameState.stone,
            heat: gameState.heat,
            hope: gameState.hope,
            satisfaction: gameState.satisfaction,
            HOUSE_HEXES: gameState.HOUSE_HEXES,
            POWERPLANT_HEXES: gameState.POWERPLANT_HEXES,
            unlockedHexes: gameState.unlockedHexes,
            tutorialStep: gameState.tutorialStep
        };
        localStorage.setItem('lastWarmthSaves', JSON.stringify(saves));
        
        if (exitAfter) {
            showNotification("بازی ذخیره شد و به منوی اصلی بازگشتید...", "info");
            setTimeout(() => window.location.reload(), 1500);
        } else if (!silent) {
            showNotification("بازی با موفقیت ذخیره شد!", "success");
        }
        return true;
    } catch (e) {
        if (!silent) showNotification("خطا در ذخیره بازی!", "error");
        return false;
    }
}

function showSaveNameModal(exitAfter = false) {
    let modal = document.getElementById('saveNameModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'saveNameModal';
        modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 7000; display: none; justify-content: center; align-items: center; font-family: 'Vazirmatn', sans-serif;";
        modal.innerHTML = `
            <div style="background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; width: 350px; max-width: 90%; display: flex; flex-direction: column; gap: 20px; text-align: center; box-shadow: 0 0 30px rgba(244, 208, 63, 0.2);">
                <h3 style="color: #f4d03f; font-size: 1.2rem; margin: 0;">ذخیره بازی جدید</h3>
                <p style="color: #e8dcc8; font-size: 0.95rem; margin: 0; line-height: 1.6;">برای اینکه بعدا دوباره بیای و بقیه بازیات رو ادامه بدی، نامی زیبا برای ذخیره‌ات انتخاب کن:</p>
                <input type="text" id="saveNameInput" style="width: 100%; padding: 10px; background: #111; color: #fff; border: 1px solid #333; border-radius: 6px; text-align: center; font-family: 'Vazirmatn', sans-serif; font-size: 1rem;" placeholder="مثلا: سفرنامه روز دهم">
                <div style="display: flex; gap: 10px;">
                    <button id="confirmSaveNameBtn" style="flex:1; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer; font-family: 'Vazirmatn', sans-serif;">تایید و ذخیره</button>
                    <button id="cancelSaveNameBtn" style="flex:1; padding:10px; background:transparent; border:1px solid #8a7a6a; border-radius:6px; color:#f5e6c8; cursor:pointer; font-family: 'Vazirmatn', sans-serif;">انصراف</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirmSaveNameBtn').onclick = () => {
            let name = document.getElementById('saveNameInput').value.trim();
            if (name) {
                gameState.currentSaveName = name;
                modal.style.display = 'none';
                let saved = saveGame(true, exitAfter);
                if (saved && !exitAfter) {
                    showNotification("بازی با موفقیت ذخیره شد!", "success");
                }
            } else {
                showNotification("لطفاً یک نام معتبر وارد کنید.", "warning");
            }
        };

        document.getElementById('cancelSaveNameBtn').onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    document.getElementById('saveNameInput').value = "سفرنامه روز " + gameState.day;
    modal.style.display = 'flex';
}

function loadGame(saveName) {
    try {
        let saves = getAllSaves();
        let savedData = saves[saveName];
        if (savedData) {
            gameState.currentSaveName = saveName;
            gameState.day = savedData.day;
            gameState.population = savedData.population;
            gameState.fuel = savedData.fuel;
            gameState.food = savedData.food;
            gameState.wood = savedData.wood;
            gameState.stone = savedData.stone;
            gameState.heat = savedData.heat;
            gameState.hope = savedData.hope;
            gameState.satisfaction = savedData.satisfaction;
            gameState.HOUSE_HEXES = savedData.HOUSE_HEXES;
            gameState.POWERPLANT_HEXES = savedData.POWERPLANT_HEXES;
            gameState.unlockedHexes = savedData.unlockedHexes;
            gameState.tutorialStep = savedData.tutorialStep !== undefined ? savedData.tutorialStep : 0;
            return true;
        }
    } catch (e) {}
    return false;
}

function deleteGame(saveName) {
    let saves = getAllSaves();
    if (saves[saveName]) {
        delete saves[saveName];
        localStorage.setItem('lastWarmthSaves', JSON.stringify(saves));
    }
}

function showGameOver() {
    gameState.gameOver = true;
    
    if (gameState.currentSaveName) {
        deleteGame(gameState.currentSaveName);
        gameState.currentSaveName = null;
    }

    const gs = document.getElementById('game-screen');
    if (gs) gs.style.display = 'none';
    
    let goScreen = document.getElementById('gameOverScreen');
    if (!goScreen) {
        goScreen = document.createElement('div');
        goScreen.id = 'gameOverScreen';
        goScreen.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 5000; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #e74c3c; font-family: 'Vazirmatn', sans-serif; gap: 20px; text-align: center;";
        goScreen.innerHTML = `
            <h1 style="font-size: 4rem; text-shadow: 0 0 30px rgba(231, 76, 60, 0.8); margin: 0;">پایان بازی</h1>
            <p style="color: #f5e6c8; font-size: 1.2rem; max-width: 400px;">شما و تمام شهروندانتان در این سرمای سهم‌گین جان خود را از دست دادید. امید همگانی برای همیشه از بین رفت...</p>
            <button id="btnGoMenu" style="padding: 14px 40px; background: linear-gradient(135deg, #e8451a, #ff6b2b); color: #fff; border: none; border-radius: 4px; font-size: 18px; font-weight: 700; cursor: pointer; box-shadow: 0 0 25px rgba(232,69,26,0.4); margin-top: 20px;">منوی اصلی</button>
        `;
        document.body.appendChild(goScreen);
        
        document.getElementById('btnGoMenu').onclick = () => {
            window.location.reload();
        };
    } else {
        goScreen.style.display = 'flex';
    }
}

function continueGame() {
    if (!hasSavedGame()) return;

    let saves = getAllSaves();
    let saveNames = Object.keys(saves);

    let modal = document.getElementById('loadGameModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loadGameModal';
        modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 6000; display: none; justify-content: center; align-items: center; font-family: 'Vazirmatn', sans-serif;";
        document.body.appendChild(modal);
    }
    
    let html = `
        <div style="background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; width: 400px; max-width: 90%; display: flex; flex-direction: column; gap: 20px; max-height: 80vh; overflow-y: auto;">
            <h3 style="color: #f4d03f; font-size: 1.2rem; margin: 0; text-align: center;">انتخاب بازی برای ادامه</h3>
            <div id="saveListContainer" style="display: flex; flex-direction: column; gap: 10px;">
    `;

    if (saveNames.length === 0) {
        html += `<p style="color: #aaa; text-align: center;">در حال حاضر بازی ذخیره شده‌ای وجود ندارد.</p>`;
    } else {
        saveNames.forEach(name => {
            let s = saves[name];
            html += `
                <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #f5e6c8; font-weight: 700;">${name}</div>
                        <div style="color: #aaa; font-size: 0.8rem;">روز ${s.day} - جمعیت ${s.population}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="load-save-btn" data-name="${name}" style="padding: 8px 16px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 6px; cursor: pointer; font-weight: bold; color:#1a1a2e; font-family: 'Vazirmatn', sans-serif;">شروع</button>
                        <button class="delete-save-btn" data-name="${name}" style="padding: 8px 16px; background: transparent; border: 1px solid #e74c3c; border-radius: 6px; cursor: pointer; color: #e74c3c; font-family: 'Vazirmatn', sans-serif;">حذف</button>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
            <button id="closeLoadModal" style="padding: 10px; background: transparent; border: 1px solid #8a7a6a; border-radius: 6px; color: #f5e6c8; cursor: pointer; font-family: 'Vazirmatn', sans-serif;">بستن</button>
        </div>
    `;
    
    modal.innerHTML = html;
    modal.style.display = 'flex';

    document.getElementById('closeLoadModal').onclick = () => {
        modal.style.display = 'none';
    };

    document.querySelectorAll('.load-save-btn').forEach(btn => {
        btn.onclick = () => {
            let name = btn.getAttribute('data-name');
            if (loadGame(name)) {
                modal.style.display = 'none';
                showStoryScreen();
                startActualGame();
            }
        };
    });

    document.querySelectorAll('.delete-save-btn').forEach(btn => {
        btn.onclick = () => {
            let name = btn.getAttribute('data-name');
            if (confirm("آیا از حذف این بازی مطمئن هستید؟")) {
                deleteGame(name);
                if (!hasSavedGame()) {
                    modal.style.display = 'none'; 
                } else {
                    continueGame(); 
                }
            }
        };
    });
}
// =================================

window.startTutorial = function(val) {
    gameState.tutorialStep = val ? 1 : 0;
    const box = document.getElementById('tutorialBox');
    if (!val && box) box.style.display = 'none';
    if (val) updateTutorialBox();
}

function acceptWaitingMigrants(id) {
    let req = gameState.migrantRequests.find(r => r.id === id);
    if (req) {
        startPlacingMigrants(req.count);
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

function createEmbers() {
    const c = document.getElementById('heroCanvas'); if (!c) return;
    const ctx = c.getContext('2d');
    let W = c.width = window.innerWidth, H = c.height = window.innerHeight;
    window.addEventListener('resize', () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; });
    class Ember {
        constructor() { this.reset(); }
        reset() { this.x = Math.random() * W; this.y = H + Math.random() * 50; this.size = Math.random() * 2.5 + 0.5; this.speedY = -(Math.random() * 1.2 + 0.3); this.speedX = (Math.random() - 0.5) * 0.6; this.life = Math.random() * 180 + 60; this.maxLife = this.life; this.hue = Math.random() * 40 + 10; }
        update() { this.y += this.speedY; this.x += this.speedX; this.life--; this.size *= 0.998; if (this.life <= 0 || this.y < -20) this.reset(); }
        draw() { const alpha = Math.max(0, (this.life / this.maxLife) * 0.5); const r = this.hue < 25 ? 232 : 255; const g = this.hue < 25 ? 69 : (this.hue < 35 ? 150 : 213); const b = this.hue < 25 ? 26 : (this.hue < 35 ? 60 : 79); ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.1, this.size), 0, Math.PI * 2); ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`; ctx.fill(); }
    }
    const embers = []; for (let i = 0; i < 60; i++) embers.push(new Ember());
    function animate() { ctx.clearRect(0, 0, W, H); embers.forEach(e => { e.update(); e.draw(); }); requestAnimationFrame(animate); }
    animate();
}
createEmbers();

function initHexGrid() {
    gameState.hexes = []; const mW = 3000, mH = 3000, cx = mW / 2, cy = mH / 2, size = gameState.hexSize;
    for (let q = -30; q <= 30; q++) { for (let r = -30; r <= 30; r++) {
            let x = size * (3/2 * q), y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) * PERSPECTIVE_Y;
            let absX = x + cx, absY = y + cy;
            if (absX > -size && absX < mW + size && absY > -size && absY < mH + size) gameState.hexes.push({ q, r, x: absX, y: absY });
    }}
    gameState.hexes.sort((a, b) => a.y - b.y);
}

function drawHex(ctx, x, y, size, fill, stroke, lineWidth = 1) {
    ctx.beginPath(); ctx.lineJoin = 'round'; 
    for (let i = 0; i < 6; i++) {
        let angle = Math.PI / 3 * i; 
        let px = x + size * Math.cos(angle), py = y + (size * Math.sin(angle)) * PERSPECTIVE_Y; 
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function drawEmbeddedLock(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); const lockColor = '#3a4148'; 
    ctx.fillStyle = lockColor; ctx.fillRect(-7, -1, 14, 11);
    ctx.lineWidth = 2.5; ctx.strokeStyle = lockColor; ctx.beginPath(); ctx.arc(0, -1, 4.5, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#15181c'; ctx.fillRect(-1, 2, 2, 5); ctx.restore();
}

function getHoveredHex(mx, my) {
    const size = gameState.hexSize, cx = 1500, cy = 1500;
    let relX = mx - cx, relY = (my - cy) / PERSPECTIVE_Y;
    let q = (2/3 * relX) / size, r = (-1/3 * relX + Math.sqrt(3)/3 * relY) / size, s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    let q_diff = Math.abs(rq - q), r_diff = Math.abs(rr - r), s_diff = Math.abs(rs - s);
    if (q_diff > r_diff && q_diff > s_diff) rq = -rr - rs; else if (r_diff > s_diff) rr = -rq - rs;
    return { q: rq, r: rr };
}

function hexDistance(a, b) { return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - (b.q + b.r))) / 2; }

function drawMap() {
    if (gameState.gameOver) return;
    const canvas = document.getElementById('gameMap'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('map-container');
    if(!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) { canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);
    
    const mW = 3000, mH = 3000;
    
    if (!gameState.isPaused) {
        let moveSpeed = 15 / camera.zoom;
        if (keys[gameState.keyBindings.up]) camera.y -= moveSpeed; 
        if (keys[gameState.keyBindings.down]) camera.y += moveSpeed;
        if (keys[gameState.keyBindings.left]) camera.x -= moveSpeed; 
        if (keys[gameState.keyBindings.right]) camera.x += moveSpeed;
    }

    let minZoom = Math.max(rect.width / mW, rect.height / mH);
    if (camera.zoom < minZoom) camera.zoom = minZoom;
    if (camera.zoom > 2) camera.zoom = 2;
    let viewW = rect.width / camera.zoom, viewH = rect.height / camera.zoom;
    camera.x = Math.max(0, Math.min(mW - viewW, camera.x));
    camera.y = Math.max(0, Math.min(mH - viewH, camera.y));

    ctx.save();
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    
    ctx.fillStyle = '#dce8f0'; ctx.fillRect(0, 0, mW, mH);
    
    const hexW = gameState.hexSize * 2;

    gameState.constructionSites = gameState.constructionSites.filter(site => {
        let timeLeft = Math.ceil((site.endTime - Date.now()) / 1000);
        if (timeLeft <= 0) {
            if (!site.completed) {
                if (site.type === 'powerplant') {
                    gameState.POWERPLANT_HEXES.push({ q: site.q, r: site.r });
                    showNotification("✅ نیروگاه جدید ساخته شد!", "success");
                } else {
                    gameState.HOUSE_HEXES.push({ q: site.q, r: site.r, pop: 0, daysOvercrowded: 0, lastReceived: 0, receivedToday: false });
                    showNotification("✅ خونه جدید ساخته شد!", "success");
                }
                site.completed = true;
                updateUI(); 
            }
            return false;
        }
        return true;
    });

    gameState.hexes.forEach(hex => {
        let houseData = gameState.HOUSE_HEXES.find(h => h.q === hex.q && h.r === hex.r);
        let ppData = gameState.POWERPLANT_HEXES.find(p => p.q === hex.q && p.r === hex.r);
        let isHouse = !!houseData;
        let isPP = !!ppData;
        let dist = hexDistance(hex, { q: 0, r: 0 });
        let isLocked = dist > 1; 
        let isUnlocked = gameState.unlockedHexes.some(u => u.q === hex.q && u.r === hex.r) || dist <= 1;
        
        if (isLocked && !isUnlocked) {
            drawHex(ctx, hex.x, hex.y, gameState.hexSize, '#15181c', '#2a2e33', 1.5);
            drawEmbeddedLock(ctx, hex.x, hex.y);
        } else {
            drawHex(ctx, hex.x, hex.y, gameState.hexSize, '#ffffff', 'rgba(130, 160, 190, 0.4)', 1.5);
        }
        
        if (isHouse && houseImg.complete && houseImg.naturalHeight !== 0) {
            let imgW = hexW * HOUSE_SCALE, imgH = imgW * (houseImg.naturalHeight / houseImg.naturalWidth);
            let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + HOUSE_OFFSET_Y; 
            ctx.drawImage(houseImg, drawX, drawY, imgW, imgH);

            const popText = `${houseData.pop}`;
            ctx.font = "bold 13px 'Vazirmatn', sans-serif";
            const textWidth = ctx.measureText(popText).width;
            const pillW = textWidth + 30;
            const pillH = 22;
            const pillX = hex.x + 15;
            const pillY = hex.y - 35;

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(pillX, pillY, pillW, pillH, 11);
            } else {
                ctx.rect(pillX, pillY, pillW, pillH);
            }
            ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(244, 208, 63, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            ctx.font = "12px Arial";
            ctx.fillStyle = '#f4d03f';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('👤', pillX + 6, pillY + pillH/2 + 1);
            
            ctx.font = "bold 13px 'Vazirmatn', sans-serif";
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(popText, pillX + pillW/2 + 6, pillY + pillH/2 + 1);
            ctx.restore();
        }

        if (isPP && powerplantImg.complete && powerplantImg.naturalHeight !== 0) {
            let imgW = hexW * POWERPLANT_SCALE, imgH = imgW * (powerplantImg.naturalHeight / powerplantImg.naturalWidth);
            let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + POWERPLANT_OFFSET_Y; 
            ctx.drawImage(powerplantImg, drawX, drawY, imgW, imgH);
        }

        let site = gameState.constructionSites.find(s => s.q === hex.q && s.r === hex.r);
        if (site) {
            let timeLeft = Math.ceil((site.endTime - Date.now()) / 1000);
            let progress = 1 - ((site.endTime - Date.now()) / 30000); 

            ctx.beginPath();
            ctx.arc(hex.x, hex.y, 20, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(hex.x, hex.y, 20, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * progress));
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#f4d03f';
            ctx.stroke();

            ctx.font = "bold 14px 'Vazirmatn', sans-serif";
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(timeLeft + 's', hex.x, hex.y);
        }
    });

    if (gameState.isPlacing) {
        let imgToDraw = gameState.placingType === 'powerplant' ? powerplantImg : houseImg;
        let currentScale = gameState.placingType === 'powerplant' ? POWERPLANT_SCALE : HOUSE_SCALE;
        let currentOffsetY = gameState.placingType === 'powerplant' ? POWERPLANT_OFFSET_Y : HOUSE_OFFSET_Y;
        if (imgToDraw.complete && imgToDraw.naturalHeight !== 0) {
            let targetHex = getHoveredHex(gameState.mouseX, gameState.mouseY);
            let hex = gameState.hexes.find(h => h.q === targetHex.q && h.r === targetHex.r);
            if (hex) {
                let imgW = hexW * currentScale, imgH = imgW * (imgToDraw.naturalHeight / imgToDraw.naturalWidth);
                let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + currentOffsetY; 
                ctx.globalAlpha = 0.6; ctx.drawImage(imgToDraw, drawX, drawY, imgW, imgH); ctx.globalAlpha = 1;
            }
        }
    }

    ctx.restore();
    
    if (!gameState.isPaused) {
        updateExpeditions();
        updateRequests();
    }
}

function setupControls() {
    const canvas = document.getElementById('gameMap'); if(!canvas) return;
    
    window.addEventListener('keydown', e => {
        if (e.code === 'Escape') {
            const gs = document.getElementById('game-screen');
            if (gs && gs.style.display === 'block') {
                const sm = document.getElementById('settingsModal');
                if (sm && sm.style.display === 'flex') {
                    sm.style.display = 'none';
                    document.getElementById('pauseModal').style.display = 'flex';
                } else {
                    togglePauseMenu();
                }
            }
            return;
        }
        
        if (gameState.rebindingKey) {
            e.preventDefault();
            if (e.code !== 'Escape') {
                gameState.keyBindings[gameState.rebindingKey] = e.code;
                updateBindTexts();
                showNotification(LANG[gameState.currentLang].keyBindSuccess, "success");
            }
            gameState.rebindingKey = null;
            return;
        }

        if (gameState.isPaused) return;

        keys[e.code] = true;
        if (Object.values(gameState.keyBindings).includes(e.code)) e.preventDefault();
    });
    
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    canvas.addEventListener('mousedown', e => {
        if (gameState.isPlacing || gameState.isPaused) return;
        camera.dragging = true; camera.dragStartX = e.clientX; camera.dragStartY = e.clientY;
        camera.startCamX = camera.x; camera.startCamY = camera.y; canvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        gameState.mouseX = camera.x + ((e.clientX - rect.left) / camera.zoom);
        gameState.mouseY = camera.y + ((e.clientY - rect.top) / camera.zoom);
        if (camera.dragging) {
            camera.x = camera.startCamX - (e.clientX - camera.dragStartX) / camera.zoom;
            camera.y = camera.startCamY - (e.clientY - camera.dragStartY) / camera.zoom;
        }
    });
    window.addEventListener('mouseup', () => { camera.dragging = false; canvas.style.cursor = 'grab'; });
    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (gameState.isPlacing) { 
            gameState.isPlacing = false;
            showNotification(LANG[gameState.currentLang].buildCancel, "info");
        }
        if (gameState.isMovingPop) {
            gameState.isMovingPop = false;
            showNotification(LANG[gameState.currentLang].moveCancel, "info");
        }
    });
    canvas.addEventListener('wheel', e => { 
        if(gameState.isPaused) return;
        e.preventDefault(); 
        let newZoom = camera.zoom + (e.deltaY > 0 ? -0.1 : 0.1);
        const mW = 3000, mH = 3000, rect = canvas.getBoundingClientRect();
        let minZoom = Math.max(rect.width / mW, rect.height / mH);
        camera.zoom = Math.max(minZoom, Math.min(2, newZoom));
    }, { passive: false });
    
    // جلوگیری از کلیک‌های فانتوم (Ghost Click) در موبایل
    let touchHandled = false;
    canvas.addEventListener('click', () => {
        if (touchHandled) { touchHandled = false; return; }
        if(!gameState.isPaused) handleMapClick();
    });
    
    // --- سیستم لمسی موبایل (یک انگشت جابجایی، دو انگشت زوم) ---
    let pinchInitialDistance = 0;
    let pinchInitialZoom = 1;

    function getDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    canvas.addEventListener('touchstart', e => {
        if (gameState.isPaused) return;
        if (gameState.isPlacing && e.touches.length === 1) {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            gameState.mouseX = camera.x + ((e.touches[0].clientX - rect.left) / camera.zoom);
            gameState.mouseY = camera.y + ((e.touches[0].clientY - rect.top) / camera.zoom);
            handleMapClick(); 
            touchHandled = true;
            return;
        }
        if (e.touches.length === 2) {
            e.preventDefault();
            pinchInitialDistance = getDistance(e.touches);
            pinchInitialZoom = camera.zoom;
            camera.dragging = false; 
        } else if (e.touches.length === 1) {
            camera.dragging = true; camera.dragStartX = e.touches[0].clientX; camera.dragStartY = e.touches[0].clientY;
            camera.startCamX = camera.x; camera.startCamY = camera.y;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if (gameState.isPaused) return;
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = getDistance(e.touches);
            if (pinchInitialDistance > 0) {
                let zoomFactor = currentDistance / pinchInitialDistance;
                let newZoom = pinchInitialZoom * zoomFactor;
                
                const mW = 3000, mH = 3000, rect = canvas.getBoundingClientRect();
                let minZoom = Math.max(rect.width / mW, rect.height / mH);
                camera.zoom = Math.max(minZoom, Math.min(2, newZoom));
            }
        } else if (camera.dragging && e.touches.length === 1) {
            e.preventDefault();
            camera.x = camera.startCamX - (e.touches[0].clientX - camera.dragStartX) / camera.zoom;
            camera.y = camera.startCamY - (e.touches[0].clientY - camera.dragStartY) / camera.zoom;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            pinchInitialDistance = 0;
        }
        if (camera.dragging && e.changedTouches.length === 1 && !gameState.isPlacing && e.touches.length === 0) {
             const rect = canvas.getBoundingClientRect();
             const tx = e.changedTouches[0].clientX - rect.left, ty = e.changedTouches[0].clientY - rect.top;
             const dx = tx - (camera.dragStartX - rect.left), dy = ty - (camera.dragStartY - rect.top);
             if(Math.sqrt(dx*dx + dy*dy) < 5) {
                 gameState.mouseX = camera.x + (tx / camera.zoom);
                 gameState.mouseY = camera.y + (ty / camera.zoom);
                 handleMapClick();
                 touchHandled = true;
             }
        }
        if (e.touches.length === 0) {
            camera.dragging = false;
        }
    });
}

function togglePauseMenu() {
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pauseModal').style.display = gameState.isPaused ? 'flex' : 'none';
    if (!gameState.isPaused) {
        document.getElementById('settingsModal').style.display = 'none';
    }
}

function updateBindTexts() {
    document.getElementById('bindUp').innerText = gameState.keyBindings.up.replace('Key', '');
    document.getElementById('bindDown').innerText = gameState.keyBindings.down.replace('Key', '');
    document.getElementById('bindLeft').innerText = gameState.keyBindings.left.replace('Key', '');
    document.getElementById('bindRight').innerText = gameState.keyBindings.right.replace('Key', '');
}

function calculateCanFit(count) {
    let totalPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0);
    let totalCapacity = gameState.HOUSE_HEXES.length * 3;
    return (totalCapacity - totalPop) >= count;
}

function startPlacingMigrants(count) {
    gameState.isPlacingMigrants = true;
    gameState.migrantsToPlace = count;
    gameState.migrantTargetHouses = []; 
    showNotification(`${count} مهاجر وارد شد. روی خونه‌ها کلیک کن تا مستقر شوند.`, "info");
}

function handleMapClick() {
    const target = getHoveredHex(gameState.mouseX, gameState.mouseY);
    let dist = hexDistance(target, { q: 0, r: 0 });
    let isLocked = dist > 1; 
    let isUnlocked = gameState.unlockedHexes.some(u => u.q === target.q && u.r === target.r) || dist <= 1;
    let isHouse = gameState.HOUSE_HEXES.some(h => h.q === target.q && h.r === target.r);
    let isPP = gameState.POWERPLANT_HEXES.some(p => p.q === target.q && p.r === target.r);
    let isOccupied = gameState.constructionSites.some(c => c.q === target.q && c.r === target.r);

    if (gameState.isPlacingMigrants) {
        let destHouse = gameState.HOUSE_HEXES.find(h => h.q === target.q && h.r === target.r);
        if (destHouse && destHouse.pop < 5) {
            destHouse.pop++;
            if (!gameState.migrantTargetHouses.includes(destHouse)) {
                gameState.migrantTargetHouses.push(destHouse);
            }
            gameState.migrantsToPlace--;
            updateUI();
            if (gameState.migrantsToPlace === 0) {
                gameState.isPlacingMigrants = false;
                
                let causedOverpopulation = false;
                for (let h of gameState.migrantTargetHouses) {
                    if (h.pop > 3) {
                        causedOverpopulation = true;
                        break;
                    }
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
            showNotification("ظرفیت این خانه پر است!", "warning");
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
                return;
            }

            if (sourceHouse.pop < destHouse.pop) {
                showNotification("جابه‌جایی نامناسب! یک درصد رضایت کم شد.", "warning");
                gameState.satisfaction = Math.max(0, gameState.satisfaction - 1);
                updateUI();
            }

            if (sourceHouse.receivedToday) {
                showAngryMoveModal(); 
                sourceHouse.receivedToday = false; 
                gameState.isMovingPop = false;
                return;
            }

            sourceHouse.pop -= gameState.moveAmount;
            destHouse.pop += gameState.moveAmount;
            destHouse.receivedToday = true; 
            
            updateUI();
            gameState.isMovingPop = false;
            
            if (gameState.tutorialStep === 16) {
                gameState.tutorialStep = 17;
                updateTutorialBox();
            }
        } else {
            showNotification(LANG[gameState.currentLang].selectOther, "warning");
        }
        return;
    }

    if (isHouse && !gameState.isPlacing) {
        let house = gameState.HOUSE_HEXES.find(h => h.q === target.q && h.r === target.r);
        let isMainHouse = (house.q === 0 && house.r === 0);
        let maxTransferable = isMainHouse ? house.pop - 1 : house.pop;
        
        if (maxTransferable > 0) {
            if (gameState.tutorialStep === 14 || gameState.tutorialStep === 0) {
                gameState.moveSource = target;
                openMovePopPanel(maxTransferable);
                if (gameState.tutorialStep === 14) {
                    gameState.tutorialStep = 15;
                    updateTutorialBox();
                }
            } else if (gameState.tutorialStep > 0) {
                showNotification("لطفاً طبق آموزش پیش برو!", "warning");
            }
        } else {
            showNotification("آدمی برای انتقال در این خانه نیست!", "info");
        }
        return;
    }

    if (isLocked && !isUnlocked && !isHouse && !isPP && !isOccupied) {
        const neighbors = [
            { q: target.q + 1, r: target.r }, { q: target.q - 1, r: target.r },
            { q: target.q, r: target.r + 1 }, { q: target.q, r: target.r - 1 },
            { q: target.q + 1, r: target.r - 1 }, { q: target.q - 1, r: target.r + 1 }
        ];
        
        let isAdjacent = false;
        for (let n of neighbors) {
            let nDist = hexDistance(n, { q: 0, r: 0 });
            let nIsHouse = gameState.HOUSE_HEXES.some(h => h.q === n.q && h.r === n.r);
            let nIsUnlocked = gameState.unlockedHexes.some(u => u.q === n.q && u.r === n.r) || nDist <= 1;
            if (nIsHouse || nIsUnlocked) { isAdjacent = true; break; }
        }

        if (!isAdjacent) {
            showNotification(LANG[gameState.currentLang].noAdjacent, "warning");
            return;
        }

        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 1 && gameState.tutorialStep !== 9) {
            showNotification("فعلاً طبق آموزش پیش برو!", "info");
            return;
        }

        if (gameState.tutorialStep === 9) {
            let isAdjacentToHouse = false;
            for (let h of gameState.HOUSE_HEXES) {
                if (hexDistance(target, h) === 1) { isAdjacentToHouse = true; break; }
            }
            if (isAdjacentToHouse) {
                showNotification("برای نیروگاه، جایی رو انتخاب کن که کنارش خونه نباشه!", "warning");
                return;
            }
        }

        gameState.pendingUnlockTarget = target;
        document.getElementById('unlockModal').style.display = 'block';
        return;
    }

    if (gameState.isPlacing) {
        if (isHouse || isPP || isOccupied) { 
            showNotification(LANG[gameState.currentLang].occupied, "warning"); return; 
        }

        if (!isUnlocked) { showNotification(LANG[gameState.currentLang].lockedArea, "warning"); return; }

        let tooClose = false;
        for (let h of gameState.HOUSE_HEXES) { if (hexDistance(target, h) <= 1) { tooClose = true; break; } }
        if (tooClose && gameState.placingType === 'house') { showNotification(LANG[gameState.currentLang].tooClose, "warning"); return; }

        if (gameState.placingType === 'house') {
            if (gameState.tutorialStep === 4 || gameState.tutorialStep === 0) {
                if (gameState.wood >= 10) {
                    gameState.wood -= 10;
                    updateUI();
                    gameState.isPlacing = false;
                    gameState.constructionSites.push({ q: target.q, r: target.r, endTime: Date.now() + 30000, completed: false, type: 'house' });
                    if (gameState.tutorialStep === 4) {
                        gameState.tutorialStep = 5; 
                        updateTutorialBox();
                    }
                    showNotification(LANG[gameState.currentLang].buildStart, "success");
                } else {
                    showNotification(LANG[gameState.currentLang].noWood, "warning");
                }
            } else if (gameState.tutorialStep > 0) {
                showNotification("فعلاً طبق آموزش پیش برو!", "warning");
            }
        } else if (gameState.placingType === 'powerplant') {
            if (gameState.tutorialStep === 12 || gameState.tutorialStep === 0) { 
                if (gameState.stone >= 10) {
                    gameState.stone -= 10;
                    updateUI();
                    gameState.isPlacing = false;
                    gameState.constructionSites.push({ q: target.q, r: target.r, endTime: Date.now() + 30000, completed: false, type: 'powerplant' });
                    if (gameState.tutorialStep === 12) {
                        gameState.tutorialStep = 13; 
                        updateTutorialBox();
                    }
                    showNotification("نیروگاه در حال ساخت است و ۱۰ سنگ کم شد!", "success");
                } else {
                    showNotification("سنگ کافی نداری!", "warning");
                }
            } else if (gameState.tutorialStep > 0) {
                showNotification("فعلاً طبق آموزش پیش برو!", "warning");
            }
        }
        return;
    }

    if (gameState.tutorialStep > 0) {
        if (gameState.tutorialStep === 1 || gameState.tutorialStep === 9) showNotification("روی یکی از خانه‌های قفل‌شده کلیک کن!", "warning");
        else if (gameState.tutorialStep === 2 || gameState.tutorialStep === 10) showNotification("حالا روی دکمه «ساخت و ساز» کلیک کن!", "warning");
        else if (gameState.tutorialStep === 3 || gameState.tutorialStep === 11) showNotification("روی دکمه «ساخت» کلیک کن!", "warning");
        else if (gameState.tutorialStep === 4 || gameState.tutorialStep === 12) showNotification("روی زمینی که قفلش رو باز کردی کلیک کن!", "warning");
        else if (gameState.tutorialStep === 6) showNotification("روی منطقه «تخت جمشید» کلیک کن و اعزام رو بزن!", "warning");
        else if (gameState.tutorialStep === 14) showNotification("روی خونه اصلی کلیک کن!", "warning");
        else if (gameState.tutorialStep === 16) showNotification("روی خونه جدیدت کلیک کن!", "warning");
        else showNotification("فعلاً طبق آموزش پیش برو!", "warning");
        return;
    }
}

const LANG = {
    fa: {
        resume: "ادامه بازی", settings: "تنظیمات", exit: "خروج", pauseTitle: "منوی توقف", settingsTitle: "تنظیمات",
        video: "ویدیو", audio: "صدا", controls: "کنترل ها", selectLang: "انتخاب زبان:", musicVol: "صدای موسیقی:",
        mute: "قطع صدا", unmute: "پخش صدا", rebindTxt: "برای تغییر دکمه، روی آن کلیک کنید و دکمه جدید را فشار دهید.",
        up: "حرکت به بالا", down: "حرکت به پایین", left: "حرکت به چپ", right: "حرکت به راست", back: "بازگشت",
        explore: "اکتشاف", build: "ساخت و ساز", movePop: "انتقال جمعیت", buildHouse: "ساخت خانه جدید", buildBtn: "ساخت",
        close: "✕", cancel: "انصراف", moveBtn: "انتقال", movePrompt: "چند نفر منتقل شوند؟", dispatchTroops: "اعزام نیرو",
        unlockTitle: "باز کردن قفل", unlockQ: "آیا می‌خواهید این قفل را باز کنید؟", unlockCost: "این کار ۱۰ سنگ هزینه دارد.", unlockYes: "بله، باز کن",
        resultTitle: "گزارش اکتشاف", resultRegion: "منطقه:", resultCasualties: "تلفات:", resultRes: "گزارش منابع:", resultNone: "منابع دریافت نکردید", collect: "دریافت",
        houseBuilt: "✅ خونه جدید ساخته شد!", buildCancel: "ساخت لغو شد", moveCancel: "انتقال لغو شد", moveSuccess: "جابه‌جایی موفق بود!",
        moveFail: "جابه‌جایی نامناسب!", moved: "نفر منتقل شدند.", emptyHouse: "آدمی برای انتقال نیست!", noAdjacent: "برای باز کردن این قفل، باید یک منطقه باز در کنارش داشته باشید!", followTut: "فعلاً طبق آموزش پیش برو!",
        buildStart: "خونه در حال ساخت است و ۱۰ چوب کم شد!", noWood: "چوب کافی نداری!", clickUnlocked: "روی خونه‌ای که قفلش رو باز کردی کلیک کن!",
        lockedArea: "این منطقه قفل است!", tooClose: "نمیتوانید به خانه‌های دیگر بچسبانید!", occupied: "در این مکان در حال ساخت است!",
        keyBindSuccess: "کلید با موفقیت تنظیم شد!", langChanged: "زبان به فارسی تغییر یافت", risk: "مقدار تلفات", reward: "پاداش هر بازگشته", dispatchBtn: "اعزام نیرو",
        wood: "چوب", stone: "سنگ", food: "غذا", fuel: "سوخت", dispatchNotif: "نفر به", temp: "دما"
    },
    en: {
        resume: "Resume", settings: "Settings", exit: "Exit", pauseTitle: "Pause Menu", settingsTitle: "Settings",
        video: "Video", audio: "Audio", controls: "Controls", selectLang: "Select Language:", musicVol: "Music Volume:",
        mute: "Mute", unmute: "Unmute", rebindTxt: "To change a key, click on it and press a new key.",
        up: "Move Up", down: "Move Down", left: "Move Left", right: "Move Right", back: "Back",
        explore: "Explore", build: "Build", movePop: "Move Population", buildHouse: "Build New House", buildBtn: "Build",
        close: "✕", cancel: "Cancel", moveBtn: "Move", movePrompt: "How many to move?", dispatchTroops: "Dispatch Troops",
        unlockTitle: "Unlock", unlockQ: "Do you want to unlock this?", unlockCost: "This costs 10 stones.", unlockYes: "Yes, Unlock",
        resultTitle: "Expedition Report", resultRegion: "Region:", resultCasualties: "Casualties:", resultRes: "Resources Report:", resultNone: "No resources found.", collect: "Collect",
        houseBuilt: "✅ New house built!", buildCancel: "Build canceled", moveCancel: "Move canceled", moveSuccess: "Move successful!",
        moveFail: "Bad move!", moved: "troops moved.", emptyHouse: "No one to move!", noAdjacent: "You need an adjacent unlocked area to unlock this!", followTut: "Follow the tutorial for now!",
        buildStart: "House is building, 10 wood deducted!", noWood: "Not enough wood!", clickUnlocked: "Click on the house you just unlocked!",
        lockedArea: "This area is locked!", tooClose: "Cannot build adjacent to other houses!", occupied: "Already building here!",
        keyBindSuccess: "Key binded successfully!", langChanged: "Language changed to English", risk: "Casualties", reward: "Reward per survivor", dispatchBtn: "Dispatch",
        wood: "Wood", stone: "Stone", food: "Food", fuel: "Fuel", dispatchNotif: "troops to", temp: "Temp"
    }
};

function applyLang(lang) {
    gameState.currentLang = lang;
    const t = LANG[lang];
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    
    set('txtPauseTitle', t.pauseTitle); set('txtResume', t.resume); set('txtSettings1', t.settings); set('txtExit', t.exit);
    set('txtSettingsTitle', t.settingsTitle); set('txtVideo', t.video); set('txtAudio', t.audio); set('txtControls', t.controls);
    set('txtLangSel', t.selectLang); set('txtMusicVol', t.musicVol); 
    set('btnMute', bgMusic && bgMusic.volume > 0 ? t.mute : t.unmute);
    set('txtRebind', t.rebindTxt);
    set('txtBindUp', t.up); set('txtBindDown', t.down); set('txtBindLeft', t.left); set('txtBindRight', t.right);
    set('txtBack', t.back);
    
    set('txtBuildTitle', t.build); set('txtBuildHouse', t.buildHouse); set('txtBuildBtn', t.buildBtn);
    set('txtExploreTitle', t.explore); set('txtMovePopTitle', t.movePop); set('txtMovePopBtn', t.moveBtn); set('txtCancelMove', t.cancel);
    
    document.querySelectorAll('.dispatch-text').forEach(el => el.innerText = t.dispatchBtn);
    document.querySelectorAll('.region-risk').forEach(el => el.innerText = t.risk + ': ' + el.getAttribute('data-val'));
    document.querySelectorAll('.region-reward').forEach(el => el.innerText = t.reward + ': ' + el.getAttribute('data-val'));

    set('txtUnlockTitle', t.unlockTitle); set('txtUnlockQ', t.unlockQ); set('txtUnlockCost', t.unlockCost); set('txtUnlockYes', t.unlockYes); set('txtCancelUnlock', t.cancel);
    set('txtResultTitle', t.resultTitle); set('txtCloseResult', t.collect);

    const heatItem = Array.from(document.querySelectorAll('.resource-item')).find(item => {
        const valEl = item.querySelector('.resource-value');
        return valEl && valEl.id === 'heat';
    });
    if (heatItem) {
        const lbl = heatItem.querySelector('.resource-label');
        if (lbl) lbl.innerText = t.temp;
    }
}

function updateTutorialBox() {
    const txt = document.getElementById('tutorialText');
    const btn = document.getElementById('tutorialBtn');
    const pointer = document.getElementById('tutorialPointer');
    const box = document.getElementById('tutorialBox');
    if(!txt || !btn || !pointer || !box) return;

    if (gameState.tutorialStep === 0) {
        box.style.display = 'none';
        btn.style.display = 'none';
        pointer.style.display = 'none';
        return;
    }

    box.style.display = 'flex'; 

    if (gameState.tutorialStep === -1) {
        txt.innerHTML = "سلام! من راهنمای تو در این سرمای سهم‌گین هستم. می‌خوای آموزش رو ببینی یا خودت بلدی؟<br><br><div style='text-align:center; margin-top:10px;'><button onclick='startTutorial(true)' style='padding: 8px 15px; background: #f4d03f; border:none; border-radius:4px; cursor:pointer; color:#000; font-weight:bold; font-family:Vazirmatn;'>آموزش ببین</button> <button onclick='startTutorial(false)' style='padding: 8px 15px; background: transparent; border:1px solid #aaa; border-radius:4px; cursor:pointer; color:#fff; font-family:Vazirmatn; margin-right:10px;'>بلدم، شروع کن</button></div>";
        btn.style.display = 'none';
        pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 1) {
        txt.innerHTML = "برای شروع، روی یکی از خانه‌های قفل‌شده اطراف منطقه امن کلیک کن تا با ۱۰ سنگ قفلش رو باز کنی.";
        btn.style.display = 'none'; pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 2) {
        txt.innerHTML = "آفرین! قفل باز شد. حالا روی دکمه «ساخت و ساز» در پایین صفحه کلیک کن.";
        btn.style.display = 'none'; movePointer('btnBuild');
    } else if (gameState.tutorialStep === 3) {
        txt.innerHTML = "خوبه! حالا روی دکمه «ساخت» در بخش «ساخت خانه جدید» کلیک کن تا خونه به موس بچسبه.";
        btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم";
        pointer.style.display = 'none';
        btn.onclick = () => { box.style.display = 'none'; };
    } else if (gameState.tutorialStep === 4) {
        txt.innerHTML = "حالا روی اونجایی که قفلش رو باز کردی کلیک کن تا خونه اونجا ساخته بشه و ۱۰ چوب از تو کم بشه.";
        btn.style.display = 'none'; pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 5) {
        txt.innerHTML = "خونه در حال ساخت است. حالا وقتشه بریم منابع بیشتری پیدا کنیم. روی دکمه «اکتشاف» در پایین صفحه کلیک کن.";
        btn.style.display = 'none'; movePointer('btnExplore');
    } else if (gameState.tutorialStep === 6) {
        txt.innerHTML = "اینجا سه منطقه هست. روی منطقه «تخت جمشید» کلیک کن و دکمه «اعزام» اون رو بزن.";
        btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم";
        pointer.style.display = 'none';
        btn.onclick = () => { box.style.display = 'none'; };
    } else if (gameState.tutorialStep === 7) {
        txt.innerHTML = "فعلاً در آموزش باید یک نفر رو انتخاب کنی.";
        btn.style.display = 'none'; pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 8) {
        txt.innerHTML = "آفرین! یادت باشه هر روز به ازای هر نفر یک غذا و به ازای هر نیروگاه یک سوخت مصرف میشه! حالا برای گرم شدن، باید نیروگاه بسازی. روی دکمه متوجه شدم بزن.";
        btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم";
        pointer.style.display = 'none';
        btn.onclick = () => { gameState.tutorialStep = 9; updateTutorialBox(); };
    } else if (gameState.tutorialStep === 9) {
        txt.innerHTML = "برای ساخت نیروگاه، باید یه زمین جدید باز کنی. روی یک مکان قفل‌شده کلیک کن که کنارش خونه نباشه (۱۰ سنگ کم میشه).";
        btn.style.display = 'none'; pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 10) {
        txt.innerHTML = "آفرین! حالا دوباره روی دکمه «ساخت و ساز» کلیک کن.";
        btn.style.display = 'none'; movePointer('btnBuild');
    } else if (gameState.tutorialStep === 11) {
        txt.innerHTML = "این بار روی دکمه «ساخت» نیروگاه کلیک کن.";
        btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم";
        pointer.style.display = 'none';
        btn.onclick = () => { box.style.display = 'none'; };
    } else if (gameState.tutorialStep === 12) {
        txt.innerHTML = "حالا روی زمینی که تازه باز کردی کلیک کن تا نیروگاه ساخته بشه (۱۰ سنگ کم میشه).";
        btn.style.display = 'none'; pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 13) {
        txt.innerHTML = "نیروگاه در حال ساخت است. حالا باید جمعیت رو بین خونه‌هات پخش کنی. روی دکمه متوجه شدم بزن و بعد روی خونه اصلی کلیک کن.";
        btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم";
        pointer.style.display = 'none';
        btn.onclick = () => { gameState.tutorialStep = 14; updateTutorialBox(); };
    } else if (gameState.tutorialStep === 14) {
        box.style.display = 'none'; btn.style.display = 'none'; pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 15) {
        txt.innerHTML = "همونطور که می‌بینی، نمی‌تونی همه آدم‌ها رو انتقال بدی. حداقل یک نفر (یعنی خودت!) باید تو خونه بمونه. پس ۱ تا ۴ نفر رو انتخاب کن و بعد روی دکمه «انتقال» بزن.";
        btn.style.display = 'inline-block'; btn.innerText = "متوجه شدم";
        pointer.style.display = 'none';
        btn.onclick = () => { box.style.display = 'none'; };
    } else if (gameState.tutorialStep === 16) {
        txt.innerHTML = "حالا روی خونه جدیدت کلیک کن تا آدم‌ها اونجا مستقر بشن.";
        btn.style.display = 'none'; pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 17) {
        txt.innerHTML = "عالیه فقط یادت باشه آدم هات رو توی یک خونه نگه نداری کلافه میشن";
        btn.style.display = 'inline-block'; btn.innerText = "پایان آموزش";
        pointer.style.display = 'none';
        btn.onclick = () => { gameState.tutorialStep = 0; box.style.display = 'none'; btn.style.display = 'none'; };
    }
}

function movePointer(elementId) {
    const pointer = document.getElementById('tutorialPointer');
    const el = document.getElementById(elementId);
    if (el && pointer) {
        const rect = el.getBoundingClientRect();
        pointer.style.display = 'block';
        pointer.style.left = (rect.left + rect.width / 2 - 30) + 'px';
        pointer.style.top = (rect.top + rect.height / 2 - 30) + 'px';
    } else if (pointer) {
        pointer.style.display = 'none';
    }
}

function startExpedition(regionName, troops) {
    const isTutorial = gameState.tutorialStep === 7.5;
    
    gameState.expeditions.push({
        id: Date.now(),
        region: regionName,
        troops: troops,
        startTime: Date.now(),
        endTime: Date.now() + (isTutorial ? 10000 : 60000),
        isTutorial: isTutorial
    });
    
    let mainHouse = gameState.HOUSE_HEXES.find(h => h.q === 0 && h.r === 0);
    if (mainHouse) {
        mainHouse.pop = Math.max(0, mainHouse.pop - troops);
    }
    updateUI();
    
    showNotification(`${troops} ${LANG[gameState.currentLang].dispatchNotif} ${regionName} اعزام شدند!`, "success");
    
    if (isTutorial) {
        gameState.tutorialStep = 8; 
        updateTutorialBox();
    }
}

function updateExpeditions() {
    const tracker = document.getElementById('expeditionTracker');
    if(!tracker) return;
    
    let html = '';
    let completed = [];

    gameState.expeditions.forEach(exp => {
        const timeLeft = exp.endTime - Date.now();
        if (timeLeft <= 0) {
            completed.push(exp);
        } else {
            const progress = 1 - (timeLeft / (exp.isTutorial ? 10000 : 60000));
            html += `
                <div style="background: rgba(10,14,26,0.9); padding: 10px; border-radius: 8px; border: 1px solid rgba(244,208,63,0.3); margin-bottom: 10px; font-family: 'Vazirmatn', sans-serif;">
                    <div style="color: #f4d03f; font-size: 0.9rem; margin-bottom: 5px;">${exp.region} (${exp.troops} نفر)</div>
                    <div style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${progress * 100}%; height: 100%; background: #f4d03f; transition: width 0.5s linear;"></div>
                    </div>
                </div>
            `;
        }
    });

    tracker.innerHTML = html;

    completed.forEach(exp => {
        const res = calculateExpeditionResult(exp);
        showExpeditionResult(exp, res);
        
        let survivors = exp.troops - res.casualties;
        if (survivors > 0) {
            let mainHouse = gameState.HOUSE_HEXES.find(h => h.q === 0 && h.r === 0);
            if (mainHouse) mainHouse.pop += survivors;
        }
        
        gameState.wood += res.wood;
        gameState.stone += res.stone;
        gameState.food += res.food;
        gameState.fuel += res.fuel;
        
        updateUI();
    });
    
    if (completed.length > 0) {
        const completedIds = completed.map(c => c.id);
        gameState.expeditions = gameState.expeditions.filter(e => !completedIds.includes(e.id));
    }
}

function updateRequests() {
    const tracker = document.getElementById('requestTrackerBody');
    if (!tracker) return;

    if (gameState.isPlacingMigrants) return;

    let expiredIds = [];

    if (gameState.migrantRequests.length === 0) {
        if (!tracker.querySelector('.no-req-msg')) {
            tracker.innerHTML = '<p class="no-req-msg" style="color: #aaa; text-align: center; font-size: 0.9rem;">در حال حاضر درخواستی وجود ندارد.</p>';
        }
        return;
    }

    let noMsg = tracker.querySelector('.no-req-msg');
    if (noMsg) noMsg.remove();

    gameState.migrantRequests.forEach((req) => {
        let timeLeft = req.endTime - Date.now();
        let reqIdStr = `req_${req.id}`;
        let existingDiv = tracker.querySelector(`[data-req-id="${reqIdStr}"]`);

        if (timeLeft <= 0) {
            expiredIds.push(req.id);
            let canFit = calculateCanFit(req.count);
            if (canFit) {
                gameState.satisfaction = Math.max(0, gameState.satisfaction - 1);
                showNotification("آدم‌های در انتظار کشته شدند! شهروندان ناراحت شدند. ۱ درصد رضایت کم شد.", "warning");
            } else {
                gameState.satisfaction = Math.min(100, gameState.satisfaction + 1);
                showNotification("آدم‌های در انتظار کشته شدند! اما شهروندان راضی بودند که منابع هدر نرفت. ۱ درصد رضایت بیشتر شد.", "info");
            }
            updateUI();
            if (existingDiv) existingDiv.remove();
        } else {
            let progress = 1 - (timeLeft / 180000); 
            if (!existingDiv) {
                let div = document.createElement('div');
                div.setAttribute('data-req-id', reqIdStr);
                div.style.cssText = "background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(244,208,63,0.3); margin-bottom: 10px.";
                div.innerHTML = `
                    <div style="color: #f4d03f; font-size: 0.9rem; margin-bottom: 8px;">${req.count} نفر در انتظار پذیرش</div>
                    <div style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden; margin-bottom: 10px;">
                        <div class="req-bar" style="width: 0%; height: 100%; background: #e74c3c; transition: width 1s linear;"></div>
                    </div>
                    <button class="accept-req-btn" data-id="${req.id}" style="width: 100%; padding: 6px; background: #f4d03f; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color:#000;">وارد شوند</button>
                `;
                tracker.appendChild(div);
                
                div.querySelector('.accept-req-btn').addEventListener('click', function() {
                    let id = parseInt(this.getAttribute('data-id'));
                    acceptWaitingMigrants(id);
                });
            }
            
            let bar = tracker.querySelector(`[data-req-id="${reqIdStr}"] .req-bar`);
            if (bar) {
                bar.style.width = (progress * 100) + '%';
            }
        }
    });

    if (expiredIds.length > 0) {
        gameState.migrantRequests = gameState.migrantRequests.filter(r => !expiredIds.includes(r.id));
    }
}

function calculateExpeditionResult(exp) {
    if (exp.isTutorial) {
        return { wood: 10, stone: 10, food: 0, fuel: 0, casualties: 0 };
    }

    const regionData = {
        'کویر لوت': { pcts: [100, 80, 75, 70, 50, 20, 0], res: { wood: 30, stone: 30, food: 20, fuel: 5 } },
        'آبشار لاتون': { pcts: [70, 60, 50, 40, 20, 0], res: { wood: 0, stone: 20, food: 10, fuel: 0 } },
        'تخت جمشید': { pcts: [40, 30, 20, 15, 10, 0], res: { wood: 10, stone: 10, food: 0, fuel: 0 } }
    };

    const r = regionData[exp.region];
    if (!r) return { casualties: exp.troops, wood: 0, stone: 0, food: 0, fuel: 0 };

    const pct = r.pcts[Math.floor(Math.random() * r.pcts.length)];

    const exact = (pct / 100) * exp.troops;
    let casualties = Math.floor(exact);
    if (Math.random() < (exact - casualties)) { 
        casualties++;
    }
    casualties = Math.min(casualties, exp.troops);

    const survivors = exp.troops - casualties;
    return {
        wood: survivors * r.res.wood,
        stone: survivors * r.res.stone,
        food: survivors * r.res.food,
        fuel: survivors * r.res.fuel,
        casualties
    };
}

function showExpeditionResult(exp, res) {
    const modal = document.getElementById('expeditionResultModal');
    const txt = document.getElementById('resultText');
    if(!modal || !txt) return;
    const t = LANG[gameState.currentLang];

    let html = `<div style="margin-bottom:10px;"><strong style="color:#f4d03f;">${t.resultRegion}</strong> ${exp.region}</div>`;
    html += `<div style="margin-bottom:10px;"><strong style="color:#e74c3c;">${t.resultCasualties}</strong> ${res.casualties} ${gameState.currentLang === 'en' ? 'troops' : 'نفر'}</div>`;
    html += `<div style="margin-bottom:10px; border-top:1px solid #333; padding-top:10px;"><strong style="color:#f4d03f;">${t.resultRes}</strong><br>`;
    
    let foundRes = false;
    let resList = '';
    if (res.wood > 0) { resList += `🪵 ${t.wood}: ${res.wood}<br>`; foundRes = true; }
    if (res.stone > 0) { resList += `🪨 ${t.stone}: ${res.stone}<br>`; foundRes = true; }
    if (res.food > 0) { resList += `🍖 ${t.food}: ${res.food}<br>`; foundRes = true; }
    if (res.fuel > 0) { resList += `🔥 ${t.fuel}: ${res.fuel}<br>`; foundRes = true; }
    
    if (!foundRes) {
        html += `${t.resultNone}<br>`;
    } else {
        html += resList;
    }
    html += `</div>`;

    txt.innerHTML = html;
    modal.style.display = 'block';
}

function showMigrantModal(count) {
    const modal = document.getElementById('migrantModal');
    const txt = document.getElementById('migrantText');
    if(!modal || !txt) return;

    txt.innerText = `${count} نفر می‌خواهند به منطقه امن شما بپیوندند. آیا اجازه می‌دهید؟`;
    modal.style.display = 'flex';

    document.getElementById('migrantReject').onclick = () => {
        modal.style.display = 'none';
        let canFit = calculateCanFit(count);
        if (canFit) {
            gameState.satisfaction = Math.max(0, gameState.satisfaction - 1);
            showNotification("شهروندان ناراحت شدند که با وجود داشتن جا، کمک نکردید. ۱ درصد رضایت کم شد.", "warning");
        } else {
            gameState.satisfaction = Math.min(100, gameState.satisfaction + 1);
            showNotification("شهروندان خوشحال شدند که منابع تقسیم نشد و بقا تضمین شد. ۱ درصد رضایت بیشتر شد.", "info");
        }
        updateUI();
    };

    document.getElementById('migrantWait').onclick = () => {
        modal.style.display = 'none';
        gameState.migrantRequests.push({
            id: Date.now(),
            count: count,
            endTime: Date.now() + 180000
        });
        showNotification("آدم‌ها در انتظار نگه داشته شدند. به بخش درخواست‌ها مراجعه کنید.", "info");
    };

    document.getElementById('migrantAccept').onclick = () => {
        modal.style.display = 'none';
        startPlacingMigrants(count);
    };
}

function nextDay() {
    if (gameState.gameOver || gameState.isPaused) return;
    gameState.day++;
    
    let totalPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0);
    
    let starvedCount = 0;
    if (gameState.food < totalPop) {
        starvedCount = totalPop - gameState.food;
        gameState.food = 0;
        
        let toKill = starvedCount;
        while (toKill > 0) {
            let eligibleHouses = gameState.HOUSE_HEXES.filter(h => h.pop > 0);
            if (eligibleHouses.length === 0) break;
            
            let house = eligibleHouses[Math.floor(Math.random() * eligibleHouses.length)];
            house.pop--;
            toKill--;
        }
        
        let remainingPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0);
        if (remainingPop <= 0) {
            showGameOver();
            return;
        }
        
        let hopeReduction = Math.ceil(starvedCount / 2);
        gameState.hope = Math.max(0, gameState.hope - hopeReduction);
        
        let modal = document.getElementById('starvationModal');
        if (modal) {
            document.getElementById('starvationText').innerText = `به دلیل کمبود غذا، ${starvedCount} نفر از شهروندان جان باختند. لطفاً منابع غذایی رو مدیریت کن!`;
            modal.style.display = 'flex';
        }
    } else {
        gameState.food -= totalPop;
    }
    
    gameState.fuel = Math.max(0, gameState.fuel - gameState.POWERPLANT_HEXES.length);
    
    gameState.HOUSE_HEXES.forEach(h => h.receivedToday = false);

    let hasOvercrowded = gameState.HOUSE_HEXES.some(h => h.pop === 5);
    let hasSpace = gameState.HOUSE_HEXES.some(h => h.pop < 3);
    if (hasOvercrowded && hasSpace && gameState.HOUSE_HEXES.length > 1) {
        document.getElementById('complaintModal').style.display = 'flex';
    }
    
    updateUI();

    if (Math.random() < 0.33) { 
        let numMigrants = Math.floor(Math.random() * gameState.day) + 1;
        showMigrantModal(numMigrants);
    }
}

function startGameLoop() {}

function updateUI() {
    let totalPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0);
    gameState.population = totalPop;

    let ppCount = gameState.POWERPLANT_HEXES.length;
    let heatCapacity = ppCount * 10; 
    
    if (totalPop > 0) {
        gameState.heat = Math.min(100, Math.round((heatCapacity / totalPop) * 100));
    } else {
        gameState.heat = 0;
    }

    const el = id => document.getElementById(id);
    
    const updateBar = (id, value, max) => {
        const valEl = el(id);
        if (valEl) {
            const barEl = valEl.parentElement.querySelector('.resource-bar');
            if (barEl) {
                let percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
                barEl.style.width = percentage + '%';
            }
            
            // اضافه کردن یک المان نامرئی برای شکستن خط و انتقال دما، امید و رضایت به ردیف دوم در موبایل
            if (id === 'heat') {
                const parent = valEl.parentElement;
                if (parent && (!parent.previousElementSibling || !parent.previousElementSibling.classList.contains('mobile-line-break'))) {
                    const lineBreak = document.createElement('div');
                    lineBreak.className = 'mobile-line-break';
                    parent.parentNode.insertBefore(lineBreak, parent);
                }
            }
        }
    };

    if(el('day')) el('day').textContent = gameState.day;
    if(el('population')) el('population').textContent = gameState.population;
    if(el('wood')) el('wood').textContent = gameState.wood;
    if(el('stone')) el('stone').textContent = gameState.stone;
    if(el('food')) el('food').textContent = Math.floor(gameState.food);
    if(el('fuel')) el('fuel').textContent = Math.floor(gameState.fuel);
    if(el('heat')) el('heat').textContent = gameState.heat + '%';
    if(el('hope')) el('hope').textContent = gameState.hope + '%';
    if(el('satisfaction')) el('satisfaction').textContent = gameState.satisfaction + '%';
    
    updateBar('population', gameState.population, 20); 
    updateBar('wood', gameState.wood, 50);
    updateBar('stone', gameState.stone, 50);
    updateBar('food', gameState.food, 50);
    updateBar('fuel', gameState.fuel, 50);
    updateBar('heat', gameState.heat, 100);
    updateBar('hope', gameState.hope, 100);
    updateBar('satisfaction', gameState.satisfaction, 100);
}

function showNotification(text, type = 'info') {
    const c = document.getElementById('notification-container');
    if(c) { c.style.top = '90px'; c.style.left = '50%'; c.style.transform = 'translateX(-50%)'; c.style.zIndex = '10000'; }
    const el = document.createElement('div');
    el.className = `notification ${type}`; el.textContent = text;
    c.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 3000);
}

function showStoryScreen() {
    const hero = document.querySelector('.hero'); if(hero) hero.style.display = 'none';
    const header = document.getElementById('siteHeader'); if(header) header.style.display = 'none';
    document.body.style.paddingTop = '0';
    const ss = document.getElementById('story-screen'); if(ss) ss.style.display = 'flex';
}
function startActualGame() {
    const ss = document.getElementById('story-screen'); if(ss) ss.style.display = 'none';
    const gs = document.getElementById('game-screen'); if(gs) gs.style.display = 'block';
    
    initHexGrid(); 
    
    const cX = 1500, cY = 1500; 
    const container = document.getElementById('map-container');
    if(!container) return;
    const rect = container.getBoundingClientRect();
    
    const mW = 3000, mH = 3000;
    let minZoom = Math.max(rect.width / mW, rect.height / mH);
    camera.zoom = Math.max(1, minZoom);
    camera.x = cX - (rect.width / camera.zoom) / 2; 
    camera.y = cY - (rect.height / camera.zoom) / 2; 
    
    setupControls(); startGameLoop(); updateUI();
    applyLang('fa');
    updateTutorialBox();
    
    if (!mapAnimId) { function anim() { drawMap(); mapAnimId = requestAnimationFrame(anim); } anim(); }
    
    // تنظیم دقیق فاصله نقشه از هدر برای جلوگیری از جای خالی
    adjustMapTop();
}

// تابعی برای تنظیم دقیق فاصله نقشه از بالا (فوق هدر)
function adjustMapTop() {
    const topBar = document.getElementById('top-bar');
    const mapContainer = document.getElementById('map-container');
    if (topBar && mapContainer) {
        // برای جلوگیری از جای خالی، دقیقاً هم‌اندازه هدر تنظیم می‌شود
        mapContainer.style.top = topBar.offsetHeight + 'px';
    }
}

function closeAllPanels(exceptId) {
    const panels = ['panelBuild', 'panelExplore', 'panelRequests', 'panelMovePop'];
    panels.forEach(id => {
        if (id !== exceptId) {
            const p = document.getElementById(id);
            if (p) p.classList.remove('panel-open');
        }
    });
}

function openMovePopPanel(maxPop) {
    closeAllPanels('panelMovePop');
    const btnsDiv = document.getElementById('movePopBtns');
    if(!btnsDiv) return;
    btnsDiv.innerHTML = '';
    for(let i=1; i<=maxPop; i++) {
        let b = document.createElement('button');
        b.innerText = i;
        b.style.cssText = "width: 50px; height: 50px; background: #2c3e50; color: #fff; border: 2px solid #f4d03f; border-radius: 8px; cursor: pointer; font-size: 1.2rem; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: 0.2s; font-family: 'Vazirmatn', sans-serif; margin: 5px;";
        b.onmouseover = () => { if(b.style.background !== 'rgb(244, 208, 63)') b.style.background = '#34495e'; };
        b.onmouseout = () => { if(b.style.background !== 'rgb(244, 208, 63)') b.style.background = '#2c3e50'; };
        b.onclick = () => {
            gameState.moveAmount = i;
            document.querySelectorAll('#movePopBtns button').forEach(btn => {
                btn.style.background = '#2c3e50';
                btn.style.color = '#fff';
            });
            b.style.background = '#f4d03f'; 
            b.style.color = '#000';
        };
        btnsDiv.appendChild(b);
    }
    gameState.moveAmount = 1;
    if(btnsDiv.firstChild) {
        btnsDiv.firstChild.click(); 
    }
    const pmp = document.getElementById('panelMovePop');
    if(pmp) pmp.classList.add('panel-open');
}

function showAngryMoveModal() {
    const modal = document.getElementById('angryMoveModal');
    if(modal) modal.style.display = 'flex';
    gameState.satisfaction = Math.max(0, gameState.satisfaction - 1); 
    updateUI();
    showNotification("۱ درصد رضایت کم شد!", "warning");
}

function initGame() {
    bgMusic = new Audio('music.mp3');
    bgMusic.volume = 0.4; 
    
    function tryPlayMusic() {
        bgMusic.play().then(() => {
            bgMusic.currentTime = MUSIC_START_TIME;
            document.body.removeEventListener('click', tryPlayMusic);
            document.body.removeEventListener('keydown', tryPlayMusic);
            document.body.removeEventListener('touchstart', tryPlayMusic);
        }).catch(e => {});
    }

    document.body.addEventListener('click', tryPlayMusic);
    document.body.addEventListener('keydown', tryPlayMusic);
    document.body.addEventListener('touchstart', tryPlayMusic);

    bgMusic.addEventListener('ended', () => {
        bgMusic.currentTime = MUSIC_START_TIME;
        bgMusic.play();
    });

    window.addEventListener('beforeunload', function (e) {
        const gs = document.getElementById('game-screen');
        if (gs && gs.style.display === 'block' && !gameState.gameOver && gameState.currentSaveName) {
            saveGame(true); 
        }
    });

    const heroActions = document.querySelector('.hero-actions');
    const startBtnHero = document.getElementById('startBtnHero');
    if (heroActions && startBtnHero) {
        if (hasSavedGame()) {
            const continueBtn = document.createElement('button');
            continueBtn.id = 'btnContinueHero';
            continueBtn.className = 'btn-primary';
            continueBtn.innerText = 'ادامه بازی';
            continueBtn.style.marginRight = '15px';
            continueBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)'; 
            continueBtn.onclick = continueGame;
            heroActions.insertBefore(continueBtn, startBtnHero);
        }
    }

    document.getElementById('startBtnHero').onclick = () => {
        gameState.currentSaveName = null; 
        showStoryScreen();
    };
    document.getElementById('startActualGameBtn').onclick = startActualGame;
    
    document.getElementById('eventClose').onclick = () => document.getElementById('event-panel').classList.replace('event-panel-visible', 'event-panel-hidden');
    
    const style = document.createElement('style');
    style.innerHTML = `
        #game-screen, #game-screen * {
            font-family: 'Vazirmatn', sans-serif !important;
        }
        button, input, select, textarea {
            font-family: 'Vazirmatn', sans-serif !important;
        }
        #tutorialPointer {
            position: fixed; width: 60px; height: 60px; border-radius: 50%;
            border: 4px solid #f4d03f; box-shadow: 0 0 15px #f4d03f, inset 0 0 15px #f4d03f;
            z-index: 999; display: none; pointer-events: none;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
        
        /* تنظیمات دسکتاپ: ارتفاع هدر اتوماتیک برای حذف جای خالی */
        #top-bar { 
            height: auto !important; 
            min-height: 0 !important;
            padding: 8px 15px !important;
            align-items: center !important;
            border-bottom: none !important; 
        }
        .top-bar-center {
            position: relative;
            padding: 0 20px !important;
            justify-content: center !important;
            flex: 1 !important;
        }

        /* اصلاح آیکون‌های استیکری در دسکتاپ (کوچک کردن کامل بدون برش) */
        .resource-icon {
            font-size: 0.9rem;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .mobile-line-break { 
            display: none !important; 
        }

        @media (max-width: 768px) {
            #pauseModal > div, #settingsModal > div { width: 95% !important; padding: 20px !important; }
            #dispatchTroopsModal { width: 90% !important; padding: 15px !important; }
            #dispatchTroopsBtns button { width: 45px !important; height: 45px !important; font-size: 1rem !important; margin: 5px !important; }
            #tutorialBox { width: 95% !important; padding: 15px !important; bottom: 80px !important; gap: 10px !important; }
            #tutorialBox img { width: 60px !important; height: 60px !important; }
            #tutorialBox p { font-size: 0.8rem !important; line-height: 1.5 !important; }
            #unlockModal, #expeditionResultModal, #migrantModal { width: 90% !important; }
            #expeditionTracker { right: 10px !important; top: 140px !important; width: 160px !important; }
            #expeditionTracker div { font-size: 0.8rem !important; }
            #movePopBtns button { width: 45px !important; height: 45px !important; font-size: 1rem !important; }
            
            .floating-panel { width: 90% !important; max-height: 75vh !important; }
            .panel-header { padding: 8px 12px !important; }
            .panel-header h3 { font-size: 0.9rem !important; }
            .panel-body { padding: 10px !important; }
            .build-item-new { padding: 10px !important; margin-bottom: 10px !important; gap: 8px !important; }
            .build-info-text { gap: 2px !important; }
            .build-name { font-size: 0.9rem !important; }
            .build-info-text > div { font-size: 0.7rem !important; }
            .build-btn, .survey-btn { padding: 5px 10px !important; font-size: 0.75rem !important; }
            .build-image { width: 50px !important; height: 50px !important; }

            /* چینش هدر بالا در موبایل (دو ردیف: استوپ و لوگو بالا، منابع پایین) */
            #top-bar { 
                height: auto !important; 
                min-height: 0 !important;
                padding: 0 !important; 
                flex-wrap: wrap !important; 
                align-items: flex-start !important;
                position: fixed !important; top: 0 !important;
                background: rgba(10, 14, 26, 0.98) !important;
                border-bottom: none !important; 
            }
            
            /* ردیف اول: استوپ و اجاق */
            #btnPause { 
                position: absolute !important; 
                top: 0 !important; 
                left: 0 !important;
                height: 40px !important;
                width: 40px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                transform: none !important;
            }
            #btnPause img { width: 24px !important; height: 24px !important; }
            
            .top-bar-left { 
                position: absolute !important; 
                top: 0 !important; 
                right: 0 !important;
                height: 40px !important;
                padding: 0 10px !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            }
            .top-bar-left img { width: 24px !important; height: 24px !important; }

            /* ردیف دوم: منابع */
            .top-bar-center { 
                width: 100% !important; 
                margin-top: 40px !important; 
                padding: 8px 5px !important;
                border-top: 1px solid rgba(244, 208, 63, 0.3) !important; /* خط جداکننده افقی زیبا */
                justify-content: center !important;
                flex-wrap: wrap !important;
            }

            .resource-item { 
                padding: 2px 6px !important; 
                height: 26px !important; /* ارتفاع ثابت برای یکدست شدن کادرها */
                gap: 2px !important; 
                margin-bottom: 4px !important; 
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                white-space: nowrap !important;
            }
            
            /* اصلاح ایموجی‌های بزرگتر (چوب و سنگ) در موبایل */
            .resource-icon { 
                font-size: 0.75rem !important; 
                line-height: 1 !important;
                width: 14px !important; 
                height: 14px !important; 
                overflow: hidden !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .resource-label { display: none !important; }
            .resource-value { font-size: 0.65rem !important; min-width: 10px !important; }
            .resource-bar-container { width: 25px !important; height: 3px !important; display: block !important; }
            .resource-divider { display: none !important; }

            /* خط شکن برای انتقال دما، امید و رضایت به ردیف دوم در موبایل */
            .mobile-line-break { 
                display: block !important; 
                flex-basis: 100% !important; 
                height: 0 !important; 
                margin: 0 !important; 
                padding: 0 !important; 
            }

            #notification-container { top: 140px !important; }
            .notification { padding: 5px 10px !important; font-size: 0.7rem !important; max-width: 90vw !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }

            #btnNextDay { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; outline: none !important; }
            #btnNextDay img { background: transparent !important; border: none !important; box-shadow: none !important; outline: none !important; }

            #bottom-bar { position: fixed !important; bottom: 0 !important; left: 0 !important; width: 100% !important; height: 50px !important; z-index: 100 !important; background: rgba(10, 14, 26, 0.98) !important; }
            .bottom-btn .btn-icon-large { font-size: 1.1rem !important; }
            .bottom-btn .btn-label { font-size: 0.55rem !important; }
            
            #map-container { bottom: 50px !important; }
        }
    `;
    document.head.appendChild(style);

    const bottomBar = document.getElementById('bottom-bar');
    if (bottomBar) {
        Array.from(bottomBar.children).forEach(btn => {
            const text = btn.innerText.toLowerCase();
            if (text.includes('اکتشاف') || text.includes('گرمایش')) btn.remove();
        });
    }

    const pointerDiv = document.createElement('div');
    pointerDiv.id = 'tutorialPointer';
    document.body.appendChild(pointerDiv);

    const topBar = document.getElementById('top-bar');
    if (topBar) {
        const pauseBtn = document.createElement('button');
        pauseBtn.id = 'btnPause';
        pauseBtn.innerHTML = `<img src="pause_icon.png" style="width: ${PAUSE_BTN_SIZE}px; height: ${PAUSE_BTN_SIZE}px; pointer-events: none; border-radius: 8px; transition: filter 0.2s ease;">`;
        pauseBtn.style.cssText = "position: absolute; left: 15px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 0;";
        topBar.appendChild(pauseBtn);
        pauseBtn.onmouseover = () => pauseBtn.querySelector('img').style.filter = 'brightness(1.3) drop-shadow(0 0 8px rgba(244, 208, 63, 0.8))';
        pauseBtn.onmouseout = () => pauseBtn.querySelector('img').style.filter = 'none';
        pauseBtn.onclick = togglePauseMenu;
    }

    const nextDayBtn = document.createElement('button');
    nextDayBtn.id = 'btnNextDay';
    nextDayBtn.innerHTML = `<img src="next_day_icon.png" style="width: ${NEXT_DAY_BTN_SIZE}px; height: ${NEXT_DAY_BTN_SIZE}px; pointer-events: none; border-radius: 12px; transition: filter 0.2s ease, transform 0.2s ease; background: transparent;">`;
    nextDayBtn.style.cssText = `position: absolute; top: ${NEXT_DAY_BTN_TOP}px; left: 50%; transform: translateX(-50%); background: none; border: none; cursor: pointer; z-index: 55; padding: 0; box-shadow: none; outline: none;`;
    document.getElementById('game-screen').appendChild(nextDayBtn);
    
    nextDayBtn.onmouseover = () => {
        const img = nextDayBtn.querySelector('img');
        img.style.filter = 'brightness(1.2) drop-shadow(0 0 10px rgba(244, 208, 63, 0.9))';
        img.style.transform = 'scale(1.1)';
    };
    nextDayBtn.onmouseout = () => {
        const img = nextDayBtn.querySelector('img');
        img.style.filter = 'none';
        img.style.transform = 'scale(1)';
    };
    nextDayBtn.onclick = nextDay;

    window.applyNextDayMobileStyle = function() {
        const isMobile = window.innerWidth <= 768;
        const btn = document.getElementById('btnNextDay');
        if (btn) {
            const img = btn.querySelector('img');
            if (isMobile) {
                btn.style.top = MOBILE_NEXT_DAY_BTN_TOP + 'px';
                if (img) {
                    img.style.width = MOBILE_NEXT_DAY_BTN_SIZE + 'px';
                    img.style.height = MOBILE_NEXT_DAY_BTN_SIZE + 'px';
                }
            } else {
                btn.style.top = NEXT_DAY_BTN_TOP + 'px';
                if (img) {
                    img.style.width = NEXT_DAY_BTN_SIZE + 'px';
                    img.style.height = NEXT_DAY_BTN_SIZE + 'px';
                }
            }
        }
        adjustMapTop(); 
    };
    window.applyNextDayMobileStyle();
    window.addEventListener('resize', window.applyNextDayMobileStyle);

    const exploreBtn = document.createElement('button');
    exploreBtn.className = 'bottom-btn';
    exploreBtn.id = 'btnExplore';
    exploreBtn.innerHTML = '<span class="btn-icon-large">🧭</span><span class="btn-label">اکتشاف</span>';
    bottomBar.appendChild(exploreBtn);

    const requestsBtn = document.createElement('button');
    requestsBtn.className = 'bottom-btn';
    requestsBtn.id = 'btnRequests';
    requestsBtn.innerHTML = '<span class="btn-icon-large">📜</span><span class="btn-label">درخواست‌ها</span>';
    bottomBar.appendChild(requestsBtn);

    const angryMoveModal = document.createElement('div');
    angryMoveModal.id = 'angryMoveModal';
    angryMoveModal.style.cssText = "position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); width: 400px; max-width: 95%; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 16px; z-index: 500; display: none; flex-direction: row; gap: 15px; padding: 20px; align-items: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);";
    angryMoveModal.innerHTML = `
        <div style="flex: 1; text-align: right;">
            <h3 style="color: #e74c3c; margin-bottom: 10px; font-size: 1rem;">گزارش شهروندان</h3>
            <p style="color: #e8dcc8; font-size: 0.85rem; line-height: 1.6;">بابا ما مگه چقدر جون داریم؟ هی از این خونه به اون خونه می‌بریمون... یه کم آروم باش!</p>
            <button id="angryMoveBtn" style="margin-top: 12px; padding: 8px 20px; background: linear-gradient(145deg, #e74c3c, #c0392b); border: none; border-radius: 6px; color: #fff; font-weight: 700; cursor: pointer;">متوجه شدم</button>
        </div>
        <img src="angry_move.png?t=${new Date().getTime()}" style="width: 90px; height: 90px; object-fit: contain; border-radius: 10px; background: #111; border: 1px solid #333; flex-shrink: 0;">
    `;
    document.getElementById('game-screen').appendChild(angryMoveModal);
    document.getElementById('angryMoveBtn').onclick = () => angryMoveModal.style.display = 'none';

    const complaintModal = document.createElement('div');
    complaintModal.id = 'complaintModal';
    complaintModal.style.cssText = "position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); width: 400px; max-width: 95%; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 16px; z-index: 500; display: none; flex-direction: row; gap: 15px; padding: 20px; align-items: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);";
    complaintModal.innerHTML = `
        <div style="flex: 1; text-align: right;">
            <h3 style="color: #e74c3c; margin-bottom: 10px; font-size: 1rem;">گزارش شهروندان</h3>
            <p id="complaintText" style="color: #e8dcc8; font-size: 0.85rem; line-height: 1.6;">ببین اقای رییس، ما ۵ نفری توی یک خونه زندگی می‌کنیم، دیوونه شدیم! در حالی که خونه ی دیگه ات جمعیتش کمتره! یه کاری بکن لطفاً...</p>
            <button id="complaintBtn" style="margin-top: 12px; padding: 8px 20px; background: linear-gradient(145deg, #e74c3c, #c0392b); border: none; border-radius: 6px; color: #fff; font-weight: 700; cursor: pointer;">متوجه شدم</button>
        </div>
        <img src="complaint.png?t=${new Date().getTime()}" style="width: 90px; height: 90px; object-fit: contain; border-radius: 10px; background: #111; border: 1px solid #333; flex-shrink: 0;">
    `;
    document.getElementById('game-screen').appendChild(complaintModal);
    document.getElementById('complaintBtn').onclick = () => {
        complaintModal.style.display = 'none';
        gameState.satisfaction = Math.max(0, gameState.satisfaction - 1); 
        updateUI();
        showNotification("۱ درصد رضایت کم شد!", "warning");
    };
    
    const starvationModal = document.createElement('div');
    starvationModal.id = 'starvationModal';
    starvationModal.style.cssText = "position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); width: 400px; max-width: 95%; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(231, 76, 60, 0.5); border-radius: 16px; z-index: 500; display: none; flex-direction: row; gap: 15px; padding: 20px; align-items: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);";
    starvationModal.innerHTML = `
        <div style="flex: 1; text-align: right;">
            <h3 style="color: #e74c3c; margin-bottom: 10px; font-size: 1rem;">گزارش تلفات</h3>
            <p id="starvationText" style="color: #e8dcc8; font-size: 0.85rem; line-height: 1.6;"></p>
            <button id="starvationBtn" style="margin-top: 12px; padding: 8px 20px; background: linear-gradient(145deg, #e74c3c, #c0392b); border: none; border-radius: 6px; color: #fff; font-weight: 700; cursor: pointer;">متوجه شدم</button>
        </div>
        <img src="starvation.png?t=${new Date().getTime()}" style="width: 90px; height: 90px; object-fit: contain; border-radius: 10px; background: #111; border: 1px solid #333; flex-shrink: 0;">
    `;
    document.getElementById('game-screen').appendChild(starvationModal);
    document.getElementById('starvationBtn').onclick = () => starvationModal.style.display = 'none';

    const unlockModal = document.createElement('div');
    unlockModal.id = 'unlockModal';
    unlockModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: rgba(10,14,26,0.98); padding: 20px; border-radius: 12px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: center; box-shadow: 0 0 30px rgba(0,0,0,0.8);";
    unlockModal.innerHTML = `
        <h3 id="txtUnlockTitle" style="color: #f4d03f; margin-bottom: 15px;">باز کردن قفل</h3>
        <p id="txtUnlockQ" style="color: #e8dcc8; margin-bottom: 5px;">آیا می‌خواهید این قفل را باز کنید؟</p>
        <p id="txtUnlockCost" style="color: #aaa; font-size: 0.8rem; margin-bottom: 20px;">این کار ۱۰ سنگ هزینه دارد.</p>
        <div style="display: flex; gap: 10px;">
            <button id="txtUnlockYes" style="flex:1; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">بله، باز کن</button>
            <button id="txtCancelUnlock" style="flex:1; padding:10px; background:transparent; border:1px solid #8a7a6a; border-radius:6px; color:#f5e6c8; cursor:pointer;">انصراف</button>
        </div>
    `;
    document.getElementById('game-screen').appendChild(unlockModal);
    document.getElementById('txtUnlockYes').onclick = () => {
        unlockModal.style.display = 'none';
        if (gameState.stone >= 10) {
            gameState.stone -= 10;
            gameState.unlockedHexes.push(gameState.pendingUnlockTarget);
            updateUI();
            showNotification("قفل باز شد و ۱۰ سنگ کم شد!", "success");
            if (gameState.tutorialStep === 1) {
                gameState.tutorialStep = 2;
                updateTutorialBox();
            } else if (gameState.tutorialStep === 9) {
                gameState.tutorialStep = 10;
                updateTutorialBox();
            }
        } else { showNotification("سنگ کافی نداری!", "warning"); }
    };
    document.getElementById('txtCancelUnlock').onclick = () => unlockModal.style.display = 'none';

    const dispatchTroopsModal = document.createElement('div');
    dispatchTroopsModal.id = 'dispatchTroopsModal';
    dispatchTroopsModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9); width: 350px; background: rgba(10,14,26,0.98); padding: 25px; border-radius: 16px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: center; box-shadow: 0 0 40px rgba(0,0,0,0.9); opacity: 0; transition: 0.3s;";
    dispatchTroopsModal.innerHTML = `
        <h3 id="txtDispatchTitle" style="color: #f4d03f; margin-bottom: 5px;">اعزام نیرو</h3>
        <p style="color: #aaa; font-size: 0.85rem; margin-bottom: 20px;"><span id="txtDispatchQ">اعزام شوند؟</span> <span id="modalRegionName" style="color:#f4d03f; font-weight:bold;"></span></p>
        <div id="dispatchTroopsBtns" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 20px;"></div>
        <button id="txtCancelDispatch" style="width: 100%; padding: 10px; background: transparent; border: 1px solid #8a7a6a; border-radius: 6px; color: #f5e6c8; cursor: pointer;">انصراف</button>
    `;
    document.getElementById('game-screen').appendChild(dispatchTroopsModal);
    document.getElementById('txtCancelDispatch').onclick = () => {
        dispatchTroopsModal.style.display = 'none';
        dispatchTroopsModal.style.opacity = 0;
    };

    const panelExplore = document.createElement('div');
    panelExplore.className = 'floating-panel';
    panelExplore.id = 'panelExplore';
    panelExplore.innerHTML = `
        <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(201,168,76,0.1);">
            <h3 id="txtExploreTitle" style="font-size:1rem; color:#f4d03f;">اکتشاف</h3>
            <button id="closeExplorePanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        <div class="panel-body" style="padding:16px; max-height: 400px; overflow-y: auto;">
            <div class="build-item-new" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px; padding:12px;">
                <div style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">کویر لوت</div>
                <div class="region-risk" data-val="۰ تا ۱۰۰ درصد" style="font-size:0.8rem; color:#aaa;">مقدار تلفات: ۰ تا ۱۰۰ درصد</div>
                <div class="region-reward" data-val="۳۰ چوب، ۳۰ سنگ، ۲۰ غذا، ۵ سوخت" style="font-size:0.8rem; color:#f4d03f;">پاداش هر بازگشته: ۳۰ چوب، ۳۰ سنگ، ۲۰ غذا، ۵ سوخت</div>
                <button id="dispatchLut" class="build-btn dispatch-text" style="width:100%; margin-top:5px;">اعزام نیرو</button>
            </div>
            <div class="build-item-new" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px; padding:12px;">
                <div style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">آبشار لاتون</div>
                <div class="region-risk" data-val="۰ تا ۷۰ درصد" style="font-size:0.8rem; color:#aaa;">مقدار تلفات: ۰ تا ۷۰ درصد</div>
                <div class="region-reward" data-val="۱۰ غذا، ۲۰ سنگ" style="font-size:0.8rem; color:#f4d03f;">پاداش هر بازگشته: ۱۰ غذا، ۲۰ سنگ</div>
                <button id="dispatchLaton" class="build-btn dispatch-text" style="width:100%; margin-top:5px;">اعزام نیرو</button>
            </div>
            <div class="build-item-new" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
                <div style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">تخت جمشید</div>
                <div class="region-risk" data-val="۰ تا ۴۰ درصد" style="font-size:0.8rem; color:#aaa;">مقدار تلفات: ۰ تا ۴۰ درصد</div>
                <div class="region-reward" data-val="۱۰ چوب، ۱۰ سنگ" style="font-size:0.8rem; color:#f4d03f;">پاداش هر بازگشته: ۱۰ چوب، ۱۰ سنگ</div>
                <button id="dispatchPersepolis" class="build-btn dispatch-text" style="width:100%; margin-top:5px;">اعزام نیرو</button>
            </div>
        </div>
    `;
    document.getElementById('game-screen').appendChild(panelExplore);

    const panelRequests = document.createElement('div');
    panelRequests.className = 'floating-panel';
    panelRequests.id = 'panelRequests';
    panelRequests.innerHTML = `
        <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(201,168,76,0.1);">
            <h3 style="font-size:1rem; color:#f4d03f;">درخواست‌ها</h3>
            <button id="closeRequestsPanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        <div class="panel-body" id="requestTrackerBody" style="padding:16px; max-height: 400px; overflow-y: auto;">
            <p class="no-req-msg" style="color: #aaa; text-align: center; font-size: 0.9rem;">در حال حاضر درخواستی وجود ندارد.</p>
        </div>
    `;
    document.getElementById('game-screen').appendChild(panelRequests);
    document.getElementById('closeRequestsPanel').onclick = () => panelRequests.classList.remove('panel-open');

    const panelBuild = document.getElementById('panelBuild');
    panelBuild.innerHTML = `
        <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(201,168,76,0.1);">
            <h3 id="txtBuildTitle" style="font-size:1rem; color:#f4d03f;">ساخت و ساز</h3>
            <button id="closeBuildPanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        <div class="panel-body" style="padding:16px;">
            <div class="build-item-new" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:15px; border:1px solid rgba(255,255,255,0.1); margin-bottom: 15px;">
                <div class="build-info-text" style="display:flex; flex-direction:column; gap:5px;">
                    <div id="txtBuildHouse" class="build-name" style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">ساخت خانه جدید</div>
                    <div style="font-size:0.8rem; color:#aaa;">هزینه: ۱۰ چوب</div>
                    <div class="build-buttons" style="display:flex; gap:8px; margin-top:5px;">
                        <button id="txtBuildBtn" class="build-btn" style="padding:8px 16px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">ساخت</button>
                    </div>
                </div>
                <img src="house.png?t=${new Date().getTime()}" style="width:80px; height:80px; object-fit:contain; border-radius:8px; background:#111; border:1px solid #333;">
            </div>

            <div class="build-item-new" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:15px; border:1px solid rgba(255,255,255,0.1);">
                <div class="build-info-text" style="display:flex; flex-direction:column; gap:5px;">
                    <div class="build-name" style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">ساخت نیروگاه</div>
                    <div style="font-size:0.8rem; color:#aaa;">هزینه: ۱۰ سنگ</div>
                    <div class="build-buttons" style="display:flex; gap:8px; margin-top:5px;">
                        <button id="selectPowerPlant" class="build-btn" style="padding:8px 16px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">ساخت</button>
                    </div>
                </div>
                <img src="powerplant.png?t=${new Date().getTime()}" style="width:80px; height:80px; object-fit:contain; border-radius:8px; background:#111; border:1px solid #333;">
            </div>
        </div>
    `;

    const panelMovePop = document.createElement('div');
    panelMovePop.className = 'floating-panel';
    panelMovePop.id = 'panelMovePop';
    panelMovePop.innerHTML = `
        <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(201,168,76,0.1);">
            <h3 id="txtMovePopTitle" style="font-size:1rem; color:#f4d03f;">انتقال جمعیت</h3>
            <button id="closeMovePopPanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        <div class="panel-body" style="padding:16px; text-align:center;">
            <p id="txtMovePrompt" style="color:#f5e6c8; margin-bottom:10px;">چند نفر منتقل شوند؟</p>
            <div id="movePopBtns" style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin:15px 0;"></div>
            <button id="txtMovePopBtn" class="build-btn" style="width:100%; margin-top:10px;">انتقال</button>
        </div>
    `;
    document.getElementById('game-screen').appendChild(panelMovePop);

    const tracker = document.createElement('div');
    tracker.id = 'expeditionTracker';
    tracker.style.cssText = "position: fixed; right: 20px; top: 70px; width: 220px; z-index: 200; display: flex; flex-direction: column; gap: 10px;";
    document.getElementById('game-screen').appendChild(tracker);

    const resultModal = document.createElement('div');
    resultModal.id = 'expeditionResultModal';
    resultModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: rgba(10,14,26,0.98); padding: 20px; border-radius: 12px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: right; box-shadow: 0 0 30px rgba(0,0,0,0.8);";
    resultModal.innerHTML = `
        <h3 id="txtResultTitle" style="color: #f4d03f; text-align: center; margin-bottom: 15px;">گزارش اکتشاف</h3>
        <div id="resultText" style="color: #e8dcc8; font-size: 1rem; line-height: 1.8;"></div>
        <button id="txtCloseResult" style="margin-top: 15px; width: 100%; padding: 10px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 6px; color: #1a1a2e; font-weight: 700; cursor: pointer;">دریافت</button>
    `;
    document.getElementById('game-screen').appendChild(resultModal);
    document.getElementById('txtCloseResult').onclick = () => resultModal.style.display = 'none';

    const migrantModal = document.createElement('div');
    migrantModal.id = 'migrantModal';
    migrantModal.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 350px; max-width: 90%; background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; z-index: 1000; display: none; flex-direction: column; align-items: center; gap: 20px; box-shadow: 0 0 40px rgba(0,0,0,0.9); text-align: center;";
    migrantModal.innerHTML = `
        <h3 style="color: #f4d03f; font-size: 1.2rem; margin: 0;">درخواست پناهندگی</h3>
        <p id="migrantText" style="color: #e8dcc8; margin: 0; font-size: 0.95rem; line-height: 1.8;"></p>
        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <button id="migrantAccept" style="padding: 12px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 8px; color: #1a1a2e; font-weight: 700; cursor: pointer; font-size: 1rem;">پذیرش و میزبانی</button>
            <button id="migrantWait" style="padding: 10px; background: transparent; border: 1px solid #8a7a6a; border-radius: 8px; color: #f5e6c8; cursor: pointer; font-size: 0.9rem;">فعلاً در انتظار بمانند</button>
            <button id="migrantReject" style="padding: 10px; background: transparent; border: 1px solid #e74c3c; border-radius: 8px; color: #e74c3c; cursor: pointer; font-size: 0.9rem;">رد کردن و رها کردن</button>
        </div>
    `;
    document.getElementById('game-screen').appendChild(migrantModal);

    const menuHTML = `
        <div id="pauseModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 2000; display: none; justify-content: center; align-items: center;">
            <div style="background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; text-align: center; width: 300px;">
                <h2 id="txtPauseTitle" style="color: #f4d03f; margin-bottom: 20px;">منوی توقف</h2>
                <button id="txtResume" style="display:block; width:100%; margin-bottom:10px; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">ادامه بازی</button>
                <button id="txtSettings1" style="display:block; width:100%; margin-bottom:10px; padding:10px; background:transparent; border:1px solid #8a7a6a; border-radius:6px; color:#f5e6c8; cursor:pointer;">تنظیمات</button>
                <button id="txtExit" style="display:block; width:100%; padding:10px; background:transparent; border:1px solid #e74c3c; border-radius:6px; color:#e74c3c; cursor:pointer;">خروج</button>
            </div>
        </div>

        <div id="settingsModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2001; display: none; justify-content: center; align-items: center;">
            <div style="background: rgba(10,14,26,0.98); padding: 30px; border-radius: 16px; border: 1px solid #f4d03f; width: 400px;">
                <h2 id="txtSettingsTitle" style="color: #f4d03f; margin-bottom: 20px; text-align: center;">تنظیمات</h2>
                <div style="display: flex; justify-content: space-around; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                    <button id="tabVideo" style="background:none; border:none; color:#aaa; font-weight:bold; cursor:pointer; font-size: 1rem;">ویدیو</button>
                    <button id="tabAudio" style="background:none; border:none; color:#f4d03f; font-weight:bold; cursor:pointer; font-size: 1rem;">صدا</button>
                    <button id="tabControls" style="background:none; border:none; color:#aaa; font-weight:bold; cursor:pointer; font-size: 1rem;">کنترل ها</button>
                </div>

                <div id="contentVideo" style="display:none; text-align:center;">
                    <p id="txtLangSel" style="color:#f5e6c8; margin-bottom:10px;">انتخاب زبان:</p>
                    <select id="langSelect" style="width:100%; padding:10px; background:#111; color:#fff; border:1px solid #333; border-radius:6px;">
                        <option value="fa">فارسی</option>
                        <option value="en">English</option>
                    </select>
                </div>

                <div id="contentAudio" style="display:block; text-align:center;">
                    <p id="txtMusicVol" style="color:#f5e6c8; margin-bottom:10px;">صدای موسیقی:</p>
                    <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="0.4" style="width:100%; cursor:pointer;">
                    <button id="btnMute" style="margin-top:10px; padding:5px 15px; background:transparent; border:1px solid #e74c3c; color:#e74c3c; border-radius:4px; cursor:pointer;">قطع صدا</button>
                </div>

                <div id="contentControls" style="display:none; text-align:center;">
                    <p id="txtRebind" style="color:#f5e6c8; margin-bottom:10px;">برای تغییر دکمه، روی آن کلیک کنید و دکمه جدید را فشار دهید.</p>
                    <div style="display:flex; flex-direction:column; gap:10px; align-items:center;">
                        <div style="color:#fff; display:flex; align-items:center; gap:10px;"><span id="txtBindUp">حرکت به بالا</span><button id="bindUp" style="padding:5px 15px; background:#111; color:#fff; border:1px solid #f4d03f; border-radius:4px; cursor:pointer;">W</button></div>
                        <div style="color:#fff; display:flex; align-items:center; gap:10px;"><span id="txtBindDown">حرکت به پایین</span><button id="bindDown" style="padding:5px 15px; background:#111; color:#fff; border:1px solid #f4d03f; border-radius:4px; cursor:pointer;">S</button></div>
                        <div style="color:#fff; display:flex; align-items:center; gap:10px;"><span id="txtBindLeft">حرکت به چپ</span><button id="bindLeft" style="padding:5px 15px; background:#111; color:#fff; border:1px solid #f4d03f; border-radius:4px; cursor:pointer;">A</button></div>
                        <div style="color:#fff; display:flex; align-items:center; gap:10px;"><span id="txtBindRight">حرکت به راست</span><button id="bindRight" style="padding:5px 15px; background:#111; color:#fff; border:1px solid #f4d03f; border-radius:4px; cursor:pointer;">D</button></div>
                    </div>
                </div>

                <button id="txtBack" style="display:block; width:100%; margin-top:20px; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">بازگشت</button>
            </div>
        </div>
    `;
    document.getElementById('game-screen').insertAdjacentHTML('beforeend', menuHTML);

    document.getElementById('txtResume').onclick = togglePauseMenu;
    document.getElementById('txtExit').onclick = () => {
        saveGame(false, true);
    };
    
    document.getElementById('txtSettings1').onclick = () => {
        document.getElementById('pauseModal').style.display = 'none';
        document.getElementById('settingsModal').style.display = 'flex';
    };
    document.getElementById('txtBack').onclick = () => {
        document.getElementById('settingsModal').style.display = 'none';
        document.getElementById('pauseModal').style.display = 'flex';
    };

    function switchTab(tab) {
        document.getElementById('contentVideo').style.display = tab === 'video' ? 'block' : 'none';
        document.getElementById('contentAudio').style.display = tab === 'audio' ? 'block' : 'none';
        document.getElementById('contentControls').style.display = tab === 'controls' ? 'block' : 'none';
        document.getElementById('tabVideo').style.color = tab === 'video' ? '#f4d03f' : '#aaa';
        document.getElementById('tabAudio').style.color = tab === 'audio' ? '#f4d03f' : '#aaa';
        document.getElementById('tabControls').style.color = tab === 'controls' ? '#f4d03f' : '#aaa';
    }
    document.getElementById('tabVideo').onclick = () => switchTab('video');
    document.getElementById('tabAudio').onclick = () => switchTab('audio');
    document.getElementById('tabControls').onclick = () => switchTab('controls');

    const volumeSlider = document.getElementById('volumeSlider');
    volumeSlider.value = bgMusic.volume;
    volumeSlider.oninput = () => {
        bgMusic.volume = parseFloat(volumeSlider.value);
        document.getElementById('btnMute').innerText = bgMusic.volume === 0 ? LANG[gameState.currentLang].unmute : LANG[gameState.currentLang].mute;
    };
    document.getElementById('btnMute').onclick = () => {
        if (bgMusic.volume > 0) {
            bgMusic.volume = 0;
            volumeSlider.value = 0;
            document.getElementById('btnMute').innerText = LANG[gameState.currentLang].unmute;
        } else {
            bgMusic.volume = 0.4;
            volumeSlider.value = 0.4;
            document.getElementById('btnMute').innerText = LANG[gameState.currentLang].mute;
        }
    };

    document.getElementById('langSelect').onchange = (e) => {
        applyLang(e.target.value);
        showNotification(LANG[gameState.currentLang].langChanged, "info");
    };

    updateBindTexts();
    document.getElementById('bindUp').onclick = () => { gameState.rebindingKey = 'up'; document.getElementById('bindUp').innerText = '...'; };
    document.getElementById('bindDown').onclick = () => { gameState.rebindingKey = 'down'; document.getElementById('bindDown').innerText = '...'; };
    document.getElementById('bindLeft').onclick = () => { gameState.rebindingKey = 'left'; document.getElementById('bindLeft').innerText = '...'; };
    document.getElementById('bindRight').onclick = () => { gameState.rebindingKey = 'right'; document.getElementById('bindRight').innerText = '...'; };

    document.getElementById('btnBuild').onclick = () => {
        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 2 && gameState.tutorialStep !== 10) {
            showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return;
        }
        closeAllPanels('panelBuild');
        panelBuild.classList.add('panel-open');
        if (gameState.tutorialStep === 2) { gameState.tutorialStep = 3; updateTutorialBox(); }
        else if (gameState.tutorialStep === 10) { gameState.tutorialStep = 11; updateTutorialBox(); }
    };
    document.getElementById('closeBuildPanel').onclick = () => panelBuild.classList.remove('panel-open');
    
    document.getElementById('txtBuildBtn').onclick = () => {
        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 3) {
            showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return;
        }
        gameState.isPlacing = true;
        gameState.placingType = 'house';
        panelBuild.classList.remove('panel-open');
        if (gameState.tutorialStep === 3) { gameState.tutorialStep = 4; updateTutorialBox(); }
    };

    document.getElementById('selectPowerPlant').onclick = () => {
        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 11) {
            showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return;
        }
        gameState.isPlacing = true;
        gameState.placingType = 'powerplant';
        panelBuild.classList.remove('panel-open');
        if (gameState.tutorialStep === 11) { gameState.tutorialStep = 12; updateTutorialBox(); }
    };

    exploreBtn.onclick = () => {
        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 5) {
            showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return;
        }
        closeAllPanels('panelExplore');
        panelExplore.classList.add('panel-open');
        if (gameState.tutorialStep === 5) { gameState.tutorialStep = 6; updateTutorialBox(); }
    };
    document.getElementById('closeExplorePanel').onclick = () => panelExplore.classList.remove('panel-open');

    requestsBtn.onclick = () => {
        if (gameState.tutorialStep > 0 && gameState.tutorialStep < 17) {
            showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return;
        }
        closeAllPanels('panelRequests');
        panelRequests.classList.add('panel-open');
    };

    const openDispatchModal = (regionName) => {
        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 6) {
            showNotification("لطفاً طبق آموزش پیش برو!", "warning"); return;
        }
        if (gameState.tutorialStep === 6 && regionName !== 'تخت جمشید') { 
            showNotification("در آموزش فقط تخت جمشید رو انتخاب کن!", "warning"); return; 
        }

        if (gameState.population <= 1) {
            showNotification("شهروند کافی برای اعزام ندارید! (حداقل ۲ نفر در کل بازی لازم است)", "warning");
            panelExplore.classList.remove('panel-open');
            return;
        }
        const maxTroops = Math.max(1, gameState.population - 1);

        if (gameState.tutorialStep === 6) {
            gameState.tutorialStep = 7;
            updateTutorialBox();
        }

        gameState.selectedRegion = regionName;
        document.getElementById('modalRegionName').innerText = regionName;
        
        const btnsDiv = document.getElementById('dispatchTroopsBtns');
        btnsDiv.innerHTML = '';
        
        for(let i=1; i<=maxTroops; i++) {
            let b = document.createElement('button');
            b.innerText = i;
            b.style.cssText = "width: 50px; height: 50px; background: #2c3e50; color: #fff; border: 2px solid #f4d03f; border-radius: 8px; cursor: pointer; font-size: 1.2rem; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: 0.2s; margin: 5px;";
            b.onmouseover = () => b.style.background = '#34495e';
            b.onmouseout = () => b.style.background = '#2c3e50';
            b.onclick = () => {
                if (gameState.tutorialStep === 7 && i !== 1) {
                    showNotification("در آموزش باید ۱ نفر را اعزام کنی!", "warning"); return;
                }
                if (gameState.tutorialStep === 7) { gameState.tutorialStep = 7.5; }
                startExpedition(gameState.selectedRegion, i);
                dispatchTroopsModal.style.display = 'none';
                dispatchTroopsModal.style.opacity = 0;
                panelExplore.classList.remove('panel-open');
            };
            btnsDiv.appendChild(b);
        }
        
        dispatchTroopsModal.style.display = 'block';
        setTimeout(() => { dispatchTroopsModal.style.opacity = 1; dispatchTroopsModal.style.transform = 'translate(-50%, -50%) scale(1)'; }, 10);
    };

    document.getElementById('dispatchLut').onclick = () => openDispatchModal('کویر لوت');
    document.getElementById('dispatchLaton').onclick = () => openDispatchModal('آبشار لاتون');
    document.getElementById('dispatchPersepolis').onclick = () => openDispatchModal('تخت جمشید');

    document.getElementById('closeMovePopPanel').onclick = () => {
        document.getElementById('panelMovePop').classList.remove('panel-open');
        if (gameState.tutorialStep === 15) { gameState.tutorialStep = 14; updateTutorialBox(); }
    };
    
    document.getElementById('txtMovePopBtn').onclick = () => {
        if (gameState.moveAmount > 0) {
            gameState.isMovingPop = true;
            document.getElementById('panelMovePop').classList.remove('panel-open');
            showNotification("حالا روی خونه مقصد کلیک کن", "info");
            if (gameState.tutorialStep === 15) { gameState.tutorialStep = 16; updateTutorialBox(); }
        }
    };

    const gameScreen = document.getElementById('game-screen');
    const tutorialHTML = `
        <div id="tutorialBox" style="position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); width: 400px; max-width: 95%; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(201, 168, 76, 0.2); border-radius: 16px; z-index: 400; display: none; flex-direction: row; gap: 15px; padding: 20px; align-items: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
            <div style="flex: 1; text-align: right;">
                <h3 style="color: #f4d03f; margin-bottom: 10px; font-size: 1rem;">آموزش بازی</h3>
                <p id="tutorialText" style="color: #e8dcc8; font-size: 0.85rem; line-height: 1.6;"></p>
                <button id="tutorialBtn" style="margin-top: 12px; padding: 8px 20px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 6px; color: #1a1a2e; font-weight: 700; cursor: pointer; display: none;">متوجه شدم</button>
            </div>
            <img src="guide.png?t=${new Date().getTime()}" style="width: 90px; height: 90px; object-fit: contain; border-radius: 10px; background: #111; border: 1px solid #333; flex-shrink: 0;">
        </div>
    `;
    gameScreen.insertAdjacentHTML('beforeend', tutorialHTML);
}
window.onload = initGame;
