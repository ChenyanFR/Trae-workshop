import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { setWallMaterial } from './room.js';
import { setWallMesh, addRaycastTarget, setHangingSlots } from './artwork.js';
import { setBounds }       from './controls.js';
import { createLighting }  from './lighting.js';
import { createArtworks }  from './artwork.js';
import { createInstallations } from './installation.js';
import { initControls }    from './controls.js';
import { initUI }          from './ui.js';

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
renderer.toneMappingExposure = 1.4;
renderer.outputColorSpace    = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ─── Base lighting + controls (synchronous — work during loading too) ─────────
scene.add(new THREE.AmbientLight(0xfff5e0, 1.2));
const controls = initControls(camera, renderer);

// ─── Render loop starts immediately (loading screen covers canvas) ────────────
function animate() {
  requestAnimationFrame(animate);
  controls.tick();
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
  '/gallery.glb',

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

    // ── Register the wall mesh for colour panel + artwork raycasting ──────────
    const wallMesh = gltf.scene.getObjectByName('Art_Gallery_Walls_0');
    if (wallMesh) {
      // Wall colour panel
      const mats = Array.isArray(wallMesh.material)
        ? wallMesh.material : [wallMesh.material];
      setWallMaterial(mats);

      // Artwork hanging raycaster
      setWallMesh(wallMesh);
    } else {
      console.warn('[Main] Art_Gallery_Walls_0 not found — artwork hanging uses fallback planes');
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

    // ── Derive walkable bounds from floor mesh ────────────────────────────────
    const floorMesh = gltf.scene.getObjectByName('Art_Gallery_Floor_0');
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
    scene.add(new THREE.HemisphereLight(0xfff5e0, 0x303030, 1.2));

    // ── Initialise interactive systems ────────────────────────────────────────
    createLighting(scene);
    createArtworks(scene, camera, renderer, controls);
    createInstallations(scene, camera, renderer, controls);
    initUI();

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
