import { CONFIG } from './config.js';
import { state, canvas } from './state.js';
import { centerOf, keepInside } from './player.js';

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function computeDamage(base) {
  const player = state.player;
  const scaled = base * (1 + player.str / 100);
  const crit = Math.random() * 100 < player.int;
  return { amount: scaled * (crit ? 2 : 1), crit };
}

export function spawnFloater(x, y, amount, crit) {
  state.floaters.push({
    x,
    y,
    text: crit ? `Kryt ${Math.round(amount)}` : String(Math.round(amount)),
    crit,
    life: 0.7,
  });
  if (state.floaters.length > 24) state.floaters.shift();
}

export function triggerShake(duration, magnitude) {
  state.shakeTimer = duration;
  state.shakeMagnitude = magnitude;
}

export function spawnParticles(x, y, color, count = 6) {
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

export function grantExp(amount) {
  state.exp += amount;
  while (state.exp >= state.expToNext) {
    state.exp -= state.expToNext;
    state.level += 1;
    // Regeneracja HP na level up (+2 HP)
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2);
    state.expToNext = Math.round(CONFIG.xpBase * CONFIG.xpGrowth ** (state.level - 1));
    state.pendingLevels += 1;
  }
}

export function damageEnemy(enemy, amount, crit) {
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

export function pointInCone(point, origin, dir, range, arc) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  const dot = Math.max(-1, Math.min(1, (dx * dir.x + dy * dir.y) / dist));
  return Math.acos(dot) <= arc / 2;
}

export function rectTouchesCone(rect, origin, dir, range, arc) {
  const points = [
    centerOf(rect),
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x, y: rect.y + rect.h },
    { x: rect.x + rect.w, y: rect.y + rect.h },
  ];
  return points.some((point) => pointInCone(point, origin, dir, range, arc));
}

export function rectTouchesThrustBox(rect, origin, dir, length, width) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = cx - origin.x;
  const dy = cy - origin.y;
  const forward = dx * dir.x + dy * dir.y;
  if (forward < 0 || forward > length) return false;
  const perp = Math.abs(-dx * dir.y + dy * dir.x);
  return perp <= width / 2 + Math.max(rect.w, rect.h) / 2;
}

export function pushEnemy(enemy, from, distance) {
  const origin = centerOf(enemy);
  const length = Math.hypot(origin.x - from.x, origin.y - from.y);
  if (length < 0.001) return;
  const dir = { x: (origin.x - from.x) / length, y: (origin.y - from.y) / length };
  enemy.x += dir.x * distance;
  enemy.y += dir.y * distance;
  keepInside(enemy);
}

export function pushAlong(enemy, dir, distance) {
  enemy.x += dir.x * distance;
  enemy.y += dir.y * distance;
  keepInside(enemy);
}

export function hurtPlayer(amount) {
  const player = state.player;
  if (player.iframe > 0 || player.hurtTimer > 0) return false;

  player.hp -= amount;
  player.hurtTimer = CONFIG.hurtCooldown;
  triggerShake(0.18, 6);
  spawnParticles(centerOf(player).x, centerOf(player).y, "#e23b3b", 8);

  if (player.hp <= 0) {
    player.hp = 0;
    // import endGame dynamically or handle in main/ui
  }
  return true;
}

export function randomEdgeSpawn(size) {
  const inset = 10;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * (canvas.width - size), y: inset };
  if (side === 1) return { x: canvas.width - size - inset, y: Math.random() * (canvas.height - size) };
  if (side === 2) return { x: Math.random() * (canvas.width - size), y: canvas.height - size - inset };
  return { x: inset, y: Math.random() * (canvas.height - size) };
}

export function createEnemy(kind) {
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

export function maxEnemiesForTime(elapsed) {
  const progress = elapsed / CONFIG.runDuration;
  return Math.min(55, Math.floor(4 + progress * 46 + (state.level - 1)));
}

export function spawnIntervalForTime(elapsed) {
  const progress = Math.max(0, Math.min(1, elapsed / CONFIG.runDuration));
  return Math.max(0.3, 2.6 - progress * 2.3 - (state.level - 1) * 0.04);
}

export function updateSpawning(dt) {
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

export function playerIsProtected() {
  return state.player.iframe > 0;
}

export function moveChaser(enemy, dt, playerCenter) {
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

export function resolveChaserSwing(enemy) {
  if (playerIsProtected()) return;
  if (!rectTouchesCone(state.player, centerOf(enemy), enemy.aim, CONFIG.chaserConeRange, CONFIG.chaserConeArc)) {
    return;
  }
  hurtPlayer(CONFIG.chaserSwingDamage);
}

export function moveRunner(enemy, dt, playerCenter) {
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

export function moveShooter(enemy, dt, playerCenter) {
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

export function fireEnemyBullet(enemy) {
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

export function updateEnemies(dt) {
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