/**
 * Droga Bohatera — Medieval Arena Survival.
 * Czysty JavaScript + Canvas. Bez bibliotek.
 *
 * Proceduralny styl medieval/fantasy, sprite'y postaci i wrogów,
 * rotująca broń w kierunku celowania, animacje ataków, cząsteczki i screen shake.
 */

const CONFIG = {
  playerSize: 26,

  speedBase: 100,
  speedPerPoint: 5,
  speedCap: 340,

  dashSpeed: 500,
  dashDuration: 0.15,
  dashIframeExtra: 0.06,
  dashCooldownBase: 2.05,
  dashCooldownDex: 0.03,
  dashCooldownMin: 0.4,

  hurtCooldown: 0.65,

  enemySize: 22,
  contactDamage: 1,

  chaserHp: 16,
  chaserSpeed: 58,
  chaserReach: 86,
  chaserWindup: 0.6,
  chaserRecover: 1.25,
  chaserConeRange: 112,
  chaserConeArc: Math.PI * 0.62,
  chaserSwingDamage: 2,

  shooterHp: 9,
  shooterSpeed: 72,
  shooterMinDist: 200,
  shooterMaxDist: 280,
  shooterFireInterval: 2,

  runnerHp: 8,
  runnerSpeed: 98,
  runnerDamage: 1,

  enemyBulletSize: 9,
  enemyBulletSpeed: 250,
  enemyBulletDamage: 1,

  chaserExp: 7,
  shooterExp: 9,
  runnerExp: 6,

  xpBase: 34,
  xpGrowth: 1.48,

  runDuration: 600, // 10 minut
};

const WEAPON_NAMES = {
  bow: "Łuk",
  fork: "Widły",
  club: "Pałka",
};

const WEAPON_DESCS = {
  bow: "Precyzyjne strzały w kierunku spojrzenia.",
  fork: "Wąskie pchnięcie o dużych obrażeniach wzdłuż linii.",
  club: "Ciężki, wąski zamach o dużych obrażeniach obszarowych.",
};

const STARTING_STATS = {
  hp: 10,
  str: 10,
  dex: 8,
  spd: 10,
  int: 5,
};

const UPGRADE_DEFS = [
  {
    id: "hp",
    category: "Statystyka",
    kind: "stat",
    title: "+ Życie",
    description: "+4 maksymalnego HP. Bohater odzyskuje 4 punkty życia.",
    apply(player) {
      player.maxHp += 4;
      player.hp = Math.min(player.maxHp, player.hp + 4);
    },
  },
  {
    id: "str",
    category: "Statystyka",
    kind: "stat",
    title: "+ Siła",
    description: "+5 Siły. Każdy punkt Siły dodaje 1% do obrażeń wszystkich ataków.",
    apply(player) {
      player.str += 5;
    },
  },
  {
    id: "spd",
    category: "Statystyka",
    kind: "stat",
    title: "+ Szybkość",
    description: "+4 Szybkości. Bohater szybciej przemierza planszę.",
    apply(player) {
      player.spd += 4;
    },
  },
  {
    id: "dex",
    category: "Statystyka",
    kind: "stat",
    title: "+ Zręczność",
    description: "+4 Zręczności. Unik pod spacją odnawia się szybciej.",
    apply(player) {
      player.dex += 4;
    },
  },
  {
    id: "int",
    category: "Statystyka",
    kind: "stat",
    title: "+ Inteligencja",
    description: "+5 Inteligencji. Zwiększa szansę na uderzenie krytyczne (200% obrażeń).",
    apply(player) {
      player.int += 5;
    },
  },
  {
    id: "bow-volley",
    weapon: "bow",
    max: 2,
    category: "Broń",
    kind: "weapon",
    title(rank) {
      return rank === 0 ? "Podwójny szybki strzał" : "Potrójny szybki strzał";
    },
    description(rank) {
      return rank === 0
        ? "Łuk wypuszcza drugi pocisk i naciąga się szybciej."
        : "Łuk wypuszcza trzeci pocisk i strzela jeszcze szybciej.";
    },
    apply(player) {
      player.bowVolley += 1;
      player.bowHaste *= 0.86;
    },
  },
  {
    id: "bow-power",
    weapon: "bow",
    max: 2,
    category: "Broń",
    kind: "weapon",
    title: "Mocniejszy naciąg",
    description: "Groty strzał zadają wyraźnie wyższe obrażenia.",
    apply(player) {
      player.bowPower += 0.28;
    },
  },
  {
    id: "fork-haste",
    weapon: "fork",
    max: 3,
    category: "Styl walki",
    kind: "weapon",
    title: "Szybszy atak widłami",
    description: "Kolejne pchnięcie nadchodzi wyraźnie szybciej.",
    apply(player) {
      player.forkHaste *= 0.72;
    },
  },
  {
    id: "fork-reach",
    weapon: "fork",
    max: 2,
    category: "Styl walki",
    kind: "weapon",
    title: "Dłuższe widły",
    description: "Pchnięcie sięga dalej i mocniej odpycha trafionych.",
    apply(player) {
      player.forkReach += 0.18;
    },
  },
  {
    id: "club-wide",
    weapon: "club",
    max: 3,
    category: "Styl walki",
    kind: "weapon",
    title: "Szersze zamachy",
    description: "Pałka obejmuje szerszy stożek przed bohaterem.",
    apply(player) {
      player.clubArc += 0.22;
    },
  },
  {
    id: "club-heavy",
    weapon: "club",
    max: 2,
    category: "Styl walki",
    kind: "weapon",
    title: "Ciężki cios",
    description: "Zamach pałką zadaje większe obrażenia.",
    apply(player) {
      player.clubPower += 0.24;
    },
  },
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hud = {
  hpFill: document.getElementById("hp-fill"),
  hpText: document.getElementById("hp-text"),
  level: document.getElementById("level"),
  expFill: document.getElementById("exp-fill"),
  expText: document.getElementById("exp-text"),
  weaponName: document.getElementById("weapon-name"),
  weaponDesc: document.getElementById("weapon-desc"),
  str: document.getElementById("str-val"),
  dex: document.getElementById("dex-val"),
  spd: document.getElementById("spd-val"),
  int: document.getElementById("int-val"),
  dashFill: document.getElementById("dash-fill"),
  dashText: document.getElementById("dash-text"),
  runTimer: document.getElementById("run-timer"),
  activeUpgradesList: document.getElementById("active-upgrades-list"),
  mainMenu: document.getElementById("main-menu"),
  startGameBtn: document.getElementById("start-game-btn"),
  weaponModal: document.getElementById("weapon-modal"),
  upgradeModal: document.getElementById("upgrade-modal"),
  upgradeLevel: document.getElementById("upgrade-level"),
  upgradeChoices: document.getElementById("upgrade-choices"),
  overlay: document.getElementById("overlay"),
  overlayStats: document.getElementById("overlay-stats"),
  victoryModal: document.getElementById("victory-modal"),
  victoryStats: document.getElementById("victory-stats"),
};

const keys = new Set();

const state = {
  player: null,
  enemies: [],
  enemyBullets: [],
  bolts: [],
  floaters: [],
  particles: [],
  dirtPatches: [],
  grassTufts: [],
  kills: 0,
  level: 1,
  exp: 0,
  expToNext: 0,
  pendingLevels: 0,
  offered: [],
  stacks: {},
  phase: "menu",
  spawnTimer: 1.1,
  nextKind: "chaser",
  elapsed: 0,
  shakeTimer: 0,
  shakeMagnitude: 0,
};

function initEnvironment() {
  state.dirtPatches = [];
  for (let i = 0; i < 16; i++) {
    state.dirtPatches.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      rx: 40 + Math.random() * 55,
      ry: 25 + Math.random() * 40,
    });
  }
  state.grassTufts = [];
  for (let i = 0; i < 55; i++) {
    state.grassTufts.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
    });
  }
}

function xpRequiredFor(level) {
  return Math.round(CONFIG.xpBase * CONFIG.xpGrowth ** (level - 1));
}

function createPlayer() {
  return {
    x: canvas.width / 2 - CONFIG.playerSize / 2,
    y: canvas.height / 2 - CONFIG.playerSize / 2,
    w: CONFIG.playerSize,
    h: CONFIG.playerSize,
    hp: STARTING_STATS.hp,
    maxHp: STARTING_STATS.hp,
    str: STARTING_STATS.str,
    dex: STARTING_STATS.dex,
    spd: STARTING_STATS.spd,
    int: STARTING_STATS.int,
    weapon: null,
    bowVolley: 1,
    bowHaste: 1,
    bowPower: 1,
    forkHaste: 1,
    forkReach: 1,
    clubArc: 0,
    clubPower: 1,
    hurtTimer: 0,
    dashTimer: 0,
    iframe: 0,
    dashCooldown: 0,
    dashCooldownMax: 0,
    dashDir: { x: 1, y: 0 },
    facing: { x: 1, y: 0 },
    attackCooldown: 0,
    strike: null,
  };
}

function resetToMenu() {
  state.player = createPlayer();
  state.enemies = [];
  state.enemyBullets = [];
  state.bolts = [];
  state.floaters = [];
  state.particles = [];
  state.kills = 0;
  state.level = 1;
  state.exp = 0;
  state.expToNext = xpRequiredFor(1);
  state.pendingLevels = 0;
  state.offered = [];
  state.stacks = {};
  state.phase = "menu";
  state.spawnTimer = 1.15;
  state.nextKind = "chaser";
  state.elapsed = 0;
  state.shakeTimer = 0;

  initEnvironment();

  hud.mainMenu.classList.remove("hidden");
  hud.weaponModal.classList.add("hidden");
  hud.upgradeModal.classList.add("hidden");
  hud.overlay.classList.add("hidden");
  hud.victoryModal.classList.add("hidden");
  hud.upgradeChoices.innerHTML = "";
  updateHud();
}

function startArmory() {
  state.phase = "armory";
  hud.mainMenu.classList.add("hidden");
  hud.weaponModal.classList.remove("hidden");
  updateHud();
}

function chooseWeapon(weaponId) {
  if (state.phase !== "armory" || !WEAPON_NAMES[weaponId]) return;
  const player = state.player;
  player.weapon = weaponId;
  player.attackCooldown = 0.5;
  state.phase = "play";
  state.spawnTimer = 1.15;
  state.elapsed = 0;
  hud.weaponModal.classList.add("hidden");
  updateHud();
}

const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
const AIM_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

window.addEventListener("keydown", (event) => {
  if (MOVE_KEYS.has(event.code) || AIM_KEYS.has(event.code) || event.code === "Space") {
    event.preventDefault();
  }

  if (MOVE_KEYS.has(event.code) || AIM_KEYS.has(event.code)) {
    keys.add(event.code);
  }

  if (event.repeat) return;

  if (state.phase === "menu") {
    if (event.code === "Enter" || event.code === "Space") startArmory();
    return;
  }

  if (state.phase === "armory") {
    const weapon = { Digit1: "bow", Digit2: "fork", Digit3: "club" }[event.code];
    if (weapon) chooseWeapon(weapon);
    return;
  }

  if (state.phase === "upgrade") {
    const index = { Digit1: 0, Digit2: 1, Digit3: 2 }[event.code];
    if (index != null) pickOffered(index);
    return;
  }

  if (state.phase === "dead" || state.phase === "victory") {
    if (event.code === "KeyR" || event.code === "Enter" || event.code === "Space") resetToMenu();
    return;
  }

  if (event.code === "Space") tryStartDash();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("blur", () => {
  keys.clear();
});

hud.startGameBtn.addEventListener("click", () => {
  startArmory();
});

hud.weaponModal.addEventListener("click", (event) => {
  const button = event.target.closest("[data-weapon]");
  if (!button) return;
  chooseWeapon(button.dataset.weapon);
});

hud.upgradeChoices.addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (!button) return;
  pickOffered(Number(button.dataset.index));
});

hud.overlay.addEventListener("click", () => {
  if (state.phase === "dead") resetToMenu();
});

hud.victoryModal.addEventListener("click", () => {
  if (state.phase === "victory") resetToMenu();
});

function readAxis(left, right, up, down) {
  let x = 0;
  let y = 0;
  if (keys.has(left)) x -= 1;
  if (keys.has(right)) x += 1;
  if (keys.has(up)) y -= 1;
  if (keys.has(down)) y += 1;
  return normalize(x, y);
}

function readMoveAxis() {
  return readAxis("KeyA", "KeyD", "KeyW", "KeyS");
}

function readAimAxis() {
  return readAxis("ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown");
}

function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 0.001) return null;
  return { x: x / length, y: y / length };
}

function updateFacing(move) {
  const player = state.player;
  const aim = readAimAxis();
  if (aim) {
    player.facing = aim;
    return;
  }
  if (player.dashTimer > 0) {
    player.facing = { x: player.dashDir.x, y: player.dashDir.y };
    return;
  }
  if (move) player.facing = { x: move.x, y: move.y };
}

function moveSpeed(spd) {
  return Math.min(CONFIG.speedCap, CONFIG.speedBase + spd * CONFIG.speedPerPoint);
}

function dashCooldownDuration(dex) {
  const scaled = CONFIG.dashCooldownBase / (1 + dex * CONFIG.dashCooldownDex);
  return Math.max(CONFIG.dashCooldownMin, scaled);
}

function tryStartDash() {
  const player = state.player;
  if (state.phase !== "play") return;
  if (player.dashTimer > 0 || player.dashCooldown > 0) return;

  const move = readMoveAxis();
  const dir = move || player.facing;
  player.dashDir = { x: dir.x, y: dir.y };
  player.dashTimer = CONFIG.dashDuration;
  player.iframe = CONFIG.dashDuration + CONFIG.dashIframeExtra;
  player.dashCooldown = dashCooldownDuration(player.dex);
  player.dashCooldownMax = player.dashCooldown;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function centerOf(entity) {
  return { x: entity.x + entity.w / 2, y: entity.y + entity.h / 2 };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function computeDamage(base) {
  const player = state.player;
  const scaled = base * (1 + player.str / 100);
  const crit = Math.random() * 100 < player.int;
  return { amount: scaled * (crit ? 2 : 1), crit };
}

function spawnFloater(x, y, amount, crit) {
  state.floaters.push({
    x,
    y,
    text: crit ? `Kryt ${Math.round(amount)}` : String(Math.round(amount)),
    crit,
    life: 0.7,
  });
  if (state.floaters.length > 24) state.floaters.shift();
}

function triggerShake(duration, magnitude) {
  state.shakeTimer = duration;
  state.shakeMagnitude = magnitude;
}

function spawnParticles(x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 110;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 3,
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.6,
    });
  }
}

function grantExp(amount) {
  state.exp += amount;
  while (state.exp >= state.expToNext) {
    state.exp -= state.expToNext;
    state.level += 1;
    state.expToNext = xpRequiredFor(state.level);
    state.pendingLevels += 1;
  }
}

function damageEnemy(enemy, amount, crit) {
  enemy.hp -= amount;
  const at = centerOf(enemy);
  spawnFloater(at.x, at.y - 8, amount, crit);
  spawnParticles(at.x, at.y, crit ? "#f7d774" : "#e3c27a", crit ? 10 : 5);
  triggerShake(0.08, 3.5);

  if (enemy.hp > 0) return;
  enemy.hp = 0;
  state.kills += 1;
  const expVal = enemy.kind === "shooter" ? CONFIG.shooterExp : (enemy.kind === "runner" ? CONFIG.runnerExp : CONFIG.chaserExp);
  grantExp(expVal);
  spawnParticles(at.x, at.y, "#805828", 12);
}

function pointInCone(point, origin, dir, range, arc) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  const dot = clamp((dx * dir.x + dy * dir.y) / dist, -1, 1);
  return Math.acos(dot) <= arc / 2;
}

function rectTouchesCone(rect, origin, dir, range, arc) {
  const points = [
    centerOf(rect),
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x, y: rect.y + rect.h },
    { x: rect.x + rect.w, y: rect.y + rect.h },
  ];
  return points.some((point) => pointInCone(point, origin, dir, range, arc));
}

function rectTouchesThrustBox(rect, origin, dir, length, width) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = cx - origin.x;
  const dy = cy - origin.y;
  const forward = dx * dir.x + dy * dir.y;
  if (forward < 0 || forward > length) return false;
  const perp = Math.abs(-dx * dir.y + dy * dir.x);
  return perp <= width / 2 + Math.max(rect.w, rect.h) / 2;
}

function keepInside(entity) {
  entity.x = clamp(entity.x, 0, canvas.width - entity.w);
  entity.y = clamp(entity.y, 0, canvas.height - entity.h);
}

function pushEnemy(enemy, from, distance) {
  const origin = centerOf(enemy);
  const dir = normalize(origin.x - from.x, origin.y - from.y);
  if (!dir) return;
  enemy.x += dir.x * distance;
  enemy.y += dir.y * distance;
  keepInside(enemy);
}

function pushAlong(enemy, dir, distance) {
  enemy.x += dir.x * distance;
  enemy.y += dir.y * distance;
  keepInside(enemy);
}

function hurtPlayer(amount) {
  const player = state.player;
  if (player.iframe > 0 || player.hurtTimer > 0) return false;

  player.hp -= amount;
  player.hurtTimer = CONFIG.hurtCooldown;
  triggerShake(0.18, 6);
  spawnParticles(centerOf(player).x, centerOf(player).y, "#e23b3b", 8);

  if (player.hp <= 0) {
    player.hp = 0;
    endGame();
  }
  return true;
}

function endGame() {
  state.phase = "dead";
  state.pendingLevels = 0;
  const weapon = WEAPON_NAMES[state.player.weapon] || "brak";
  const minutes = Math.floor(state.elapsed / 60);
  const seconds = Math.floor(state.elapsed % 60);
  const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  hud.overlayStats.textContent =
    `Czas przetrwania: ${timeStr}   ·   Poziom ${state.level}   ·   Pokonani: ${state.kills}   ·   Broń: ${weapon}`;
  hud.upgradeModal.classList.add("hidden");
  hud.overlay.classList.remove("hidden");
}

function triggerVictory() {
  state.phase = "victory";
  state.pendingLevels = 0;
  const weapon = WEAPON_NAMES[state.player.weapon] || "brak";
  hud.victoryStats.textContent =
    `Czas przetrwania: 10:00 / 10:00   ·   Poziom ${state.level}   ·   Pokonani: ${state.kills}   ·   Broń: ${weapon}`;
  hud.upgradeModal.classList.add("hidden");
  hud.victoryModal.classList.remove("hidden");
}

function upgradeText(value, rank) {
  return typeof value === "function" ? value(rank) : value;
}

function rollUpgrades() {
  const weapon = state.player.weapon;
  const available = UPGRADE_DEFS.filter((def) => {
    if (def.weapon && def.weapon !== weapon) return false;
    const rank = state.stacks[def.id] || 0;
    return !def.max || rank < def.max;
  });

  for (let i = available.length - 1; i > 0; i--) {
    const swap = Math.floor(Math.random() * (i + 1));
    [available[i], available[swap]] = [available[swap], available[i]];
  }

  return available.slice(0, 3).map((def) => {
    const rank = state.stacks[def.id] || 0;
    return {
      id: def.id,
      kind: def.kind,
      category: def.category,
      title: upgradeText(def.title, rank),
      description: upgradeText(def.description, rank),
    };
  });
}

function openUpgrade() {
  if (state.phase === "dead" || state.phase === "victory") return;
  state.offered = rollUpgrades();
  if (state.offered.length === 0) {
    state.pendingLevels = 0;
    state.phase = "play";
    return;
  }

  state.phase = "upgrade";
  hud.upgradeLevel.textContent =
    `Poziom ${state.level}. ${WEAPON_NAMES[state.player.weapon]} zostaje — wybierz, co rośnie dalej.`;
  hud.upgradeChoices.innerHTML = "";

  state.offered.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `choice${option.kind === "stat" ? " stat-upgrade" : ""}`;
    button.dataset.index = String(index);
    button.innerHTML =
      `<span class="choice-key">${index + 1}</span>` +
      `<span class="choice-cat">${option.category}</span>` +
      `<strong></strong>` +
      `<span class="choice-desc"></span>`;
    button.querySelector("strong").textContent = option.title;
    button.querySelector(".choice-desc").textContent = option.description;
    hud.upgradeChoices.appendChild(button);
  });

  hud.upgradeModal.classList.remove("hidden");
}

function pickOffered(index) {
  if (state.phase !== "upgrade") return;
  const option = state.offered[index];
  if (!option) return;

  const def = UPGRADE_DEFS.find((entry) => entry.id === option.id);
  if (def) def.apply(state.player);
  state.stacks[option.id] = (state.stacks[option.id] || 0) + 1;
  state.pendingLevels = Math.max(0, state.pendingLevels - 1);
  state.offered = [];

  if (state.pendingLevels > 0) {
    openUpgrade();
    updateHud();
    return;
  }

  state.phase = "play";
  hud.upgradeModal.classList.add("hidden");
  updateHud();
}

function attackProfile() {
  const player = state.player;
  if (player.weapon === "bow") {
    return {
      kind: "bow",
      cooldown: 0.65 * player.bowHaste,
      damage: 4 * player.bowPower,
      volley: player.bowVolley,
    };
  }
  if (player.weapon === "fork") {
    return {
      kind: "fork",
      cooldown: 0.78 * player.forkHaste,
      damage: 11,
      range: 160 * player.forkReach,
      width: 24,
      knock: Math.min(150, 110 * player.forkReach),
      active: 0.1,
    };
  }
  return {
    kind: "club",
    cooldown: 1.32,
    damage: 10 * player.clubPower,
    range: 85,
    arc: Math.min(Math.PI * 1.1, Math.PI * 0.65 + player.clubArc),
    knock: 34,
    active: 0.16,
  };
}

function performAttack() {
  const player = state.player;
  const profile = attackProfile();
  const dir = { x: player.facing.x, y: player.facing.y };
  player.attackCooldown = profile.cooldown;

  if (profile.kind === "bow") {
    fireBow(dir, profile);
    return;
  }

  player.strike = {
    kind: profile.kind,
    dir,
    range: profile.range,
    arc: profile.arc,
    width: profile.width,
    damage: profile.damage,
    knock: profile.knock,
    timer: profile.active,
    duration: profile.active,
    hits: new Set(),
  };
}

function fireBow(dir, profile) {
  const origin = centerOf(state.player);
  const count = profile.volley;
  const base = Math.atan2(dir.y, dir.x);
  const spread = 0.14;
  const speed = 520;
  const size = 8;

  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
    const angle = base + offset;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    state.bolts.push({
      x: origin.x - size / 2 + dir.x * 16,
      y: origin.y - size / 2 + dir.y * 16,
      w: size,
      h: size,
      vx,
      vy,
      baseDamage: profile.damage,
      life: 0.9,
      hit: false,
    });
  }
}

function updateAttack(dt) {
  const player = state.player;
  if (!player.weapon) return;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;

  const strike = player.strike;
  if (strike) {
    strike.timer -= dt;
    const origin = centerOf(player);
    for (const enemy of state.enemies) {
      if (strike.hits.has(enemy) || enemy.hp <= 0) continue;

      let hitDetected = false;
      if (strike.kind === "fork") {
        hitDetected = rectTouchesThrustBox(enemy, origin, strike.dir, strike.range, strike.width);
      } else {
        hitDetected = rectTouchesCone(enemy, origin, strike.dir, strike.range, strike.arc);
      }

      if (!hitDetected) continue;

      strike.hits.add(enemy);
      const hit = computeDamage(strike.damage);
      damageEnemy(enemy, hit.amount, hit.crit);
      if (enemy.hp <= 0) continue;
      if (strike.kind === "fork") pushAlong(enemy, strike.dir, strike.knock);
      else pushEnemy(enemy, origin, strike.knock);
    }
    if (strike.timer <= 0) player.strike = null;
  }

  if (player.attackCooldown <= 0 && !player.strike) performAttack();
}

function updateBolts(dt) {
  for (const bolt of state.bolts) {
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.life -= dt;
    if (bolt.hit) continue;

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || !rectsOverlap(bolt, enemy)) continue;
      const hit = computeDamage(bolt.baseDamage);
      damageEnemy(enemy, hit.amount, hit.crit);
      bolt.hit = true;
      break;
    }
  }

  state.bolts = state.bolts.filter((bolt) => !bolt.hit && bolt.life > 0 && !isOffscreen(bolt));
}

function updateFloaters(dt) {
  for (const floater of state.floaters) {
    floater.y -= 28 * dt;
    floater.life -= dt;
  }
  state.floaters = state.floaters.filter((floater) => floater.life > 0);
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function updatePlayer(dt) {
  const player = state.player;
  const move = readMoveAxis();
  updateFacing(move);

  if (player.dashTimer > 0) {
    player.x += player.dashDir.x * CONFIG.dashSpeed * dt;
    player.y += player.dashDir.y * CONFIG.dashSpeed * dt;
    player.dashTimer -= dt;
  } else if (move) {
    const speed = moveSpeed(player.spd);
    player.x += move.x * speed * dt;
    player.y += move.y * speed * dt;
  }

  keepInside(player);
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.iframe > 0) player.iframe -= dt;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;
}

function randomEdgeSpawn(size) {
  const inset = 10;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * (canvas.width - size), y: inset };
  if (side === 1) return { x: canvas.width - size - inset, y: Math.random() * (canvas.height - size) };
  if (side === 2) return { x: Math.random() * (canvas.width - size), y: canvas.height - size - inset };
  return { x: inset, y: Math.random() * (canvas.height - size) };
}

function createEnemy(kind) {
  const isShooter = kind === "shooter";
  const isRunner = kind === "runner";
  const size = isRunner ? 18 : CONFIG.enemySize;
  const pos = randomEdgeSpawn(size);
  const timeProgress = state.elapsed / CONFIG.runDuration;

  let baseHp = CONFIG.chaserHp;
  if (isShooter) baseHp = CONFIG.shooterHp;
  if (isRunner) baseHp = CONFIG.runnerHp;

  const maxHp = Math.round(baseHp * (1 + timeProgress * 1.8 + (state.level - 1) * 0.2));

  return {
    kind: isShooter ? "shooter" : (isRunner ? "runner" : "chaser"),
    x: pos.x,
    y: pos.y,
    w: size,
    h: size,
    hp: maxHp,
    maxHp,
    shootTimer: 0.7 + Math.random() * CONFIG.shooterFireInterval,
    strafe: Math.random() < 0.5 ? 1 : -1,
    ai: "chase",
    aiTimer: 0,
    aim: { x: 1, y: 0 },
    swingFlash: 0,
    flankOffset: (Math.random() - 0.5) * 1.4,
  };
}

function maxEnemiesForTime(elapsed) {
  const progress = elapsed / CONFIG.runDuration;
  return Math.min(55, Math.floor(4 + progress * 46 + (state.level - 1)));
}

function spawnIntervalForTime(elapsed) {
  const progress = clamp(elapsed / CONFIG.runDuration, 0, 1);
  return Math.max(0.3, 2.6 - progress * 2.3 - (state.level - 1) * 0.04);
}

function updateSpawning(dt) {
  if (state.enemies.length >= maxEnemiesForTime(state.elapsed)) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;

  const kinds = ["chaser", "runner", "shooter"];
  const currentIdx = kinds.indexOf(state.nextKind);
  const kind = state.nextKind;
  state.nextKind = kinds[(currentIdx + 1) % kinds.length];

  state.enemies.push(createEnemy(kind));
  state.spawnTimer = spawnIntervalForTime(state.elapsed);
}

function playerIsProtected() {
  return state.player.iframe > 0;
}

function moveChaser(enemy, dt, playerCenter) {
  const origin = centerOf(enemy);
  const dx = playerCenter.x - origin.x;
  const dy = playerCenter.y - origin.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (enemy.swingFlash > 0) enemy.swingFlash -= dt;

  if (enemy.ai === "windup") {
    enemy.aiTimer -= dt;
    if (enemy.aiTimer <= 0) {
      resolveChaserSwing(enemy);
      enemy.ai = "recover";
      enemy.aiTimer = CONFIG.chaserRecover;
      enemy.swingFlash = 0.12;
    }
    return;
  }

  if (enemy.ai === "recover") {
    enemy.aiTimer -= dt;
    if (enemy.aiTimer <= 0) enemy.ai = "chase";
    return;
  }

  if (dist <= CONFIG.chaserReach) {
    enemy.ai = "windup";
    enemy.aiTimer = CONFIG.chaserWindup;
    enemy.aim = { x: dx / dist, y: dy / dist };
    return;
  }

  const angleToPlayer = Math.atan2(dy, dx);
  const targetAngle = angleToPlayer + (enemy.flankOffset || 0);
  const moveX = Math.cos(targetAngle);
  const moveY = Math.sin(targetAngle);

  const timeProgress = state.elapsed / CONFIG.runDuration;
  const speed = CONFIG.chaserSpeed + timeProgress * 24 + (state.level - 1) * 4;
  enemy.x += moveX * speed * dt;
  enemy.y += moveY * speed * dt;
  enemy.aim = { x: dx / dist, y: dy / dist };
}

function resolveChaserSwing(enemy) {
  if (playerIsProtected()) return;
  if (!rectTouchesCone(state.player, centerOf(enemy), enemy.aim, CONFIG.chaserConeRange, CONFIG.chaserConeArc)) {
    return;
  }
  hurtPlayer(CONFIG.chaserSwingDamage);
}

function moveRunner(enemy, dt, playerCenter) {
  const origin = centerOf(enemy);
  const dx = playerCenter.x - origin.x;
  const dy = playerCenter.y - origin.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (enemy.ai === "retreat") {
    enemy.aiTimer -= dt;
    enemy.x -= enemy.aim.x * CONFIG.runnerSpeed * 1.3 * dt;
    enemy.y -= enemy.aim.y * CONFIG.runnerSpeed * 1.3 * dt;
    if (enemy.aiTimer <= 0) {
      enemy.ai = "pause";
      enemy.aiTimer = 0.45;
    }
    return;
  }

  if (enemy.ai === "pause") {
    enemy.aiTimer -= dt;
    if (enemy.aiTimer <= 0) enemy.ai = "chase";
    return;
  }

  if (dist <= 32) {
    if (!playerIsProtected()) {
      hurtPlayer(CONFIG.runnerDamage);
    }
    enemy.ai = "retreat";
    enemy.aiTimer = 0.38;
    enemy.aim = { x: dx / dist, y: dy / dist };
    return;
  }

  const angleToPlayer = Math.atan2(dy, dx);
  const targetAngle = angleToPlayer + (enemy.flankOffset || 0);
  const moveX = Math.cos(targetAngle);
  const moveY = Math.sin(targetAngle);

  const speed = CONFIG.runnerSpeed + (state.elapsed / 12);
  enemy.x += moveX * speed * dt;
  enemy.y += moveY * speed * dt;
  enemy.aim = { x: dx / dist, y: dy / dist };
}

function moveShooter(enemy, dt, playerCenter) {
  const origin = centerOf(enemy);
  const dx = playerCenter.x - origin.x;
  const dy = playerCenter.y - origin.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = CONFIG.shooterSpeed;

  if (dist > CONFIG.shooterMaxDist) {
    enemy.x += (dx / dist) * speed * dt;
    enemy.y += (dy / dist) * speed * dt;
  } else if (dist < CONFIG.shooterMinDist) {
    enemy.x -= (dx / dist) * speed * dt;
    enemy.y -= (dy / dist) * speed * dt;
  } else {
    enemy.x += (-dy / dist) * enemy.strafe * speed * 0.55 * dt;
    enemy.y += (dx / dist) * enemy.strafe * speed * 0.55 * dt;
  }

  enemy.shootTimer -= dt;
  if (enemy.shootTimer <= 0) {
    fireEnemyBullet(enemy);
    enemy.shootTimer = Math.max(0.7, CONFIG.shooterFireInterval - (state.elapsed / CONFIG.runDuration));
  }
}

function fireEnemyBullet(enemy) {
  const from = centerOf(enemy);
  const to = centerOf(state.player);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const size = CONFIG.enemyBulletSize;

  state.enemyBullets.push({
    x: from.x - size / 2,
    y: from.y - size / 2,
    w: size,
    h: size,
    vx: (dx / dist) * CONFIG.enemyBulletSpeed,
    vy: (dy / dist) * CONFIG.enemyBulletSpeed,
  });
}

function updateEnemies(dt) {
  const playerCenter = centerOf(state.player);

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.kind === "shooter") moveShooter(enemy, dt, playerCenter);
    else if (enemy.kind === "runner") moveRunner(enemy, dt, playerCenter);
    else moveChaser(enemy, dt, playerCenter);
    keepInside(enemy);
  }

  for (let i = 0; i < state.enemies.length; i++) {
    for (let j = i + 1; j < state.enemies.length; j++) {
      const e1 = state.enemies[i];
      const e2 = state.enemies[j];
      if (e1.hp <= 0 || e2.hp <= 0) continue;
      const dx = (e2.x + e2.w / 2) - (e1.x + e1.w / 2);
      const dy = (e2.y + e2.h / 2) - (e1.y + e1.h / 2);
      const dist = Math.hypot(dx, dy);
      const minDist = (e1.w + e2.w) * 0.85;
      if (dist < minDist && dist > 0.01) {
        const overlap = (minDist - dist) / dist;
        const pushX = dx * overlap * 50 * dt;
        const pushY = dy * overlap * 50 * dt;
        e1.x -= pushX;
        e1.y -= pushY;
        e2.x += pushX;
        e2.y += pushY;
        keepInside(e1);
        keepInside(e2);
      }
    }
  }

  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
}

function isOffscreen(bullet) {
  return (
    bullet.x + bullet.w < -20 ||
    bullet.y + bullet.h < -20 ||
    bullet.x > canvas.width + 20 ||
    bullet.y > canvas.height + 20
  );
}

function updateEnemyBullets(dt) {
  for (const bullet of state.enemyBullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
  }
  state.enemyBullets = state.enemyBullets.filter((bullet) => !isOffscreen(bullet));
}

function resolveCollisions() {
  const player = state.player;
  if (playerIsProtected() || state.phase !== "play") return;

  for (const enemy of state.enemies) {
    if (!rectsOverlap(player, enemy)) continue;
    hurtPlayer(CONFIG.contactDamage);
    break;
  }

  if (state.phase !== "play" || player.hurtTimer > 0) return;

  for (let i = 0; i < state.enemyBullets.length; i++) {
    if (!rectsOverlap(player, state.enemyBullets[i])) continue;
    state.enemyBullets.splice(i, 1);
    hurtPlayer(CONFIG.enemyBulletDamage);
    break;
  }
}

function update(dt) {
  if (state.phase !== "play") return;

  state.elapsed += dt;
  if (state.elapsed >= CONFIG.runDuration) {
    triggerVictory();
    return;
  }

  if (state.shakeTimer > 0) {
    state.shakeTimer -= dt;
  }

  updatePlayer(dt);
  updateAttack(dt);
  updateBolts(dt);
  updateFloaters(dt);
  updateParticles(dt);

  if (state.pendingLevels > 0) {
    openUpgrade();
    return;
  }
  if (state.phase !== "play") return;

  updateSpawning(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
  resolveCollisions();
}

function drawBackground() {
  // Soczysta zielona trawa
  ctx.fillStyle = "#324d25";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Plamy piasku / ziemi
  ctx.fillStyle = "#4a3c26";
  for (const patch of state.dirtPatches) {
    ctx.beginPath();
    ctx.ellipse(patch.x, patch.y, patch.rx, patch.ry, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(74, 60, 38, 0.45)";
    ctx.fill();
  }

  // Kępki trawy
  ctx.strokeStyle = "#436631";
  ctx.lineWidth = 2;
  for (const tuft of state.grassTufts) {
    ctx.beginPath();
    ctx.moveTo(tuft.x, tuft.y);
    ctx.lineTo(tuft.x - 3, tuft.y - 6);
    ctx.moveTo(tuft.x, tuft.y);
    ctx.lineTo(tuft.x + 3, tuft.y - 7);
    ctx.stroke();
  }
}

function drawCone(origin, dir, range, arc, color, alpha) {
  const aim = Math.atan2(dir.y, dir.x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.arc(origin.x, origin.y, range, aim - arc / 2, aim + arc / 2);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = Math.min(1, alpha + 0.3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawThrustBox(origin, dir, length, width, color, alpha) {
  const angle = Math.atan2(dir.y, dir.x);
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, -width / 2, length, width);
  ctx.globalAlpha = Math.min(1, alpha + 0.3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, -width / 2, length, width);
  ctx.restore();
}

function drawHero(player) {
  const at = centerOf(player);
  const dashing = player.dashTimer > 0;
  const hurtFlash = player.hurtTimer > 0 && Math.floor(player.hurtTimer * 14) % 2 === 0;

  if (dashing) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#4da3ff";
    ctx.beginPath();
    ctx.arc(at.x - player.dashDir.x * 14, at.y - player.dashDir.y * 14, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  if (player.iframe > 0) ctx.globalAlpha = 0.75;
  if (hurtFlash) ctx.fillStyle = "#fff";

  // Ciało bohatera (tunica)
  ctx.fillStyle = "#8b5a2b"; // brązowa tunika
  ctx.beginPath();
  ctx.arc(at.x, at.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#d4af37"; // złoty pas / obramowanie
  ctx.stroke();

  // Głowa
  ctx.fillStyle = "#e0ac69";
  ctx.beginPath();
  ctx.arc(at.x, at.y - 4, 6, 0, Math.PI * 2);
  ctx.fill();

  // Widoczna broń rotująca w stronę celowania
  const angle = Math.atan2(player.facing.y, player.facing.x);
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);

  if (player.weapon === "bow") {
    // Rysowanie łuku i cięciwy
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(6, 0, 12, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(6, -12);
    ctx.lineTo(6, 12);
    ctx.stroke();
    // Strzała na łuku
    ctx.fillStyle = "#f4e2a4";
    ctx.fillRect(0, -1, 14, 2);
  } else if (player.weapon === "fork") {
    // Widły (trzy zęby)
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 0); ctx.lineTo(18, 0); // trzon
    ctx.moveTo(14, -6); ctx.lineTo(18, -6);
    ctx.moveTo(14, 0); ctx.lineTo(20, 0);
    ctx.moveTo(14, 6); ctx.lineTo(18, 6);
    ctx.stroke();
  } else if (player.weapon === "club") {
    // Pałka maczuga
    ctx.fillStyle = "#5c3a21";
    ctx.fillRect(4, -3, 10, 6);
    ctx.fillStyle = "#73492c";
    ctx.beginPath();
    ctx.arc(16, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawChaserTelegraphs() {
  for (const enemy of state.enemies) {
    if (enemy.kind !== "chaser") continue;
    const origin = centerOf(enemy);

    if (enemy.ai === "windup") {
      const charge = 1 - enemy.aiTimer / CONFIG.chaserWindup;
      drawCone(origin, enemy.aim, CONFIG.chaserConeRange, CONFIG.chaserConeArc, "#ff3b3b", 0.16 + charge * 0.28);
    }

    if (enemy.swingFlash > 0) {
      drawCone(origin, enemy.aim, CONFIG.chaserConeRange, CONFIG.chaserConeArc, "#ffd0d0", 0.45);
    }
  }
}

function drawPlayerStrike() {
  const strike = state.player.strike;
  if (!strike || strike.duration <= 0) return;
  const fade = clamp(strike.timer / strike.duration, 0, 1);
  const origin = centerOf(state.player);

  if (strike.kind === "fork") {
    drawThrustBox(origin, strike.dir, strike.range, strike.width, "#d5ecff", 0.25 + fade * 0.45);
  } else {
    const color = "#ffb15a";
    drawCone(origin, strike.dir, strike.range, strike.arc, color, 0.25 + fade * 0.45);
  }
}

function drawBolts() {
  for (const bolt of state.bolts) {
    const angle = Math.atan2(bolt.vy, bolt.vx);
    const at = centerOf(bolt);
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(angle);
    ctx.fillStyle = "#f4e2a4";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, 3);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, -3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawEnemyHpBar(enemy) {
  const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
  const barH = 4;
  const y = Math.max(0, enemy.y - barH - 3);
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(enemy.x, y, enemy.w, barH);
  ctx.fillStyle = ratio > 0.45 ? "#7dff9a" : "#ff5a5a";
  ctx.fillRect(enemy.x, y, enemy.w * ratio, barH);
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;

    if (enemy.kind === "shooter") {
      // Łucznik: zielony strój, mały łuk
      ctx.fillStyle = "#2d6a4f";
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = "#d0a070";
      ctx.beginPath();
      ctx.arc(cx, cy - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      // mini łuk
      ctx.strokeStyle = "#52b788";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 6, cy, 6, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    } else if (enemy.kind === "runner") {
      // Zwinny bandyta: mały, zakapturzony w ciemnoniebieskim stroju
      ctx.fillStyle = "#1d3557";
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = "#457b9d";
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Zwykły bandyta (Chaser): duży, łysy w brązowym stroju
      ctx.fillStyle = "#804000";
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = "#b07040"; // łysa głowa
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#402000";
      ctx.lineWidth = 2;
      ctx.strokeRect(enemy.x, enemy.y, enemy.w, enemy.h);
    }

    drawEnemyHpBar(enemy);
  }
}

function drawEnemyBullets() {
  ctx.fillStyle = "#ff4b4b";
  for (const bullet of state.enemyBullets) {
    ctx.beginPath();
    ctx.arc(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, bullet.w / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
  }
}

function drawFloaters() {
  ctx.textAlign = "center";
  ctx.font = "bold 13px Cinzel, Tahoma, sans-serif";
  for (const floater of state.floaters) {
    ctx.globalAlpha = clamp(floater.life / 0.7, 0, 1);
    ctx.fillStyle = floater.crit ? "#f7d774" : "#f2e3c6";
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.save();
  if (state.shakeTimer > 0) {
    const sx = (Math.random() - 0.5) * state.shakeMagnitude;
    const sy = (Math.random() - 0.5) * state.shakeMagnitude;
    ctx.translate(sx, sy);
  }

  drawBackground();
  drawChaserTelegraphs();
  drawPlayerStrike();
  drawEnemyBullets();
  drawBolts();
  drawEnemies();
  drawHero(state.player);
  drawParticles();
  drawFloaters();

  ctx.restore();
}

function updateHud() {
  const player = state.player;
  const hpRatio = player.maxHp > 0 ? clamp(player.hp / player.maxHp, 0, 1) : 0;
  hud.hpFill.style.width = `${Math.round(hpRatio * 100)}%`;
  hud.hpFill.classList.toggle("low", hpRatio <= 0.35 && player.hp > 0);
  hud.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

  hud.level.textContent = String(state.level);
  const expRatio = state.expToNext > 0 ? clamp(state.exp / state.expToNext, 0, 1) : 0;
  hud.expFill.style.width = `${Math.round(expRatio * 100)}%`;
  hud.expText.textContent = `${Math.floor(state.exp)} / ${state.expToNext}`;

  hud.weaponName.textContent = WEAPON_NAMES[player.weapon] || "Brak";
  hud.weaponDesc.textContent = WEAPON_DESCS[player.weapon] || "Wybierz broń, aby rozpocząć.";

  hud.str.textContent = String(player.str);
  hud.dex.textContent = String(player.dex);
  hud.spd.textContent = String(player.spd);
  hud.int.textContent = String(player.int);

  const ready = player.dashCooldown <= 0 && player.dashTimer <= 0;
  const max = player.dashCooldownMax || dashCooldownDuration(player.dex);
  const ratio = ready ? 1 : 1 - player.dashCooldown / max;
  hud.dashFill.style.width = `${Math.round(clamp(ratio, 0, 1) * 100)}%`;
  hud.dashText.textContent = ready ? "Gotów" : `${player.dashCooldown.toFixed(1)}s`;

  const remaining = Math.max(0, CONFIG.runDuration - state.elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  hud.runTimer.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const activeContainer = hud.activeUpgradesList;
  activeContainer.innerHTML = "";
  const activeEntries = Object.entries(state.stacks);
  if (activeEntries.length === 0) {
    activeContainer.innerHTML = '<span class="no-upgrades">Brak ulepszeń</span>';
  } else {
    activeEntries.forEach(([id, count]) => {
      const def = UPGRADE_DEFS.find((d) => d.id === id);
      if (!def) return;
      const title = typeof def.title === "function" ? def.title(count - 1) : def.title;
      const item = document.createElement("div");
      item.className = "upgrade-item";
      item.innerHTML = `<span>${title}</span><span>poziom ${count}</span>`;
      activeContainer.appendChild(item);
    });
  }
}

let lastTime = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;
  if (state.phase === "play") {
    update(dt);
  }
  updateHud();
  render();
  requestAnimationFrame(frame);
}

resetToMenu();
requestAnimationFrame(frame);