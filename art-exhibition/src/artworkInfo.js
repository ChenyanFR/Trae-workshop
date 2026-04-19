import * as THREE from 'three';
import { setControlsEnabled } from './controls.js';
import { isCurator } from './userMode.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Feature A — Info Editor Modal
// ═══════════════════════════════════════════════════════════════════════════════

let _modal = null;
let _currentGroup = null;
let _fields = {};
let _idSeq = 0;

function genId() { return `art_${Date.now()}_${++_idSeq}`; }

const FIELD_DEFS = [
  { key: 'title',       label: 'Title',            type: 'text',     ph: 'e.g. Starry Night' },
  { key: 'artist',      label: 'Artist',           type: 'text',     ph: 'e.g. Van Gogh' },
  { key: 'year',        label: 'Year',             type: 'text',     ph: 'e.g. 2024' },
  { key: 'medium',      label: 'Medium',           type: 'text',     ph: 'e.g. Oil on canvas / Photography' },
  { key: 'dimensions',  label: 'Dimensions',       type: 'text',     ph: 'e.g. 80×60 cm' },
  { key: 'description', label: 'Description',      type: 'textarea', ph: 'Background, themes, style…' },
  { key: 'videoURL',    label: 'Video URL (optional)', type: 'text', ph: 'https://…' },
];

function makeBtn(label, primary, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  Object.assign(b.style, {
    padding: '8px 22px', borderRadius: '6px', cursor: 'pointer',
    fontSize: '13px', fontFamily: 'Georgia, serif', letterSpacing: '0.04em',
    background: primary ? '#c8903a' : 'transparent',
    color:      primary ? '#fff'    : '#7a5020',
    border:     primary ? 'none'    : '1px solid #c8b89a',
    transition: 'background 0.15s',
  });
  b.addEventListener('mouseenter', () => b.style.background = primary ? '#a07030' : 'rgba(200,144,58,0.12)');
  b.addEventListener('mouseleave', () => b.style.background = primary ? '#c8903a' : 'transparent');
  b.addEventListener('click', onClick);
  return b;
}

function buildModal() {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.65)',
    zIndex: 500, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    background: '#f7f2ec', color: '#1a1208',
    borderRadius: '12px', padding: '32px 36px',
    width: '460px', maxHeight: '82vh', overflowY: 'auto',
    fontFamily: 'Georgia, serif',
    boxShadow: '0 24px 72px rgba(0,0,0,0.85)',
  });

  const h2 = document.createElement('h2');
  h2.textContent = 'Artwork Info';
  Object.assign(h2.style, {
    fontSize: '20px', fontWeight: 'normal',
    letterSpacing: '0.1em', marginBottom: '22px',
    borderBottom: '1px solid #c8b89a', paddingBottom: '12px', color: '#2a1808',
  });
  panel.appendChild(h2);

  _fields = {};
  for (const f of FIELD_DEFS) {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '15px';

    const lbl = document.createElement('label');
    lbl.textContent = f.label;
    Object.assign(lbl.style, {
      display: 'block', fontSize: '11.5px',
      color: '#7a5020', letterSpacing: '0.05em', marginBottom: '5px',
    });
    wrap.appendChild(lbl);

    const inp = f.type === 'textarea'
      ? Object.assign(document.createElement('textarea'), { rows: 3 })
      : Object.assign(document.createElement('input'), { type: 'text' });
    if (f.type === 'textarea') inp.style.resize = 'vertical';
    inp.placeholder = f.ph;
    Object.assign(inp.style, {
      width: '100%', boxSizing: 'border-box',
      padding: '8px 11px', border: '1px solid #c8b89a',
      borderRadius: '6px', background: '#faf7f2', color: '#1a1208',
      fontFamily: 'Georgia, serif', fontSize: '13px', outline: 'none',
      transition: 'border-color 0.15s',
    });
    inp.addEventListener('focus', () => inp.style.borderColor = '#c8903a');
    inp.addEventListener('blur',  () => inp.style.borderColor = '#c8b89a');
    wrap.appendChild(inp);
    _fields[f.key] = inp;
    panel.appendChild(wrap);
  }

  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, {
    display: 'flex', justifyContent: 'flex-end', gap: '10px',
    marginTop: '22px', paddingTop: '18px', borderTop: '1px solid #c8b89a',
  });
  btnRow.appendChild(makeBtn('Skip', false, () => closeEditor()));
  btnRow.appendChild(makeBtn('Save', true,  () => commitSave()));
  panel.appendChild(btnRow);

  overlay.appendChild(panel);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeEditor(); });
  document.body.appendChild(overlay);
  _modal = overlay;
}

function commitSave() {
  if (!_currentGroup) return;
  const prev = _currentGroup.userData.info || {};
  _currentGroup.userData.info = {
    id:          prev.id || genId(),
    title:       _fields.title.value.trim(),
    artist:      _fields.artist.value.trim(),
    year:        _fields.year.value.trim(),
    medium:      _fields.medium.value.trim(),
    dimensions:  _fields.dimensions.value.trim(),
    description: _fields.description.value.trim(),
    videoURL:    _fields.videoURL.value.trim(),
  };
  closeEditor();
}

function closeEditor() {
  if (_modal) _modal.style.display = 'none';
  setControlsEnabled(true);
  const closed = _currentGroup;
  _currentGroup = null;
  // Refresh card if this group is currently shown
  if (closed && _lastCardGroup === closed) fillCardContent(closed);
}

export function openInfoEditor(group) {
  if (!isCurator()) return;
  _currentGroup = group;
  if (!_modal) buildModal();
  setControlsEnabled(false);
  const info = group.userData.info || {};
  for (const key of Object.keys(_fields)) _fields[key].value = info[key] ?? '';
  if (!group.userData.info?.id) {
    if (!group.userData.info) group.userData.info = {};
    group.userData.info.id = genId();
  }
  _modal.style.display = 'flex';
}

export function isEditorOpen() {
  return !!(_modal && _modal.style.display !== 'none');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Feature B — Hover Preview Card
// ═══════════════════════════════════════════════════════════════════════════════

let _card = null;
let _cardHovered  = false;
let _lastCardGroup = null;
let _timedOutGroup = null;
let _cardShowTime  = 0;
let _hideTimeout   = null;
const CARD_TTL_MS  = 3000;
const HIDE_DELAY   = 300;

function scheduleHide() {
  if (_hideTimeout) return;
  _hideTimeout = setTimeout(() => {
    _hideTimeout = null;
    _card.style.opacity = '0';
    _lastCardGroup = null;
  }, HIDE_DELAY);
}

function cancelHide() {
  if (!_hideTimeout) return;
  clearTimeout(_hideTimeout);
  _hideTimeout = null;
}
const _rc   = new THREE.Raycaster();
const _mNDC = new THREE.Vector2(-9999, -9999);

function buildCard() {
  _card = document.createElement('div');
  Object.assign(_card.style, {
    position: 'fixed',
    background: 'rgba(0,0,0,0.8)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    fontFamily: 'Georgia, serif',
    backdropFilter: 'blur(10px)',
    maxWidth: '280px',
    pointerEvents: 'auto',
    zIndex: 150,
    opacity: '0',
    transition: 'opacity 200ms ease',
    lineHeight: '1.6',
    transform: 'translateX(-50%)',
  });
  _card.addEventListener('mouseenter', () => { _cardHovered = true;  cancelHide(); });
  _card.addEventListener('mouseleave', () => { _cardHovered = false; scheduleHide(); });
  document.body.appendChild(_card);
}

function styleActionBtn(btn) {
  Object.assign(btn.style, {
    background: 'rgba(255,255,255,0.13)',
    color: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '4px', padding: '4px 12px',
    cursor: 'pointer', fontSize: '12px',
    fontFamily: 'Georgia, serif', transition: 'background 0.15s',
  });
  btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.22)');
  btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(255,255,255,0.13)');
}

function fillCardContent(group) {
  if (!_card) return;
  _lastCardGroup = group;
  _card.innerHTML = '';

  const info = group.userData.info;
  const hasContent = info && (info.title || info.artist || info.year);

  if (!hasContent) {
    const ph = document.createElement('div');
    ph.textContent = 'No description';
    Object.assign(ph.style, {
      fontSize: '12px', opacity: '0.45',
      fontStyle: 'italic', marginBottom: isCurator() ? '10px' : '0',
    });
    _card.appendChild(ph);

    if (isCurator()) {
      const btn = document.createElement('button');
      btn.textContent = '+ Add Description';
      styleActionBtn(btn);
      btn.addEventListener('click', () => openInfoEditor(group));
      _card.appendChild(btn);
    }
  } else {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', gap: '8px',
    });

    const textCol = document.createElement('div');
    textCol.style.flex = '1';
    if (info.title) {
      const t = document.createElement('div');
      t.textContent = info.title;
      Object.assign(t.style, { fontSize: '15px', fontWeight: 'bold', marginBottom: '3px' });
      textCol.appendChild(t);
    }
    if (info.artist) {
      const a = document.createElement('div');
      a.textContent = info.artist;
      Object.assign(a.style, { fontSize: '12px', opacity: '0.78' });
      textCol.appendChild(a);
    }
    if (info.year) {
      const y = document.createElement('div');
      y.textContent = info.year;
      Object.assign(y.style, { fontSize: '11px', opacity: '0.55', marginTop: '2px' });
      textCol.appendChild(y);
    }

    row.appendChild(textCol);

    if (isCurator()) {
      const editBtn = document.createElement('button');
      editBtn.textContent = '✎';
      editBtn.title = 'Edit description';
      Object.assign(editBtn.style, {
        background: 'transparent', border: 'none',
        color: 'rgba(255,255,255,0.38)', cursor: 'pointer',
        fontSize: '15px', lineHeight: '1', padding: '2px 4px',
        flexShrink: '0', transition: 'color 0.15s',
        fontFamily: 'Georgia, serif',
      });
      editBtn.addEventListener('mouseenter', () => editBtn.style.color = 'rgba(255,255,255,0.9)');
      editBtn.addEventListener('mouseleave', () => editBtn.style.color = 'rgba(255,255,255,0.38)');
      editBtn.addEventListener('click', () => openInfoEditor(group));
      row.appendChild(editBtn);
    }
    _card.appendChild(row);
  }
}

export function initHoverPreview(canvas) {
  buildCard();
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    _mNDC.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
    _mNDC.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
  });
  canvas.addEventListener('mouseleave', () => {
    _mNDC.set(-9999, -9999);
    if (!_cardHovered) scheduleHide();
  });
}

export function tickHoverPreview(camera, renderer, artworks, interacting) {
  if (!_card) return;

  // While mouse is on the card: cancel any pending hide, still respect TTL
  if (_cardHovered) {
    cancelHide();
    if (_lastCardGroup && Date.now() - _cardShowTime > CARD_TTL_MS) {
      _card.style.opacity = '0';
      _timedOutGroup = _lastCardGroup;
      _lastCardGroup = null;
    }
    return;
  }

  // Immediate hide for editor/interaction states (these aren't a mouse-movement gap)
  if (isEditorOpen() || interacting || !artworks.length) {
    cancelHide();
    _card.style.opacity = '0';
    _lastCardGroup = null;
    _timedOutGroup = null;
    return;
  }

  _rc.setFromCamera(_mNDC, camera);
  const hits = _rc.intersectObjects(artworks.flatMap(a => a.children), true);

  if (!hits.length || hits[0].object.userData.isRotHandle) {
    // Mouse left artwork — delayed hide so user can reach the card
    scheduleHide();
    _timedOutGroup = null;
    return;
  }

  const parent = artworks.find(a =>
    a.children.some(ch => ch === hits[0].object || ch === hits[0].object.parent)
  );
  if (!parent) {
    scheduleHide();
    _timedOutGroup = null;
    return;
  }

  // Don't re-show a card that just timed out until mouse leaves and re-enters
  if (parent === _timedOutGroup) {
    _card.style.opacity = '0';
    return;
  }

  // Rebuild DOM only when hovered group changes; reset timer
  if (parent !== _lastCardGroup) {
    fillCardContent(parent);
    _cardShowTime = Date.now();
  }

  // Hide after TTL (immediate — deliberate timeout, not a mouse-movement gap)
  if (Date.now() - _cardShowTime > CARD_TTL_MS) {
    cancelHide();
    _card.style.opacity = '0';
    _timedOutGroup = parent;
    _lastCardGroup = null;
    return;
  }

  // Mouse is on artwork and TTL not expired — show card
  cancelHide();

  const worldPos = parent.position.clone();
  worldPos.y -= (parent.userData.artHeight ?? 0.4) / 2 + 0.08;
  const v = worldPos.clone().project(camera);
  if (v.z > 1) { _card.style.opacity = '0'; return; }

  const el = renderer.domElement;
  _card.style.left = Math.round((v.x + 1) / 2 * el.clientWidth) + 'px';
  _card.style.top  = Math.round((1 - v.y) / 2 * el.clientHeight + 4) + 'px';
  _card.style.opacity = '1';
}
