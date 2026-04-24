import { isCurator, onModeChange } from './userMode.js';
import { toggleWallPanel,    closeWallPanel    } from './ui.js';
import { toggleFloorPanel,   closeFloorPanel   } from './floor.js';
import { toggleObjectsPanel, closeObjectsPanel } from './installation.js';

const ITEMS = [
  { label: '🎨  Walls',   toggle: toggleWallPanel,    close: closeWallPanel    },
  { label: '🗿  Objects', toggle: toggleObjectsPanel, close: closeObjectsPanel },
  { label: '🏛  Floor',   toggle: toggleFloorPanel,   close: closeFloorPanel   },
];

export function initDecorateMenu() {
  injectCSS();

  // ── Trigger button ──────────────────────────────────────────────────────────
  const trigger = document.createElement('button');
  trigger.id = 'decorate-trigger';
  trigger.innerHTML = '✦ Decorate <span id="decorate-caret">▾</span>';
  document.body.appendChild(trigger);

  // ── Dropdown ────────────────────────────────────────────────────────────────
  const menu = document.createElement('div');
  menu.id = 'decorate-menu';
  document.body.appendChild(menu);

  ITEMS.forEach(item => {
    const li = document.createElement('button');
    li.className = 'decorate-item';
    li.textContent = item.label;
    li.addEventListener('click', () => {
      // Close all other panels first
      ITEMS.forEach(other => { if (other !== item) other.close(); });
      item.toggle();
      closeMenu();
    });
    menu.appendChild(li);
  });

  // ── Open / close ────────────────────────────────────────────────────────────
  let open = false;

  function openMenu() {
    const rect = trigger.getBoundingClientRect();
    menu.style.top  = (rect.bottom + 4) + 'px';
    menu.style.left = rect.left + 'px';
    open = true;
    menu.classList.add('open');
    document.getElementById('decorate-caret').textContent = '▴';
    setTimeout(() => document.addEventListener('click', outsideClick), 0);
  }

  function closeMenu() {
    open = false;
    menu.classList.remove('open');
    document.getElementById('decorate-caret').textContent = '▾';
    document.removeEventListener('click', outsideClick);
  }

  function outsideClick(e) {
    if (!trigger.contains(e.target) && !menu.contains(e.target)) closeMenu();
  }

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    open ? closeMenu() : openMenu();
  });

  // ── Visibility based on role ────────────────────────────────────────────────
  function syncVisibility() {
    const show = isCurator();
    trigger.style.display = show ? '' : 'none';
    if (!show) { closeMenu(); ITEMS.forEach(i => i.close()); }
  }

  syncVisibility();
  onModeChange(syncVisibility);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('decorate-menu-css')) return;
  const s = document.createElement('style');
  s.id = 'decorate-menu-css';
  s.textContent = `
    #decorate-trigger {
      padding: 10px 16px;
      background: rgba(20,12,4,0.82);
      color: #f0e6d0;
      border: 1px solid #8a6a3a;
      border-radius: 6px; cursor: pointer;
      font-size: 14px; font-family: serif; letter-spacing: 0.05em;
      backdrop-filter: blur(4px);
      transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }
    #decorate-trigger:hover {
      background: rgba(90,50,10,0.9);
      border-color: #c8903a;
    }
    #decorate-caret {
      font-size: 10px; margin-left: 4px; opacity: 0.7;
      display: inline-block; transition: transform 0.15s;
    }

    #decorate-menu {
      position: fixed; z-index: 300;
      background: rgba(12,7,3,0.96);
      border: 1px solid #8a6a3a;
      border-radius: 8px;
      padding: 6px 0;
      min-width: 170px;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.75), 0 0 0 1px rgba(200,144,58,0.08);
      opacity: 0; pointer-events: none;
      transform: translateY(-6px);
      transition: opacity 0.16s ease, transform 0.16s ease;
    }
    #decorate-menu.open {
      opacity: 1; pointer-events: auto;
      transform: translateY(0);
    }

    .decorate-item {
      display: block; width: 100%;
      padding: 10px 18px;
      background: transparent; border: none;
      color: #f0e0c0; font-size: 13px; font-family: serif;
      letter-spacing: 0.04em; text-align: left;
      cursor: pointer;
      transition: background 0.12s, color 0.12s;
      border-bottom: 1px solid rgba(200,144,58,0.08);
    }
    .decorate-item:last-child { border-bottom: none; }
    .decorate-item:hover {
      background: rgba(200,144,58,0.14);
      color: #f8d898;
    }
  `;
  document.head.appendChild(s);
}
