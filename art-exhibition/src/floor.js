// floor.js — Floor material & texture management

import * as THREE from 'three';

let _floorMesh = null;

export function setFloorMesh(mesh) {
  _floorMesh = mesh;
}

// ─── Texture generators ───────────────────────────────────────────────────────
function makeCanvasTex(canvas, repeat) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeMarble(bg, veinRgb, veins = 14) {
  const sz = 512;
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < veins; i++) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${veinRgb},${0.10 + Math.random() * 0.22})`;
    ctx.lineWidth = 0.5 + Math.random() * 2.5;
    ctx.moveTo(Math.random() * sz, Math.random() * sz);
    for (let j = 0; j < 4; j++) {
      ctx.bezierCurveTo(
        Math.random() * sz, Math.random() * sz,
        Math.random() * sz, Math.random() * sz,
        Math.random() * sz, Math.random() * sz
      );
    }
    ctx.stroke();
  }
  return c;
}

function makeCarpet(color) {
  const sz = 256;
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, sz, sz);
  const img = ctx.getImageData(0, 0, sz, sz);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 32;
    d[i]   = Math.max(0, Math.min(255, d[i]   + n));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = 0.07;
  for (let y = 0; y < sz; y += 3) {
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    ctx.moveTo(0, y);
    for (let x = 0; x < sz; x += 8) {
      ctx.lineTo(x + 4, y + (Math.random() * 2 - 1));
      ctx.lineTo(x + 8, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return c;
}

function makeWood(light, dark) {
  const sz = 512;
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const ctx = c.getContext('2d');
  const rows = 8, plankH = sz / rows;
  const plankW = sz / 3;
  const hexToRgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [lr, lg, lb] = hexToRgb(light);
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (plankW / 2);
    for (let col = -1; col < 4; col++) {
      const x = col * plankW - offset, y = row * plankH;
      const v = (Math.random() - 0.5) * 18;
      ctx.fillStyle = `rgb(${Math.round(lr+v)},${Math.round(lg+v*0.8)},${Math.round(lb+v*0.5)})`;
      ctx.fillRect(x + 1, y + 1, plankW - 2, plankH - 2);
      ctx.globalAlpha = 0.14;
      for (let gi = 0; gi < 6; gi++) {
        const gy = y + (gi / 6) * plankH;
        ctx.beginPath();
        ctx.strokeStyle = dark;
        ctx.lineWidth = 0.5;
        ctx.moveTo(x, gy);
        ctx.bezierCurveTo(x + plankW*0.3, gy + (Math.random()-0.5)*4,
          x + plankW*0.7, gy + (Math.random()-0.5)*4, x + plankW, gy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = dark; ctx.globalAlpha = 0.35;
    ctx.fillRect(0, row * plankH, sz, 1);
    ctx.globalAlpha = 1;
  }
  return c;
}

function makeTile(bg, grout, count = 6) {
  const sz = 512;
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const ctx = c.getContext('2d');
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, sz, sz);
  const s = Math.floor(sz / count), gap = 4;
  const hexToRgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [br, bg2, bb] = hexToRgb(bg);
  for (let r = 0; r < count; r++) {
    for (let col = 0; col < count; col++) {
      const v = (Math.random() - 0.5) * 12;
      ctx.fillStyle = `rgb(${Math.round(br+v)},${Math.round(bg2+v)},${Math.round(bb+v)})`;
      ctx.fillRect(col*s + gap/2, r*s + gap/2, s - gap, s - gap);
    }
  }
  return c;
}

function makeConcrete() {
  const sz = 512;
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, sz, sz);
  const img = ctx.getImageData(0, 0, sz, sz);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 40;
    d[i] = d[i+1] = d[i+2] = Math.max(0, Math.min(255, d[i] + n));
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function makeSolid(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 2, 2);
  return c;
}

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = [
  {
    id: 'white-marble',  name: 'White Marble',
    make: () => makeMarble('#f0ece4', '150,140,128'),
    roughness: 0.15, metalness: 0.05, repeat: 10,
    css: 'linear-gradient(135deg,#f5f1ea 0%,#e8e2d8 40%,#f0ece4 70%,#ddd8ce 100%)',
  },
  {
    id: 'black-marble',  name: 'Black Marble',
    make: () => makeMarble('#181818', '220,208,170'),
    roughness: 0.12, metalness: 0.08, repeat: 10,
    css: 'linear-gradient(135deg,#1a1a1a 0%,#2a2820 40%,#181818 70%,#222018 100%)',
  },
  {
    id: 'beige-marble',  name: 'Beige Marble',
    make: () => makeMarble('#d4c4a0', '140,100,55'),
    roughness: 0.18, metalness: 0.04, repeat: 10,
    css: 'linear-gradient(135deg,#d4c4a0 0%,#c8b888 40%,#d4c4a0 70%,#bca880 100%)',
  },
  {
    id: 'red-carpet',    name: 'Crimson Carpet',
    make: () => makeCarpet('#8B1A1A'),
    roughness: 0.96, metalness: 0.0,  repeat: 20,
    css: 'radial-gradient(ellipse,#a02020 0%,#8B1A1A 55%,#6a1010 100%)',
  },
  {
    id: 'navy-carpet',   name: 'Navy Carpet',
    make: () => makeCarpet('#1a2a5a'),
    roughness: 0.96, metalness: 0.0,  repeat: 20,
    css: 'radial-gradient(ellipse,#243474 0%,#1a2a5a 55%,#101840 100%)',
  },
  {
    id: 'forest-carpet', name: 'Forest Carpet',
    make: () => makeCarpet('#1a3a20'),
    roughness: 0.96, metalness: 0.0,  repeat: 20,
    css: 'radial-gradient(ellipse,#244830 0%,#1a3a20 55%,#0e2014 100%)',
  },
  {
    id: 'cream-carpet',  name: 'Cream Carpet',
    make: () => makeCarpet('#d4ccba'),
    roughness: 0.96, metalness: 0.0,  repeat: 20,
    css: 'radial-gradient(ellipse,#e0d8c8 0%,#d4ccba 55%,#c4bcaa 100%)',
  },
  {
    id: 'oak-wood',      name: 'Oak Parquet',
    make: () => makeWood('#c8a060', '#6a4820'),
    roughness: 0.75, metalness: 0.0,  repeat: 12,
    css: 'repeating-linear-gradient(180deg,#c8a060 0px,#b89050 30px,#c8a060 31px,#d0a868 60px)',
  },
  {
    id: 'dark-wood',     name: 'Dark Walnut',
    make: () => makeWood('#4a2c10', '#1e100a'),
    roughness: 0.78, metalness: 0.0,  repeat: 12,
    css: 'repeating-linear-gradient(180deg,#4a2c10 0px,#3a2008 30px,#4a2c10 31px,#543418 60px)',
  },
  {
    id: 'white-tile',    name: 'White Tile',
    make: () => makeTile('#f0eeea', '#c0bcb4'),
    roughness: 0.25, metalness: 0.02, repeat: 14,
    css: 'repeating-conic-gradient(#f0eeea 0% 25%,#c0bcb4 0% 50%) 0 0/24px 24px',
  },
  {
    id: 'black-tile',    name: 'Black Tile',
    make: () => makeTile('#1a1a1a', '#404040'),
    roughness: 0.22, metalness: 0.04, repeat: 14,
    css: 'repeating-conic-gradient(#1a1a1a 0% 25%,#383838 0% 50%) 0 0/24px 24px',
  },
  {
    id: 'terracotta',    name: 'Terracotta',
    make: () => makeTile('#c06040', '#7a3820'),
    roughness: 0.82, metalness: 0.0,  repeat: 14,
    css: 'repeating-conic-gradient(#c06040 0% 25%,#7a3820 0% 50%) 0 0/24px 24px',
  },
  {
    id: 'concrete',      name: 'Concrete',
    make: () => makeConcrete(),
    roughness: 0.92, metalness: 0.0,  repeat: 10,
    css: 'radial-gradient(ellipse,#a0a0a0 0%,#888888 50%,#787878 100%)',
  },
  {
    id: 'black-solid',   name: 'Matte Black',
    make: () => makeSolid('#0a0a0a'),
    roughness: 0.96, metalness: 0.0,  repeat: 1,
    css: '#0a0a0a',
  },
];

const _cache = {};

function getTexture(preset) {
  if (!_cache[preset.id]) {
    _cache[preset.id] = makeCanvasTex(preset.make(), preset.repeat);
  }
  return _cache[preset.id];
}

export function applyFloorPreset(id) {
  if (!_floorMesh) return;
  const preset = PRESETS.find(p => p.id === id);
  if (!preset) return;
  const mats = Array.isArray(_floorMesh.material)
    ? _floorMesh.material : [_floorMesh.material];
  mats.forEach(m => {
    m.map       = getTexture(preset);
    m.color.setHex(0xffffff);
    m.roughness = preset.roughness;
    m.metalness = preset.metalness;
    m.needsUpdate = true;
  });
}

let _floorPanel = null;
export function toggleFloorPanel() { if (_floorPanel) _floorPanel.style.display = _floorPanel.style.display === 'none' ? 'block' : 'none'; }
export function closeFloorPanel()  { if (_floorPanel) _floorPanel.style.display = 'none'; }

// ─── UI ───────────────────────────────────────────────────────────────────────
export function initFloorUI() {
  _floorPanel = document.createElement('div');
  const panel = _floorPanel;
  Object.assign(panel.style, {
    position: 'fixed', top: '55px', left: '16px',
    background: 'rgba(12,7,3,0.94)', border: '1px solid #6a4a20',
    borderRadius: '10px', padding: '16px 18px',
    color: '#f0e0c0', fontFamily: 'serif', zIndex: 200,
    display: 'none', width: '292px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
  });
  document.body.appendChild(panel);

  const title = document.createElement('div');
  title.textContent = 'Floor Material';
  Object.assign(title.style, {
    fontSize: '15px', letterSpacing: '0.1em', textAlign: 'center',
    marginBottom: '14px', borderBottom: '1px solid #3a2510', paddingBottom: '10px',
  });
  panel.appendChild(title);

  const GROUPS = [
    { label: 'Marble',  ids: ['white-marble', 'black-marble', 'beige-marble'] },
    { label: 'Carpet',  ids: ['red-carpet', 'navy-carpet', 'forest-carpet', 'cream-carpet'] },
    { label: 'Wood',    ids: ['oak-wood', 'dark-wood'] },
    { label: 'Tile',    ids: ['white-tile', 'black-tile', 'terracotta'] },
    { label: 'Other',   ids: ['concrete', 'black-solid'] },
  ];

  let activeCard = null;

  GROUPS.forEach(group => {
    const lbl = document.createElement('div');
    lbl.textContent = group.label;
    Object.assign(lbl.style, {
      fontSize: '9.5px', color: '#907850', letterSpacing: '0.06em',
      marginBottom: '6px', marginTop: '10px',
    });
    panel.appendChild(lbl);

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(group.ids.length, 4)}, 1fr)`,
      gap: '7px',
    });

    group.ids.forEach(id => {
      const preset = PRESETS.find(p => p.id === id);
      if (!preset) return;

      const card = document.createElement('div');
      Object.assign(card.style, {
        cursor: 'pointer', borderRadius: '6px', overflow: 'hidden',
        border: '2px solid transparent',
        transition: 'border-color 0.15s, transform 0.1s',
      });

      const swatch = document.createElement('div');
      Object.assign(swatch.style, { height: '44px', background: preset.css });
      card.appendChild(swatch);

      const name = document.createElement('div');
      name.textContent = preset.name;
      Object.assign(name.style, {
        fontSize: '9px', textAlign: 'center', padding: '3px 2px',
        background: 'rgba(0,0,0,0.45)', color: '#f0e0c0', lineHeight: '1.3',
      });
      card.appendChild(name);

      card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#c8903a';
        card.style.transform = 'translateY(-2px)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = activeCard === card ? '#c8903a' : 'transparent';
        card.style.transform = '';
      });
      card.addEventListener('click', () => {
        if (activeCard) activeCard.style.borderColor = 'transparent';
        activeCard = card;
        card.style.borderColor = '#c8903a';
        applyFloorPreset(id);
      });

      row.appendChild(card);
    });

    panel.appendChild(row);
  });
}
