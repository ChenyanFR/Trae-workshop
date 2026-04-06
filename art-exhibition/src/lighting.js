import * as THREE from 'three';

// Room dimensions (must match room.js)
const W = 14;
const H = 6;
const D = 12;

function makeSpot(color, intensity, distance, angle, penumbra, decay) {
  const light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
  light.castShadow = true;
  light.shadow.mapSize.width  = 1024;
  light.shadow.mapSize.height = 1024;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far  = 20;
  light.shadow.bias = -0.001;
  return light;
}

export function createLighting(scene) {
  // ── Ambient — warm white fill ────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0xfff5e0, 1.2);
  scene.add(ambient);

  // ── Main wall (back / red) — 3 spotlights ────────────────────────────────
  const mainWallZ = D / 2;
  const spotHeight = H - 0.4;
  const spotDist   = 3.0;

  const mainWallXPositions = [-W / 3.5, 0, W / 3.5];
  for (const sx of mainWallXPositions) {
    const spot = makeSpot(0xfff8e7, 2.0, 12, Math.PI / 7, 0.45, 1.5);
    spot.position.set(sx, spotHeight, mainWallZ - spotDist);
    spot.target.position.set(sx, H / 2, mainWallZ);
    scene.add(spot);
    scene.add(spot.target);
  }

  // ── Left side wall — 1 spotlight ─────────────────────────────────────────
  const leftSpot = makeSpot(0xfff0d0, 1.5, 10, Math.PI / 6, 0.5, 1.5);
  leftSpot.position.set(-W / 2 + spotDist, spotHeight, 0);
  leftSpot.target.position.set(-W / 2, H / 2, 0);
  scene.add(leftSpot);
  scene.add(leftSpot.target);

  // ── Right side wall — 1 spotlight ────────────────────────────────────────
  const rightSpot = makeSpot(0xfff0d0, 1.5, 10, Math.PI / 6, 0.5, 1.5);
  rightSpot.position.set(W / 2 - spotDist, spotHeight, 0);
  rightSpot.target.position.set(W / 2, H / 2, 0);
  scene.add(rightSpot);
  scene.add(rightSpot.target);

  // ── Subtle hemisphere for colour grading ─────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffe8c0, 0x1a0d00, 0.3);
  scene.add(hemi);
}
