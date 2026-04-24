import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

// Room half-extents — overridden at runtime via setBounds() after GLB loads
let BOUND_X = 6.5;
let BOUND_Z = 5.5;
const EYE_Y = 1.7;

export function setBounds(x, z) { BOUND_X = x; BOUND_Z = z; }

let _enabled = true;
export function setControlsEnabled(v) { _enabled = v; }

// ─── Smooth camera fly-to ─────────────────────────────────────────────────────
let _fly = null;
let _flyCamera = null;
let _flyControls = null;

export function flyTo(camPos, target, duration = 0.8) {
  if (!_flyCamera) return;
  _fly = {
    camPos:     camPos.clone(),
    target:     target.clone(),
    duration,
    start:      performance.now(),
    fromCam:    _flyCamera.position.clone(),
    fromTarget: _flyControls.target.clone(),
  };
}

const MOVE_SPEED = 4.0;   // metres per second

export function initControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  _flyCamera = camera;
  _flyControls = controls;

  controls.target.set(0, EYE_Y, 0);

  controls.enableDamping  = true;
  controls.dampingFactor  = 0.06;
  controls.rotateSpeed    = 0.6;
  controls.zoomSpeed      = 0.8;
  controls.panSpeed       = 0.5;
  controls.minDistance    = 0.5;
  controls.maxDistance    = 10;
  controls.minPolarAngle  = Math.PI * 0.1;
  controls.maxPolarAngle  = Math.PI * 0.85;

  controls.update();

  // ── Key state ────────────────────────────────────────────────────────────
  const keys = { w: false, a: false, s: false, d: false, q: false, e: false };

  window.addEventListener('keydown', (e) => {
    if (!_enabled) return;
    const t = e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (k in keys) { keys[k] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const t = e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
  });

  // ── Reusable vectors ─────────────────────────────────────────────────────
  const forward  = new THREE.Vector3();
  const right    = new THREE.Vector3();
  const delta    = new THREE.Vector3();

  let lastTime = performance.now();

  // ── Per-frame update (called from render loop) ───────────────────────────
  controls.tick = () => {
    const now = performance.now();
    const dt  = Math.min((now - lastTime) / 1000, 0.05); // seconds, capped
    lastTime  = now;

    const moving = _enabled && (keys.w || keys.a || keys.s || keys.d || keys.q || keys.e);

    // Fly animation — cancelled by any key movement
    if (_fly) {
      if (moving) {
        _fly = null;
      } else {
        const t = Math.min((now - _fly.start) / (_fly.duration * 1000), 1);
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
        camera.position.lerpVectors(_fly.fromCam,    _fly.camPos, e);
        controls.target.lerpVectors(_fly.fromTarget, _fly.target, e);
        if (t >= 1) _fly = null;
        controls.update();
        return;
      }
    }
    if (moving) {
      // Horizontal forward = direction camera is looking, projected onto XZ plane
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      right.crossVectors(forward, camera.up).normalize();

      delta.set(0, 0, 0);
      if (keys.w) delta.addScaledVector(forward,  1);
      if (keys.s) delta.addScaledVector(forward, -1);
      if (keys.d) delta.addScaledVector(right,    1);
      if (keys.a) delta.addScaledVector(right,   -1);

      if (delta.lengthSq() > 0) delta.normalize();
      delta.multiplyScalar(MOVE_SPEED * dt);

      // Move camera and orbit target together so rotation stays consistent
      camera.position.add(delta);
      controls.target.add(delta);

      // Q/E vertical movement
      if (keys.q || keys.e) {
        const dy = (keys.q ? 1 : -1) * MOVE_SPEED * dt;
        camera.position.y  = THREE.MathUtils.clamp(camera.position.y  + dy, 0.3, 5.5);
        controls.target.y  = THREE.MathUtils.clamp(controls.target.y  + dy, 0.3, 5.5);
      }

      // Clamp inside room walls
      camera.position.x  = THREE.MathUtils.clamp(camera.position.x, -BOUND_X, BOUND_X);
      camera.position.z  = THREE.MathUtils.clamp(camera.position.z, -BOUND_Z, BOUND_Z);
      controls.target.x  = THREE.MathUtils.clamp(controls.target.x, -BOUND_X, BOUND_X);
      controls.target.z  = THREE.MathUtils.clamp(controls.target.z, -BOUND_Z, BOUND_Z);
    }

    controls.update();
  };

  return controls;
}
