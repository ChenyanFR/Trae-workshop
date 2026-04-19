import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { setWallMaterialMap } from './room.js';
import { setWallMesh, addRaycastTarget, setHangingSlots } from './artwork.js';
import { setBounds }       from './controls.js';
import { createLighting }  from './lighting.js';
import { createArtworks, tickVideoArtworks, getArtworks, isInteracting, tickEditMode } from './artwork.js';
import { initHoverPreview, tickHoverPreview } from './artworkInfo.js';
import { createInstallations } from './installation.js';
import { initControls }    from './controls.js';
import { initUI }          from './ui.js';
import { setFloorMesh, initFloorUI } from './floor.js';
import { initModeUI } from './userMode.js';

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0806);
scene.fog = new THREE.FogExp2(0x0a0806, 0.015);

// ─── Camera ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 300
);
camera.position.set(0, 1.7, -4);
camera.lookAt(0, 1.7, 6);

// ─── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.outputColorSpace    = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ─── Environment map (fixes black metallic materials) ─────────────────────────
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

// ─── Base lighting + controls (synchronous — work during loading too) ─────────
scene.add(new THREE.AmbientLight(0xfff5e0, 0.3));
const controls = initControls(camera, renderer);

// ─── Render loop starts immediately (loading screen covers canvas) ────────────
function animate() {
  requestAnimationFrame(animate);
  controls.tick();
  tickVideoArtworks(camera);
  tickHoverPreview(camera, renderer, getArtworks(), isInteracting());
  tickEditMode();
  renderer.render(scene, camera);
}
animate();

// ─── Loading screen helpers ───────────────────────────────────────────────────
const ldScreen = document.getElementById('loading-screen');
const ldBar    = document.getElementById('ld-bar');
const ldPct    = document.getElementById('ld-pct');

function setProgress(p) {
  if (ldBar) ldBar.style.width = Math.round(p * 100) + '%';
  if (ldPct) ldPct.textContent = Math.round(p * 100) + '%';
}
function hideLoadingScreen() {
  if (ldScreen) ldScreen.remove();
}

// ─── Load GLB ─────────────────────────────────────────────────────────────────
const draco = new DRACOLoader();
draco.setDecoderPath('/draco/');
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

loader.load(
  '/Gallery Test.glb',

  // ── Success ──────────────────────────────────────────────────────────────────
  (gltf) => {
    const model = gltf.scene;

    // Enable shadows on every mesh
    model.traverse(c => {
      if (c.isMesh) {
        c.castShadow    = true;
        c.receiveShadow = true;
        // Ensure Raycaster works on every mesh
        c.raycast = THREE.Mesh.prototype.raycast;
        // Fix flipped normals: force double-sided rendering
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(m => { m.side = THREE.DoubleSide; });
      }
    });

    scene.add(model);

    // ── 处理 Artpiece meshes：隐藏并收集位置作为预设挂画点 ────────────────────
    // 确保 matrixWorld 已计算（在 render 之前手动触发）
    model.updateWorldMatrix(true, true);

    const hangingSlots = [];
    gltf.scene.traverse((child) => {
      if (!child.isMesh || !child.name.startsWith('Artpiece')) return;

      // 所有 Artpiece mesh 都不参与 raycasting（让射线穿透打到后面的墙）
      child.raycast = () => {};

      // 画作占位面（灰色 _Artwork_0 和白色 __0）→ 隐藏 + 记录位置
      if (/_Artwork_0$/.test(child.name) || /__0$/.test(child.name)) {
        const pos = new THREE.Vector3();
        child.getWorldPosition(pos);
        hangingSlots.push(pos);
        child.visible = false;
      } else {
        // 木框等其余部分也隐藏（用户的画框会替代它）
        child.visible = false;
      }
    });

    setHangingSlots(hangingSlots);
    console.log(`[Main] ${hangingSlots.length} 个预设挂画点已注册`);

    // ── Register wall materials for colour panel ──────────────────────────────
    const WALL_NAMES = [
      'Exhibition_Wall_01', 'Exhibition_Wall_02',
      'Exhibition_Wall_03', 'Exhibition_Wall_04',
      'Exhibition_End_Wall_01', 'Exhibition_End_Wall_02',
    ];
    const wallMaterialMap = {};
    const wallMeshes = [];
    gltf.scene.traverse(child => {
      if (!child.isMesh || !WALL_NAMES.includes(child.name)) return;
      // Clone materials so each wall is independent
      const cloned = Array.isArray(child.material)
        ? child.material.map(m => m.clone())
        : [child.material.clone()];
      child.material = Array.isArray(child.material) ? cloned : cloned[0];
      wallMaterialMap[child.name] = cloned;
      wallMeshes.push(child);
    });
    setWallMaterialMap(wallMaterialMap);
    // Register all wall meshes as raycast targets so paintings can hang on any wall
    if (wallMeshes.length > 0) {
      setWallMesh(wallMeshes[0]);
      wallMeshes.slice(1).forEach(m => addRaycastTarget(m));
    }

    // ── 独立展板（不靠墙）加入 raycaster，设为双面 ──────────────────────────
    // 名字含 'Foating' 的是中间的独立浮动展板
    gltf.scene.traverse((child) => {
      if (!child.isMesh || !child.name.includes('Foating')) return;
      // 恢复 raycasting（之前没有被禁用，但确保一下）
      child.raycast = THREE.Mesh.prototype.raycast;
      // 双面材质，防止法线方向导致射线从背面打不中
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => { m.side = THREE.DoubleSide; });
      addRaycastTarget(child);
      console.log('[Main] 独立展板已加入 raycaster:', child.name);
    });

    // ── Register floor mesh for material switching ────────────────────────────
    const floorObj = gltf.scene.getObjectByName('Floor');
    if (floorObj) {
      floorObj.material = Array.isArray(floorObj.material)
        ? floorObj.material.map(m => m.clone()) : floorObj.material.clone();
      setFloorMesh(floorObj);
    }

    // ── Derive walkable bounds from floor mesh ────────────────────────────────
    const floorMesh = floorObj || gltf.scene.getObjectByName('Art_Gallery_Floor_0');
    if (floorMesh) {
      floorMesh.geometry.computeBoundingBox();
      const bb = floorMesh.geometry.boundingBox;
      const wMin = bb.min.clone().applyMatrix4(floorMesh.matrixWorld);
      const wMax = bb.max.clone().applyMatrix4(floorMesh.matrixWorld);
      const hx = Math.abs(wMax.x - wMin.x) / 2 - 0.5;
      const hz = Math.abs(wMax.z - wMin.z) / 2 - 0.5;
      setBounds(Math.max(hx, 1), Math.max(hz, 1));

      // Place camera near the centre of the floor, just inside one end
      const cx = (wMin.x + wMax.x) / 2;
      const cz = (wMin.z + wMax.z) / 2;
      camera.position.set(cx, 1.7, cz - Math.max(hz * 0.6, 2));
      controls.target.set(cx, 1.7, cz);
      controls.update();
    }

    // ── Room lighting ─────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xfff5e0, 0x303030, 0.4));

    // ── Initialise interactive systems ────────────────────────────────────────
    // createLighting(scene); // disabled: old room coords don't match new GLB
    createArtworks(scene, camera, renderer, controls);
    initHoverPreview(renderer.domElement);
    createInstallations(scene, camera, renderer, controls);
    initUI();
    initFloorUI();
    initModeUI();

    hideLoadingScreen();
  },

  // ── Progress ──────────────────────────────────────────────────────────────────
  (xhr) => {
    if (xhr.total) setProgress(xhr.loaded / xhr.total);
  },

  // ── Error ──────────────────────────────────────────────────────────────────────
  (err) => {
    console.error('[Main] GLB load failed:', err);
    if (ldPct) ldPct.textContent = 'Load failed — see console';
  }
);

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
