import * as THREE from 'three';
import { openInfoEditor, isEditorOpen } from './artworkInfo.js';
import { isCurator, onModeChange } from './userMode.js';
import { openFocus, closeFocus, isFocusOpen, onFocusSwipeRight } from './focusMode.js';
import { openDetail, isDetailOpen } from './artworkDetail.js';

// ─── Frame presets ────────────────────────────────────────────────────────────
const FRAME_PRESETS = [
  {
    name: 'Baroque Gold',     desc: '22K gilded carved finish',
    color: 0xC9A03A, roughness: 0.22, metalness: 0.92,
    css: 'linear-gradient(135deg,#7a5a10 0%,#f5d060 30%,#c9a03a 55%,#f0c840 72%,#8a6318 100%)',
  },
  {
    name: 'Antique Silver',   desc: 'Aged sterling with patina',
    color: 0xB8B8B0, roughness: 0.38, metalness: 0.82,
    css: 'linear-gradient(135deg,#888880 0%,#e0e0d8 35%,#a8a8a0 55%,#d8d8d0 75%,#909088 100%)',
  },
  {
    name: 'Brushed Steel',    desc: 'Modern museum aluminium',
    color: 0x9A9A9A, roughness: 0.30, metalness: 0.88,
    css: 'repeating-linear-gradient(90deg,#787878 0px,#c0c0c0 1px,#909090 2px,#b0b0b0 4px)',
  },
  {
    name: 'Oxidized Copper',  desc: 'Verde patina, aged 80 yrs',
    color: 0xA07840, roughness: 0.55, metalness: 0.58,
    css: 'linear-gradient(120deg,#B87333 0%,#8B5e20 25%,#6a9a78 50%,#B87333 75%,#7a9070 100%)',
  },
  {
    name: 'Dark Walnut',      desc: 'Hand-carved aged walnut',
    color: 0x3E2410, roughness: 0.88, metalness: 0.0,
    css: 'repeating-linear-gradient(170deg,#3e2410 0px,#5a3418 3px,#2e1808 6px,#4a2c14 10px,#3e2410 13px)',
  },
  {
    name: 'Rosewood',         desc: 'Deep red mahogany grain',
    color: 0x5C1A1A, roughness: 0.82, metalness: 0.0,
    css: 'repeating-linear-gradient(168deg,#5c1a1a 0px,#7a2c20 2px,#3c1010 5px,#6a2218 9px,#5c1a1a 12px)',
  },
  {
    name: 'Plaster White',    desc: 'Classic gesso, museum style',
    color: 0xF0EDE6, roughness: 0.95, metalness: 0.0,
    css: 'radial-gradient(ellipse at 30% 30%,#fffdf8 0%,#f0ede6 50%,#ddd8d0 100%)',
  },
  {
    name: 'Matte Black',      desc: 'Japanese lacquer, flat finish',
    color: 0x1a1a1a, roughness: 0.96, metalness: 0.02,
    css: 'radial-gradient(ellipse at 25% 25%,#383838 0%,#1a1a1a 55%,#0a0a0a 100%)',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const FRAME_THICKNESS = 0.06;
const FRAME_DEPTH     = 0.05;
const CANVAS_DEPTH    = 0.01;
const WALL_OFFSET     = 0.005; // 紧贴墙面，避免悬浮或插入墙里
const MIN_SIZE        = 0.001;
const MAX_SIZE        = 1000;
const SIZE_STEP       = 0.08;

const WALLS = [
  { normal: new THREE.Vector3(0, 0, -1), point: new THREE.Vector3(0, 0,  5.85), rotY: Math.PI },
  { normal: new THREE.Vector3(0, 0,  1), point: new THREE.Vector3(0, 0, -5.85), rotY: 0 },
  { normal: new THREE.Vector3(1, 0,  0), point: new THREE.Vector3(-6.85, 0, 0),  rotY: -Math.PI / 2 },
  { normal: new THREE.Vector3(-1, 0, 0), point: new THREE.Vector3( 6.85, 0, 0),  rotY:  Math.PI / 2 },
];

// GLB raycaster targets — wall mesh + any freestanding panels.
// Set by main.js after the model loads.
let _raycastTargets = [];
export function setWallMesh(mesh) { _raycastTargets = [mesh]; }
export function addRaycastTarget(mesh) { _raycastTargets.push(mesh); }

// Predefined hanging slots (world positions of hidden Artpiece meshes).
// When the ray hits the wall within SNAP_DIST of a slot, painting snaps there.
const SNAP_DIST = 0.7; // metres
let _hangingSlots = [];
export function setHangingSlots(slots) { _hangingSlots = slots; }

// ─── Build framed painting ────────────────────────────────────────────────────
function buildFramedPainting(texture, width, height, pIdx) {
  const preset  = FRAME_PRESETS[pIdx % FRAME_PRESETS.length];
  const group   = new THREE.Group();
  const isVideo = texture?.image instanceof HTMLVideoElement;
  const videoEl = isVideo ? texture.image : null;

  const frameMat = new THREE.MeshStandardMaterial({
    color: preset.color, roughness: preset.roughness, metalness: preset.metalness,
  });
  const ft = FRAME_THICKNESS, fd = FRAME_DEPTH;
  for (const b of [
    { w: width + ft * 2, h: ft,     x: 0,                   y:  height / 2 + ft / 2 },
    { w: width + ft * 2, h: ft,     x: 0,                   y: -height / 2 - ft / 2 },
    { w: ft,             h: height, x: -width / 2 - ft / 2,  y: 0 },
    { w: ft,             h: height, x:  width / 2 + ft / 2,  y: 0 },
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, fd), frameMat);
    m.position.set(b.x, b.y, 0);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
  const canvas = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: texture || null, color: texture ? 0xffffff : 0xbbbbbb,
      roughness: 0.85, metalness: 0.0,
    })
  );
  canvas.position.z = fd / 2 + CANVAS_DEPTH / 2;
  canvas.receiveShadow = true;
  group.add(canvas);

  group.userData.isArtwork  = true;
  group.userData.isVideo    = isVideo;
  group.userData.videoEl    = videoEl;
  group.userData.presetIdx  = pIdx;
  group.userData.artWidth   = width;
  group.userData.artHeight  = height;
  group.userData.artTexture = texture;
  group.userData.canvasMesh = canvas;
  group.userData.frameMat   = frameMat;
  return group;
}

// ─── Rebuild painting at new size ─────────────────────────────────────────────
function resizePainting(group, newSize) {
  const tex    = group.userData.artTexture;
  const img    = tex?.image;
  const aspect = img ? ((img.videoWidth || img.width) / (img.videoHeight || img.height)) || 1 : 1;
  removeRotHandle(group);
  _scene.remove(group);
  const ng = buildFramedPainting(tex, newSize * aspect, newSize, group.userData.presetIdx);
  ng.position.copy(group.position);
  ng.rotation.copy(group.rotation);
  ng.userData.wallNormal = group.userData.wallNormal?.clone();
  ng.userData.wallPoint  = group.userData.wallPoint?.clone();
  ng.userData.wallRotY   = group.userData.wallRotY;
  ng.userData.artSize    = newSize;
  ng.userData.info       = group.userData.info;
  _scene.add(ng);
  return ng;
}

// ─── Apply new frame preset to placed painting ────────────────────────────────
function applyNewFrame(group, newIdx) {
  const ng = resizePainting(
    group,
    group.userData.artSize ?? Math.max(group.userData.artWidth, group.userData.artHeight)
  );
  // overwrite preset on freshly built group
  const preset = FRAME_PRESETS[newIdx % FRAME_PRESETS.length];
  ng.userData.frameMat.color.setHex(preset.color);
  ng.userData.frameMat.roughness  = preset.roughness;
  ng.userData.frameMat.metalness  = preset.metalness;
  ng.userData.frameMat.needsUpdate = true;
  ng.userData.presetIdx = newIdx;
  artworks = artworks.map(a => a === group ? ng : a);
  selectArtwork(ng);
}

// ─── Rotation handle ──────────────────────────────────────────────────────────
const rotHandleMat = new THREE.MeshStandardMaterial({
  color: 0xffd060, metalness: 0.75, roughness: 0.2,
  emissive: new THREE.Color(0x554400), emissiveIntensity: 0.4,
});
const rotHandleGeo = new THREE.SphereGeometry(0.065, 16, 12);

function addRotHandle(group) {
  if (group.userData.rotHandle) return;
  const h = new THREE.Mesh(rotHandleGeo, rotHandleMat);
  h.userData.isRotHandle = true;
  const ht = group.userData.artHeight / 2 + FRAME_THICKNESS + 0.12;
  h.position.set(0, ht, FRAME_DEPTH / 2 + 0.04);
  h.castShadow = false;
  group.add(h);
  group.userData.rotHandle = h;
}

function removeRotHandle(group) {
  if (!group.userData.rotHandle) return;
  group.remove(group.userData.rotHandle);
  group.userData.rotHandle = null;
}

// Screen-space centre of a group (pixels)
function screenCenter(group) {
  const v = group.position.clone().project(_camera);
  const el = _renderer.domElement;
  return {
    x: (v.x + 1) / 2 * el.clientWidth,
    y: (1 - v.y) / 2 * el.clientHeight,
  };
}

// ─── Module state ─────────────────────────────────────────────────────────────
let _scene, _camera, _renderer, _controls;
let placingGroup    = null;
let selectedGroup   = null;
let artworks        = [];
let hangingMode     = false;
let pendingTextures = [];
let currentSize     = 0.8;
let isDragging      = false;
let isRotating      = false;
let prevRotAngle    = 0;
let presetIdx       = 0;
let changingFrameFor = null; // group whose frame we're changing, or null = new painting
let editMode        = false;

// ─── Corner resize drag state ─────────────────────────────────────────────────
let _resizeDragActive  = false;
let _resizeStartSize   = 0;
let _resizeStartDist   = 1;
let _resizeStartCX     = 0; // artwork center in screen pixels at drag start
let _resizeStartCY     = 0;
const EDIT_MIN_SIZE    = 0.001;
const EDIT_MAX_SIZE    = 1000;
const _cornerHandles   = [];

// ─── UI refs ──────────────────────────────────────────────────────────────────
let editModeBar;

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();
const _plane    = new THREE.Plane();
const _hitPt    = new THREE.Vector3();

let uploadBtn, crosshair, hintBar, framePanel, selectionBar;

// ─── Highlight ────────────────────────────────────────────────────────────────
function highlight(group, on) {
  const mat = group.userData.frameMat;
  if (!mat) return;
  mat.emissiveIntensity = on ? 0.32 : 0;
  mat.emissive.setHex(on ? 0x887755 : 0x000000);
}

// ─── Selection ────────────────────────────────────────────────────────────────
function selectArtwork(group) {
  if (editMode && selectedGroup && selectedGroup !== group) exitEditMode();
  if (selectedGroup && selectedGroup !== group) {
    highlight(selectedGroup, false);
    removeRotHandle(selectedGroup);
  }
  selectedGroup = group;
  highlight(group, true);
  addRotHandle(group);
  updateSelectionBar();
}

function deselectAll() {
  exitEditMode();
  if (selectedGroup) {
    highlight(selectedGroup, false);
    removeRotHandle(selectedGroup);
  }
  selectedGroup = null;
  if (selectionBar) selectionBar.style.display = 'none';
}

function adjustSelectedSize(delta) {
  if (!selectedGroup) return;
  const cur = selectedGroup.userData.artSize
    ?? Math.max(selectedGroup.userData.artWidth, selectedGroup.userData.artHeight);
  const ng = resizePainting(selectedGroup, THREE.MathUtils.clamp(cur + delta, MIN_SIZE, MAX_SIZE));
  artworks = artworks.map(a => a === selectedGroup ? ng : a);
  selectArtwork(ng);
  selectedGroup = ng;
}

function deleteSelected() {
  if (!selectedGroup) return;
  removeRotHandle(selectedGroup);
  // Clean up video resources
  if (selectedGroup.userData.videoEl) {
    const v = selectedGroup.userData.videoEl;
    v.pause();
    if (v.src.startsWith('blob:')) URL.revokeObjectURL(v.src);
  }
  _scene.remove(selectedGroup);
  artworks = artworks.filter(a => a !== selectedGroup);
  selectedGroup = null;
  if (selectionBar) selectionBar.style.display = 'none';
}

// ─── Selection toolbar ────────────────────────────────────────────────────────
function buildSelectionBar() {
  selectionBar = document.createElement('div');
  Object.assign(selectionBar.style, {
    position: 'fixed', bottom: '20px', left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(12,7,3,0.90)', border: '1px solid #6a4a20',
    borderRadius: '8px', padding: '10px 18px',
    color: '#f0e0c0', fontFamily: 'serif', fontSize: '13px',
    display: 'none', zIndex: 200, gap: '10px',
    alignItems: 'center', backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
  });

  const label = document.createElement('span');
  label.id = 'sel-label';
  selectionBar.appendChild(label);

  const sep = () => {
    const s = document.createElement('span');
    s.textContent = '|'; s.style.opacity = '0.25'; s.style.margin = '0 2px';
    selectionBar.appendChild(s);
  };

  const btn = (text, tip, fn) => {
    const b = document.createElement('button');
    b.textContent = text; b.title = tip;
    Object.assign(b.style, {
      background: 'rgba(255,255,255,0.06)', border: '1px solid #5a3a10',
      color: '#f0e0c0', borderRadius: '4px', padding: '4px 11px',
      cursor: 'pointer', fontSize: '13px', fontFamily: 'serif',
    });
    b.addEventListener('mouseenter', () => b.style.background = 'rgba(200,144,58,0.28)');
    b.addEventListener('mouseleave', () => b.style.background = 'rgba(255,255,255,0.06)');
    b.addEventListener('click', fn);
    selectionBar.appendChild(b);
    return b;
  };

  sep();
  btn('－', 'Shrink', () => adjustSelectedSize(-SIZE_STEP));
  btn('＋', 'Grow',   () => adjustSelectedSize(+SIZE_STEP));
  sep();
  btn('🖼 Change Frame', 'Pick a new frame style', () => {
    if (!selectedGroup) return;
    changingFrameFor = selectedGroup;
    showFramePanel();
  });
  sep();
  btn('🗑 Delete', 'Delete (Del key)', deleteSelected);
  sep();

  const hint = document.createElement('span');
  hint.textContent = 'Drag ● to rotate  ·  ESC deselect';
  hint.style.cssText = 'opacity:0.38;font-size:11px';
  selectionBar.appendChild(hint);

  document.body.appendChild(selectionBar);
}

function updateSelectionBar() {
  if (!selectedGroup || !selectionBar || editMode) return;
  const preset = FRAME_PRESETS[selectedGroup.userData.presetIdx % FRAME_PRESETS.length];
  const w = (selectedGroup.userData.artWidth  ?? 0).toFixed(2);
  const h = (selectedGroup.userData.artHeight ?? 0).toFixed(2);
  selectionBar.querySelector('#sel-label').textContent = `${preset.name}  ${w}×${h} m`;
  selectionBar.style.display = 'flex';
}

// ─── Edit mode bar ────────────────────────────────────────────────────────────
function buildEditModeBar() {
  editModeBar = document.createElement('div');
  Object.assign(editModeBar.style, {
    position: 'fixed', bottom: '20px', left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(8,18,12,0.92)', border: '1px solid #3a6a48',
    borderRadius: '8px', padding: '10px 18px',
    color: '#b0e8c8', fontFamily: 'serif', fontSize: '13px',
    display: 'none', zIndex: 200, gap: '12px',
    alignItems: 'center', backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.55)', whiteSpace: 'nowrap',
  });

  const hint = document.createElement('span');
  hint.textContent = 'Edit Mode  ·  Drag corner to resize  ·  Drag artwork to move';
  hint.style.cssText = 'opacity:0.72;font-size:12px';
  editModeBar.appendChild(hint);

  const sep = document.createElement('span');
  sep.textContent = '|'; sep.style.cssText = 'opacity:0.22';
  editModeBar.appendChild(sep);

  const doneBtn = document.createElement('button');
  doneBtn.textContent = 'Done';
  Object.assign(doneBtn.style, {
    background: 'rgba(50,180,100,0.18)', border: '1px solid #3a6a48',
    color: '#b0e8c8', borderRadius: '4px', padding: '4px 14px',
    cursor: 'pointer', fontSize: '13px', fontFamily: 'serif',
  });
  doneBtn.addEventListener('mouseenter', () => doneBtn.style.background = 'rgba(50,180,100,0.32)');
  doneBtn.addEventListener('mouseleave', () => doneBtn.style.background = 'rgba(50,180,100,0.18)');
  doneBtn.addEventListener('click', exitEditMode);
  editModeBar.appendChild(doneBtn);

  const esc = document.createElement('span');
  esc.textContent = 'ESC to exit';
  esc.style.cssText = 'opacity:0.28;font-size:11px';
  editModeBar.appendChild(esc);

  document.body.appendChild(editModeBar);
}

// ─── Corner resize handles ────────────────────────────────────────────────────
// Corner order: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
const CORNER_CURSORS = ['nwse-resize', 'nesw-resize', 'nesw-resize', 'nwse-resize'];

function buildCornerHandles() {
  for (let i = 0; i < 4; i++) {
    const h = document.createElement('div');
    Object.assign(h.style, {
      position: 'fixed', width: '10px', height: '10px',
      background: '#fff', border: '1.5px solid #222',
      borderRadius: '2px', boxSizing: 'border-box',
      transform: 'translate(-50%,-50%)',
      cursor: CORNER_CURSORS[i],
      zIndex: 250, display: 'none',
      transition: 'background 0.12s, transform 0.12s',
      pointerEvents: 'auto',
    });
    h.addEventListener('mouseenter', () => {
      h.style.background = '#c8903a';
      h.style.transform = 'translate(-50%,-50%) scale(1.45)';
    });
    h.addEventListener('mouseleave', () => {
      h.style.background = '#fff';
      h.style.transform = 'translate(-50%,-50%)';
    });
    h.addEventListener('mousedown', e => onCornerMouseDown(e, i));
    document.body.appendChild(h);
    _cornerHandles.push(h);
  }
}

function getArtworkCornersScreen(group) {
  const el = _renderer.domElement;
  const w  = group.userData.artWidth  ?? 0.5;
  const h  = group.userData.artHeight ?? 0.5;
  const ft = FRAME_THICKNESS;
  const localPts = [
    new THREE.Vector3(-w / 2 - ft,  h / 2 + ft, 0), // 0 top-left
    new THREE.Vector3( w / 2 + ft,  h / 2 + ft, 0), // 1 top-right
    new THREE.Vector3(-w / 2 - ft, -h / 2 - ft, 0), // 2 bottom-left
    new THREE.Vector3( w / 2 + ft, -h / 2 - ft, 0), // 3 bottom-right
  ];
  return localPts.map(lp => {
    const wp = group.localToWorld(lp.clone());
    const v  = wp.project(_camera);
    return {
      x: (v.x + 1) / 2 * el.clientWidth,
      y: (1 - v.y) / 2 * el.clientHeight,
    };
  });
}

function showCornerHandles(group) {
  _cornerHandles.forEach(h => h.style.display = 'block');
}

function hideCornerHandles() {
  _cornerHandles.forEach(h => h.style.display = 'none');
}

function onCornerMouseDown(e, cornerIndex) {
  e.preventDefault();
  e.stopPropagation();
  if (!editMode || !selectedGroup) return;

  _resizeDragActive = true;
  _resizeStartSize  = selectedGroup.userData.artSize
    ?? Math.max(selectedGroup.userData.artWidth, selectedGroup.userData.artHeight);

  // Compute artwork screen center
  const el = _renderer.domElement;
  const cv  = selectedGroup.position.clone().project(_camera);
  _resizeStartCX = (cv.x + 1) / 2 * el.clientWidth;
  _resizeStartCY = (1 - cv.y) / 2 * el.clientHeight;

  // Distance from center to dragged corner
  const corners  = getArtworkCornersScreen(selectedGroup);
  _resizeStartDist = Math.max(
    Math.hypot(corners[cornerIndex].x - _resizeStartCX,
               corners[cornerIndex].y - _resizeStartCY),
    1
  );

  if (_controls) _controls.enabled = false;
  document.addEventListener('mousemove', onResizeDragMove);
  document.addEventListener('mouseup',   onResizeDragEnd);
}

function onResizeDragMove(e) {
  if (!_resizeDragActive || !selectedGroup) return;
  const dist   = Math.hypot(e.clientX - _resizeStartCX, e.clientY - _resizeStartCY);
  const factor = dist / _resizeStartDist;
  const newSize = THREE.MathUtils.clamp(_resizeStartSize * factor, EDIT_MIN_SIZE, EDIT_MAX_SIZE);
  selectedGroup.scale.setScalar(newSize / _resizeStartSize);
}

function onResizeDragEnd() {
  if (!_resizeDragActive) return;
  _resizeDragActive = false;
  document.removeEventListener('mousemove', onResizeDragMove);
  document.removeEventListener('mouseup',   onResizeDragEnd);
  if (_controls) _controls.enabled = true;
  if (!selectedGroup) return;

  const factor  = selectedGroup.scale.x;
  const newSize = THREE.MathUtils.clamp(_resizeStartSize * factor, EDIT_MIN_SIZE, EDIT_MAX_SIZE);
  selectedGroup.scale.set(1, 1, 1); // reset before rebuilding

  const old = selectedGroup;
  const ng  = resizePainting(old, newSize); // removes old from scene, adds ng
  artworks  = artworks.map(a => a === old ? ng : a);

  // Manually update selection — stay in edit mode, skip selectArtwork to avoid exitEditMode
  selectedGroup = ng;
  highlight(ng, true);
  addRotHandle(ng);
  if (selectionBar)  selectionBar.style.display  = 'none';
  if (editModeBar)   editModeBar.style.display    = 'flex';
}

export function tickEditMode() {
  if (!editMode || !selectedGroup || !_cornerHandles.length) return;
  // Update matrixWorld so localToWorld is accurate
  selectedGroup.updateWorldMatrix(true, false);
  const positions = getArtworkCornersScreen(selectedGroup);
  positions.forEach((pos, i) => {
    _cornerHandles[i].style.left = pos.x + 'px';
    _cornerHandles[i].style.top  = pos.y + 'px';
  });
}

function enterEditMode(group) {
  if (!isCurator()) return;
  editMode = true;
  selectArtwork(group);
  showCornerHandles(group);
  if (selectionBar) selectionBar.style.display = 'none';
  if (editModeBar)  editModeBar.style.display  = 'flex';
}

function exitEditMode() {
  if (!editMode) return;
  editMode = false;
  hideCornerHandles();
  if (editModeBar) editModeBar.style.display = 'none';
  updateSelectionBar();
}

// ─── Frame selector panel ─────────────────────────────────────────────────────
function buildFramePanel() {
  framePanel = document.createElement('div');
  Object.assign(framePanel.style, {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    background: 'rgba(12,7,3,0.94)', border: '1px solid #6a4a20',
    borderRadius: '12px', padding: '26px 30px',
    color: '#f0e0c0', fontFamily: 'serif',
    zIndex: 300, display: 'none', width: '520px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.75)',
  });

  const title = document.createElement('div');
  title.id = 'frame-panel-title';
  title.textContent = 'Choose Frame Style';
  Object.assign(title.style, {
    fontSize: '17px', letterSpacing: '0.12em', marginBottom: '5px', textAlign: 'center',
  });
  framePanel.appendChild(title);

  const sub = document.createElement('div');
  sub.textContent = 'Select material and finish';
  Object.assign(sub.style, {
    fontSize: '11px', textAlign: 'center', color: '#907850',
    letterSpacing: '0.04em', marginBottom: '18px',
    borderBottom: '1px solid #3a2510', paddingBottom: '12px',
  });
  framePanel.appendChild(sub);

  const grid = document.createElement('div');
  Object.assign(grid.style, {
    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '18px',
  });

  const cards = [];
  FRAME_PRESETS.forEach((preset, i) => {
    const card = document.createElement('div');
    Object.assign(card.style, {
      cursor: 'pointer', borderRadius: '7px', overflow: 'hidden',
      border: '2px solid transparent', transition: 'border-color 0.15s, transform 0.1s',
      background: 'rgba(255,255,255,0.04)',
    });

    const swatch = document.createElement('div');
    Object.assign(swatch.style, { height: '54px', background: preset.css, position: 'relative' });
    if (preset.metalness > 0.5) {
      const sheen = document.createElement('div');
      sheen.style.cssText = 'position:absolute;inset:0;background:linear-gradient(160deg,rgba(255,255,255,0.18) 0%,transparent 50%);pointer-events:none';
      swatch.appendChild(sheen);
    }
    const tag = document.createElement('div');
    tag.textContent = preset.metalness > 0.6 ? 'Metal'
      : preset.metalness > 0.2 ? 'Semi-metal'
      : preset.roughness > 0.85 ? 'Matte' : 'Satin';
    tag.style.cssText = 'position:absolute;bottom:4px;right:5px;font-size:9px;background:rgba(0,0,0,0.45);color:#ddd;padding:1px 5px;border-radius:3px';
    swatch.appendChild(tag);

    const info = document.createElement('div');
    info.style.cssText = 'padding:6px 6px 7px;background:rgba(0,0,0,0.25)';
    info.innerHTML = `<div style="font-size:11px;color:#f0e0c0;margin-bottom:2px">${preset.name}</div>
                      <div style="font-size:9.5px;color:#907850;line-height:1.3">${preset.desc}</div>`;
    card.appendChild(swatch); card.appendChild(info);

    const markSelected = () => {
      cards.forEach((c, j) => { c.style.borderColor = j === presetIdx ? '#c8903a' : 'transparent'; });
    };
    card.addEventListener('mouseenter', () => { card.style.borderColor = '#c8903a'; card.style.transform = 'translateY(-2px)'; });
    card.addEventListener('mouseleave', () => { card.style.borderColor = i === presetIdx ? '#c8903a' : 'transparent'; card.style.transform = ''; });
    card.addEventListener('click', () => {
      presetIdx = i; markSelected(); hideFramePanel();
      if (changingFrameFor) {
        applyNewFrame(changingFrameFor, i);
        changingFrameFor = null;
      } else {
        enterHangingMode();
      }
    });
    cards.push(card);
    grid.appendChild(card);
  });
  cards[presetIdx].style.borderColor = '#c8903a';
  framePanel.appendChild(grid);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  Object.assign(cancelBtn.style, {
    display: 'block', margin: '0 auto', padding: '6px 26px', background: 'transparent',
    color: '#907850', border: '1px solid #4a3010', borderRadius: '4px',
    cursor: 'pointer', fontSize: '12px', fontFamily: 'serif',
  });
  cancelBtn.addEventListener('click', () => { changingFrameFor = null; hideFramePanel(); });
  framePanel.appendChild(cancelBtn);
  document.body.appendChild(framePanel);
}

function showFramePanel() {
  const title = framePanel.querySelector('#frame-panel-title');
  title.textContent = changingFrameFor ? 'Change Frame Style' : 'Choose Frame Style';
  framePanel.style.display = 'block';
}
function hideFramePanel() { framePanel.style.display = 'none'; }

// ─── Upload button ────────────────────────────────────────────────────────────
function buildUploadBtn() {
  uploadBtn = document.createElement('button');
  uploadBtn.textContent = '🖼 Hang Painting';
  Object.assign(uploadBtn.style, {
    position: 'fixed', top: '16px', right: '16px',
    padding: '10px 18px', background: 'rgba(20,12,4,0.82)',
    color: '#f0e6d0', border: '1px solid #8a6a3a',
    borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
    fontFamily: 'serif', letterSpacing: '0.04em', zIndex: 100,
    backdropFilter: 'blur(4px)',
  });
  uploadBtn.addEventListener('mouseenter', () => uploadBtn.style.background = 'rgba(90,50,10,0.9)');
  uploadBtn.addEventListener('mouseleave', () => uploadBtn.style.background = 'rgba(20,12,4,0.82)');
  document.body.appendChild(uploadBtn);

  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*,video/*';
  fileInput.multiple = true; fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', onFilesSelected);
}

function buildHUD() {
  crosshair = document.createElement('div');
  crosshair.textContent = '+';
  Object.assign(crosshair.style, {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    color: 'rgba(255,240,200,0.8)', fontSize: '28px', fontWeight: '100',
    pointerEvents: 'none', display: 'none', userSelect: 'none',
    zIndex: 99, textShadow: '0 0 6px rgba(0,0,0,0.6)',
  });
  document.body.appendChild(crosshair);

  hintBar = document.createElement('div');
  Object.assign(hintBar.style, {
    position: 'fixed', bottom: '20px', left: '20px',
    color: 'rgba(240,220,180,0.75)', fontSize: '12px',
    fontFamily: 'serif', pointerEvents: 'none',
    zIndex: 100, textShadow: '0 1px 4px rgba(0,0,0,0.8)', display: 'none',
  });
  document.body.appendChild(hintBar);
}

// ─── File loading ─────────────────────────────────────────────────────────────
function onFilesSelected(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  pendingTextures = [];
  let loaded = 0;
  const total = files.length;
  files.forEach(file => {
    if (file.type.startsWith('video/')) {
      // ── Video file: create HTMLVideoElement + VideoTexture ──────────────────
      const videoEl = document.createElement('video');
      videoEl.src = URL.createObjectURL(file);
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.crossOrigin = 'anonymous';
      videoEl.addEventListener('loadedmetadata', () => {
        const tex = new THREE.VideoTexture(videoEl);
        tex.colorSpace = THREE.SRGBColorSpace;
        pendingTextures.push(tex);
        if (++loaded === total) { changingFrameFor = null; showFramePanel(); }
      }, { once: true });
      videoEl.load();
    } else {
      // ── Image file: existing path ───────────────────────────────────────────
      const reader = new FileReader();
      reader.onload = ev => {
        new THREE.TextureLoader().load(ev.target.result, tex => {
          tex.colorSpace = THREE.SRGBColorSpace;
          pendingTextures.push(tex);
          if (++loaded === total) { changingFrameFor = null; showFramePanel(); }
        });
      };
      reader.readAsDataURL(file);
    }
  });
  e.target.value = '';
}

// ─── Hanging mode ─────────────────────────────────────────────────────────────
function enterHangingMode() {
  hangingMode = true; deselectAll(); spawnNextPainting();
  crosshair.style.display = 'block'; hintBar.style.display = 'block';
  hintBar.textContent = 'Move to wall  ·  Click to place  ·  Scroll to resize  ·  ESC to exit';
  _controls.enabled = false;
}

function exitHangingMode() {
  hangingMode = false;
  if (placingGroup) { _scene.remove(placingGroup); placingGroup = null; }
  crosshair.style.display = 'none'; hintBar.style.display = 'none';
  _controls.enabled = true;
}

function spawnNextPainting() {
  if (!pendingTextures.length) { exitHangingMode(); return; }
  const tex    = pendingTextures.shift();
  const img    = tex.image;
  const aspect = img ? ((img.videoWidth || img.width) / (img.videoHeight || img.height)) || 1 : 1;
  placingGroup = buildFramedPainting(tex, currentSize * aspect, currentSize, presetIdx);
  placingGroup.userData.artSize = currentSize;
  placingGroup.visible = false;
  _scene.add(placingGroup);
}

// ─── Raycasting ───────────────────────────────────────────────────────────────
function getNDC(e) {
  const r = _renderer.domElement.getBoundingClientRect();
  mouse.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  mouse.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
}

function castOnWalls() {
  raycaster.setFromCamera(mouse, _camera);

  // ── Primary: raycast directly against the GLB wall mesh ──────────────────
  if (_raycastTargets.length > 0) {
    const hits = raycaster.intersectObjects(_raycastTargets, false);
    if (hits.length > 0) {
      const hit  = hits[0];
      const normal = hit.face.normal.clone()
        .transformDirection(hit.object.matrixWorld)
        .normalize();

      // 确保法线朝向相机（房间内侧）
      const toCamera = new THREE.Vector3().subVectors(_camera.position, hit.point);
      if (normal.dot(toCamera) < 0) normal.negate();

      // 吸附到最近的预设挂画点
      let snapPoint = hit.point.clone();
      if (_hangingSlots.length > 0) {
        let minDist = SNAP_DIST;
        for (const slotPos of _hangingSlots) {
          const d = slotPos.distanceTo(hit.point);
          if (d < minDist) { minDist = d; snapPoint = slotPos.clone(); }
        }
      }

      const rotY = Math.atan2(normal.x, normal.z);
      const wall = { normal, point: snapPoint, rotY };
      return { wall, point: snapPoint };
    }
    return null;
  }

  // ── Fallback: hardcoded planes (procedural room) ──────────────────────────
  for (const wall of WALLS) {
    _plane.setFromNormalAndCoplanarPoint(wall.normal, wall.point);
    if (raycaster.ray.intersectPlane(_plane, _hitPt)) {
      const ok = _hitPt.x > -6.8 && _hitPt.x < 6.8
              && _hitPt.y >  0.2 && _hitPt.y < 5.8
              && _hitPt.z > -5.9 && _hitPt.z < 5.9;
      if (ok) return { wall, point: _hitPt.clone() };
    }
  }
  return null;
}

function snapToWall(group, point, wall) {
  group.position.copy(point);
  group.position.addScaledVector(wall.normal, FRAME_DEPTH / 2 + WALL_OFFSET);
  group.rotation.set(0, wall.rotY, 0);
  group.userData.wallNormal = wall.normal.clone();
  group.userData.wallPoint  = wall.point.clone();
  group.userData.wallRotY   = wall.rotY;
  group.visible = true;
}

function clampToRoom(group) {
  group.position.y = THREE.MathUtils.clamp(group.position.y, 0.3, 10);
  group.position.x = THREE.MathUtils.clamp(group.position.x, -20, 20);
  group.position.z = THREE.MathUtils.clamp(group.position.z, -20, 20);
}

// ─── Event handlers ───────────────────────────────────────────────────────────
function onMouseMove(e) {
  // Free rotation drag
  if (isRotating && selectedGroup) {
    const c = screenCenter(selectedGroup);
    const angle = Math.atan2(e.clientY - c.y, e.clientX - c.x);
    selectedGroup.rotation.z += prevRotAngle - angle;
    prevRotAngle = angle;
    return;
  }

  getNDC(e);

  // Drag placed artwork along its wall (works in both hanging mode and normal mode)
  if (isDragging && selectedGroup) {
    _plane.setFromNormalAndCoplanarPoint(
      selectedGroup.userData.wallNormal, selectedGroup.userData.wallPoint
    );
    raycaster.setFromCamera(mouse, _camera);
    if (raycaster.ray.intersectPlane(_plane, _hitPt)) {
      selectedGroup.position.copy(_hitPt);
      selectedGroup.position.addScaledVector(selectedGroup.userData.wallNormal, FRAME_DEPTH / 2 + WALL_OFFSET);
      clampToRoom(selectedGroup);
    }
    return;
  }

  if (!hangingMode) return;

  // Preview placing
  if (placingGroup) {
    const hit = castOnWalls();
    if (hit) snapToWall(placingGroup, hit.point, hit.wall);
    else     placingGroup.visible = false;
  }
}

function onMouseDown(e) {
  if (e.button !== 0) return;
  if (isEditorOpen()) return;
  if (!isCurator()) return;
  removeCtxMenu();
  getNDC(e);
  raycaster.setFromCamera(mouse, _camera);

  if (hangingMode) {
    e.preventDefault();
    // Click on placed artwork → select + drag
    const hits = raycaster.intersectObjects(artworks.flatMap(a => a.children), true);
    if (hits.length) {
      const parent = artworks.find(a => a.children.includes(hits[0].object)
        || (hits[0].object.parent && a.children.includes(hits[0].object.parent)));
      if (parent) { selectArtwork(parent); isDragging = true; return; }
    }
    // Place pending painting
    if (placingGroup) {
      const hit = castOnWalls();
      if (hit) {
        snapToWall(placingGroup, hit.point, hit.wall);
        const placed = placingGroup;
        artworks.push(placed);
        // Start video playing immediately — this click IS the user gesture,
        // so play() will succeed even for muted autoplay
        if (placed.userData.videoEl) {
          placed.userData.videoEl.play().catch(() => {});
        }
        placingGroup = null;
        spawnNextPainting();
      }
    }
    return;
  }

  // Normal mode
  // Check rotation handle first
  const handleMeshes = artworks
    .filter(a => a.userData.rotHandle)
    .map(a => a.userData.rotHandle);
  const handleHits = raycaster.intersectObjects(handleMeshes);
  if (handleHits.length) {
    const handle = handleHits[0].object;
    const parent = artworks.find(a => a.userData.rotHandle === handle);
    if (parent) {
      selectArtwork(parent);
      isRotating = true;
      const c = screenCenter(parent);
      prevRotAngle = Math.atan2(e.clientY - c.y, e.clientX - c.x);
      e.preventDefault();
      return;
    }
  }

  // Click on artwork canvas/frame → select + drag
  const artHits = raycaster.intersectObjects(artworks.flatMap(a => a.children), true);
  if (artHits.length) {
    const parent = artworks.find(a =>
      a.children.some(ch => ch === artHits[0].object || ch === artHits[0].object.parent)
    );
    if (parent) {
      selectArtwork(parent);
      isDragging = true;
      _controls.enabled = false; // prevent camera moving while dragging artwork
      return;
    }
  }
  deselectAll();
}

function onMouseUp() {
  if (isDragging && !hangingMode) _controls.enabled = true;
  isDragging = false;
  isRotating = false;
}

function onWheel(e) {
  if (hangingMode && placingGroup) {
    e.preventDefault();
    const d = e.deltaY > 0 ? -SIZE_STEP : SIZE_STEP;
    currentSize = THREE.MathUtils.clamp(currentSize + d, MIN_SIZE, MAX_SIZE);
    const tex    = placingGroup.userData.artTexture;
    const timg   = tex?.image;
    const aspect = timg ? ((timg.videoWidth || timg.width) / (timg.videoHeight || timg.height)) || 1 : 1;
    const pos = placingGroup.position.clone(), rot = placingGroup.rotation.clone();
    const vis = placingGroup.visible;
    const wn  = placingGroup.userData.wallNormal?.clone();
    const wp  = placingGroup.userData.wallPoint?.clone();
    const wr  = placingGroup.userData.wallRotY;
    _scene.remove(placingGroup);
    placingGroup = buildFramedPainting(tex, currentSize * aspect, currentSize, presetIdx);
    placingGroup.position.copy(pos); placingGroup.rotation.copy(rot); placingGroup.visible = vis;
    placingGroup.userData.artSize = currentSize;
    placingGroup.userData.wallNormal = wn; placingGroup.userData.wallPoint = wp; placingGroup.userData.wallRotY = wr;
    _scene.add(placingGroup);
    return;
  }
  // Placed paintings are resized by corner handles in edit mode, not scroll
}

function onKeyDown(e) {
  if (isFocusOpen()) return; // focus mode handles ESC via capture listener
  if (isEditorOpen()) return;
  if (e.key === 'Escape') {
    removeCtxMenu();
    if (editMode)    { exitEditMode(); return; }
    if (hangingMode) { exitHangingMode(); return; }
    deselectAll();
    return;
  }
  if (e.key === 'Delete') deleteSelected();
}

// ─── Focus mode triggers ──────────────────────────────────────────────────────
function hitArtwork(e) {
  getNDC(e);
  raycaster.setFromCamera(mouse, _camera);
  const hits = raycaster.intersectObjects(artworks.flatMap(a => a.children), true);
  if (!hits.length) return null;
  return artworks.find(a =>
    a.children.some(ch => ch === hits[0].object || ch === hits[0].object.parent)
  ) ?? null;
}

function onCanvasClick(e) {
  if (isCurator()) return;    // visitor only — curator uses dblclick
  if (isFocusOpen()) return;
  const parent = hitArtwork(e);
  if (parent) openFocus(parent);
}

function onCanvasDblClick(e) {
  if (!isCurator()) return;
  if (isEditorOpen() || hangingMode || editMode) return;
  const parent = hitArtwork(e);
  if (parent) openFocus(parent);
}

// ─── Context menu ─────────────────────────────────────────────────────────────
let _ctxMenu = null;

function removeCtxMenu() {
  if (_ctxMenu) { _ctxMenu.remove(); _ctxMenu = null; }
}

function showContextMenu(x, y, group) {
  removeCtxMenu();
  const menu = document.createElement('div');
  Object.assign(menu.style, {
    position: 'fixed', left: x + 'px', top: y + 'px',
    background: 'rgba(12,7,3,0.93)', border: '1px solid #5a3a10',
    borderRadius: '6px', overflow: 'hidden', zIndex: 400,
    boxShadow: '0 8px 28px rgba(0,0,0,0.65)',
    fontFamily: 'serif', fontSize: '13px', color: '#f0e0c0',
    backdropFilter: 'blur(8px)', minWidth: '140px',
  });

  const mkItem = (text, fn) => {
    const item = document.createElement('div');
    item.textContent = text;
    Object.assign(item.style, { padding: '9px 16px', cursor: 'pointer' });
    item.addEventListener('mouseenter', () => item.style.background = 'rgba(200,144,58,0.25)');
    item.addEventListener('mouseleave', () => item.style.background = '');
    item.addEventListener('click', () => { removeCtxMenu(); fn(); });
    menu.appendChild(item);
  };

  mkItem('Edit Info', () => openInfoEditor(group));
  mkItem('Resize / Move', () => enterEditMode(group));

  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px;background:rgba(90,50,10,0.6);margin:2px 0';
  menu.appendChild(sep);

  mkItem('Delete Artwork', () => {
    if (selectedGroup !== group) selectArtwork(group);
    deleteSelected();
  });

  document.body.appendChild(menu);
  _ctxMenu = menu;

  // Dismiss when clicking outside
  const dismiss = e => {
    if (!menu.contains(e.target)) removeCtxMenu();
    document.removeEventListener('mousedown', dismiss, true);
  };
  setTimeout(() => document.addEventListener('mousedown', dismiss, true), 0);
}

function onContextMenu(e) {
  e.preventDefault();
  if (hangingMode || isEditorOpen() || !isCurator()) return;
  getNDC(e);
  raycaster.setFromCamera(mouse, _camera);
  const hits = raycaster.intersectObjects(artworks.flatMap(a => a.children), true);
  if (!hits.length) return;
  const parent = artworks.find(a =>
    a.children.some(ch => ch === hits[0].object || ch === hits[0].object.parent)
  );
  if (!parent) return;
  showContextMenu(e.clientX, e.clientY, parent);
}

// ─── Proximity-based video playback ───────────────────────────────────────────
const PLAY_DIST  = 3; // metres — unmute + play
const PAUSE_DIST = 5; // metres — mute + pause

export function tickVideoArtworks(camera) {
  for (const group of artworks) {
    if (!group.userData.isVideo || !group.userData.videoEl) continue;
    const videoEl = group.userData.videoEl;
    const dist = camera.position.distanceTo(group.position);

    if (dist < PLAY_DIST) {
      if (videoEl.paused) videoEl.play().catch(() => {});
      videoEl.muted = false;
    } else if (dist > PAUSE_DIST) {
      if (!videoEl.paused) videoEl.pause();
      videoEl.muted = true;
    }
  }
}

export function getArtworks()   { return artworks; }
export function isInteracting() { return hangingMode || isDragging || isRotating || _resizeDragActive || isFocusOpen() || isDetailOpen(); }

// ─── Init ─────────────────────────────────────────────────────────────────────
export function createArtworks(scene, camera, renderer, controls) {
  _scene = scene; _camera = camera; _renderer = renderer; _controls = controls;
  buildUploadBtn(); buildHUD(); buildFramePanel(); buildSelectionBar(); buildEditModeBar(); buildCornerHandles();

  onFocusSwipeRight(group => {
    closeFocus(false); // keep controls locked — detail takes over
    openDetail(group, g => openFocus(g));
  });

  onModeChange(() => {
    if (isFocusOpen()) closeFocus();
    if (editMode) exitEditMode();
    if (hangingMode) exitHangingMode();
    removeCtxMenu();
    deselectAll();
    uploadBtn.style.display = isCurator() ? '' : 'none';
  });
  const cv = renderer.domElement;
  cv.addEventListener('mousemove',    onMouseMove);
  cv.addEventListener('mousedown',    onMouseDown);
  cv.addEventListener('mouseup',      onMouseUp);
  cv.addEventListener('wheel',        onWheel, { passive: false });
  cv.addEventListener('contextmenu',  onContextMenu);
  cv.addEventListener('click',        onCanvasClick);
  cv.addEventListener('dblclick',     onCanvasDblClick);
  window.addEventListener('keydown', onKeyDown);
}
