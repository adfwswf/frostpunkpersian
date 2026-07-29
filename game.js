// === تنظیمات قابل تغییر توسط شما (فقط این اعداد را تغییر دهید) ===
const PERSPECTIVE_Y = 0.6;        // زاویه شش ضلعی ها
const HOUSE_SCALE = 1.5;          // بزرگنمایی خانه
const BASE_Y_RATIO = 0.85;        // موقعیت پایه خونه
const HOUSE_OFFSET_X = 0;         // جابجایی چپ و راست
const HOUSE_OFFSET_Y = 3;         // جابجایی بالا و پایین
// =================================================================

const gameState = {
    day: 1, population: 5, fuel: 5, food: 15, wood: 20, stone: 10, heat: 5, hope: 30, satisfaction: 50,
    gameOver: false, isPlacing: false, isMovingPop: false, mouseX: 0, mouseY: 0,
    buildings: [], constructionSites: [], obstacles: [], clearingSites: [],
    hexes: [], hexSize: 45, clickedHex: null,
    HOUSE_HEXES: [{ q: 0, r: 0, pop: 5 }],
    tutorialStep: 1, 
    unlockedHexes: [],
    selectedRegion: null,
    moveSource: null,
    moveAmount: 0,
    expeditions: [],
    pendingUnlockTarget: null
};

const camera = { x: 0, y: 0, zoom: 1, dragging: false, dragStartX: 0, dragStartY: 0, startCamX: 0, startCamY: 0 };
let mapAnimId = null;

const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };

const houseImg = new Image();
houseImg.src = "house.png?t=" + new Date().getTime();

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
    let moveSpeed = 15 / camera.zoom;
    if (keys.KeyW) camera.y -= moveSpeed; if (keys.KeyS) camera.y += moveSpeed;
    if (keys.KeyA) camera.x -= moveSpeed; if (keys.KeyD) camera.x += moveSpeed;

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
                gameState.HOUSE_HEXES.push({ q: site.q, r: site.r, pop: 0 });
                showNotification("✅ خونه جدید ساخته شد!", "success");
                site.completed = true;
            }
            return false;
        }
        return true;
    });

    gameState.hexes.forEach(hex => {
        let houseData = gameState.HOUSE_HEXES.find(h => h.q === hex.q && h.r === hex.r);
        let isHouse = !!houseData;
        let dist = hexDistance(hex, { q: 0, r: 0 });
        let isLocked = dist > 1; 
        let isUnlocked = gameState.unlockedHexes.some(u => u.q === hex.q && u.r === hex.r);
        
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

            ctx.beginPath();
            ctx.arc(hex.x + 35, hex.y - 20, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fill();
            ctx.strokeStyle = '#f4d03f';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Vazirmatn';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(houseData.pop, hex.x + 35, hex.y - 20);
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

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Vazirmatn';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(timeLeft + 's', hex.x, hex.y);
        }
    });

    if (gameState.isPlacing && houseImg.complete && houseImg.naturalHeight !== 0) {
        let targetHex = getHoveredHex(gameState.mouseX, gameState.mouseY);
        let hex = gameState.hexes.find(h => h.q === targetHex.q && h.r === targetHex.r);
        if (hex) {
            let imgW = hexW * HOUSE_SCALE, imgH = imgW * (houseImg.naturalHeight / houseImg.naturalWidth);
            let drawX = hex.x - imgW / 2 + HOUSE_OFFSET_X, drawY = (hex.y - imgH * BASE_Y_RATIO) + HOUSE_OFFSET_Y; 
            ctx.globalAlpha = 0.6; ctx.drawImage(houseImg, drawX, drawY, imgW, imgH); ctx.globalAlpha = 1;
        }
    }

    ctx.restore();
    
    updateExpeditions();
}

function setupControls() {
    const canvas = document.getElementById('gameMap'); if(!canvas) return;
    window.addEventListener('keydown', e => { if (e.code in keys) { keys[e.code] = true; e.preventDefault(); } });
    window.addEventListener('keyup', e => { if (e.code in keys) keys[e.code] = false; });

    canvas.addEventListener('mousedown', e => {
        if (gameState.isPlacing) return;
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
            showNotification("ساخت لغو شد", "info");
        }
        if (gameState.isMovingPop) {
            gameState.isMovingPop = false;
            showNotification("انتقال لغو شد", "info");
        }
    });
    canvas.addEventListener('wheel', e => { 
        e.preventDefault(); 
        let newZoom = camera.zoom + (e.deltaY > 0 ? -0.1 : 0.1);
        const mW = 3000, mH = 3000, rect = canvas.getBoundingClientRect();
        let minZoom = Math.max(rect.width / mW, rect.height / mH);
        camera.zoom = Math.max(minZoom, Math.min(2, newZoom));
    }, { passive: false });
    
    canvas.addEventListener('click', () => { handleMapClick(); });
    
    canvas.addEventListener('touchstart', e => {
        if (gameState.isPlacing) {
            const rect = canvas.getBoundingClientRect();
            gameState.mouseX = camera.x + ((e.touches[0].clientX - rect.left) / camera.zoom);
            gameState.mouseY = camera.y + ((e.touches[0].clientY - rect.top) / camera.zoom);
            handleMapClick(); return;
        }
        if (e.touches.length === 1) {
            camera.dragging = true; camera.dragStartX = e.touches[0].clientX; camera.dragStartY = e.touches[0].clientY;
            camera.startCamX = camera.x; camera.startCamY = camera.y;
        }
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
        if (camera.dragging && e.touches.length === 1) {
            e.preventDefault();
            camera.x = camera.startCamX - (e.touches[0].clientX - camera.dragStartX) / camera.zoom;
            camera.y = camera.startCamY - (e.touches[0].clientY - camera.dragStartY) / camera.zoom;
        }
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
        if (camera.dragging && e.changedTouches.length === 1 && !gameState.isPlacing) {
             const rect = canvas.getBoundingClientRect();
             const tx = e.changedTouches[0].clientX - rect.left, ty = e.changedTouches[0].clientY - rect.top;
             const dx = tx - (camera.dragStartX - rect.left), dy = ty - (camera.dragStartY - rect.top);
             if(Math.sqrt(dx*dx + dy*dy) < 5) {
                 gameState.mouseX = camera.x + (tx / camera.zoom);
                 gameState.mouseY = camera.y + (ty / camera.zoom);
                 handleMapClick();
             }
        }
        camera.dragging = false;
    });
}

function handleMapClick() {
    const target = getHoveredHex(gameState.mouseX, gameState.mouseY);
    let dist = hexDistance(target, { q: 0, r: 0 });
    let isLocked = dist > 1; 
    let isUnlocked = gameState.unlockedHexes.some(u => u.q === target.q && u.r === target.r) || dist <= 1;
    let isHouse = gameState.HOUSE_HEXES.some(h => h.q === target.q && h.r === target.r);
    let isOccupied = gameState.constructionSites.some(c => c.q === target.q && c.r === target.r);

    if (gameState.isMovingPop) {
        let destHouse = gameState.HOUSE_HEXES.find(h => h.q === target.q && h.r === target.r);
        let sourceHouse = gameState.HOUSE_HEXES.find(h => h.q === gameState.moveSource.q && h.r === gameState.moveSource.r);
        
        if (destHouse && sourceHouse && destHouse !== sourceHouse) {
            sourceHouse.pop -= gameState.moveAmount;
            destHouse.pop += gameState.moveAmount;
            
            gameState.hope = Math.min(100, gameState.hope + 2);
            gameState.satisfaction = Math.min(100, gameState.satisfaction + 5);
            updateUI();
            
            gameState.isMovingPop = false;
            showNotification(`${gameState.moveAmount} نفر منتقل شدند! امید و رضایت بیشتر شد.`, "success");
            
            if (gameState.tutorialStep === 11) {
                gameState.tutorialStep = 12;
                updateTutorialBox();
            }
        } else {
            showNotification("روی یک خونه دیگر کلیک کن!", "warning");
        }
        return;
    }

    if (isHouse && !gameState.isPlacing) {
        let house = gameState.HOUSE_HEXES.find(h => h.q === target.q && h.r === target.r);
        if (house.pop > 0) {
            if (gameState.tutorialStep === 9 || gameState.tutorialStep === 0) {
                gameState.moveSource = target;
                openMovePopPanel(house.pop);
                if (gameState.tutorialStep === 9) {
                    gameState.tutorialStep = 10;
                    updateTutorialBox();
                }
            }
        } else {
            showNotification("این خونه خالیه!", "info");
        }
        return;
    }

    // === باز کردن قفل با کادر تایید (در هر زمان از بازی) ===
    if (isLocked && !isUnlocked && !isHouse && !isOccupied) {
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
            
            if (nIsHouse || nIsUnlocked) { 
                isAdjacent = true; 
                break; 
            }
        }

        if (!isAdjacent) {
            showNotification("برای باز کردن این قفل، باید یک منطقه باز در کنارش داشته باشید!", "warning");
            return;
        }

        if (gameState.tutorialStep > 0 && gameState.tutorialStep !== 2) {
            showNotification("فعلاً طبق آموزش پیش برو!", "info");
            return;
        }

        gameState.pendingUnlockTarget = target;
        document.getElementById('unlockModal').style.display = 'block';
        return;
    }

    if (gameState.tutorialStep === 5 && gameState.isPlacing) {
        if (isUnlocked) {
            if (gameState.wood >= 10) {
                gameState.wood -= 10;
                updateUI();
                gameState.isPlacing = false;
                gameState.constructionSites.push({ q: target.q, r: target.r, endTime: Date.now() + 30000, completed: false });
                
                gameState.tutorialStep = 6; 
                updateTutorialBox();
                
                showNotification("خونه در حال ساخت است و ۱۰ چوب کم شد!", "success");
            } else {
                showNotification("چوب کافی نداری!", "warning");
            }
        } else {
            showNotification("روی خونه‌ای که قفلش رو باز کردی کلیک کن!", "warning");
        }
        return;
    }

    if (gameState.tutorialStep > 0) {
        if (gameState.tutorialStep === 2) showNotification("روی یکی از خانه‌های تیره اطراف منطقه امن کلیک کن!", "info");
        else if (gameState.tutorialStep === 3) showNotification("حالا روی دکمه «ساخت و ساز» کلیک کن!", "info");
        else if (gameState.tutorialStep === 4) showNotification("روی دکمه «ساخت» کلیک کن!", "info");
        else if (gameState.tutorialStep === 6) showNotification("روی دکمه «اکتشاف» کلیک کن!", "info");
        return;
    }

    if (!gameState.isPlacing) return;

    if (dist > 1) { showNotification("این منطقه قفل است!", "warning"); return; }

    let tooClose = false;
    for (let h of gameState.HOUSE_HEXES) { if (hexDistance(target, h) <= 1) { tooClose = true; break; } }
    if (tooClose) { showNotification("نمیتوانید به خانه‌های دیگر بچسبانید!", "warning"); return; }

    if (isOccupied) { showNotification("در این مکان در حال ساخت است!", "warning"); return; }

    gameState.isPlacing = false;
    gameState.constructionSites.push({ q: target.q, r: target.r, endTime: Date.now() + 30000, completed: false });
    showNotification("خونه تا ۳۰ ثانیه دیگر ساخته می‌شود", "success");
}

function updateTutorialBox() {
    const txt = document.getElementById('tutorialText');
    const btn = document.getElementById('tutorialBtn');
    const pointer = document.getElementById('tutorialPointer');
    const box = document.getElementById('tutorialBox');
    if(!txt || !btn || !pointer || !box) return;

    box.style.display = 'flex'; 

    if (gameState.tutorialStep === 1) {
        txt.innerHTML = "سلام! من راهنمای تو در این سرمای سهم‌گین هستم. برای شروع، اول یکی از خانه‌های قفل‌شده رو انتخاب کن و با دادن ۵ سنگ قفلش رو باز کن.";
        btn.style.display = 'inline-block';
        btn.innerText = "متوجه شدم";
        pointer.style.display = 'none';
        btn.onclick = () => { gameState.tutorialStep = 2; updateTutorialBox(); };
    } else if (gameState.tutorialStep === 2) {
        box.style.display = 'none'; 
        btn.style.display = 'none';
        pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 3) {
        txt.innerHTML = "آفرین! قفل باز شد. حالا باید با دادن ۱۰ چوب یک خونه بسازی. روی دکمه «ساخت و ساز» در پایین صفحه کلیک کن.";
        btn.style.display = 'none';
        movePointer('btnBuild');
    } else if (gameState.tutorialStep === 4) {
        txt.innerHTML = "خوبه! حالا روی دکمه «ساخت» کلیک کن تا خونه به موس بچسبه.";
        btn.style.display = 'none';
        movePointer('selectHouse');
    } else if (gameState.tutorialStep === 5) {
        txt.innerHTML = "حالا روی اونجایی که قفلش رو باز کردی کلیک کن تا خونه اونجا ساخته بشه و ۱۰ چوب از تو کم بشه.";
        btn.style.display = 'none';
        pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 6) {
        txt.innerHTML = "خونه در حال ساخت است. حالا وقتشه بریم منابع بیشتری پیدا کنیم. روی دکمه «اکتشاف» در پایین صفحه کلیک کن.";
        btn.style.display = 'none';
        movePointer('btnExplore');
    } else if (gameState.tutorialStep === 7) {
        txt.innerHTML = "اینجا سه منطقه هست. روی منطقه «تخت جمشید» کلیک کن و دکمه «اعزام» اون رو بزن.";
        btn.style.display = 'inline-block'; 
        btn.innerText = "متوجه شدم";
        pointer.style.display = 'none';
        btn.onclick = () => { 
            gameState.tutorialStep = 7.5; 
            updateTutorialBox();
        };
    } else if (gameState.tutorialStep === 7.5) {
        box.style.display = 'none'; 
        btn.style.display = 'none';
        pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 9) {
        txt.innerHTML = "آفرین! نیروها اعزام شدند. حالا باید جمعیت رو بین خونه‌هات پخش کنی. برای شروع، روی خونه اصلی (همون خونه اول) کلیک کن.";
        btn.style.display = 'none';
        pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 10) {
        txt.innerHTML = "اینجا می‌تونی انتخاب کنی چند نفر رو می‌خوای منتقل کنی. یه عدد رو انتخاب کن و بعد روی دکمه «انتقال» بزن.";
        btn.style.display = 'none';
        pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 11) {
        txt.innerHTML = "حالا روی خونه جدیدت (همونی که تازه ساختی) کلیک کن تا آدم‌ها اونجا مستقر بشن.";
        btn.style.display = 'none';
        pointer.style.display = 'none';
    } else if (gameState.tutorialStep === 12) {
        txt.innerHTML = "عالیه! با پخش کردن آدم‌ها تو خونه‌ها، امید و رضایتت بیشتر میشه. آموزش تمومه، حالا خودت بازی رو پیش ببر!";
        btn.style.display = 'none';
        pointer.style.display = 'none';
        setTimeout(() => {
            gameState.tutorialStep = 0;
            const tBox = document.getElementById('tutorialBox');
            if(tBox) tBox.style.display = 'none';
        }, 8000);
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

// === سیستم اکتشاف ===
function startExpedition(regionName, troops) {
    const isTutorial = gameState.tutorialStep === 7.5;
    
    gameState.expeditions.push({
        id: Date.now(),
        region: regionName,
        troops: troops,
        startTime: Date.now(),
        endTime: Date.now() + 60000, 
        isTutorial: isTutorial
    });
    
    showNotification(`${troops} نفر به ${regionName} اعزام شدند!`, "success");
    
    if (isTutorial) {
        gameState.tutorialStep = 9; 
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
            const progress = 1 - (timeLeft / 60000);
            html += `
                <div style="background: rgba(10,14,26,0.9); padding: 10px; border-radius: 8px; border: 1px solid rgba(244,208,63,0.3); margin-bottom: 10px;">
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
        
        if (res.casualties > 0) {
            let mainHouse = gameState.HOUSE_HEXES.find(h => h.q === 0 && h.r === 0);
            if (mainHouse) mainHouse.pop = Math.max(0, mainHouse.pop - res.casualties);
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

function calculateExpeditionResult(exp) {
    if (exp.isTutorial) {
        return { wood: 5, stone: 3, food: 0, fuel: 0, casualties: 0 };
    }

    const regions = {
        'کویر لوت': { failMin: 70, failMax: 80, amountMin: 10, amountMax: 20, res: ['wood', 'stone', 'food', 'fuel'] },
        'آبشار لاتون': { failMin: 40, failMax: 60, amountMin: 5, amountMax: 10, res: ['food', 'stone'] },
        'تخت جمشید': { failMin: 10, failMax: 20, amountMin: 1, amountMax: 5, res: ['wood', 'stone'] }
    };

    const r = regions[exp.region];
    if (!r) return { casualties: exp.troops, wood:0, stone:0, food:0, fuel:0 };

    const failRate = Math.random() * (r.failMax - r.failMin) + r.failMin;
    const roll = Math.random() * 100;

    let casualties = 0;
    let resources = { wood: 0, stone: 0, food: 0, fuel: 0 };

    if (roll <= failRate) {
        if (Math.random() > 0.5) { 
            casualties = Math.floor(Math.random() * exp.troops) + 1;
        }
    } else {
        const amount = Math.floor(Math.random() * (r.amountMax - r.amountMin + 1)) + r.amountMin;
        r.res.forEach(res => {
            if (Math.random() > 0.3) { 
                resources[res] += Math.floor(Math.random() * amount) + 1;
            }
        });
    }

    return { ...resources, casualties };
}

function showExpeditionResult(exp, res) {
    const modal = document.getElementById('expeditionResultModal');
    const txt = document.getElementById('resultText');
    if(!modal || !txt) return;

    let html = `<div style="margin-bottom:10px;"><strong style="color:#f4d03f;">منطقه:</strong> ${exp.region}</div>`;
    html += `<div style="margin-bottom:10px;"><strong style="color:#e74c3c;">تلفات:</strong> ${res.casualties} نفر</div>`;
    html += `<div style="margin-bottom:10px; border-top:1px solid #333; padding-top:10px;"><strong style="color:#f4d03f;">گزارش منابع:</strong><br>`;
    
    let foundRes = false;
    if (res.wood > 0) { html += `🪵 چوب: ${res.wood}<br>`; foundRes = true; }
    if (res.stone > 0) { html += `🪨 سنگ: ${res.stone}<br>`; foundRes = true; }
    if (res.food > 0) { html += `🍖 غذا: ${res.food}<br>`; foundRes = true; }
    if (res.fuel > 0) { html += `🔥 سوخت: ${res.fuel}<br>`; foundRes = true; }
    
    if (!foundRes && res.casualties === 0) html += "هیچ منبعی به دست نیامد.";
    html += `</div>`;

    txt.innerHTML = html;
    modal.style.display = 'block';
}

function startGameLoop() { setInterval(() => { if (gameState.gameOver) return; gameState.day++; updateUI(); }, 20000); }
function updateUI() {
    let totalPop = gameState.HOUSE_HEXES.reduce((sum, h) => sum + h.pop, 0);
    gameState.population = totalPop;
    const el = id => document.getElementById(id);
    if(el('day')) el('day').textContent = gameState.day;
    if(el('population')) el('population').textContent = gameState.population;
    if(el('wood')) el('wood').textContent = gameState.wood;
    if(el('stone')) el('stone').textContent = gameState.stone;
    if(el('food')) el('food').textContent = Math.floor(gameState.food);
    if(el('fuel')) el('fuel').textContent = Math.floor(gameState.fuel);
    if(el('heat')) el('heat').textContent = gameState.heat + '%';
    if(el('hope')) el('hope').textContent = gameState.hope + '%';
    if(el('satisfaction')) el('satisfaction').textContent = gameState.satisfaction + '%';
}
function showNotification(text, type = 'info') {
    const c = document.getElementById('notification-container');
    if(c) { c.style.top = '65px'; c.style.left = '50%'; c.style.transform = 'translateX(-50%)'; c.style.zIndex = '10000'; }
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
    
    updateTutorialBox();
    
    if (!mapAnimId) { function anim() { drawMap(); mapAnimId = requestAnimationFrame(anim); } anim(); }
}

function openMovePopPanel(maxPop) {
    const btnsDiv = document.getElementById('movePopBtns');
    if(!btnsDiv) return;
    btnsDiv.innerHTML = '';
    for(let i=1; i<=maxPop; i++) {
        let b = document.createElement('button');
        b.className = 'dispatch-num-btn';
        b.innerText = i;
        b.onclick = () => {
            gameState.moveAmount = i;
            document.querySelectorAll('#movePopBtns button').forEach(btn => {
                btn.style.background = '#333'; btn.style.color = '#fff';
            });
            b.style.background = '#f4d03f'; b.style.color = '#000';
        };
        btnsDiv.appendChild(b);
    }
    gameState.moveAmount = 1;
    if(btnsDiv.firstChild) {
        btnsDiv.firstChild.style.background = '#f4d03f';
        btnsDiv.firstChild.style.color = '#000';
    }
    const pmp = document.getElementById('panelMovePop');
    if(pmp) pmp.classList.add('panel-open');
}

function initGame() {
    document.getElementById('startBtnHero').onclick = showStoryScreen;
    document.getElementById('startActualGameBtn').onclick = startActualGame;
    document.getElementById('eventClose').onclick = () => document.getElementById('event-panel').classList.replace('event-panel-visible', 'event-panel-hidden');
    
    const style = document.createElement('style');
    style.innerHTML = `
        #tutorialPointer {
            position: fixed; width: 60px; height: 60px; border-radius: 50%;
            border: 4px solid #f4d03f; box-shadow: 0 0 15px #f4d03f, inset 0 0 15px #f4d03f;
            z-index: 999; display: none; pointer-events: none;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
    `;
    document.head.appendChild(style);

    const pointerDiv = document.createElement('div');
    pointerDiv.id = 'tutorialPointer';
    document.body.appendChild(pointerDiv);

    // === پاک کردن دکمه اکتشاف بی‌فایده از نوار پایین ===
    const bottomBar = document.getElementById('bottom-bar');
    if (bottomBar) {
        Array.from(bottomBar.children).forEach(btn => {
            if (btn.innerText.includes('اکتشاف')) btn.remove();
        });
    }

    const exploreBtn = document.createElement('button');
    exploreBtn.className = 'bottom-btn';
    exploreBtn.id = 'btnExplore';
    exploreBtn.innerHTML = '<span class="btn-icon-large">🧭</span><span class="btn-label">اکتشاف</span>';
    bottomBar.appendChild(exploreBtn);

    // === کادر تایید باز کردن قفل ===
    const unlockModal = document.createElement('div');
    unlockModal.id = 'unlockModal';
    unlockModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: rgba(10,14,26,0.98); padding: 20px; border-radius: 12px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: center; box-shadow: 0 0 30px rgba(0,0,0,0.8);';
    unlockModal.innerHTML = `
        <h3 style="color: #f4d03f; margin-bottom: 15px;">باز کردن قفل</h3>
        <p style="color: #e8dcc8; margin-bottom: 5px;">آیا می‌خواهید این قفل را باز کنید؟</p>
        <p style="color: #aaa; font-size: 0.8rem; margin-bottom: 20px;">این کار ۵ سنگ هزینه دارد.</p>
        <div style="display: flex; gap: 10px;">
            <button id="confirmUnlockBtn" style="flex:1; padding:10px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-weight:700; cursor:pointer;">بله، باز کن</button>
            <button id="cancelUnlockBtn" style="flex:1; padding:10px; background:transparent; border:1px solid #8a7a6a; border-radius:6px; color:#f5e6c8; cursor:pointer;">انصراف</button>
        </div>
    `;
    document.getElementById('game-screen').appendChild(unlockModal);

    document.getElementById('confirmUnlockBtn').onclick = () => {
        unlockModal.style.display = 'none';
        if (gameState.stone >= 5) {
            gameState.stone -= 5;
            gameState.unlockedHexes.push(gameState.pendingUnlockTarget);
            updateUI();
            showNotification("قفل باز شد و ۵ سنگ کم شد!", "success");
            
            if (gameState.tutorialStep === 2) {
                gameState.tutorialStep = 3;
                updateTutorialBox();
            }
        } else {
            showNotification("سنگ کافی نداری!", "warning");
        }
    };
    document.getElementById('cancelUnlockBtn').onclick = () => {
        unlockModal.style.display = 'none';
    };

    // === پنل اکتشاف ===
    const panelExplore = document.createElement('div');
    panelExplore.className = 'floating-panel';
    panelExplore.id = 'panelExplore';
    panelExplore.innerHTML = `
        <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(201,168,76,0.1);">
            <h3 style="font-size:1rem; color:#f4d03f;">اکتشاف</h3>
            <button id="closeExplorePanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        <div class="panel-body" style="padding:16px; max-height: 400px; overflow-y: auto;">
            <div class="build-item-new" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px; padding:12px;">
                <div style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">کویر لوت</div>
                <div style="font-size:0.8rem; color:#aaa;">درصد شکست: ۷۰ تا ۸۰ درصد</div>
                <div style="font-size:0.8rem; color:#aaa;">مقدار منابع: زیاد</div>
                <div style="font-size:0.8rem; color:#f4d03f;">منابع احتمالی: چوب، سنگ، غذا، سوخت</div>
                <button id="dispatchLut" class="build-btn" style="width:100%; margin-top:5px;">اعزام نیرو</button>
            </div>
            <div class="build-item-new" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px; padding:12px;">
                <div style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">آبشار لاتون</div>
                <div style="font-size:0.8rem; color:#aaa;">درصد شکست: ۴۰ تا ۶۰ درصد</div>
                <div style="font-size:0.8rem; color:#aaa;">مقدار منابع: متوسط</div>
                <div style="font-size:0.8rem; color:#f4d03f;">منابع احتمالی: غذا، سنگ</div>
                <button id="dispatchLaton" class="build-btn" style="width:100%; margin-top:5px;">اعزام نیرو</button>
            </div>
            <div class="build-item-new" style="display:flex; flex-direction:column; gap:8px; padding:12px;">
                <div style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">تخت جمشید</div>
                <div style="font-size:0.8rem; color:#aaa;">درصد شکست: ۱۰ تا ۲۰ درصد</div>
                <div style="font-size:0.8rem; color:#aaa;">مقدار منابع: کم</div>
                <div style="font-size:0.8rem; color:#f4d03f;">منابع احتمالی: چوب، سنگ</div>
                <button id="dispatchPersepolis" class="build-btn" style="width:100%; margin-top:5px;">اعزام نیرو</button>
            </div>
            
            <div id="dispatchModal" style="display:none; margin-top:15px; padding:15px; background:rgba(0,0,0,0.3); border-radius:8px; text-align:center;">
                <p style="color:#f5e6c8; margin-bottom:10px;">چند نفر اعزام شوند؟ (۱ تا ۴ نفر)</p>
                <div style="display:flex; justify-content:center; gap:10px;">
                    <button class="dispatch-num-btn" data-count="1" style="padding:8px 12px; background:#333; color:#fff; border:none; border-radius:4px; cursor:pointer;">۱ نفر</button>
                    <button class="dispatch-num-btn" data-count="2" style="padding:8px 12px; background:#333; color:#fff; border:none; border-radius:4px; cursor:pointer;">۲ نفر</button>
                    <button class="dispatch-num-btn" data-count="3" style="padding:8px 12px; background:#333; color:#fff; border:none; border-radius:4px; cursor:pointer;">۳ نفر</button>
                    <button class="dispatch-num-btn" data-count="4" style="padding:8px 12px; background:#333; color:#fff; border:none; border-radius:4px; cursor:pointer;">۴ نفر</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('game-screen').appendChild(panelExplore);

    const panelBuild = document.getElementById('panelBuild');
    panelBuild.innerHTML = `
        <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(201,168,76,0.1);">
            <h3 style="font-size:1rem; color:#f4d03f;">ساخت و ساز</h3>
            <button id="closeBuildPanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        <div class="panel-body" style="padding:16px;">
            <div class="build-item-new" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); border-radius:10px; padding:15px; border:1px solid rgba(255,255,255,0.1);">
                <div class="build-info-text" style="display:flex; flex-direction:column; gap:10px;">
                    <div class="build-name" style="font-size:1.1rem; font-weight:700; color:#f5e6c8;">ساخت خانه جدید</div>
                    <div class="build-buttons" style="display:flex; gap:8px;">
                        <button class="build-btn" id="selectHouse" style="padding:8px 16px; background:linear-gradient(145deg, #f4d03f, #c9a84c); border:none; border-radius:6px; color:#1a1a2e; font-family:'Vazirmatn'; font-weight:700; cursor:pointer;">ساخت</button>
                        <button class="survey-btn" id="surveyBtn" style="padding:8px 16px; background:transparent; border:1px solid #8a7a6a; border-radius:6px; color:#f5e6c8; font-family:'Vazirmatn'; cursor:pointer;">نظر سنجی</button>
                    </div>
                </div>
                <div class="build-image" style="width:80px; height:80px; display:flex; align-items:center; justify-content:center; background:#111; border-radius:8px; border:1px solid #333; font-size:40px;">🏠</div>
            </div>
        </div>
    `;

    const panelMovePop = document.createElement('div');
    panelMovePop.className = 'floating-panel';
    panelMovePop.id = 'panelMovePop';
    panelMovePop.innerHTML = `
        <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(201,168,76,0.1);">
            <h3 style="font-size:1rem; color:#f4d03f;">انتقال جمعیت</h3>
            <button id="closeMovePopPanel" style="background:none; border:none; color:#8a9aaa; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>
        <div class="panel-body" style="padding:16px; text-align:center;">
            <p style="color:#f5e6c8; margin-bottom:10px;">چند نفر منتقل شوند؟</p>
            <div id="movePopBtns" style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin:15px 0;"></div>
            <button id="confirmMoveBtn" class="build-btn" style="width:100%; margin-top:10px;">انتقال</button>
        </div>
    `;
    document.getElementById('game-screen').appendChild(panelMovePop);

    // === ردیاب اکتشاف ===
    const tracker = document.createElement('div');
    tracker.id = 'expeditionTracker';
    tracker.style.cssText = 'position: fixed; right: 20px; top: 70px; width: 220px; z-index: 200; display: flex; flex-direction: column; gap: 10px;';
    document.getElementById('game-screen').appendChild(tracker);

    // === کادر نتایج اکتشاف ===
    const resultModal = document.createElement('div');
    resultModal.id = 'expeditionResultModal';
    resultModal.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 300px; background: rgba(10,14,26,0.98); padding: 20px; border-radius: 12px; border: 1px solid #f4d03f; z-index: 1000; display: none; text-align: right; box-shadow: 0 0 30px rgba(0,0,0,0.8);';
    resultModal.innerHTML = `
        <h3 style="color: #f4d03f; text-align: center; margin-bottom: 15px;">گزارش اکتشاف</h3>
        <div id="resultText" style="color: #e8dcc8; font-size: 1rem; line-height: 1.8;"></div>
        <button id="closeResultBtn" style="margin-top: 15px; width: 100%; padding: 10px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 6px; color: #1a1a2e; font-weight: 700; cursor: pointer;">دریافت</button>
    `;
    document.getElementById('game-screen').appendChild(resultModal);
    
    document.getElementById('closeResultBtn').onclick = () => {
        resultModal.style.display = 'none';
    };

    document.getElementById('btnBuild').onclick = () => {
        panelBuild.classList.add('panel-open');
        if (gameState.tutorialStep === 3) {
            gameState.tutorialStep = 4;
            updateTutorialBox();
        }
    };
    document.getElementById('closeBuildPanel').onclick = () => panelBuild.classList.remove('panel-open');
    document.getElementById('surveyBtn').onclick = () => { showNotification("بخش نظر سنجی فعلا غیرفعال است.", "info"); };
    
    document.getElementById('selectHouse').onclick = () => {
        gameState.isPlacing = true;
        panelBuild.classList.remove('panel-open');
        if (gameState.tutorialStep === 4) {
            gameState.tutorialStep = 5;
            updateTutorialBox();
        } else {
            showNotification("محل ساخت خونه رو انتخاب کن", "info");
        }
    };

    exploreBtn.onclick = () => {
        panelExplore.classList.add('panel-open');
        if (gameState.tutorialStep === 6) {
            gameState.tutorialStep = 7;
            updateTutorialBox();
        }
    };
    document.getElementById('closeExplorePanel').onclick = () => {
        panelExplore.classList.remove('panel-open');
        document.getElementById('dispatchModal').style.display = 'none';
    };

    const openDispatchModal = (regionName) => {
        if (gameState.tutorialStep === 7) {
            showNotification("اول دکمه «متوجه شدم» رو بزن!", "warning");
            return;
        }
        if (gameState.tutorialStep === 7.5 && regionName !== 'تخت جمشید') {
            showNotification("در آموزش فقط تخت جمشید رو انتخاب کن!", "warning");
            return;
        }

        gameState.selectedRegion = regionName;
        document.getElementById('dispatchModal').style.display = 'block';
    };

    document.getElementById('dispatchLut').onclick = () => openDispatchModal('کویر لوت');
    document.getElementById('dispatchLaton').onclick = () => openDispatchModal('آبشار لاتون');
    document.getElementById('dispatchPersepolis').onclick = () => openDispatchModal('تخت جمشید');

    document.querySelectorAll('.dispatch-num-btn').forEach(btn => {
        btn.onclick = () => {
            const count = parseInt(btn.getAttribute('data-count'));
            
            startExpedition(gameState.selectedRegion, count);
            
            document.getElementById('dispatchModal').style.display = 'none';
            panelExplore.classList.remove('panel-open');
        };
    });

    document.getElementById('closeMovePopPanel').onclick = () => {
        document.getElementById('panelMovePop').classList.remove('panel-open');
        if (gameState.tutorialStep === 10) {
            gameState.tutorialStep = 9;
            updateTutorialBox();
        }
    };
    
    document.getElementById('confirmMoveBtn').onclick = () => {
        if (gameState.moveAmount > 0) {
            gameState.isMovingPop = true;
            document.getElementById('panelMovePop').classList.remove('panel-open');
            showNotification("حالا روی خونه مقصد کلیک کن", "info");
            if (gameState.tutorialStep === 10) {
                gameState.tutorialStep = 11;
                updateTutorialBox();
            }
        }
    };

    const gameScreen = document.getElementById('game-screen');
    const tutorialHTML = `
        <div id="tutorialBox" style="position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); width: 400px; max-width: 95%; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(201, 168, 76, 0.2); border-radius: 16px; z-index: 400; display: none; flex-direction: row; gap: 15px; padding: 20px; align-items: center; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
            <div style="flex: 1; text-align: right;">
                <h3 style="color: #f4d03f; margin-bottom: 10px; font-size: 1rem;">آموزش بازی</h3>
                <p id="tutorialText" style="color: #e8dcc8; font-size: 0.85rem; line-height: 1.6;"></p>
                <button id="tutorialBtn" style="margin-top: 12px; padding: 8px 20px; background: linear-gradient(145deg, #f4d03f, #c9a84c); border: none; border-radius: 6px; color: #1a1a2e; font-family: 'Vazirmatn'; font-weight: 700; cursor: pointer; display: none;">متوجه شدم</button>
            </div>
            <img src="guide.png?t=${new Date().getTime()}" style="width: 90px; height: 90px; object-fit: contain; border-radius: 10px; background: #111; border: 1px solid #333; flex-shrink: 0;">
        </div>
    `;
    gameScreen.insertAdjacentHTML('beforeend', tutorialHTML);
}
window.onload = initGame;