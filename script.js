const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayDesc = document.getElementById("overlayDesc");
const startBtn = document.getElementById("startBtn");
const resultCard = document.getElementById("resultCard");
const resultImage = document.getElementById("resultImage");
const resultText = document.getElementById("resultText");
const announceEl = document.getElementById("announce");

const distanceEl = document.getElementById("distance");
const heartsEl = document.getElementById("hearts");
const speedEl = document.getElementById("speed");
const hpEl = document.getElementById("hp");
const ammoEl = document.getElementById("ammo");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const jumpBtn = document.getElementById("jumpBtn");
const modeBtn = document.getElementById("modeBtn");
const shootBtn = document.getElementById("shootBtn");
const authGate = document.getElementById("authGate");
const authName = document.getElementById("authName");
const authPass = document.getElementById("authPass");
const authBtn = document.getElementById("authBtn");
const authError = document.getElementById("authError");

let authed = false;

const TILE = 48;
const ROWS = 13;
const COLS = 120;
const HALF_WORLD_X = (COLS * TILE) / 2;

const girlfriendTiers = [
  {
    key: "uiuc",
    minRate: 0,
    title: "UIUC 时尚管理女朋友",
    desc: "你找到了一个 UIUC 时尚管理的女朋友。你们未来偏向潮流生活，周末逛展、打卡和拍照是主线。",
    image: "./assets/gf-uiuc.svg",
  },
  {
    key: "nyu",
    minRate: 0.4,
    title: "NYU Tisch 艺术女朋友",
    desc: "你找到了一个 NYU Tisch 艺术的女朋友。你们未来会很有电影感，情绪价值和审美都在线。",
    image: "./assets/gf-nyu.svg",
  },
  {
    key: "duke",
    minRate: 0.75,
    title: "Duke Data+CS 女朋友",
    desc: "你找到了一个 Duke Data+CS 的女朋友。你们未来是顶配双核组合，恋爱和成长效率都拉满。",
    image: "./assets/gf-duke.svg",
  },
];

const deathTaunts = [
  "这把操作像断网重连，思路全掉线。",
  "你不是在闯关，你是在给怪物送分。",
  "落点和节奏双崩，翻车翻得很完整。",
  "这一跳的质量，直接把胜率打骨折。",
  "手感稀碎到离谱，怪物都开始同情你。",
];

function generateMap() {
  const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => "."));

  const gaps = [
    [18, 20], [34, 35], [52, 54], [70, 72], [88, 90], [106, 108],
  ];

  for (let x = 0; x < COLS; x += 1) {
    let isGap = false;
    for (const [a, b] of gaps) {
      if (x >= a && x <= b) {
        isGap = true;
        break;
      }
    }
    if (!isGap) {
      grid[11][x] = "G";
      grid[12][x] = "G";
    }
  }

  const blockRanges = [
    [8, 10], [14, 16], [27, 30], [42, 44], [60, 62], [76, 78], [95, 97],
  ];
  for (const [a, b] of blockRanges) {
    for (let x = a; x <= b; x += 1) grid[8][x] = "#";
  }

  const platformRanges = [
    [18, 21, 9], [33, 36, 9], [52, 55, 8], [69, 73, 9], [87, 91, 8], [105, 109, 9],
    [24, 27, 7], [46, 49, 7], [80, 83, 7]
  ];
  for (const [a, b, y] of platformRanges) {
    for (let x = a; x <= b; x += 1) grid[y][x] = "P";
  }

  return grid.map((row) => row.join(""));
}

const mapRows = generateMap();
const mapWidth = COLS * TILE;
const mapHeight = ROWS * TILE;

const game = {
  running: false,
  finished: false,
  cameraX: 0,
  worldEndX: mapWidth - TILE * 4,
  heartsCollected: 0,
  totalBlossoms: 0,
  lives: 3,
  invincibleTimer: 0,
  mode: "god",
  ammo: 5,
  ammoRegenFrames: 0,
  shootCooldown: 0,
  dukeNarrated: false,
  winCelebrating: false,
  winDelayFrames: 0,
  deathCelebrating: false,
  deathDelayFrames: 0,
  pendingGameOver: false,
  lastTaunt: "",
};

const player = {
  x: TILE * 2,
  y: TILE * 9,
  w: 34,
  h: 42,
  vx: 0,
  vy: 0,
  speed: 4.25,
  jumpForce: 15.8,
  gravity: 0.68,
  maxFall: 14,
  onGround: false,
  face: 1,
  spawnX: TILE * 2,
  spawnY: TILE * 9,
  coyoteFrames: 0,
  jumpBufferFrames: 0,
};

const state = {
  keys: Object.create(null),
  enemies: [],
  blossoms: [],
  projectiles: [],
  particles: [],
  wishes: [],
};

function tileAt(tx, ty) {
  if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return ".";
  return mapRows[ty][tx];
}

function isSolidTile(tx, ty) {
  const c = tileAt(tx, ty);
  return c === "G" || c === "#";
}

function isPlatformTile(tx, ty) {
  return tileAt(tx, ty) === "P";
}

function groundTopAt(col) {
  for (let y = 0; y < ROWS; y += 1) {
    if (isSolidTile(col, y)) return y * TILE;
  }
  return mapHeight + 200;
}

function buildLevelObjects() {
  state.enemies = [];
  state.blossoms = [];
  state.projectiles = [];

  const enemySpawns = [
    [12, 17], [24, 31], [39, 47], [57, 66], [74, 83], [93, 101], [112, 117],
  ];
  for (const [a, b] of enemySpawns) {
    const x = (a + 1) * TILE + 6;
    const y = groundTopAt(a + 1) - 34;
    state.enemies.push({ x, y, w: 34, h: 34, vx: 1.5 + Math.random() * 0.9, minX: a * TILE, maxX: b * TILE, alive: true });
  }

  const blossomPositions = [
    [9, 7], [15, 7], [22, 8], [26, 6], [34, 8], [41, 7], [52, 7],
    [61, 6], [70, 8], [78, 7], [86, 7], [95, 6], [103, 8], [110, 8], [114, 7],
  ];
  for (const [tx, ty] of blossomPositions) {
    state.blossoms.push({ x: tx * TILE + 10, y: ty * TILE + 10, w: 28, h: 28, taken: false });
  }

  game.totalBlossoms = state.blossoms.length;
}

function addBurst(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.8) * 5,
      life: 18 + Math.random() * 18,
      color,
      s: 2 + Math.random() * 2,
    });
  }
}

function getGirlfriendTier() {
  const rate = game.totalBlossoms > 0 ? game.heartsCollected / game.totalBlossoms : 0;
  if (rate >= girlfriendTiers[2].minRate) return girlfriendTiers[2];
  if (rate >= girlfriendTiers[1].minRate) return girlfriendTiers[1];
  return girlfriendTiers[0];
}

function showResultCard() {
  const tier = getGirlfriendTier();
  resultImage.src = tier.image;
  resultImage.alt = tier.title;
  resultText.textContent = `桃花结算: ${tier.desc}`;
  resultCard.classList.remove("hidden");
}

function hideResultCard() {
  resultCard.classList.add("hidden");
  resultImage.removeAttribute("src");
  resultText.textContent = "";
}

function resetRomanceProgress() {
  game.heartsCollected = 0;
  for (const blossom of state.blossoms) blossom.taken = false;
}

function setRomanceHudVisible(visible) {
  heartsEl.style.display = visible ? "" : "none";
  speedEl.style.display = visible ? "" : "none";
}

let announceTimer = null;
function announce(text, duration = 1200) {
  announceEl.textContent = text;
  announceEl.classList.add("visible");
  if (announceTimer) clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    announceEl.classList.remove("visible");
  }, duration);
}

function verifyLogin() {
  const name = authName.value.trim();
  const pass = authPass.value.trim();
  if (name === "董宇涵" && pass === "<YOUR_LOGIN_PASSWORD>") {
    authed = true;
    authGate.classList.remove("visible");
    authError.textContent = "";
    announce("登录成功");
    return;
  }
  authed = false;
  authError.textContent = "用户名或密码错误";
}

function resetGame() {
  game.running = true;
  game.finished = false;
  game.cameraX = 0;
  game.heartsCollected = 0;
  game.lives = 3;
  game.invincibleTimer = 0;
  game.mode = "god";
  game.ammo = 5;
  game.ammoRegenFrames = 0;
  game.shootCooldown = 0;
  game.dukeNarrated = false;
  game.winCelebrating = false;
  game.winDelayFrames = 0;
  game.deathCelebrating = false;
  game.deathDelayFrames = 0;
  game.pendingGameOver = false;
  game.lastTaunt = "";

  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.face = 1;
  player.coyoteFrames = 0;
  player.jumpBufferFrames = 0;

  state.particles = [];
  state.wishes = [];
  buildLevelObjects();
  hideResultCard();
  setRomanceHudVisible(false);
  announceEl.classList.remove("visible");
  announce("神形态: 你现在可以发射网球");
  overlay.classList.remove("visible");
  updateHud();
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hurtPlayer() {
  if (game.invincibleTimer > 0 || game.winCelebrating || game.deathCelebrating) return;
  overlay.classList.remove("visible");
  hideResultCard();
  const taunt = deathTaunts[Math.floor(Math.random() * deathTaunts.length)];
  game.lives -= 1;
  game.invincibleTimer = 45;
  game.lastTaunt = taunt;
  addBurst(player.x + player.w / 2, player.y + player.h / 2, "#ff5d70", 22);
  announce(`翻车嘲讽: ${taunt}`, 2300);
  launchTauntRain(taunt);
  resetRomanceProgress();
  game.running = false;
  game.deathCelebrating = true;
  game.deathDelayFrames = 120;
  game.pendingGameOver = game.lives <= 0;
  state.projectiles = [];
  state.keys = Object.create(null);

  if (game.pendingGameOver) {
    startBtn.textContent = "再来一把";
  }
}

function launchTauntRain(baseTaunt) {
  const pool = [
    baseTaunt,
    "这波纯送",
    "全程梦游",
    "节奏崩盘",
    "落地就寄",
    "操作离谱",
    "怪物狂喜",
    "翻车实录",
    "建议重开",
  ];
  state.wishes = [];
  for (let i = 0; i < 46; i += 1) {
    state.wishes.push({
      text: pool[i % pool.length],
      x: 30 + Math.random() * (canvas.width - 60) + game.cameraX,
      y: 60 + Math.random() * (canvas.height - 120),
      vy: -0.12 - Math.random() * 0.2,
      life: 95 + Math.floor(Math.random() * 70),
      color: i % 2 === 0 ? "#ff5d70" : "#ffd6dc",
    });
  }
}

function launchBirthdayWishes() {
  state.wishes = [];
  const lines = [
    "董宇涵生日快乐",
    "20岁起飞",
    "杜克周瑜冲冲冲",
    "早日遇见小乔",
    "DYH今天主角",
    "桃花运MAX",
  ];
  for (let i = 0; i < 36; i += 1) {
    const text = lines[i % lines.length];
    state.wishes.push({
      text,
      x: 80 + Math.random() * (canvas.width - 160) + game.cameraX,
      y: 120 + Math.random() * (canvas.height - 220),
      vy: -0.25 - Math.random() * 0.25,
      life: 160 + Math.floor(Math.random() * 80),
      color: ["#ffd44d", "#ff8ac0", "#d6e4ff", "#ffffff"][i % 4],
    });
    addBurst(game.worldEndX - 20 + Math.random() * 30, canvas.height - TILE * 5 + Math.random() * 30, "#ffd66b", 2);
  }
}

function finalizeDeath() {
  game.deathCelebrating = false;
  state.wishes = [];

  if (game.pendingGameOver) {
    game.pendingGameOver = false;
    game.running = false;
    announceEl.classList.remove("visible");
    overlay.classList.add("visible");
    overlayTitle.textContent = "翻车名场面：DYH 被副本公开处刑";
    overlayDesc.innerHTML =
      `生命耗尽，判定：本局没找到女朋友。<br>${game.lastTaunt}<br>再来一把，不然今天寿星只能收获全场嘲笑。`;
    hideResultCard();
    heartsEl.textContent = `桃花值: 0/${game.totalBlossoms}`;
    speedEl.textContent = "桃花评级: 未找到女朋友";
    setRomanceHudVisible(true);
    updateHud();
    return;
  }

  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.coyoteFrames = 0;
  player.jumpBufferFrames = 0;
  player.onGround = false;
  game.running = true;
  announce("重开一条命，但桃花已清零", 1700);
  updateHud();
}

function finalizeWin() {
  game.finished = true;
  overlay.classList.add("visible");
  startBtn.textContent = "重开庆生局";
  overlayTitle.textContent = "杜克周瑜会师小乔";
  overlayDesc.innerHTML = `董宇涵，2006-03-02 出生，2026-03-02 满 20 岁。<br>你以神魔双形态横扫地图，顺利通关。<br>桃花值 ${game.heartsCollected}/${game.totalBlossoms}。`;
  setRomanceHudVisible(true);
  showResultCard();
}

function winGame() {
  if (game.winCelebrating || game.finished) return;
  game.running = false;
  game.winCelebrating = true;
  game.winDelayFrames = 170;
  announce("生日快乐！祝福雨来袭", 1700);
  launchBirthdayWishes();
}

function updateHud() {
  const progress = Math.max(0, Math.min(100, Math.floor((player.x / game.worldEndX) * 100)));
  const tier = getGirlfriendTier();
  distanceEl.textContent = `进度: ${progress}%`;
  if (game.finished) {
    heartsEl.textContent = `桃花值: ${game.heartsCollected}/${game.totalBlossoms}`;
    speedEl.textContent = `桃花评级: ${tier.title}`;
  }
  hpEl.textContent = `生命: ${game.lives}`;
  ammoEl.textContent = `${game.mode === "god" ? "神形态" : "魔形态"} | 弹药: ${game.ammo}`;
}

function toggleMode() {
  if (!game.running) return;
  game.mode = game.mode === "god" ? "demon" : "god";
  addBurst(player.x + player.w / 2, player.y + 8, game.mode === "god" ? "#ffe169" : "#f5f5f5", 12);
  announce(game.mode === "god" ? "神形态: 你现在可以发射网球" : "魔形态: 你现在可以发射白色不明液体");
}

function shoot() {
  if (!game.running || game.ammo <= 0 || game.shootCooldown > 0) return;

  const isGod = game.mode === "god";
  state.projectiles.push({
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    w: isGod ? 14 : 16,
    h: isGod ? 14 : 12,
    vx: player.face * (isGod ? 8.8 : 7.5),
    vy: isGod ? -0.2 : -0.1,
    life: 120,
    mode: game.mode,
  });

  game.ammo -= 1;
  game.shootCooldown = 12;
  addBurst(player.x + player.w / 2 + player.face * 10, player.y + 20, isGod ? "#d7ff7a" : "#ffffff", 9);
  announce(isGod ? "网球发射" : "白色不明液体发射");
}

function updateInput() {
  const left = state.keys.ArrowLeft || state.keys.KeyA;
  const right = state.keys.ArrowRight || state.keys.KeyD;

  if (left && !right) {
    player.vx = -player.speed;
    player.face = -1;
  } else if (right && !left) {
    player.vx = player.speed;
    player.face = 1;
  } else {
    player.vx *= 0.72;
    if (Math.abs(player.vx) < 0.2) player.vx = 0;
  }
}

function consumeJumpIfPossible() {
  if (player.jumpBufferFrames > 0 && player.coyoteFrames > 0) {
    player.vy = -player.jumpForce;
    player.onGround = false;
    player.coyoteFrames = 0;
    player.jumpBufferFrames = 0;
    addBurst(player.x + player.w / 2, player.y + player.h, "#e8f5ff", 10);
  }
}

function applyHorizontal() {
  player.x += player.vx;

  const left = Math.floor(player.x / TILE);
  const right = Math.floor((player.x + player.w - 1) / TILE);
  const top = Math.floor(player.y / TILE);
  const bottom = Math.floor((player.y + player.h - 1) / TILE);

  if (player.vx > 0) {
    for (let ty = top; ty <= bottom; ty += 1) {
      if (isSolidTile(right, ty)) {
        player.x = right * TILE - player.w;
        player.vx = 0;
        break;
      }
    }
  } else if (player.vx < 0) {
    for (let ty = top; ty <= bottom; ty += 1) {
      if (isSolidTile(left, ty)) {
        player.x = (left + 1) * TILE;
        player.vx = 0;
        break;
      }
    }
  }
}

function applyVertical() {
  const prevY = player.y;
  player.vy += player.gravity;
  if (player.vy > player.maxFall) player.vy = player.maxFall;
  player.y += player.vy;
  player.onGround = false;

  const left = Math.floor(player.x / TILE);
  const right = Math.floor((player.x + player.w - 1) / TILE);
  const top = Math.floor(player.y / TILE);
  const bottom = Math.floor((player.y + player.h - 1) / TILE);

  if (player.vy > 0) {
    let landed = false;
    for (let tx = left; tx <= right; tx += 1) {
      if (isSolidTile(tx, bottom)) {
        player.y = bottom * TILE - player.h;
        player.vy = 0;
        player.onGround = true;
        landed = true;
        break;
      }
    }

    if (!landed) {
      const prevBottom = prevY + player.h;
      const nowBottom = player.y + player.h;
      for (let tx = left; tx <= right; tx += 1) {
        if (!isPlatformTile(tx, bottom)) continue;
        const platformTop = bottom * TILE + TILE - 14;
        if (prevBottom <= platformTop + 4 && nowBottom >= platformTop) {
          player.y = platformTop - player.h;
          player.vy = 0;
          player.onGround = true;
          break;
        }
      }
    }
  } else if (player.vy < 0) {
    for (let tx = left; tx <= right; tx += 1) {
      if (isSolidTile(tx, top)) {
        player.y = (top + 1) * TILE;
        player.vy = 0;
        break;
      }
    }
  }

  if (player.y > mapHeight + 120) {
    hurtPlayer();
  }
}

function updateEnemies() {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    e.x += e.vx;
    if (e.x <= e.minX || e.x + e.w >= e.maxX) e.vx *= -1;

    if (aabb(player, e)) {
      const stomp = player.vy > 1.2 && player.y + player.h - 8 < e.y + 8;
      if (stomp) {
        e.alive = false;
        player.vy = -10.8;
        addBurst(e.x + e.w / 2, e.y + e.h / 2, "#ffd44d", 18);
      } else {
        hurtPlayer();
      }
    }
  }
}

function updateProjectiles() {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i];
    p.life -= 1;
    p.x += p.vx;
    p.y += p.vy;
    if (p.mode === "demon") p.vy += 0.03;

    if (p.life <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    const tx = Math.floor((p.x + p.w / 2) / TILE);
    const ty = Math.floor((p.y + p.h / 2) / TILE);
    if (isSolidTile(tx, ty) || isPlatformTile(tx, ty)) {
      addBurst(p.x, p.y, p.mode === "god" ? "#d7ff7a" : "#ffffff", 8);
      state.projectiles.splice(i, 1);
      continue;
    }

    let hit = false;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (aabb(p, e)) {
        e.alive = false;
        addBurst(e.x + e.w / 2, e.y + e.h / 2, p.mode === "god" ? "#d7ff7a" : "#ffffff", 16);
        hit = true;
        break;
      }
    }
    if (hit) state.projectiles.splice(i, 1);
  }
}

function updateCollectibles() {
  for (const blossom of state.blossoms) {
    if (!blossom.taken && aabb(player, blossom)) {
      blossom.taken = true;
      game.heartsCollected += 1;
      addBurst(blossom.x + 8, blossom.y + 8, "#ff8ac0", 18);
    }
  }
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= 1;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.14;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updateWishes() {
  for (let i = state.wishes.length - 1; i >= 0; i -= 1) {
    const w = state.wishes[i];
    w.life -= 1;
    w.y += w.vy;
    if (w.life <= 0) state.wishes.splice(i, 1);
  }
}

function updateCamera() {
  const target = player.x - canvas.width * 0.38;
  game.cameraX += (target - game.cameraX) * 0.16;
  if (game.cameraX < 0) game.cameraX = 0;
  const maxCam = mapWidth - canvas.width;
  if (game.cameraX > maxCam) game.cameraX = maxCam;
}

function updateAmmo() {
  game.shootCooldown = Math.max(0, game.shootCooldown - 1);
  if (game.ammo >= 5) {
    game.ammoRegenFrames = 0;
    return;
  }
  game.ammoRegenFrames += 1;
  if (game.ammoRegenFrames >= 600) {
    game.ammo += 1;
    game.ammoRegenFrames = 0;
  }
}

function updateGame() {
  if (game.winCelebrating) {
    updateParticles();
    updateWishes();
    game.winDelayFrames -= 1;
    if (game.winDelayFrames <= 0) {
      game.winCelebrating = false;
      finalizeWin();
    }
    return;
  }
  if (game.deathCelebrating) {
    updateParticles();
    updateWishes();
    game.deathDelayFrames -= 1;
    if (game.deathDelayFrames <= 0) {
      finalizeDeath();
    }
    return;
  }
  if (!game.running) return;

  game.invincibleTimer = Math.max(0, game.invincibleTimer - 1);
  player.jumpBufferFrames = Math.max(0, player.jumpBufferFrames - 1);
  player.coyoteFrames = Math.max(0, player.coyoteFrames - 1);

  updateInput();
  consumeJumpIfPossible();
  applyHorizontal();
  applyVertical();

  if (player.onGround) {
    player.coyoteFrames = 8;
    consumeJumpIfPossible();
  }

  updateAmmo();
  updateEnemies();
  updateProjectiles();
  updateCollectibles();
  updateParticles();
  updateWishes();
  updateCamera();

  if (!game.dukeNarrated && player.x >= HALF_WORLD_X) {
    game.dukeNarrated = true;
    announce("你开启了人生的新篇章，在杜克遇到了新的朋友，在这里你能否终结大压抑时代？？", 3400);
  }

  if (player.x + player.w >= game.worldEndX) winGame();

  updateHud();
}

function drawSky() {
  const uiucGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  uiucGrad.addColorStop(0, "#13294b");
  uiucGrad.addColorStop(0.72, "#1d3f73");
  uiucGrad.addColorStop(1, "#ff5f05");
  ctx.fillStyle = uiucGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const splitScreenX = mapWidth * 0.5 - game.cameraX;
  if (splitScreenX < canvas.width) {
    const dukeGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    dukeGrad.addColorStop(0, "#012169");
    dukeGrad.addColorStop(0.7, "#1347a8");
    dukeGrad.addColorStop(1, "#d6e4ff");
    ctx.fillStyle = dukeGrad;
    ctx.fillRect(Math.max(0, splitScreenX), 0, canvas.width - Math.max(0, splitScreenX), canvas.height);
  }

  if (splitScreenX > 0 && splitScreenX < canvas.width) {
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(splitScreenX, 0);
    ctx.lineTo(splitScreenX, canvas.height);
    ctx.stroke();
  }

  const cloudShift = (game.cameraX * 0.2) % (canvas.width + 220);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  for (let i = -1; i < 5; i += 1) {
    const x = i * 260 - cloudShift;
    const y = 78 + (i % 2) * 40;
    ctx.beginPath();
    ctx.arc(x + 20, y, 18, 0, Math.PI * 2);
    ctx.arc(x + 42, y - 8, 24, 0, Math.PI * 2);
    ctx.arc(x + 66, y, 17, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawZoneLabels() {
  const uiucX = 8 * TILE - game.cameraX;
  const dukeX = HALF_WORLD_X + 6 * TILE - game.cameraX;

  ctx.fillStyle = "rgba(19, 41, 75, 0.88)";
  ctx.fillRect(uiucX, 34, 188, 40);
  ctx.fillStyle = "#ff5f05";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("UIUC Zone", uiucX + 20, 60);

  ctx.fillStyle = "rgba(1, 33, 105, 0.88)";
  ctx.fillRect(dukeX, 34, 188, 40);
  ctx.fillStyle = "#d6e4ff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("Duke Zone", dukeX + 24, 60);
}

function drawTile(tx, ty, ch) {
  const x = tx * TILE - game.cameraX;
  const y = ty * TILE;
  if (x + TILE < 0 || x > canvas.width) return;

  if (ch === "G") {
    ctx.fillStyle = "#805736";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#4ea154";
    ctx.fillRect(x, y, TILE, 10);
  } else if (ch === "#") {
    ctx.fillStyle = "#a26e46";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = "#c58b58";
    ctx.fillRect(x + 5, y + 7, TILE - 10, TILE - 14);
  } else if (ch === "P") {
    ctx.fillStyle = "#98724f";
    ctx.fillRect(x, y + TILE - 14, TILE, 14);
    ctx.fillStyle = "#5eb765";
    ctx.fillRect(x, y + TILE - 16, TILE, 4);
  }
}

function drawMap() {
  for (let ty = 0; ty < ROWS; ty += 1) {
    const row = mapRows[ty];
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = row[tx];
      if (ch === ".") continue;
      drawTile(tx, ty, ch);
    }
  }
}

function drawBlossoms() {
  for (const blossom of state.blossoms) {
    if (blossom.taken) continue;
    const x = blossom.x - game.cameraX + 14;
    const y = blossom.y + 10;
    if (x < -30 || x > canvas.width + 30) continue;
    ctx.fillStyle = "#ff7cb8";
    for (let i = 0; i < 5; i += 1) {
      const a = (-Math.PI / 2) + (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffd66b";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const x = e.x - game.cameraX;
    if (x < -50 || x > canvas.width + 50) continue;

    ctx.fillStyle = "#f3c7a6";
    ctx.fillRect(x + 8, e.y + 2, e.w - 16, 10);
    ctx.fillStyle = "#355f91";
    ctx.fillRect(x + 11, e.y + 12, e.w - 22, 9);
    ctx.fillStyle = "#d04a44";
    ctx.fillRect(x + 4, e.y + 20, e.w - 8, 12);
    ctx.fillRect(x - 2, e.y + 20, 8, 10);
    ctx.fillRect(x + e.w - 6, e.y + 20, 8, 10);
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(x + 10, e.y + 5, 4, 4);
    ctx.fillRect(x + e.w - 14, e.y + 5, 4, 4);
  }
}

function drawPlayer() {
  const flash = game.invincibleTimer > 0 && Math.floor(game.invincibleTimer / 4) % 2 === 0;
  if (flash) return;

  const x = player.x - game.cameraX;
  const y = player.y;

  ctx.fillStyle = game.mode === "god" ? "#183a71" : "#4d2a5f";
  ctx.fillRect(x + 9, y + 16, 16, 24);
  ctx.fillStyle = "#f9d7b5";
  ctx.fillRect(x + 10, y + 4, 14, 12);
  ctx.fillStyle = game.mode === "god" ? "#d23b47" : "#cfd2da";
  ctx.fillRect(x + 6, y + 18, 22, 10);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + (player.face > 0 ? 17 : 10), y + 8, 4, 4);
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    const x = p.x - game.cameraX;
    const y = p.y;
    if (p.mode === "god") {
      ctx.fillStyle = "#d8ff6a";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#95c63d";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0.5, 2.6);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#f7f7f7";
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 1, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFlag() {
  const x = game.worldEndX - game.cameraX;
  ctx.fillStyle = "#f3f9ff";
  ctx.fillRect(x, canvas.height - TILE * 6, 6, TILE * 5);
  ctx.fillStyle = "#ffef95";
  ctx.fillRect(x + 6, canvas.height - TILE * 6, 42, 20);
  ctx.fillStyle = "#344064";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("小乔", x + 12, canvas.height - TILE * 6 + 14);
}

function drawSupporters() {
  const flagX = game.worldEndX - game.cameraX;
  const baseX = flagX - 300;
  const y = canvas.height - TILE * 3 - 8;
  const people = [
    { name: "Alice", color: "#ff8ac0", offset: 0 },
    { name: "Ryan", color: "#ffd44d", offset: 48 },
    { name: "Haobo", color: "#7ad7ff", offset: 96 },
    { name: "Christine", color: "#d6e4ff", offset: 144 },
  ];
  for (const p of people) {
    const x = baseX + p.offset;
    ctx.fillStyle = "#f8d8b8";
    ctx.fillRect(x + 7, y - 24, 14, 12);
    ctx.fillStyle = p.color;
    ctx.fillRect(x + 3, y - 10, 22, 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 1, y - 14, 6, 4);
    ctx.fillRect(x + 21, y - 14, 6, 4);
    ctx.fillStyle = "#0f1a2f";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.name, x + 14, y + 20);
    ctx.textAlign = "left";
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 24);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - game.cameraX, p.y, p.s, p.s);
  }
  ctx.globalAlpha = 1;
}

function drawWishes() {
  for (const w of state.wishes) {
    ctx.globalAlpha = Math.max(0, w.life / 120);
    ctx.fillStyle = w.color;
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(w.text, w.x - game.cameraX, w.y);
  }
  ctx.globalAlpha = 1;
}

function render() {
  drawSky();
  drawMap();
  drawZoneLabels();
  drawBlossoms();
  drawEnemies();
  drawPlayer();
  drawProjectiles();
  drawFlag();
  drawSupporters();
  drawParticles();
  drawWishes();
}

function gameLoop() {
  updateGame();
  render();
  requestAnimationFrame(gameLoop);
}

function doJump() {
  if (!game.running) return;
  player.jumpBufferFrames = 8;
  consumeJumpIfPossible();
}

document.addEventListener("keydown", (e) => {
  state.keys[e.code] = true;
  if (["Space", "ArrowUp", "KeyW", "ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) {
    e.preventDefault();
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) doJump();
  }
  if (e.code === "KeyQ") toggleMode();
  if (e.code === "KeyK") shoot();
});

document.addEventListener("keyup", (e) => {
  state.keys[e.code] = false;
  if (["Space", "ArrowUp", "KeyW"].includes(e.code) && player.vy < -3) {
    player.vy *= 0.45;
  }
});

function bindHold(button, keyCode) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    state.keys[keyCode] = true;
  });
  button.addEventListener("pointerup", () => {
    state.keys[keyCode] = false;
  });
  button.addEventListener("pointerleave", () => {
    state.keys[keyCode] = false;
  });
  button.addEventListener("pointercancel", () => {
    state.keys[keyCode] = false;
  });
}

bindHold(leftBtn, "ArrowLeft");
bindHold(rightBtn, "ArrowRight");

jumpBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  doJump();
});

modeBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  toggleMode();
});

shootBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  shoot();
});

authBtn.addEventListener("click", verifyLogin);
authPass.addEventListener("keydown", (e) => {
  if (e.key === "Enter") verifyLogin();
});
authName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") verifyLogin();
});

startBtn.addEventListener("click", () => {
  if (!authed) {
    authGate.classList.add("visible");
    authError.textContent = "请先登录";
    return;
  }
  state.keys = Object.create(null);
  resetGame();
});

buildLevelObjects();
setRomanceHudVisible(false);
updateHud();
render();
gameLoop();
