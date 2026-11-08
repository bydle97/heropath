import { CONFIG, WEAPON_NAMES } from './config.js';
import { state, hud, keys, initEnvironment, createPlayer } from './state.js';
import { updatePlayer, updateAttack, tryStartDash } from './player.js';
import { updateSpawning, updateEnemies } from './enemies.js';
import { render, renderWeaponPreviews } from './renderer.js';
import { updateHud, openUpgrade, pickOffered } from './ui.js';

export function resetToMenu() {
  state.player = createPlayer();
  state.enemies = [];
  state.enemyBullets = [];
  state.bolts = [];
  state.floaters = [];
  state.particles = [];
  state.kills = 0;
  state.level = 1;
  state.exp = 0;
  state.expToNext = Math.round(CONFIG.xpBase * CONFIG.xpGrowth ** 0);
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

export function startArmory() {
  state.phase = "armory";
  hud.mainMenu.classList.add("hidden");
  hud.weaponModal.classList.remove("hidden");
  renderWeaponPreviews();
  updateHud();
}

export function chooseWeapon(weaponId) {
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

export function endGame() {
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

export function triggerVictory() {
  state.phase = "victory";
  state.pendingLevels = 0;
  const weapon = WEAPON_NAMES[state.player.weapon] || "brak";
  hud.victoryStats.textContent =
    `Czas przetrwania: 10:00 / 10:00   ·   Poziom ${state.level}   ·   Pokonani: ${state.kills}   ·   Broń: ${weapon}`;
  hud.upgradeModal.classList.add("hidden");
  hud.victoryModal.classList.remove("hidden");
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

function updateEnemyBullets(dt) {
  for (const bullet of state.enemyBullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
  }
  state.enemyBullets = state.enemyBullets.filter((bullet) => !isOffscreen(bullet));
}

function isOffscreen(bullet) {
  return (
    bullet.x + bullet.w < -20 ||
    bullet.y + bullet.h < -20 ||
    bullet.x > canvas.width + 20 ||
    bullet.y > canvas.height + 20
  );
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveCollisions() {
  const player = state.player;
  if (player.iframe > 0 || state.phase !== "play") return;

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

import { hurtPlayer, computeDamage, damageEnemy } from './enemies.js';
import { canvas } from './state.js';

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