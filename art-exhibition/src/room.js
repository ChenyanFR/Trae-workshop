// room.js — GLB wall-colour adapter
//
// ui.js has a static `import { setRoomColor } from './room.js'` that must
// never break. This file keeps that export but now targets the GLB wall mesh
// material instead of procedural geometry.

let _wallMaterialMap = {};
let _activeHighlight  = null;
let _highlightTimer   = null;

/** Called from main.js after the GLB loads. map = { meshName: [Material, ...] } */
export function setWallMaterialMap(map) {
  _wallMaterialMap = map;
}

/** Called by ui.js on every palette click. target = mesh name (e.g. 'Exhibition_Wall_01'). */
export function setRoomColor(target, hex) {
  const mats = _wallMaterialMap[target];
  if (!mats) return;
  mats.forEach(m => {
    if (m.color) m.color.setStyle(hex);
    if (m.map) { m.map = null; }
    m.needsUpdate = true;
  });
}

/**
 * Highlight the selected wall: brief bright flash → settles to subtle glow.
 * Clears the previous wall's highlight automatically.
 */
export function highlightWall(name) {
  // Clear previous highlight
  if (_activeHighlight && _wallMaterialMap[_activeHighlight]) {
    _wallMaterialMap[_activeHighlight].forEach(m => {
      m.emissive?.setHex(0x000000);
      m.emissiveIntensity = 0;
      m.needsUpdate = true;
    });
  }
  clearTimeout(_highlightTimer);
  _activeHighlight = name;

  const mats = _wallMaterialMap[name];
  if (!mats) return;

  // Flash bright
  mats.forEach(m => {
    m.emissive?.setHex(0xffffff);
    m.emissiveIntensity = 0.5;
    m.needsUpdate = true;
  });

  // After 600 ms settle to a subtle persistent glow
  _highlightTimer = setTimeout(() => {
    if (_activeHighlight !== name) return;
    mats.forEach(m => {
      m.emissiveIntensity = 0.08;
      m.needsUpdate = true;
    });
  }, 600);
}

// Legacy shim — no longer used but kept so stale imports don't crash.
export function setWallMaterial() {}

// Kept as a no-op so any stale import in other files doesn't crash.
export function createRoom() {}
