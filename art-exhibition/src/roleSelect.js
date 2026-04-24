import { setControlsEnabled } from './controls.js';

// ─── Role Selection Screen ─────────────────────────────────────────────────────
// Shown once after the GLB loads, before the gallery is interactive.
// Calls onSelect('curator' | 'visitor') and fades itself out.

export function showRoleSelect(onSelect) {
  setControlsEnabled(false);
  injectStyles();

  const overlay = document.createElement('div');
  overlay.id = 'role-select-overlay';
  document.body.appendChild(overlay);

  // ── Background decorative lines ──
  const deco = document.createElement('div');
  deco.className = 'rs-deco';
  overlay.appendChild(deco);

  // ── Center card ──
  const box = document.createElement('div');
  box.className = 'rs-box';
  overlay.appendChild(box);

  // Title
  const title = document.createElement('div');
  title.className = 'rs-title';
  title.textContent = 'Enter the Exhibition';
  box.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'rs-sub';
  sub.textContent = 'How would you like to experience the space?';
  box.appendChild(sub);

  // Cards row
  const row = document.createElement('div');
  row.className = 'rs-row';
  box.appendChild(row);

  row.appendChild(makeCard({
    role: 'curator',
    icon: '✎',
    name: 'Artist',
    tagline: 'Shape the exhibition',
    perks: ['Upload & place artworks', 'Edit labels & descriptions', 'Customise walls and floor'],
    accent: '#c8903a',
    accentDim: 'rgba(200,144,58,0.12)',
    accentGlow: 'rgba(200,144,58,0.25)',
  }, onSelect, overlay));

  row.appendChild(makeCard({
    role: 'visitor',
    icon: '👁',
    name: 'Visitor',
    tagline: 'Wander and discover',
    perks: ['Browse every artwork', 'Read artist statements', 'Explore at your own pace'],
    accent: '#5a9fd4',
    accentDim: 'rgba(90,159,212,0.10)',
    accentGlow: 'rgba(90,159,212,0.22)',
  }, onSelect, overlay));

  // Fade in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  });
}

// ─── Card factory ─────────────────────────────────────────────────────────────
function makeCard({ role, icon, name, tagline, perks, accent, accentDim, accentGlow }, onSelect, overlay) {
  const card = document.createElement('div');
  card.className = 'rs-card';
  card.style.setProperty('--accent',     accent);
  card.style.setProperty('--accent-dim', accentDim);
  card.style.setProperty('--accent-glow',accentGlow);

  const iconEl = document.createElement('div');
  iconEl.className = 'rs-icon';
  iconEl.textContent = icon;
  iconEl.style.color = accent;
  card.appendChild(iconEl);

  const nameEl = document.createElement('div');
  nameEl.className = 'rs-name';
  nameEl.textContent = name;
  nameEl.style.color = accent;
  card.appendChild(nameEl);

  const tagEl = document.createElement('div');
  tagEl.className = 'rs-tagline';
  tagEl.textContent = tagline;
  card.appendChild(tagEl);

  const divider = document.createElement('div');
  divider.className = 'rs-divider';
  divider.style.background = accent;
  card.appendChild(divider);

  const ul = document.createElement('ul');
  ul.className = 'rs-perks';
  perks.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    ul.appendChild(li);
  });
  card.appendChild(ul);

  const enterBtn = document.createElement('div');
  enterBtn.className = 'rs-enter';
  enterBtn.textContent = `Enter as ${name}`;
  enterBtn.style.color = accent;
  enterBtn.style.borderColor = accent;
  card.appendChild(enterBtn);

  card.addEventListener('click', () => {
    // Brief pulse then fade overlay
    card.style.transform = 'translateY(-6px) scale(1.03)';
    card.style.boxShadow = `0 0 48px ${accentGlow}, 0 32px 64px rgba(0,0,0,0.7)`;
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        setControlsEnabled(true);
        onSelect(role);
      }, 500);
    }, 120);
  });

  return card;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('role-select-css')) return;
  const s = document.createElement('style');
  s.id = 'role-select-css';
  s.textContent = `
    #role-select-overlay {
      position: fixed; inset: 0; z-index: 900;
      background: radial-gradient(ellipse at 50% 40%, #1a1108 0%, #080604 100%);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.6s ease;
      font-family: Georgia, 'Noto Serif SC', serif;
      overflow: hidden;
    }

    /* Subtle grid overlay */
    #role-select-overlay::before {
      content: '';
      position: absolute; inset: 0; pointer-events: none;
      background-image:
        linear-gradient(rgba(200,160,80,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200,160,80,0.03) 1px, transparent 1px);
      background-size: 60px 60px;
    }

    .rs-deco {
      position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 600px 300px at 20% 80%, rgba(200,144,58,0.06) 0%, transparent 70%),
        radial-gradient(ellipse 500px 250px at 80% 20%, rgba(90,159,212,0.05) 0%, transparent 70%);
    }

    .rs-box {
      position: relative; text-align: center;
      padding: 0 24px;
    }

    .rs-title {
      font-size: 38px; font-weight: normal;
      color: #f0e8d8; letter-spacing: 0.12em;
      margin-bottom: 12px; line-height: 1.2;
    }

    .rs-sub {
      font-size: 14px; color: rgba(240,232,216,0.45);
      letter-spacing: 0.06em; margin-bottom: 52px;
      font-style: italic;
    }

    .rs-row {
      display: flex; gap: 28px; justify-content: center;
      flex-wrap: wrap;
    }

    .rs-card {
      width: 260px;
      background: rgba(255,250,242,0.04);
      border: 1px solid rgba(255,250,242,0.1);
      border-radius: 12px;
      padding: 36px 28px 28px;
      cursor: pointer;
      transition: transform 0.22s ease, box-shadow 0.22s ease,
                  border-color 0.22s ease, background 0.22s ease;
      text-align: left;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .rs-card:hover {
      transform: translateY(-6px);
      background: var(--accent-dim);
      border-color: var(--accent);
      box-shadow: 0 0 32px var(--accent-glow), 0 20px 48px rgba(0,0,0,0.65);
    }

    .rs-icon {
      font-size: 32px; margin-bottom: 16px;
      line-height: 1;
    }

    .rs-name {
      font-size: 26px; font-weight: normal;
      letter-spacing: 0.08em; margin-bottom: 6px;
    }

    .rs-tagline {
      font-size: 13px; color: rgba(240,232,216,0.5);
      font-style: italic; letter-spacing: 0.04em;
      margin-bottom: 20px;
    }

    .rs-divider {
      height: 1px; opacity: 0.25;
      margin-bottom: 18px;
    }

    .rs-perks {
      list-style: none; margin: 0 0 28px; padding: 0;
    }
    .rs-perks li {
      font-size: 12px; color: rgba(240,232,216,0.55);
      letter-spacing: 0.03em; line-height: 2;
      padding-left: 14px; position: relative;
    }
    .rs-perks li::before {
      content: '–';
      position: absolute; left: 0;
      color: rgba(240,232,216,0.3);
    }

    .rs-enter {
      font-size: 12px; letter-spacing: 0.1em;
      border: 1px solid; border-radius: 20px;
      padding: 8px 18px; display: inline-block;
      transition: background 0.18s, opacity 0.18s;
      opacity: 0.7;
    }
    .rs-card:hover .rs-enter { opacity: 1; background: var(--accent-dim); }
  `;
  document.head.appendChild(s);
}
