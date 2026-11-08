import { state, canvas, ctx } from './state.js';
import { centerOf } from './player.js';

export function drawBackground() {
  ctx.fillStyle = "#324d25";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(74, 60, 38, 0.45)";
  for (const patch of state.dirtPatches) {
    ctx.beginPath();
    ctx.ellipse(patch.x, patch.y, patch.rx, patch.ry, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

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

export function drawCone(origin, dir, range, arc, color, alpha) {
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

export function drawThrustBox(origin, dir, length, width, color, alpha) {
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

export function drawHero(player) {
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

  ctx.fillStyle = "#8b5a2b";
  ctx.beginPath();
  ctx.arc(at.x, at.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#d4af37";
  ctx.stroke();

  ctx.fillStyle = "#e0ac69";
  ctx.beginPath();
  ctx.arc(at.x, at.y - 4, 6, 0, Math.PI * 2);
  ctx.fill();

  const angle = Math.atan2(player.facing.y, player.facing.x);
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);

  if (player.weapon === "bow") {
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
    ctx.fillStyle = "#f4e2a4";
    ctx.fillRect(0, -1, 14, 2);
  } else if (player.weapon === "fork") {
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 0); ctx.lineTo(18, 0);
    ctx.moveTo(14, -6); ctx.lineTo(18, -6);
    ctx.moveTo(14, 0); ctx.lineTo(20, 0);
    ctx.moveTo(14, 6); ctx.lineTo(18, 6);
    ctx.stroke();
  } else if (player.weapon === "club") {
    ctx.fillStyle = "#5c3a21";
    ctx.fillRect(4, -3, 10, 6);
    ctx.fillStyle = "#73492c";
    ctx.beginPath();
    ctx.arc(16, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawChaserTelegraphs() {
  for (const enemy of state.enemies) {
    if (enemy.kind !== "chaser") continue;
    const origin = centerOf(enemy);
    if (enemy.ai === "windup") {
      const charge = 1 - enemy.aiTimer / 0.6;
      drawCone(origin, enemy.aim, 112, Math.PI * 0.62, "#ff3b3b", 0.16 + charge * 0.28);
    }
    if (enemy.swingFlash > 0) {
      drawCone(origin, enemy.aim, 112, Math.PI * 0.62, "#ffd0d0", 0.45);
    }
  }
}

export function drawPlayerStrike() {
  const strike = state.player.strike;
  if (!strike || strike.duration <= 0) return;
  const fade = Math.max(0, Math.min(1, strike.timer / strike.duration));
  const origin = centerOf(state.player);

  if (strike.kind === "fork") {
    drawThrustBox(origin, strike.dir, strike.range, strike.width, "#d5ecff", 0.25 + fade * 0.45);
  } else {
    drawCone(origin, strike.dir, strike.range, strike.arc, "#ffb15a", 0.25 + fade * 0.45);
  }
}

export function drawBolts() {
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

export function drawEnemyHpBar(enemy) {
  const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
  const barH = 4;
  const y = Math.max(0, enemy.y - barH - 3);
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(enemy.x, y, enemy.w, barH);
  ctx.fillStyle = ratio > 0.45 ? "#7dff9a" : "#ff5a5a";
  ctx.fillRect(enemy.x, y, enemy.w * ratio, barH);
}

export function drawEnemies() {
  for (const enemy of state.enemies) {
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;

    if (enemy.kind === "shooter") {
      ctx.fillStyle = "#2d6a4f";
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = "#d0a070";
      ctx.beginPath();
      ctx.arc(cx, cy - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#52b788";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 6, cy, 6, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    } else if (enemy.kind === "runner") {
      ctx.fillStyle = "#1d3557";
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = "#457b9d";
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#804000";
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.fillStyle = "#b07040";
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

export function drawEnemyBullets() {
  ctx.fillStyle = "#ff4b4b";
  for (const bullet of state.enemyBullets) {
    ctx.beginPath();
    ctx.arc(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, bullet.w / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawParticles() {
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.restore();
  }
}

export function drawFloaters() {
  ctx.textAlign = "center";
  ctx.font = "bold 13px Cinzel, Tahoma, sans-serif";
  for (const floater of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, floater.life / 0.7));
    ctx.fillStyle = floater.crit ? "#f7d774" : "#f2e3c6";
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.globalAlpha = 1;
}

export function render() {
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

// Proceduralne rysowanie broni w canvas preview (dla menu wyboru)
export function drawWeaponPreviewOnCanvas(targetCanvas, weaponType) {
  const pCtx = targetCanvas.getContext("2d");
  pCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  pCtx.save();
  pCtx.translate(targetCanvas.width / 2, targetCanvas.height / 2);

  if (weaponType === "bow") {
    pCtx.strokeStyle = "#8b4513";
    pCtx.lineWidth = 3;
    pCtx.beginPath();
    pCtx.arc(0, 0, 18, -Math.PI / 1.5, Math.PI / 1.5);
    pCtx.stroke();
    pCtx.strokeStyle = "#e8e8e8";
    pCtx.lineWidth = 1;
    pCtx.beginPath();
    pCtx.moveTo(-4, -15.5);
    pCtx.lineTo(-4, 15.5);
    pCtx.stroke();
    pCtx.fillStyle = "#f4e2a4";
    pCtx.fillRect(-12, -1, 18, 2);
  } else if (weaponType === "fork") {
    pCtx.strokeStyle = "#cccccc";
    pCtx.lineWidth = 2;
    pCtx.beginPath();
    pCtx.moveTo(-16, 0); pCtx.lineTo(16, 0);
    pCtx.moveTo(10, -8); pCtx.lineTo(16, -8);
    pCtx.moveTo(10, 0); pCtx.lineTo(18, 0);
    pCtx.moveTo(10, 8); pCtx.lineTo(16, 8);
    pCtx.stroke();
  } else if (weaponType === "club") {
    pCtx.fillStyle = "#5c3a21";
    pCtx.fillRect(-10, -4, 14, 8);
    pCtx.fillStyle = "#73492c";
    pCtx.beginPath();
    pCtx.arc(8, 0, 8, 0, Math.PI * 2);
    pCtx.fill();
  }

  pCtx.restore();
}