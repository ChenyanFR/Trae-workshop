import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

// Room half-extents — overridden at runtime via setBounds() after GLB loads
let BOUND_X = 6.5;
let BOUND_Z = 5.5;
const EYE_Y = 1.7;

export function setBounds(x, z) { BOUND_X = x; BOUND_Z = z; }

const MOVE_SPEED = 4.0;   // metres per second

export function initControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);

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
  const keys = { w: false, a: false, s: false, d: false };

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k in keys) { keys[k] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
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

    const moving = keys.w || keys.a || keys.s || keys.d;
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

      // Lock Y to eye-level (no flying / crouching)
      camera.position.y  = EYE_Y;
      controls.target.y  = EYE_Y;

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
