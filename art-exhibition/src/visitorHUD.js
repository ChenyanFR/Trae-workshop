import { isCurator, onModeChange } from './userMode.js';

let _hud       = null;
let _fadeTimer = null;

export function initVisitorHUD() {
  injectStyles();
  _hud = buildHUD();
  document.body.appendChild(_hud);

  // Re-show briefly on any interaction
  document.addEventListener('mousemove', onInteract, { passive: true });
  document.addEventListener('keydown',   onInteract, { capture: true, passive: true });

  function syncRole() {
    if (isCurator()) {
      hideNow();
    } else {
      show();
      scheduleHide(5000);
    }
  }
  onModeChange(syncRole);
  syncRole();
}

// ─── Visibility helpers ───────────────────────────────────────────────────────
function show() {
  if (!_hud) return;
  clearTimeout(_fadeTimer);
  _hud.style.opacity = '1';
}

function hideNow() {
  if (!_hud) return;
  clearTimeout(_fadeTimer);
  _hud.style.opacity = '0';
}

function scheduleHide(ms) {
  clearTimeout(_fadeTimer);
  _fadeTimer = setTimeout(() => { if (_hud) _hud.style.opacity = '0'; }, ms);
}

function onInteract() {
  if (isCurator()) return;
  show();
  scheduleHide(2000);
}

// ─── Build HUD DOM ────────────────────────────────────────────────────────────
function buildHUD() {
  const hud = document.createElement('div');
  hud.id = 'visitor-hud';

  const rows = [
    { action: 'Move',         keys: ['W', 'A', 'S', 'D'] },
    { action: 'Look up / down', keys: ['Q', 'E'] },
    { action: 'Focus artwork', keys: ['click'] },
    { action: 'All controls', keys: ['H'] },
  ];

  rows.forEach(({ action, keys }) => {
    const row = document.createElement('div');
    row.className = 'hud-row';

    const lbl = document.createElement('span');
    lbl.className = 'hud-label';
    lbl.textContent = action;
    row.appendChild(lbl);

    const keysWrap = document.createElement('span');
    keysWrap.className = 'hud-keys';
    keys.forEach(k => {
      const badge = document.createElement('span');
      badge.className = k === 'click' ? 'hud-key hud-key--mouse' : 'hud-key';
      badge.textContent = k === 'click' ? '🖱 click' : k;
      keysWrap.appendChild(badge);
    });
    row.appendChild(keysWrap);

    hud.appendChild(row);
  });

  return hud;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('visitor-hud-css')) return;
  const s = document.createElement('style');
  s.id = 'visitor-hud-css';
  s.textContent = `
    #visitor-hud {
      position: fixed;
      bottom: 28px; right: 28px;
      z-index: 150;
      padding: 12px 16px;
      background: rgba(6, 4, 2, 0.70);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(200, 155, 60, 0.20);
      border-radius: 10px;
      min-width: 210px;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.7s ease;
      font-family: Georgia, serif;
      box-shadow: 0 4px 24px rgba(0,0,0,0.55);
    }

    .hud-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 5px 0;
      border-bottom: 1px solid rgba(200, 155, 60, 0.07);
    }
    .hud-row:last-child { border-bottom: none; }

    .hud-label {
      font-size: 10.5px;
      color: rgba(210, 185, 140, 0.50);
      letter-spacing: 0.05em;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .hud-keys {
      display: flex;
      gap: 3px;
      align-items: center;
      flex-shrink: 0;
    }

    .hud-key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 5px;
      background: rgba(255, 245, 215, 0.07);
      border: 1px solid rgba(200, 155, 60, 0.38);
      border-bottom: 2px solid rgba(200, 155, 60, 0.55);
      border-radius: 4px;
      font-size: 11px;
      font-family: 'SF Mono', 'Consolas', 'Menlo', monospace;
      color: rgba(240, 215, 155, 0.90);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.5);
      letter-spacing: 0;
    }

    .hud-key--mouse {
      min-width: auto;
      padding: 0 8px;
      font-family: Georgia, serif;
      font-size: 10px;
      letter-spacing: 0.03em;
      border-color: rgba(200, 155, 60, 0.25);
      border-bottom-color: rgba(200, 155, 60, 0.38);
      color: rgba(240, 215, 155, 0.65);
    }
  `;
  document.head.appendChild(s);
}
