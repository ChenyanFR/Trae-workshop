// room.js — GLB wall-colour adapter
//
// ui.js has a static `import { setRoomColor } from './room.js'` that must
// never break. This file keeps that export but now targets the GLB wall mesh
// material instead of procedural geometry.

let _wallMaterial = null;

/** Called from main.js after the GLB loads. */
export function setWallMaterial(mat) {
  _wallMaterial = Array.isArray(mat) ? mat : [mat];
}

/** Called by ui.js on every palette click. All surface tabs drive the GLB wall. */
export function setRoomColor(_target, hex) {
  if (_wallMaterial) {
    _wallMaterial.forEach(m => { if (m.color) m.color.setStyle(hex); });
  }
}

// Kept as a no-op so any stale import in other files doesn't crash.
export function createRoom() {}
