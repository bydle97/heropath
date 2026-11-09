import { CONFIG } from './config.js';
import { state, canvas, keys } from './state.js';
import { rectTouchesCone, rectTouchesThrustBox, pushEnemy, pushAlong, damageEnemy, computeDamage } from './enemies.js';

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 0.001) return null;
  return { x: x / length, y: y / length };
}

export function readAxis(left, right, up, down) {
  let x = 0;
  let y = 0;
  if (keys.has(left)) x -= 1;
  if (keys.has(right)) x += 1;
  if (keys.has(up)) y -= 1;
  if (keys.has(down)) y += 1;
  return normalize(x, y);
}

export function readMoveAxis() {
  return readAxis("KeyA", "KeyD", "KeyW", "KeyS");
}

export function readAimAxis() {
  return readAxis("ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown");
}

export function updateFacing(move) {
  const player = state.player;

  // 1. Strzałki mają pierwszeństwo (celowanie z klawiatury)
  const aim = readAimAxis();
  if (aim) {
    player.facing = aim;
    return;
  }

  // 2. Mysz: bohater patrzy w stronę kursora
  if (state.mouse && state.mouse.active) {
    const c = centerOf(player);
    const toMouse = normalize(state.mouse.x - c.x, state.mouse.y - c.y);
    if (toMouse) {
      player.facing = toMouse;
      return;
    }
  }

  // 3. Bez myszy: kierunek uniku / ruchu
  if (player.dashTimer > 0) {
    player.facing = { x: player.dashDir.x, y: player.dashDir.y };
    return;
  }
  if (move) player.facing = { x: move.x, y: move.y };
}

export function moveSpeed(spd) {
  return Math.min(CONFIG.speedCap, CONFIG.speedBase + spd * CONFIG.speedPerPoint);
}

export function dashCooldownDuration(dex) {
  const scaled = CONFIG.dashCooldownBase / (1 + dex * CONFIG.dashCooldownDex);
  return Math.max(CONFIG.dashCooldownMin, scaled);
}

export function tryStartDash() {
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

export function centerOf(entity) {
  return { x: entity.x + entity.w / 2, y: entity.y + entity.h / 2 };
}

export function keepInside(entity) {
  entity.x = Math.max(0, Math.min(canvas.width - entity.w, entity.x));
  entity.y = Math.max(0, Math.min(canvas.height - entity.h, entity.y));
}

export function updatePlayer(dt) {
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

export function attackProfile() {
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
      cooldown: 0.75 * player.forkHaste,
      damage: 11,
      range: 110 * player.forkReach,
      width: 22,
      knock: Math.min(140, 100 * player.forkReach),
      active: 0.1,
    };
  }
  return {
    kind: "club",
    cooldown: 1.32,
    damage: 10 * player.clubPower,
    range: 82,
    arc: Math.min(Math.PI * 0.8, Math.PI * 0.40 + player.clubArc),
    knock: 34,
    active: 0.15,
  };
}

export function performAttack() {
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

export function fireBow(dir, profile) {
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

export function updateAttack(dt) {
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