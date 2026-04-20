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

let _videoMode        = 'url';   // 'url' | 'file'
let _uploadedVideoURL = '';
let _videoUrlInput    = null;
let _videoPanelUrl    = null;
let _videoPanelFile   = null;
let _videoFileNameEl  = null;
let _videoTabUrl      = null;
let _videoTabFile     = null;

function genId() { return `art_${Date.now()}_${++_idSeq}`; }

const FIELD_DEFS = [
  { key: 'title',       label: 'Title',            type: 'text',     ph: 'e.g. Starry Night' },
  { key: 'artist',      label: 'Artist',           type: 'text',     ph: 'e.g. Van Gogh' },
  { key: 'year',        label: 'Year',             type: 'text',     ph: 'e.g. 2024' },
  { key: 'medium',      label: 'Medium',           type: 'text',     ph: 'e.g. Oil on canvas / Photography' },
  { key: 'dimensions',  label: 'Dimensions',       type: 'text',     ph: 'e.g. 80×60 cm' },
  { key: 'description', label: 'Description',      type: 'textarea', ph: 'Background, themes, style…' },
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

  buildVideoSection(panel);

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

// ─── Video section ────────────────────────────────────────────────────────────
function makeVideoTab(label) {
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    flex: '1', padding: '7px 10px', border: 'none',
    background: 'transparent', cursor: 'pointer',
    fontSize: '12px', fontFamily: 'Georgia, serif',
    color: '#7a5020', transition: 'background 0.15s, color 0.15s',
    letterSpacing: '0.03em',
  });
  return btn;
}

function setVideoTab(mode) {
  _videoMode = mode;
  const on  = { background: '#c8903a', color: '#fff' };
  const off = { background: 'transparent', color: '#7a5020' };
  Object.assign(_videoTabUrl.style,  mode === 'url'  ? on : off);
  Object.assign(_videoTabFile.style, mode === 'file' ? on : off);
  _videoPanelUrl.style.display  = mode === 'url'  ? '' : 'none';
  _videoPanelFile.style.display = mode === 'file' ? '' : 'none';
}

function handleFileSelected(file, dropZone) {
  if (_uploadedVideoURL.startsWith('blob:')) URL.revokeObjectURL(_uploadedVideoURL);
  _uploadedVideoURL = URL.createObjectURL(file);
  _videoFileNameEl._fnText.textContent = file.name;
  _videoFileNameEl.style.display = 'flex';
  dropZone.style.display = 'none';
}

function buildVideoSection(panel) {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '15px';

  const lbl = document.createElement('label');
  lbl.textContent = 'Video (optional)';
  Object.assign(lbl.style, {
    display: 'block', fontSize: '11.5px',
    color: '#7a5020', letterSpacing: '0.05em', marginBottom: '8px',
  });
  wrap.appendChild(lbl);

  // Tab row
  const tabRow = document.createElement('div');
  Object.assign(tabRow.style, {
    display: 'flex', marginBottom: '8px',
    border: '1px solid #c8b89a', borderRadius: '6px', overflow: 'hidden',
  });
  _videoTabUrl  = makeVideoTab('External URL');
  _videoTabFile = makeVideoTab('Upload File');
  _videoTabUrl.addEventListener('click',  () => setVideoTab('url'));
  _videoTabFile.addEventListener('click', () => setVideoTab('file'));
  tabRow.appendChild(_videoTabUrl);
  tabRow.appendChild(_videoTabFile);
  wrap.appendChild(tabRow);

  // ── URL panel ──
  _videoPanelUrl = document.createElement('div');
  _videoUrlInput = document.createElement('input');
  _videoUrlInput.type = 'text';
  _videoUrlInput.placeholder = 'YouTube, Vimeo, or direct .mp4 URL…';
  Object.assign(_videoUrlInput.style, {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 11px', border: '1px solid #c8b89a',
    borderRadius: '6px', background: '#faf7f2', color: '#1a1208',
    fontFamily: 'Georgia, serif', fontSize: '13px', outline: 'none',
    transition: 'border-color 0.15s',
  });
  _videoUrlInput.addEventListener('focus', () => _videoUrlInput.style.borderColor = '#c8903a');
  _videoUrlInput.addEventListener('blur',  () => _videoUrlInput.style.borderColor = '#c8b89a');
  _videoPanelUrl.appendChild(_videoUrlInput);
  wrap.appendChild(_videoPanelUrl);

  // ── File panel ──
  _videoPanelFile = document.createElement('div');
  _videoPanelFile.style.display = 'none';

  const fileHiddenInput = document.createElement('input');
  fileHiddenInput.type = 'file';
  fileHiddenInput.accept = 'video/*';
  fileHiddenInput.style.display = 'none';

  const dropZone = document.createElement('div');
  Object.assign(dropZone.style, {
    border: '2px dashed #c8b89a', borderRadius: '6px',
    padding: '22px 16px', textAlign: 'center', cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  });
  const dIcon = document.createElement('div');
  dIcon.textContent = '▶';
  Object.assign(dIcon.style, { fontSize: '22px', color: '#c8b89a', marginBottom: '6px' });
  const dText = document.createElement('div');
  dText.textContent = 'Click to choose  ·  or drag & drop';
  Object.assign(dText.style, { fontSize: '13px', color: '#7a5020', fontFamily: 'Georgia, serif' });
  const dSub = document.createElement('div');
  dSub.textContent = 'MP4 · WebM · MOV · OGG';
  Object.assign(dSub.style, { fontSize: '11px', color: '#c8b89a', marginTop: '4px' });
  dropZone.appendChild(dIcon);
  dropZone.appendChild(dText);
  dropZone.appendChild(dSub);

  dropZone.addEventListener('click',      () => fileHiddenInput.click());
  dropZone.addEventListener('mouseenter', () => { dropZone.style.borderColor = '#c8903a'; dropZone.style.background = 'rgba(200,144,58,0.05)'; });
  dropZone.addEventListener('mouseleave', () => { dropZone.style.borderColor = '#c8b89a'; dropZone.style.background = 'transparent'; });
  dropZone.addEventListener('dragover',   e => { e.preventDefault(); dropZone.style.borderColor = '#c8903a'; dropZone.style.background = 'rgba(200,144,58,0.05)'; });
  dropZone.addEventListener('dragleave',  () => { dropZone.style.borderColor = '#c8b89a'; dropZone.style.background = 'transparent'; });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.style.borderColor = '#c8b89a'; dropZone.style.background = 'transparent';
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('video/')) handleFileSelected(file, dropZone);
  });
  fileHiddenInput.addEventListener('change', () => {
    const file = fileHiddenInput.files?.[0];
    if (file) handleFileSelected(file, dropZone);
  });

  // Selected file display row
  _videoFileNameEl = document.createElement('div');
  Object.assign(_videoFileNameEl.style, {
    display: 'none', marginTop: '8px', padding: '8px 12px',
    background: 'rgba(200,144,58,0.08)', borderRadius: '6px',
    border: '1px solid rgba(200,144,58,0.3)',
    fontSize: '12px', color: '#5a3010', fontFamily: 'Georgia, serif',
    alignItems: 'center', gap: '8px',
  });
  const fnIcon = document.createElement('span');
  fnIcon.textContent = '▶'; fnIcon.style.color = '#c8903a';
  const fnText = document.createElement('span');
  fnText.style.flex = '1';
  const fnClear = document.createElement('button');
  fnClear.textContent = '✕';
  Object.assign(fnClear.style, {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: '#c8b89a', fontSize: '11px', padding: '0 2px', transition: 'color 0.15s',
  });
  fnClear.addEventListener('mouseenter', () => fnClear.style.color = '#7a5020');
  fnClear.addEventListener('mouseleave', () => fnClear.style.color = '#c8b89a');
  fnClear.addEventListener('click', () => {
    _uploadedVideoURL = '';
    _videoFileNameEl.style.display = 'none';
    dropZone.style.display = '';
  });
  _videoFileNameEl.appendChild(fnIcon);
  _videoFileNameEl.appendChild(fnText);
  _videoFileNameEl.appendChild(fnClear);
  _videoFileNameEl._fnText   = fnText;
  _videoFileNameEl._dropZone = dropZone;

  _videoPanelFile.appendChild(dropZone);
  _videoPanelFile.appendChild(fileHiddenInput);
  _videoPanelFile.appendChild(_videoFileNameEl);
  wrap.appendChild(_videoPanelFile);

  panel.appendChild(wrap);
  setVideoTab('url');
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
    videoURL:    _videoMode === 'file' ? _uploadedVideoURL : (_videoUrlInput?.value.trim() ?? ''),
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

  // Init video section
  if (_videoUrlInput) {
    const vUrl = info.videoURL || '';
    if (vUrl.startsWith('blob:')) {
      _uploadedVideoURL = vUrl;
      if (_videoFileNameEl?._fnText) {
        _videoFileNameEl._fnText.textContent = 'Previously uploaded video';
        _videoFileNameEl.style.display = 'flex';
        if (_videoFileNameEl._dropZone) _videoFileNameEl._dropZone.style.display = 'none';
      }
      setVideoTab('file');
    } else {
      _videoUrlInput.value = vUrl;
      _uploadedVideoURL = '';
      if (_videoFileNameEl) _videoFileNameEl.style.display = 'none';
      if (_videoFileNameEl?._dropZone) _videoFileNameEl._dropZone.style.display = '';
      setVideoTab('url');
    }
  }

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
let _cardHovered   = false;
let _lastCardGroup = null;
let _timedOutGroup = null;
let _cardShowTime  = 0;
let _hideTimeout   = null;
const CARD_TTL_MS  = 3000;
const HIDE_DELAY   = 300;

// ── Visitor right-side panel (positioned next to artwork) ────────────────────
let _visitorCard   = null;
let _vcHovered     = false;
const VC_WIDTH     = 400;

function buildVisitorCard() {
  _visitorCard = document.createElement('div');
  Object.assign(_visitorCard.style, {
    position: 'fixed',
    left: '-9999px', top: '0',          // parked off-screen until positioned
    width: VC_WIDTH + 'px', maxHeight: '50vh',
    background: 'rgba(255,250,240,0.95)',
    padding: '28px 36px', boxSizing: 'border-box',
    borderRadius: '4px',
    boxShadow: '0 4px 32px rgba(0,0,0,0.22)',
    backdropFilter: 'blur(10px)',
    overflowY: 'auto',
    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
    zIndex: 150, opacity: '0', pointerEvents: 'none',
    fontFamily: 'Georgia, serif',
    transform: 'translateY(-50%) translateX(0)',
  });
  _visitorCard.id = 'visitor-hover-card';
  _visitorCard.addEventListener('mouseenter', () => { _vcHovered = true;  cancelHide(); });
  _visitorCard.addEventListener('mouseleave', () => { _vcHovered = false; scheduleHide(); });

  if (!document.getElementById('visitor-hover-card-css')) {
    const s = document.createElement('style');
    s.id = 'visitor-hover-card-css';
    s.textContent = `
      #visitor-hover-card { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.15) transparent; }
      #visitor-hover-card::-webkit-scrollbar { width: 4px; }
      #visitor-hover-card::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }
      #visitor-hover-card .vc-desc { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.1) transparent; }
      #visitor-hover-card .vc-desc::-webkit-scrollbar { width: 4px; }
      #visitor-hover-card .vc-desc::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(_visitorCard);
}

// Project all 8 corners of the artwork's AABB to find its true screen-space
// bounding rect. Using box.max.x alone is wrong for side-wall paintings because
// the painting's depth axis (Z or X in world space) becomes the screen-horizontal axis.
function calcVisitorCardPos(group, camera) {
  const box = new THREE.Box3().setFromObject(group);
  const { min, max } = box;

  let minSX = Infinity, maxSX = -Infinity;
  let minSY = Infinity, maxSY = -Infinity;

  for (let xi = 0; xi < 2; xi++) {
    for (let yi = 0; yi < 2; yi++) {
      for (let zi = 0; zi < 2; zi++) {
        const p = new THREE.Vector3(
          xi === 0 ? min.x : max.x,
          yi === 0 ? min.y : max.y,
          zi === 0 ? min.z : max.z,
        ).project(camera);
        const sx = (p.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-p.y * 0.5 + 0.5) * window.innerHeight;
        if (sx < minSX) minSX = sx;
        if (sx > maxSX) maxSX = sx;
        if (sy < minSY) minSY = sy;
        if (sy > maxSY) maxSY = sy;
      }
    }
  }

  const cy  = (minSY + maxSY) / 2;
  const GAP = 30;

  if (maxSX + GAP + VC_WIDTH > window.innerWidth) {
    return { x: minSX - GAP - VC_WIDTH, y: cy, side: 'left' };
  }
  return { x: maxSX + GAP, y: cy, side: 'right' };
}

function fillVisitorCard(group) {
  _visitorCard.innerHTML = '';
  const info = group.userData.info || {};

  const title = document.createElement('div');
  title.textContent = info.title || 'Untitled';
  Object.assign(title.style, {
    fontSize: '24px', fontWeight: 'normal',
    color: info.title ? '#2a2218' : '#8a7a6a',
    fontStyle: info.title ? 'normal' : 'italic',
    marginBottom: '16px', lineHeight: '1.3',
  });
  _visitorCard.appendChild(title);

  if (info.description) {
    const maxLen = 150;
    const text   = info.description.length > maxLen
      ? info.description.slice(0, maxLen) + '…'
      : info.description;
    const desc = document.createElement('div');
    desc.className = 'vc-desc';
    desc.textContent = text;
    Object.assign(desc.style, {
      fontSize: '13px', lineHeight: '1.8',
      color: '#3a3228', textIndent: '2em',
      maxHeight: '200px', overflowY: 'auto',
      marginBottom: '20px',
    });
    _visitorCard.appendChild(desc);
  }

  const metaRows = [
    ['Artist', info.artist],
    ['Year',   info.year],
    ['Size',   info.dimensions],
  ].filter(([, v]) => v);

  if (metaRows.length) {
    const meta = document.createElement('div');
    Object.assign(meta.style, {
      borderTop: '1px solid rgba(0,0,0,0.1)',
      marginTop: '20px', paddingTop: '16px',
      fontSize: '11px', lineHeight: '2.0', color: '#8a7a6a',
    });
    metaRows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.innerHTML = `<span style="opacity:0.55">${label}</span>&ensp;${value}`;
      meta.appendChild(row);
    });
    _visitorCard.appendChild(meta);
  }
}

function slideInVisitorCard(group, camera) {
  if (!_visitorCard) buildVisitorCard();
  fillVisitorCard(group);

  const pos = calcVisitorCardPos(group, camera);
  _visitorCard.dataset.side = pos.side;

  // Park at calculated position with slide-in offset (toward artwork)
  _visitorCard.style.left      = pos.x + 'px';
  _visitorCard.style.top       = pos.y + 'px';
  const offset = pos.side === 'right' ? '-10px' : '10px';
  _visitorCard.style.transform = `translateY(-50%) translateX(${offset})`;
  _visitorCard.style.opacity   = '0';
  _visitorCard.style.pointerEvents = 'auto';

  requestAnimationFrame(() => {
    _visitorCard.style.transform = 'translateY(-50%) translateX(0)';
    _visitorCard.style.opacity   = '1';
  });
}

function updateVisitorCardPos(group, camera) {
  if (!_visitorCard || _visitorCard.style.opacity === '0') return;
  const pos = calcVisitorCardPos(group, camera);
  // Update position without transition (left/top not in transition list)
  _visitorCard.style.left = pos.x + 'px';
  _visitorCard.style.top  = pos.y + 'px';
}

function slideOutVisitorCard() {
  if (!_visitorCard) return;
  const side   = _visitorCard.dataset.side || 'right';
  const offset = side === 'right' ? '-10px' : '10px';
  _visitorCard.style.transform = `translateY(-50%) translateX(${offset})`;
  _visitorCard.style.opacity   = '0';
  _visitorCard.style.pointerEvents = 'none';
}

export function resetHoverState() {
  cancelHide();
  if (_card) _card.style.opacity = '0';
  slideOutVisitorCard();
  _lastCardGroup = null;
  _timedOutGroup = null;
  _cardHovered   = false;
  _vcHovered     = false;
}

function scheduleHide() {
  if (_hideTimeout) return;
  _hideTimeout = setTimeout(() => {
    _hideTimeout = null;
    if (_card) _card.style.opacity = '0';
    slideOutVisitorCard();
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
    if (!_cardHovered && !_vcHovered) scheduleHide();
  });
}

export function tickHoverPreview(camera, renderer, artworks, interacting) {
  if (!_card) return;

  const visitorMode = !isCurator();
  const cardHov     = visitorMode ? _vcHovered : _cardHovered;

  // Card/panel is being hovered
  if (cardHov) {
    cancelHide();
    // Curator: still respect TTL even while hovering
    if (!visitorMode && _lastCardGroup && Date.now() - _cardShowTime > CARD_TTL_MS) {
      _card.style.opacity = '0';
      _timedOutGroup = _lastCardGroup;
      _lastCardGroup = null;
    }
    return;
  }

  // Immediate hide for editor/interaction states
  if (isEditorOpen() || interacting || !artworks.length) {
    cancelHide();
    _card.style.opacity = '0';
    slideOutVisitorCard();
    _lastCardGroup = null;
    _timedOutGroup = null;
    return;
  }

  _rc.setFromCamera(_mNDC, camera);
  const hits = _rc.intersectObjects(artworks.flatMap(a => a.children), true);

  if (!hits.length || hits[0].object.userData.isRotHandle) {
    scheduleHide();
    _timedOutGroup = null;
    return;
  }

  const parent = artworks.find(a =>
    a.children.some(ch => ch === hits[0].object || ch === hits[0].object.parent)
  );
  if (!parent) { scheduleHide(); _timedOutGroup = null; return; }

  // ── Visitor mode: panel next to artwork, no TTL ──────────────────────────
  if (visitorMode) {
    cancelHide();
    if (parent !== _lastCardGroup) {
      slideInVisitorCard(parent, camera);
      _lastCardGroup = parent;
    } else {
      updateVisitorCardPos(parent, camera); // track artwork as camera moves
    }
    return;
  }

  // ── Curator mode: existing bottom card with TTL ───────────────────────────
  if (parent === _timedOutGroup) { _card.style.opacity = '0'; return; }

  if (parent !== _lastCardGroup) {
    fillCardContent(parent);
    _cardShowTime = Date.now();
  }

  if (Date.now() - _cardShowTime > CARD_TTL_MS) {
    cancelHide();
    _card.style.opacity = '0';
    _timedOutGroup = parent;
    _lastCardGroup = null;
    return;
  }

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
