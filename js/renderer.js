/**
 * ============================================================================
 * PLIK: js/renderer.js (Silnik Graficzny 2.5D oparty o Three.js WebGL)
 * ============================================================================
 *
 * MINIPORADNIK EDUKACYJNY:
 * 1. Kamera ortograficzna: OrthographicCamera(0, W, 0, H) mapuje świat 1:1 na piksele
 *    z osią Y skierowaną w dół (jak w Canvas 2D).
 * 2. Odwrócona oś Y odwraca kolejność wierzchołków, dlatego WSZYSTKO jest rysowane
 *    meshami z materiałem DoubleSide (bez THREE.Sprite).
 * 3. Animacje ataków wynikają ze stanu gry: player.strike (postęp ciosu bohatera),
 *    enemy.ai / enemy.swingFlash (zapowiedź ciosu wroga), enemy.shootTimer (celowanie strzelca).
 * 4. Efekty (pociski, cząsteczki, liczby obrażeń) są w pulach - nie tworzymy nowych
 *    obiektów co klatkę.
 */

import { state } from './state.js';
import { centerOf } from './player.js';
import { textures } from './textures.js';
import { CONFIG } from './config.js';

export const WORLD_W = 920;
export const WORLD_H = 620;

const domCanvas = document.getElementById("game");

const renderer = new THREE.WebGLRenderer({ canvas: domCanvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(WORLD_W, WORLD_H, false);

export const scene = new THREE.Scene();
scene.background = new THREE.Color("#324d25");

export const camera = new THREE.OrthographicCamera(0, WORLD_W, 0, WORLD_H, 0.1, 2000);
camera.position.set(0, 0, 1000);

const envGroup = new THREE.Group();
const entitiesGroup = new THREE.Group();
const effectsGroup = new THREE.Group();
scene.add(envGroup);
scene.add(entitiesGroup);
scene.add(effectsGroup);

const unitPlane = new THREE.PlaneGeometry(1, 1);

function basicMaterial(opts) {
  return new THREE.MeshBasicMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    ...opts,
  });
}

// Wycinek koła (stożek) o promieniu 1, wycentrowany na kierunku 0 rad
const sectorCache = new Map();
function sectorGeometry(arc) {
  const key = arc.toFixed(3);
  if (!sectorCache.has(key)) {
    sectorCache.set(key, new THREE.CircleGeometry(1, 28, -arc / 2, arc));
  }
  return sectorCache.get(key);
}

export function initThreeEnvironment() {
  while (envGroup.children.length > 0) envGroup.remove(envGroup.children[0]);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W, WORLD_H),
    new THREE.MeshBasicMaterial({ color: 0x324d25, side: THREE.DoubleSide })
  );
  ground.position.set(WORLD_W / 2, WORLD_H / 2, -10);
  envGroup.add(ground);

  for (const patch of state.dirtPatches) {
    const patchMesh = new THREE.Mesh(
      new THREE.CircleGeometry(patch.rx, 16),
      new THREE.MeshBasicMaterial({
        color: 0x4a3c26,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      })
    );
    patchMesh.position.set(patch.x, patch.y, -5);
    patchMesh.scale.set(1, patch.ry / patch.rx, 1);
    envGroup.add(patchMesh);
  }
}

// ---------------------------------------------------------------------------
// Stan renderera
// ---------------------------------------------------------------------------
let playerMesh = null;
let weaponMesh = null;
let strikeMesh = null;
let strikeRef = null;
let prevAttackCooldown = 0;
let weaponKick = 0;
let lastNow = performance.now();

const enemyViews = new Map(); // enemy -> { body, tele, bg, fill }
const enemyMaterials = {};
const barBgMaterial = basicMaterial({ color: 0x120a06, opacity: 0.85 });

const boltPool = [];
const bulletPool = [];
const particlePool = [];
const floaterPool = [];
const textTextures = new Map();

function getEnemyMaterial(kind, tex) {
  if (!enemyMaterials[kind]) enemyMaterials[kind] = basicMaterial({ map: tex });
  return enemyMaterials[kind];
}

function syncPool(pool, count, create) {
  while (pool.length < count) {
    const mesh = create();
    effectsGroup.add(mesh);
    pool.push(mesh);
  }
  for (let i = 0; i < pool.length; i++) pool[i].visible = i < count;
}

function getTextTexture(text, crit) {
  const key = (crit ? "c:" : "n:") + text;
  if (textTextures.has(key)) return textTextures.get(key);
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 40;
  const ctx = c.getContext("2d");
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#1a0d05";
  ctx.strokeText(text, 64, 21);
  ctx.fillStyle = crit ? "#ffd84a" : "#ffffff";
  ctx.fillText(text, 64, 21);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  textTextures.set(key, tex);
  if (textTextures.size > 200) {
    const firstKey = textTextures.keys().next().value;
    textTextures.get(firstKey).dispose();
    textTextures.delete(firstKey);
  }
  return tex;
}

// ---------------------------------------------------------------------------
// Animacja ciosu bohatera (widły: pchnięcie, pałka: stożek zamachu)
// Zwraca postęp ciosu 0..1 (albo -1, gdy brak ciosu)
// ---------------------------------------------------------------------------
function updateStrikeEffect(player, origin) {
  const s = player.strike;
  if (s !== strikeRef) {
    if (strikeMesh) {
      effectsGroup.remove(strikeMesh);
      strikeMesh.material.dispose();
      strikeMesh = null;
    }
    strikeRef = s;
    if (s) {
      strikeMesh =
        s.kind === "fork"
          ? new THREE.Mesh(unitPlane, basicMaterial({ color: 0xfff2b0 }))
          : new THREE.Mesh(sectorGeometry(s.arc), basicMaterial({ color: 0xffe0a0 }));
      effectsGroup.add(strikeMesh);
    }
  }
  if (!s || !strikeMesh) return -1;

  const p = 1 - Math.max(0, s.timer) / s.duration;
  const fade = 1 - p;
  const angle = Math.atan2(s.dir.y, s.dir.x);

  if (s.kind === "fork") {
    const len = s.range * Math.min(1, 0.25 + p * 2.5);
    strikeMesh.scale.set(len, s.width, 1);
    strikeMesh.position.set(origin.x + s.dir.x * len / 2, origin.y + s.dir.y * len / 2, 13);
    strikeMesh.rotation.z = angle;
    strikeMesh.material.opacity = 0.15 + 0.7 * fade;
  } else {
    const r = s.range * (0.55 + 0.45 * p);
    strikeMesh.scale.set(r, r, 1);
    strikeMesh.position.set(origin.x, origin.y, 13);
    strikeMesh.rotation.z = angle;
    strikeMesh.material.opacity = 0.08 + 0.4 * fade;
  }
  return p;
}

// ---------------------------------------------------------------------------
// Wrogowie: ciało, zapowiedź ataku, pasek życia
// ---------------------------------------------------------------------------
function createEnemyView(enemy, tex) {
  const body = new THREE.Mesh(unitPlane, getEnemyMaterial(enemy.kind, tex));
  entitiesGroup.add(body);

  let tele = null;
  if (enemy.kind === "chaser") {
    tele = new THREE.Mesh(sectorGeometry(CONFIG.chaserConeArc), basicMaterial({ color: 0xff3030 }));
  } else if (enemy.kind === "shooter") {
    tele = new THREE.Mesh(unitPlane, basicMaterial({ color: 0xff5050 }));
  }
  if (tele) {
    tele.visible = false;
    entitiesGroup.add(tele);
  }

  const bg = new THREE.Mesh(unitPlane, barBgMaterial);
  const fill = new THREE.Mesh(unitPlane, basicMaterial({ color: 0x43c76c }));
  entitiesGroup.add(bg);
  entitiesGroup.add(fill);

  return { body, tele, bg, fill };
}

function removeEnemyView(view) {
  entitiesGroup.remove(view.body);
  if (view.tele) {
    entitiesGroup.remove(view.tele);
    view.tele.material.dispose();
  }
  entitiesGroup.remove(view.bg);
  entitiesGroup.remove(view.fill);
  view.fill.material.dispose();
}

function updateEnemyView(enemy, view, pCenter) {
  const c = centerOf(enemy);
  let scale = enemy.w * 1.8;
  let ox = 0;
  let oy = 0;

  if (enemy.kind === "chaser") {
    const tele = view.tele;
    if (enemy.ai === "windup") {
      const p = 1 - Math.max(0, enemy.aiTimer) / CONFIG.chaserWindup;
      const r = CONFIG.chaserConeRange * (0.35 + 0.65 * p);
      tele.visible = true;
      tele.material.color.set(0xff3030);
      tele.material.opacity = 0.12 + 0.35 * p;
      tele.scale.set(r, r, 1);
      tele.position.set(c.x, c.y, 7);
      tele.rotation.z = Math.atan2(enemy.aim.y, enemy.aim.x);
      scale *= 1 + 0.2 * p;
    } else if (enemy.swingFlash > 0) {
      const f = enemy.swingFlash / 0.12;
      tele.visible = true;
      tele.material.color.set(0xffffff);
      tele.material.opacity = 0.85 * f;
      tele.scale.set(CONFIG.chaserConeRange, CONFIG.chaserConeRange, 1);
      tele.position.set(c.x, c.y, 7);
      tele.rotation.z = Math.atan2(enemy.aim.y, enemy.aim.x);
      ox = enemy.aim.x * 10 * f;
      oy = enemy.aim.y * 10 * f;
    } else {
      tele.visible = false;
    }
  } else if (enemy.kind === "shooter") {
    const tele = view.tele;
    if (enemy.shootTimer > 0 && enemy.shootTimer < 0.4) {
      const p = 1 - enemy.shootTimer / 0.4;
      const dx = pCenter.x - c.x;
      const dy = pCenter.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      tele.visible = true;
      tele.material.opacity = 0.2 + 0.6 * p;
      tele.scale.set(90, 2.5, 1);
      tele.position.set(c.x + ux * 55, c.y + uy * 55, 7);
      tele.rotation.z = Math.atan2(uy, ux);
      scale *= 1 + 0.3 * p;
    } else {
      tele.visible = false;
    }
  } else if (enemy.kind === "runner") {
    if (enemy.ai === "retreat") scale *= 1.2;
  }

  view.body.scale.set(scale, scale, 1);
  view.body.position.set(c.x + ox, c.y + oy, 8);

  // Pasek życia
  const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
  const barW = 28;
  const barY = c.y - enemy.h * 0.9 - 7;
  view.bg.scale.set(barW + 2, 6, 1);
  view.bg.position.set(c.x, barY, 9);
  view.fill.scale.set(Math.max(0.01, barW * ratio), 4, 1);
  view.fill.position.set(c.x - barW / 2 + (barW * ratio) / 2, barY, 9.5);
  view.fill.material.color.setHSL(0.33 * ratio, 0.75, 0.5);
}

// ---------------------------------------------------------------------------
// Główna funkcja renderująca
// ---------------------------------------------------------------------------
export function render() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;

  let sx = 0;
  let sy = 0;
  if (state.shakeTimer > 0) {
    sx = (Math.random() - 0.5) * state.shakeMagnitude;
    sy = (Math.random() - 0.5) * state.shakeMagnitude;
  }
  camera.position.set(sx, sy, 1000);

  if (!state.player) {
    renderer.render(scene, camera);
    return;
  }

  const player = state.player;
  const pCenter = centerOf(player);

  // Odrzut broni po każdym ataku (cooldown skacze w górę)
  if (player.attackCooldown > prevAttackCooldown + 0.05) weaponKick = 0.12;
  prevAttackCooldown = player.attackCooldown;
  if (weaponKick > 0) weaponKick = Math.max(0, weaponKick - dt);

  // --- Gracz ---
  if (!playerMesh && textures.player) {
    playerMesh = new THREE.Mesh(unitPlane, basicMaterial({ map: textures.player }));
    playerMesh.scale.set(player.w * 1.8, player.h * 1.8, 1);
    entitiesGroup.add(playerMesh);
  }
  if (playerMesh) {
    playerMesh.position.set(pCenter.x, pCenter.y, 10);
    let opacity = 1;
    if (player.iframe > 0) opacity = 0.6;
    else if (player.hurtTimer > 0) opacity = Math.floor(now / 70) % 2 ? 0.3 : 1;
    playerMesh.material.opacity = opacity;
  }

  // --- Animacja ciosu ---
  const strikeProgress = updateStrikeEffect(player, pCenter);

  // --- Broń ---
  if (player.weapon) {
    const tex = textures[player.weapon];
    if (!weaponMesh && tex) {
      weaponMesh = new THREE.Mesh(unitPlane, basicMaterial({ map: tex }));
      weaponMesh.scale.set(36, 36, 1);
      entitiesGroup.add(weaponMesh);
    } else if (weaponMesh && tex && weaponMesh.material.map !== tex) {
      weaponMesh.material.map = tex;
      weaponMesh.material.needsUpdate = true;
    }
    if (weaponMesh) {
      let angle = Math.atan2(player.facing.y, player.facing.x);
      let offset = 16;
      const s = player.strike;

      if (s && strikeProgress >= 0) {
        if (s.kind === "fork") {
          offset += Math.sin(strikeProgress * Math.PI) * s.range * 0.45;
        } else {
          angle += -s.arc / 2 + s.arc * strikeProgress;
          offset += 6;
        }
      } else if (player.weapon === "bow") {
        offset -= (weaponKick / 0.12) * 6;
      }

      weaponMesh.position.set(
        pCenter.x + Math.cos(angle) * offset,
        pCenter.y + Math.sin(angle) * offset,
        12
      );
      weaponMesh.rotation.z = angle;
    }
  } else if (weaponMesh) {
    entitiesGroup.remove(weaponMesh);
    weaponMesh.material.dispose();
    weaponMesh = null;
  }

  // --- Wrogowie ---
  const currentEnemies = new Set();
  for (const enemy of state.enemies) {
    currentEnemies.add(enemy);
    let view = enemyViews.get(enemy);
    if (!view) {
      const tex =
        enemy.kind === "shooter" ? textures.shooter : enemy.kind === "runner" ? textures.runner : textures.chaser;
      if (!tex) continue;
      view = createEnemyView(enemy, tex);
      enemyViews.set(enemy, view);
    }
    updateEnemyView(enemy, view, pCenter);
  }
  for (const [enemy, view] of enemyViews.entries()) {
    if (!currentEnemies.has(enemy)) {
      removeEnemyView(view);
      enemyViews.delete(enemy);
    }
  }

  // --- Strzały gracza ---
  const boltCount = textures.bolt ? state.bolts.length : 0;
  syncPool(boltPool, boltCount, () => new THREE.Mesh(unitPlane, basicMaterial({ map: textures.bolt })));
  for (let i = 0; i < boltCount; i++) {
    const bolt = state.bolts[i];
    const mesh = boltPool[i];
    mesh.scale.set(bolt.w * 3, bolt.h * 1.5, 1);
    mesh.position.set(bolt.x + bolt.w / 2, bolt.y + bolt.h / 2, 15);
    mesh.rotation.z = Math.atan2(bolt.vy, bolt.vx);
  }

  // --- Pociski wrogów ---
  const bulletCount = textures.bullet ? state.enemyBullets.length : 0;
  syncPool(bulletPool, bulletCount, () => new THREE.Mesh(unitPlane, basicMaterial({ map: textures.bullet })));
  for (let i = 0; i < bulletCount; i++) {
    const bullet = state.enemyBullets[i];
    const mesh = bulletPool[i];
    mesh.scale.set(bullet.w * 1.6, bullet.h * 1.6, 1);
    mesh.position.set(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, 15);
  }

  // --- Cząsteczki ---
  const particleCount = state.particles.length;
  syncPool(particlePool, particleCount, () => new THREE.Mesh(unitPlane, basicMaterial({ color: 0xffffff })));
  for (let i = 0; i < particleCount; i++) {
    const p = state.particles[i];
    const mesh = particlePool[i];
    mesh.material.color.set(p.color);
    mesh.material.opacity = Math.max(0, Math.min(1, p.life / p.maxLife));
    mesh.scale.set(p.size * 2, p.size * 2, 1);
    mesh.position.set(p.x, p.y, 20);
  }

  // --- Liczby obrażeń ---
  const floaterCount = state.floaters.length;
  syncPool(floaterPool, floaterCount, () => new THREE.Mesh(unitPlane, basicMaterial({})));
  for (let i = 0; i < floaterCount; i++) {
    const f = state.floaters[i];
    const mesh = floaterPool[i];
    const tex = getTextTexture(f.text, f.crit);
    if (mesh.material.map !== tex) {
      mesh.material.map = tex;
      mesh.material.needsUpdate = true;
    }
    const size = f.crit ? 1.25 : 1;
    mesh.scale.set(64 * size, 20 * size, 1);
    mesh.position.set(f.x, f.y, 25);
    mesh.material.opacity = Math.max(0, Math.min(1, f.life / 0.4));
  }

  renderer.render(scene, camera);
}

export function drawWeaponPreviewOnCanvas(targetCanvas, weaponType) {
  const pCtx = targetCanvas.getContext("2d");
  pCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  pCtx.save();
  pCtx.translate(targetCanvas.width / 2, targetCanvas.height / 2);

  if (weaponType === "bow") {
    pCtx.strokeStyle = "#8b4513"; pCtx.lineWidth = 3;
    pCtx.beginPath(); pCtx.arc(0, 0, 18, -Math.PI / 1.5, Math.PI / 1.5); pCtx.stroke();
    pCtx.strokeStyle = "#e8e8e8"; pCtx.lineWidth = 1;
    pCtx.beginPath(); pCtx.moveTo(-4, -15.5); pCtx.lineTo(-4, 15.5); pCtx.stroke();
    pCtx.fillStyle = "#f4e2a4"; pCtx.fillRect(-12, -1, 18, 2);
  } else if (weaponType === "fork") {
    pCtx.strokeStyle = "#cccccc"; pCtx.lineWidth = 2;
    pCtx.beginPath();
    pCtx.moveTo(-16, 0); pCtx.lineTo(16, 0);
    pCtx.moveTo(10, -8); pCtx.lineTo(16, -8);
    pCtx.moveTo(10, 0); pCtx.lineTo(18, 0);
    pCtx.moveTo(10, 8); pCtx.lineTo(16, 8);
    pCtx.stroke();
  } else if (weaponType === "club") {
    pCtx.fillStyle = "#5c3a21"; pCtx.fillRect(-10, -4, 14, 8);
    pCtx.fillStyle = "#73492c"; pCtx.beginPath(); pCtx.arc(8, 0, 8, 0, Math.PI * 2); pCtx.fill();
  }
  pCtx.restore();
}