/**
 * ============================================================================
 * PLIK: js/state.js (Zarządzanie Stanem Gry i Środowiskiem - Gettery HUD)
 * ============================================================================
 *
 * MINIPORADNIK EDUKACYJNY (JavaScript - Gettery w obiektach):
 * Używanie getterów (`get nazwa() { return ... }`) w obiekcie `hud` sprawia,
 * że elementy DOM są pobierane dynamicznie w momencie odczytu, a nie jednorazowo
 * przy starcie modułu. Zapobiega to błędom, gdy skrypt ładuje się przed DOM.
 *
 * MYSZ: pozycja kursora jest przeliczana na współrzędne ŚWIATA gry (920x620),
 * niezależnie od tego, jak canvas jest skalowany na ekranie.
 *
 * UWAGA: `canvas` to stały obiekt z wymiarami ŚWIATA gry (a nie element DOM).
 */

import { CONFIG, STARTING_STATS } from './config.js';
import { initThreeEnvironment, WORLD_W, WORLD_H } from './renderer.js';

export const canvas = { width: WORLD_W, height: WORLD_H };

export const hud = {
  get hpFill() { return document.getElementById("hp-fill"); },
  get hpText() { return document.getElementById("hp-text"); },
  get level() { return document.getElementById("level"); },
  get expFill() { return document.getElementById("exp-fill"); },
  get expText() { return document.getElementById("exp-text"); },
  get weaponName() { return document.getElementById("weapon-name"); },
  get weaponDesc() { return document.getElementById("weapon-desc"); },
  get str() { return document.getElementById("str-val"); },
  get dex() { return document.getElementById("dex-val"); },
  get spd() { return document.getElementById("spd-val"); },
  get int() { return document.getElementById("int-val"); },
  get dashFill() { return document.getElementById("dash-fill"); },
  get dashText() { return document.getElementById("dash-text"); },
  get runTimer() { return document.getElementById("run-timer"); },
  get activeUpgradesList() { return document.getElementById("active-upgrades-list"); },
  get mainMenu() { return document.getElementById("main-menu"); },
  get startGameBtn() { return document.getElementById("start-game-btn"); },
  get weaponModal() { return document.getElementById("weapon-modal"); },
  get upgradeModal() { return document.getElementById("upgrade-modal"); },
  get upgradeLevel() { return document.getElementById("upgrade-level"); },
  get upgradeChoices() { return document.getElementById("upgrade-choices"); },
  get overlay() { return document.getElementById("overlay"); },
  get overlayStats() { return document.getElementById("overlay-stats"); },
  get victoryModal() { return document.getElementById("victory-modal"); },
  get victoryStats() { return document.getElementById("victory-stats"); },
  get pauseModal() { return document.getElementById("pause-modal"); },
  get loadingModal() { return document.getElementById("loading-modal"); },
  get loadingText() { return document.getElementById("loading-text"); },
  get loadingFill() { return document.getElementById("loading-fill"); },
};

export const keys = new Set();

export const state = {
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
  phase: "loading",
  spawnTimer: 1.1,
  nextKind: "chaser",
  elapsed: 0,
  shakeTimer: 0,
  shakeMagnitude: 0,
  // Pozycja kursora w współrzędnych świata gry; active = mysz już się poruszyła
  mouse: { x: WORLD_W / 2, y: WORLD_H / 2, active: false },
};

// Śledzenie myszy (na oknie, więc działa też gdy kursor jest nad modalem)
const gameCanvasEl = document.getElementById("game");
window.addEventListener("mousemove", (e) => {
  const rect = gameCanvasEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  state.mouse.x = (e.clientX - rect.left) * (WORLD_W / rect.width);
  state.mouse.y = (e.clientY - rect.top) * (WORLD_H / rect.height);
  state.mouse.active = true;
});

export function initEnvironment() {
  state.dirtPatches = [];
  for (let i = 0; i < 18; i++) {
    state.dirtPatches.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      rx: 40 + Math.random() * 55,
      ry: 25 + Math.random() * 40,
    });
  }
  state.grassTufts = [];
  for (let i = 0; i < 60; i++) {
    state.grassTufts.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
    });
  }
  initThreeEnvironment();
}

export function createPlayer() {
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