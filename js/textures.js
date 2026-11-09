/**
 * ============================================================================
 * PLIK: js/textures.js (Menadżer Zasobów i Tekstur - Three.js)
 * ============================================================================
 *
 * MINIPORADNIK EDUKACYJNY:
 * Tekstury rysujemy proceduralnie na <canvas> i zamieniamy na THREE.CanvasTexture,
 * więc nie potrzeba żadnych plików graficznych.
 *
 * flipY = false: nasza kamera ma oś Y skierowaną w dół (jak w Canvas 2D),
 * więc tekstura musi być "nieodwrócona", aby górna część rysunku była na górze ekranu.
 */

export const textures = {
  player: null,
  chaser: null,
  shooter: null,
  runner: null,
  bow: null,
  fork: null,
  club: null,
  bolt: null,
  bullet: null,
};

function createCanvasTexture(w, h, drawFn) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  drawFn(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export async function loadGameTextures(onProgress) {
  const assetDefs = [
    { key: "player", w: 64, h: 64, draw(ctx, w, h) {
      ctx.fillStyle = "#8b5a2b"; ctx.beginPath(); ctx.arc(w/2, h/2, 22, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = "#d4af37"; ctx.stroke();
      ctx.fillStyle = "#e0ac69"; ctx.beginPath(); ctx.arc(w/2, h/2 - 4, 12, 0, Math.PI * 2); ctx.fill();
    }},
    { key: "chaser", w: 64, h: 64, draw(ctx, w, h) {
      ctx.fillStyle = "#6b1c1c"; ctx.beginPath(); ctx.arc(w/2, h/2, 22, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#380d0d"; ctx.stroke();
      ctx.fillStyle = "#a83232"; ctx.beginPath(); ctx.arc(w/2, h/2 - 4, 10, 0, Math.PI * 2); ctx.fill();
    }},
    { key: "shooter", w: 64, h: 64, draw(ctx, w, h) {
      ctx.fillStyle = "#4a1c6b"; ctx.beginPath(); ctx.arc(w/2, h/2, 22, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#250d36"; ctx.stroke();
      ctx.fillStyle = "#8c45cc"; ctx.beginPath(); ctx.arc(w/2, h/2 - 4, 10, 0, Math.PI * 2); ctx.fill();
    }},
    { key: "runner", w: 64, h: 64, draw(ctx, w, h) {
      ctx.fillStyle = "#1d3557"; ctx.beginPath(); ctx.arc(w/2, h/2, 20, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#0d1a2b"; ctx.stroke();
      ctx.fillStyle = "#457b9d"; ctx.beginPath(); ctx.arc(w/2, h/2 - 4, 10, 0, Math.PI * 2); ctx.fill();
    }},
    { key: "bow", w: 64, h: 64, draw(ctx, w, h) {
      ctx.strokeStyle = "#8b4513"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w/2, h/2, 20, -Math.PI/1.5, Math.PI/1.5); ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w/2 - 6, h/2 - 17); ctx.lineTo(w/2 - 6, h/2 + 17); ctx.stroke();
    }},
    { key: "fork", w: 64, h: 64, draw(ctx, w, h) {
      ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 4; ctx.beginPath();
      ctx.moveTo(10, h/2); ctx.lineTo(54, h/2);
      ctx.moveTo(42, h/2 - 12); ctx.lineTo(54, h/2 - 12);
      ctx.moveTo(42, h/2); ctx.lineTo(58, h/2);
      ctx.moveTo(42, h/2 + 12); ctx.lineTo(54, h/2 + 12); ctx.stroke();
    }},
    { key: "club", w: 64, h: 64, draw(ctx, w, h) {
      ctx.fillStyle = "#5c3a21"; ctx.fillRect(16, h/2 - 6, 24, 12);
      ctx.fillStyle = "#73492c"; ctx.beginPath(); ctx.arc(46, h/2, 14, 0, Math.PI * 2); ctx.fill();
    }},
    { key: "bolt", w: 32, h: 32, draw(ctx, w, h) {
      ctx.fillStyle = "#f4e2a4"; ctx.fillRect(4, h/2 - 3, w - 8, 6);
    }},
    { key: "bullet", w: 32, h: 32, draw(ctx, w, h) {
      ctx.fillStyle = "#ff4b4b"; ctx.beginPath(); ctx.arc(w/2, h/2, 10, 0, Math.PI * 2); ctx.fill();
    }}
  ];

  let loaded = 0;
  for (const def of assetDefs) {
    textures[def.key] = createCanvasTexture(def.w, def.h, def.draw);
    loaded++;
    if (onProgress) onProgress(Math.round((loaded / assetDefs.length) * 100));
    await new Promise(r => setTimeout(r, 20)); // Krótka pauza dla efektu paska ładowania
  }
}