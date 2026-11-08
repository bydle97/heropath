import { CONFIG, WEAPON_NAMES, WEAPON_DESCS, UPGRADE_DEFS } from './config.js';
import { state, hud } from './state.js';
import { dashCooldownDuration } from './player.js';
import { drawWeaponPreviewOnCanvas } from './renderer.js';

export function updateHud() {
  const player = state.player;
  const hpRatio = player.maxHp > 0 ? Math.max(0, Math.min(1, player.hp / player.maxHp)) : 0;
  hud.hpFill.style.width = `${Math.round(hpRatio * 100)}%`;
  hud.hpFill.classList.toggle("low", hpRatio <= 0.35 && player.hp > 0);
  hud.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

  hud.level.textContent = String(state.level);
  const expRatio = state.expToNext > 0 ? Math.max(0, Math.min(1, state.exp / state.expToNext)) : 0;
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
  hud.dashFill.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
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

  // Widoczność modala pauzy
  if (hud.pauseModal) {
    hud.pauseModal.classList.toggle("hidden", state.phase !== "paused");
  }
}

export function rollUpgrades() {
  const weapon = state.player.weapon;
  const weightedPool = [];
  UPGRADE_DEFS.forEach((def) => {
    if (def.weapon && def.weapon !== weapon) return;
    const rank = state.stacks[def.id] || 0;
    if (def.max && rank >= def.max) return;

    const weight = def.weight || 1;
    for (let i = 0; i < weight; i++) {
      weightedPool.push(def);
    }
  });

  for (let i = weightedPool.length - 1; i > 0; i--) {
    const swap = Math.floor(Math.random() * (i + 1));
    [weightedPool[i], weightedPool[swap]] = [weightedPool[swap], weightedPool[i]];
  }

  const chosen = [];
  const chosenIds = new Set();
  for (const def of weightedPool) {
    if (!chosenIds.has(def.id)) {
      chosenIds.add(def.id);
      chosen.push(def);
      if (chosen.length === 3) break;
    }
  }

  return chosen.map((def) => {
    const rank = state.stacks[def.id] || 0;
    const title = typeof def.title === "function" ? def.title(rank) : def.title;
    const description = typeof def.description === "function" ? def.description(rank) : def.description;
    return {
      id: def.id,
      kind: def.kind,
      category: def.category,
      title,
      description,
    };
  });
}

export function openUpgrade() {
  if (state.phase === "dead" || state.phase === "victory") return;
  state.offered = rollUpgrades();
  if (state.offered.length === 0) {
    state.pendingLevels = 0;
    state.phase = "paused";
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

export function pickOffered(index) {
  if (state.phase !== "upgrade") return;
  const option = state.offered[index];
  if (!option) return;

  const def = UPGRADE_DEFS.find((entry) => entry.id === option.id);
  if (def) def.apply(state.player);
  state.stacks[option.id] = (state.stacks[option.id] || 0) + 1;
  state.pendingLevels = Math.max(0, state.pendingLevels - 1);
  state.offered = [];

  hud.upgradeModal.classList.add("hidden");

  if (state.pendingLevels > 0) {
    openUpgrade();
    updateHud();
    return;
  }

  // Po wybraniu ulepszenia gra wstrzymuje się (pauza), wymagając naciśnięcia Ctrl, aby gracz zdążył przygotować się do walki
  state.phase = "paused";
  updateHud();
}

export function renderWeaponPreviews() {
  const modal = hud.weaponModal;
  if (!modal) return;
  const buttons = modal.querySelectorAll("[data-weapon]");
  buttons.forEach((btn) => {
    const weaponType = btn.dataset.weapon;
    let previewCanvas = btn.querySelector("canvas.weapon-preview");
    if (!previewCanvas) {
      previewCanvas = document.createElement("canvas");
      previewCanvas.className = "weapon-preview";
      previewCanvas.width = 54;
      previewCanvas.height = 54;
      btn.insertBefore(previewCanvas, btn.firstChild.nextSibling);
    }
    drawWeaponPreviewOnCanvas(previewCanvas, weaponType);
  });
}