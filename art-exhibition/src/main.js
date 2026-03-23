import * as THREE from 'three';
import { createRoom }     from './room.js';
import { createLighting } from './lighting.js';
import { createArtworks }      from './artwork.js';
import { createInstallations } from './installation.js';
import { initControls }        from './controls.js';
import { initUI }              from './ui.js';

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0806);
scene.fog = new THREE.FogExp2(0x0a0806, 0.04);

// ─── Camera ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  60,                                        // fov
  window.innerWidth / window.innerHeight,    // aspect
  0.1,                                       // near
  100                                        // far
);
// Start position: center of the room, eye-level, facing the main (red) wall
camera.position.set(0, 1.7, -4);
camera.lookAt(0, 1.7, 6);

// ─── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Shadow settings
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFShadowMap;

// Tone mapping for a cinematic look
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
renderer.outputColorSpace    = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);

// ─── Build scene ──────────────────────────────────────────────────────────────
createLighting(scene);
createRoom(scene);
const controls = initControls(camera, renderer);
createArtworks(scene, camera, renderer, controls);
createInstallations(scene, camera, renderer, controls);
initUI();

// ─── Resize handler ───────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render loop ──────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.tick(); // WASD movement + damping
  renderer.render(scene, camera);
}
animate();
