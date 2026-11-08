import { CONFIG, STARTING_STATS } from './config.js';

export const canvas = document.getElementById("game");
export const ctx = canvas.getContext("2d");

export const hud = {
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
  phase: "menu",
  spawnTimer: 1.1,
  nextKind: "chaser",
  elapsed: 0,
  shakeTimer: 0,
  shakeMagnitude: 0,
};

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