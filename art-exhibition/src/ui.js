import { setRoomColor, highlightWall } from './room.js';

// ─── Surface definitions ──────────────────────────────────────────────────────
const SURFACES = [
  { id: 'Exhibition_Wall_01',     label: 'Wall 1',    current: '#8B1A1A' },
  { id: 'Exhibition_Wall_02',     label: 'Wall 2',    current: '#8B1A1A' },
  { id: 'Exhibition_Wall_03',     label: 'Wall 3',    current: '#8B1A1A' },
  { id: 'Exhibition_Wall_04',     label: 'Wall 4',    current: '#8B1A1A' },
  { id: 'Exhibition_End_Wall_01', label: 'End Wall 1', current: '#8B1A1A' },
  { id: 'Exhibition_End_Wall_02', label: 'End Wall 2', current: '#8B1A1A' },
];

// ─── Curated museum palette ───────────────────────────────────────────────────
// Row 1 — Light & Neutral (walls, ceilings)
// Row 2 — Mid-tone (supports + floors)
// Row 3 — Bold feature (accent walls)
// Row 4 — Dark & Dramatic
const PALETTE = [
  // Light
  '#FFFFFF', '#F8F4EC', '#F0EDE6', '#E8E2D8',
  '#DDD8CE', '#D0C9BC', '#C4BCAE', '#B8B0A0',
  // Mid
  '#908070', '#786858', '#604830', '#503820',
  '#A09080', '#887060', '#705848', '#584030',
  // Bold gallery
  '#8B1A1A', '#4A0D1A', '#1B2A4A', '#0D1B34',
  '#1A3A28', '#162A18', '#3A2A50', '#2A1A40',
  // Dark
  '#2A1808', '#1A1410', '#0E0C0A', '#080808',
  '#1A2030', '#101820', '#1E2818', '#101408',
];

// ─── State ────────────────────────────────────────────────────────────────────
let activeSurface = SURFACES[0];
const surfaceColors = Object.fromEntries(SURFACES.map(s => [s.id, s.current]));

let _wallPanel = null;
export function toggleWallPanel() { if (_wallPanel) _wallPanel.style.display = _wallPanel.style.display === 'none' ? 'block' : 'none'; }
export function closeWallPanel()  { if (_wallPanel) _wallPanel.style.display = 'none'; }

// ─── Build UI ─────────────────────────────────────────────────────────────────
export function initUI() {
  buildWallColorPanel();
}

function buildWallColorPanel() {
  // ── Panel ─────────────────────────────────────────────────────────────────
  _wallPanel = document.createElement('div');
  const panel = _wallPanel;
  Object.assign(panel.style, {
    position: 'fixed', top: '55px', left: '16px',
    background: 'rgba(12,7,3,0.94)', border: '1px solid #6a4a20',
    borderRadius: '10px', padding: '18px 20px',
    color: '#f0e0c0', fontFamily: 'serif', zIndex: 200,
    display: 'none', width: '284px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
  });
  document.body.appendChild(panel);

  // Title
  const title = document.createElement('div');
  title.textContent = 'Wall Colors';
  Object.assign(title.style, {
    fontSize: '15px', letterSpacing: '0.1em', textAlign: 'center',
    marginBottom: '14px', borderBottom: '1px solid #3a2510', paddingBottom: '10px',
  });
  panel.appendChild(title);

  // ── Surface tabs ──────────────────────────────────────────────────────────
  const tabRow = document.createElement('div');
  Object.assign(tabRow.style, {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
    gap: '6px', marginBottom: '14px',
  });

  const tabBtns = [];
  SURFACES.forEach((surf, i) => {
    const tb = document.createElement('button');
    tb.textContent = surf.label;
    Object.assign(tb.style, {
      padding: '5px 4px', fontSize: '10.5px', fontFamily: 'serif',
      border: '1px solid #5a3a10', borderRadius: '4px', cursor: 'pointer',
      letterSpacing: '0.02em', transition: 'background 0.12s',
      color: '#f0e0c0',
    });
    const setActive = () => {
      activeSurface = surf;
      tabBtns.forEach((b, j) => {
        b.style.background = j === i ? 'rgba(200,144,58,0.35)' : 'rgba(255,255,255,0.05)';
        b.style.borderColor = j === i ? '#c8903a' : '#5a3a10';
      });
      updatePreviewDot();
      highlightWall(surf.id);
    };
    tb.addEventListener('click', setActive);
    tb.style.background = i === 0 ? 'rgba(200,144,58,0.35)' : 'rgba(255,255,255,0.05)';
    if (i === 0) tb.style.borderColor = '#c8903a';
    tabBtns.push(tb);
    tabRow.appendChild(tb);
  });
  panel.appendChild(tabRow);

  // ── Current colour preview + label ───────────────────────────────────────
  const previewRow = document.createElement('div');
  Object.assign(previewRow.style, {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '12px',
  });
  const previewDot = document.createElement('div');
  Object.assign(previewDot.style, {
    width: '28px', height: '28px', borderRadius: '50%',
    border: '2px solid #6a4a20', flexShrink: '0',
    background: surfaceColors[activeSurface.id],
  });
  const previewLabel = document.createElement('span');
  previewLabel.style.fontSize = '12px';
  previewLabel.style.opacity  = '0.7';
  previewLabel.textContent    = `Current: ${surfaceColors[activeSurface.id].toUpperCase()}`;
  previewRow.appendChild(previewDot);
  previewRow.appendChild(previewLabel);
  panel.appendChild(previewRow);

  function updatePreviewDot() {
    const c = surfaceColors[activeSurface.id];
    previewDot.style.background = c;
    previewLabel.textContent    = `Current: ${c.toUpperCase()}`;
  }

  // ── Palette grid ──────────────────────────────────────────────────────────
  const rowLabels = ['Light & Neutral', 'Mid-tone', 'Bold Gallery', 'Dark & Dramatic'];
  rowLabels.forEach((rowLabel, rowIdx) => {
    const lbl = document.createElement('div');
    lbl.textContent = rowLabel;
    Object.assign(lbl.style, {
      fontSize: '9.5px', color: '#907850', letterSpacing: '0.06em',
      marginBottom: '5px', marginTop: rowIdx > 0 ? '8px' : '0',
    });
    panel.appendChild(lbl);

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: '4px', marginBottom: '2px',
    });

    PALETTE.slice(rowIdx * 8, rowIdx * 8 + 8).forEach(hex => {
      const swatch = document.createElement('div');
      Object.assign(swatch.style, {
        width: '100%', aspectRatio: '1', borderRadius: '3px',
        background: hex, cursor: 'pointer',
        border: '1.5px solid transparent', transition: 'border-color 0.1s, transform 0.1s',
      });
      swatch.title = hex.toUpperCase();
      swatch.addEventListener('mouseenter', () => {
        swatch.style.borderColor = '#c8903a';
        swatch.style.transform = 'scale(1.2)';
      });
      swatch.addEventListener('mouseleave', () => {
        swatch.style.borderColor = surfaceColors[activeSurface.id] === hex ? '#c8903a' : 'transparent';
        swatch.style.transform = '';
      });
      swatch.addEventListener('click', () => applyColor(hex, swatch, row));
      row.appendChild(swatch);
    });
    panel.appendChild(row);
  });

  // ── Custom colour picker ──────────────────────────────────────────────────
  const customRow = document.createElement('div');
  Object.assign(customRow.style, {
    display: 'flex', alignItems: 'center', gap: '8px',
    marginTop: '12px', paddingTop: '10px',
    borderTop: '1px solid #3a2510',
  });
  const customLabel = document.createElement('span');
  customLabel.textContent = 'Custom';
  customLabel.style.cssText = 'font-size:11px;opacity:0.65;flex-shrink:0';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = surfaceColors[activeSurface.id];
  Object.assign(colorInput.style, {
    width: '36px', height: '28px', border: '1px solid #5a3a10',
    borderRadius: '4px', cursor: 'pointer', padding: '1px',
    background: 'transparent', flexShrink: '0',
  });
  colorInput.addEventListener('input', () => applyColor(colorInput.value, null, null));
  colorInput.addEventListener('change', () => applyColor(colorInput.value, null, null));

  // Sync picker with active tab
  tabBtns.forEach((tb, i) => {
    tb.addEventListener('click', () => {
      colorInput.value = surfaceColors[SURFACES[i].id];
    });
  });

  customRow.appendChild(customLabel);
  customRow.appendChild(colorInput);
  panel.appendChild(customRow);

  // ── Apply helper ──────────────────────────────────────────────────────────
  function applyColor(hex, clickedSwatch, swatchRow) {
    surfaceColors[activeSurface.id] = hex;
    setRoomColor(activeSurface.id, hex);
    colorInput.value = hex;
    updatePreviewDot();

    // Highlight the selected swatch in this row
    if (swatchRow) {
      swatchRow.querySelectorAll('div').forEach(s => { s.style.borderColor = 'transparent'; });
      if (clickedSwatch) clickedSwatch.style.borderColor = '#c8903a';
    }
  }
}
