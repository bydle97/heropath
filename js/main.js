/**
 * ============================================================================
 * PLIK: js/main.js (Główny Punkt Wejścia i Pętla Gry - Three.js WebGL)
 * ============================================================================
 * 
 * MINIPORADNIK EDUKACYJNY (Delegacja Zdarzeń w JavaScript):
 * Zamiast podpinać nasłuchiwacze bezpośrednio pod konkretne elementy, które mogą 
 * się pojawiać i znikać (np. modale), używamy delegacji zdarzeń (`document.addEventListener("click", ...)`).
 * Pozwala to skutecznie wychwytywać kliknięcia w dowolne przyciski w grze za pomocą `.closest()`.
 */

import { CONFIG, WEAPON_NAMES } from './config.js';
import { state, hud, keys, initEnvironment, createPlayer } from './state.js';
import { updatePlayer, updateAttack, tryStartDash } from './player.js';
import { updateSpawning, updateEnemies, hurtPlayer, computeDamage, damageEnemy } from './enemies.js';
import { render } from './renderer.js';
import { updateHud, openUpgrade, pickOffered, renderWeaponPreviews } from './ui.js';
import { loadGameTextures } from './textures.js';
import { canvas } from './state.js';

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

  if (hud.loadingModal) hud.loadingModal.classList.add("hidden");
  if (hud.mainMenu) hud.mainMenu.classList.remove("hidden");
  if (hud.weaponModal) hud.weaponModal.classList.add("hidden");
  if (hud.upgradeModal) hud.upgradeModal.classList.add("hidden");
  if (hud.overlay) hud.overlay.classList.add("hidden");
  if (hud.victoryModal) hud.victoryModal.classList.add("hidden");
  if (hud.pauseModal) hud.pauseModal.classList.add("hidden");
  if (hud.upgradeChoices) hud.upgradeChoices.innerHTML = "";
  updateHud();
}

export function startArmory() {
  state.phase = "armory";
  if (hud.mainMenu) hud.mainMenu.classList.add("hidden");
  if (hud.weaponModal) hud.weaponModal.classList.remove("hidden");
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
  if (hud.weaponModal) hud.weaponModal.classList.add("hidden");
  updateHud();
}

export function endGame() {
  state.phase = "dead";
  state.pendingLevels = 0;
  const weapon = WEAPON_NAMES[state.player.weapon] || "brak";
  const minutes = Math.floor(state.elapsed / 60);
  const seconds = Math.floor(state.elapsed % 60);
  const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  if (hud.overlayStats) {
    hud.overlayStats.textContent =
      `Czas przetrwania: ${timeStr}   ·   Poziom ${state.level}   ·   Pokonani: ${state.kills}   ·   Broń: ${weapon}`;
  }
  if (hud.upgradeModal) hud.upgradeModal.classList.add("hidden");
  if (hud.pauseModal) hud.pauseModal.classList.add("hidden");
  if (hud.overlay) hud.overlay.classList.remove("hidden");
}

export function triggerVictory() {
  state.phase = "victory";
  state.pendingLevels = 0;
  const weapon = WEAPON_NAMES[state.player.weapon] || "brak";
  if (hud.victoryStats) {
    hud.victoryStats.textContent =
      `Czas przetrwania: 10:00 / 10:00   ·   Poziom ${state.level}   ·   Pokonani: ${state.kills}   ·   Broń: ${weapon}`;
  }
  if (hud.upgradeModal) hud.upgradeModal.classList.add("hidden");
  if (hud.pauseModal) hud.pauseModal.classList.add("hidden");
  if (hud.victoryModal) hud.victoryModal.classList.remove("hidden");
}

const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
const AIM_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

window.addEventListener("keydown", (e) => {
  if (MOVE_KEYS.has(e.code) || AIM_KEYS.has(e.code) || e.code === "Space") {
    keys.add(e.code);
    if (MOVE_KEYS.has(e.code) || AIM_KEYS.has(e.code)) e.preventDefault();
    if (e.code === "Space") {
      e.preventDefault();
      tryStartDash();
    }
  }

  if (e.code === "KeyQ") {
    if (state.phase === "play") {
      state.phase = "paused";
    } else if (state.phase === "paused") {
      state.phase = "play";
    }
    updateHud();
  }

  if (e.code === "KeyR") {
    if (state.phase === "dead" || state.phase === "victory") {
      resetToMenu();
    }
  }

  if (state.phase === "upgrade") {
    if (e.code === "Digit1" || e.code === "Numpad1") pickOffered(0);
    if (e.code === "Digit2" || e.code === "Numpad2") pickOffered(1);
    if (e.code === "Digit3" || e.code === "Numpad3") pickOffered(2);
  }

  if (state.phase === "armory") {
    if (e.code === "Digit1" || e.code === "Numpad1") chooseWeapon("bow");
    if (e.code === "Digit2" || e.code === "Numpad2") chooseWeapon("fork");
    if (e.code === "Digit3" || e.code === "Numpad3") chooseWeapon("club");
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

// Robustyjna delegacja zdarzeń kliknięć na poziomie całego dokumentu
document.addEventListener("click", (e) => {
  // Przycisk "Nowa Gra" w menu głównym
  if (e.target.closest("#start-game-btn")) {
    startArmory();
    return;
  }

  // Wybór broni w zbrojowni
  const weaponBtn = e.target.closest("[data-weapon]");
  if (weaponBtn && state.phase === "armory") {
    chooseWeapon(weaponBtn.dataset.weapon);
    return;
  }

  // Wybór ulepszenia
  const upgradeBtn = e.target.closest("button[data-index]");
  if (upgradeBtn && state.phase === "upgrade") {
    pickOffered(Number(upgradeBtn.dataset.index));
    return;
  }

  // Kliknięcie w ekran końca gry (dead / victory) powracające do menu
  if (e.target.closest("#overlay") && state.phase === "dead") {
    resetToMenu();
    return;
  }

  if (e.target.closest("#victory-modal") && state.phase === "victory") {
    resetToMenu();
    return;
  }
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
    if (state.player.hp <= 0) endGame();
    break;
  }

  if (state.phase !== "play" || player.hurtTimer > 0) return;

  for (let i = 0; i < state.enemyBullets.length; i++) {
    if (!rectsOverlap(player, state.enemyBullets[i])) continue;
    state.enemyBullets.splice(i, 1);
    hurtPlayer(CONFIG.enemyBulletDamage);
    if (state.player.hp <= 0) endGame();
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
  if (state.phase === "play" && state.player.hp <= 0) endGame();
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

async function initGame() {
  state.phase = "loading";
  if (hud.loadingModal) hud.loadingModal.classList.remove("hidden");

  try {
    await loadGameTextures((percent) => {
      if (hud.loadingFill) hud.loadingFill.style.width = `${percent}%`;
      if (hud.loadingFill) hud.loadingFill.style.width = `${percent}%`;
      if (hud.loadingText) hud.loadingText.textContent = `Ładowanie zasobów Three.js: ${percent}%`;
    });
  } catch (err) {
    console.error("Błąd ładowania tekstur Three.js:", err);
  }

  resetToMenu();
  requestAnimationFrame(frame);
}

initGame();
