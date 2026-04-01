import * as THREE from 'three';
import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const _draco = new DRACOLoader();
_draco.setDecoderPath('/draco/');
const _loader = new GLTFLoader();
_loader.setDRACOLoader(_draco);

/**
 * Hide the current gallery and load a GLB as the walkable environment.
 * @param {THREE.Scene}  scene
 * @param {THREE.Camera} camera
 * @param {object}       controls  — must expose .target and .setBounds(x,z)
 * @param {string}       glbPath   — URL of the GLB (e.g. '/testmodel.glb')
 * @param {object}       callbacks — { onStart, onProgress(0-1), onDone, onError }
 */
export function loadAsEnvironment(scene, camera, controls, glbPath, callbacks = {}) {
  const { onStart, onProgress, onDone, onError } = callbacks;

  // Snapshot existing gallery objects so we can hide them once the model loads
  const galleryObjects = [...scene.children];

  onStart?.();

  _loader.load(
    glbPath,
    (gltf) => {
      // ── Hide gallery ──────────────────────────────────────────────────────
      galleryObjects.forEach(obj => { obj.visible = false; });

      const model = gltf.scene;
      model.traverse(c => {
        if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
      });

      // ── Auto-scale to walkable size (~15 m on longest axis) ───────────────
      const box1 = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box1.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const TARGET = 15;
      if (maxDim > 0) model.scale.setScalar(TARGET / maxDim);

      // ── Centre at world origin, sit on y = 0 ──────────────────────────────
      const box2 = new THREE.Box3().setFromObject(model);
      const centre = new THREE.Vector3();
      box2.getCenter(centre);
      model.position.x -= centre.x;
      model.position.z -= centre.z;
      model.position.y -= box2.min.y;

      scene.add(model);

      // ── Place camera inside (floor level + eye height) ───────────────────
      const box3 = new THREE.Box3().setFromObject(model);
      const mid = new THREE.Vector3();
      box3.getCenter(mid);
      camera.position.set(mid.x, 1.7, mid.z - 2);
      controls.target.set(mid.x, 1.7, mid.z + 1);
      controls.update();

      // ── Expand movement bounds so the whole space is explorable ───────────
      const halfX = (box3.max.x - box3.min.x) / 2;
      const halfZ = (box3.max.z - box3.min.z) / 2;
      controls.setBounds(halfX, halfZ);

      // ── Remove gallery fog, add gentle environment ambient ────────────────
      scene.fog = null;
      const envAmbient = new THREE.AmbientLight(0xffffff, 2.5);
      scene.add(envAmbient);

      console.log('[Env] Model loaded. Size (scaled):', size.multiplyScalar(TARGET / maxDim));
      onDone?.();
    },
    (xhr) => {
      if (xhr.total) onProgress?.(xhr.loaded / xhr.total);
    },
    (err) => {
      console.error('[Env] Load error:', err);
      onError?.(err);
      onDone?.();
    }
  );
}
