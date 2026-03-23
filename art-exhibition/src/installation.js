import * as THREE from 'three';

// ─── Categories ───────────────────────────────────────────────────────────────
const CATS = [
  { id: 'sculpture', label: '🗿 Sculpture' },
  { id: 'sketching', label: '✏️ Sketching' },
  { id: 'plants',    label: '🌿 Plants'    },
  { id: 'lights',    label: '💡 Lights'    },
  { id: 'custom',    label: '📦 Custom'    },
];

// ─── Geometry / material helpers ─────────────────────────────────────────────
const mk = (geo, mat, x=0, y=0, z=0, rx=0, ry=0, rz=0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
  m.castShadow = true; m.receiveShadow = true;
  return m;
};
const mat  = (c, r=0.7, m=0.0, s=THREE.FrontSide) =>
  new THREE.MeshStandardMaterial({ color:c, roughness:r, metalness:m, side:s });
const matD = (c, r=0.7, m=0.0) => mat(c, r, m, THREE.DoubleSide);
const box  = (w,h,d) => new THREE.BoxGeometry(w,h,d);
const cyl  = (rt,rb,h,s=24) => new THREE.CylinderGeometry(rt,rb,h,s);
const sph  = (r,ws=24,hs=18) => new THREE.SphereGeometry(r,ws,hs);
const pot  = (topR, botR, h, color=0xB05A30) => {
  const g = new THREE.Group();
  const m = mat(color, 0.8);
  g.add(mk(cyl(topR, botR, h, 32), m, 0, h/2, 0));           // body
  g.add(mk(cyl(topR+0.01, topR+0.01, 0.04, 32), mat(0x7a3a18, 0.8), 0, h+0.02, 0)); // rim
  g.add(mk(cyl(botR*0.6, botR*0.6, 0.04, 24), mat(0x7a3a18, 0.8), 0, 0.02, 0));     // base
  return g;
};

// ─── Build functions ──────────────────────────────────────────────────────────

function buildMarbleSphere() {
  const g = new THREE.Group();
  const pedMat = mat(0xD0C8B8, 0.55);
  g.add(mk(cyl(0.28, 0.34, 0.12, 8), pedMat, 0, 0.06, 0));
  g.add(mk(cyl(0.22, 0.28, 0.18, 8), pedMat, 0, 0.21, 0));
  g.add(mk(sph(0.38, 40, 30), mat(0xF8F4F0, 0.06, 0.02), 0, 0.75, 0));
  g.userData.totalHeight = 1.15;
  return g;
}

function buildAbstractTotem() {
  const g = new THREE.Group();
  const m1 = mat(0x1c1410, 0.25, 0.75);
  const m2 = mat(0x2a2018, 0.35, 0.65);
  // Plinth
  g.add(mk(box(0.4,0.1,0.4), mat(0x302820,0.5), 0, 0.05, 0));
  // Stacked rotated blocks
  [
    [0.34, 0.28, 0.34, 0.18,  0.0,  m1],
    [0.28, 0.32, 0.28, 0.58,  0.5,  m2],
    [0.24, 0.30, 0.24, 0.98, -0.35, m1],
    [0.20, 0.28, 0.20, 1.36,  0.8,  m2],
    [0.15, 0.22, 0.15, 1.70,  0.2,  m1],
  ].forEach(([w,h,d,y,ry,m]) => g.add(mk(box(w,h,d), m, 0, y, 0, 0, ry, 0)));
  g.userData.totalHeight = 1.85;
  return g;
}

function buildClassicalUrn() {
  const g = new THREE.Group();
  const stone = mat(0xDED4C0, 0.65);
  g.add(mk(cyl(0.22, 0.26, 0.25, 32), stone, 0, 0.125, 0)); // pedestal
  g.add(mk(cyl(0.16, 0.22, 0.12, 32), stone, 0, 0.31, 0));  // neck-in
  g.add(mk(cyl(0.28, 0.16, 0.38, 32), stone, 0, 0.63, 0));  // body
  g.add(mk(cyl(0.14, 0.28, 0.16, 32), stone, 0, 0.90, 0));  // shoulder
  g.add(mk(cyl(0.12, 0.14, 0.22, 32), stone, 0, 1.07, 0));  // neck
  g.add(mk(cyl(0.20, 0.12, 0.09, 32), stone, 0, 1.225, 0)); // lip
  // Handles (torus arcs approximate)
  [-1,1].forEach(side => {
    const h = mk(new THREE.TorusGeometry(0.12, 0.025, 8, 14, Math.PI), mat(0xC8BEA8,0.7), side*0.26, 0.72, 0, Math.PI/2, 0, side*Math.PI/2);
    g.add(h);
  });
  g.userData.totalHeight = 1.3;
  return g;
}

function buildSpiralForm() {
  const g = new THREE.Group();
  const pedMat = mat(0x2a1c10, 0.45, 0.55);
  g.add(mk(cyl(0.2, 0.24, 0.12, 32), pedMat, 0, 0.06, 0));
  g.add(mk(cyl(0.14, 0.2, 0.1, 32),  pedMat, 0, 0.17, 0));
  const knot = mk(new THREE.TorusKnotGeometry(0.28, 0.07, 128, 16, 2, 3), mat(0x8C6A2A, 0.2, 0.85), 0, 0.65, 0);
  g.add(knot);
  g.userData.totalHeight = 1.0;
  return g;
}

function buildEasel() {
  const g = new THREE.Group();
  const wood = mat(0x7a4a20, 0.85);
  // Three legs (A-frame)
  [[-0.22, 0, 0.12], [0.22, 0, 0.12], [0, 0, -0.18]].forEach(([x,,z], i) => {
    const leg = mk(box(0.04, 1.5, 0.04), wood, x, 0.75, z, i===2?-0.12:0, 0, i<2?(x>0?-0.06:0.06):0);
    g.add(leg);
  });
  // Canvas ledge
  g.add(mk(box(0.52, 0.04, 0.06), wood, 0, 0.55, 0.05));
  // Top crossbar
  g.add(mk(box(0.52, 0.04, 0.04), wood, 0, 1.35, 0.04));
  // Canvas
  const canvas = mk(new THREE.PlaneGeometry(0.5, 0.65), mat(0xFFFBF5, 0.9), 0, 0.9, 0.07);
  canvas.receiveShadow = true;
  g.add(canvas);
  // Stool
  g.add(mk(box(0.35, 0.04, 0.28), wood, 0.7, 0.42, 0.1));
  [[-0.14,0.12],[-0.14,-0.1],[0.14,0.12],[0.14,-0.1]].forEach(([lx,lz]) =>
    g.add(mk(box(0.03,0.42,0.03), wood, 0.7+lx, 0.21, 0.1+lz)));
  // Sketchbook on stool
  g.add(mk(box(0.25, 0.02, 0.18), mat(0xF0E8D8, 0.9), 0.7, 0.45, 0.1));
  g.userData.totalHeight = 1.4;
  return g;
}

function buildStudyTable() {
  const g = new THREE.Group();
  const wood = mat(0x6a4020, 0.8);
  // Table top
  g.add(mk(box(1.1, 0.05, 0.65), mat(0x9a6030, 0.7), 0, 0.745, 0));
  // Legs
  [[-0.5,0.28],[-0.5,-0.28],[0.5,0.28],[0.5,-0.28]].forEach(([lx,lz]) =>
    g.add(mk(box(0.06,0.74,0.06), wood, lx, 0.37, lz)));
  // Items on table
  g.add(mk(box(0.3, 0.01, 0.4), mat(0xFAF6EE, 0.95), -0.2, 0.775, 0));  // paper
  g.add(mk(box(0.015,0.18,0.015), mat(0x202020,0.9), 0.15, 0.865, 0.1)); // pencil
  // Chair
  g.add(mk(box(0.44, 0.04, 0.42), wood, 0, 0.45, -0.62));
  [[-0.19,-0.19],[0.19,-0.19],[-0.19,0.17],[0.19,0.17]].forEach(([cx,cz]) =>
    g.add(mk(box(0.05,0.45,0.05), wood, cx, 0.225, -0.62+cz)));
  // Chair back
  g.add(mk(box(0.44,0.36,0.04), wood, 0, 0.69, -0.62+0.19));
  g.userData.totalHeight = 0.75;
  return g;
}

function buildFiddleLeaf() {
  const g = new THREE.Group();
  const p = pot(0.2, 0.16, 0.3); p.position.y = 0; g.add(p);
  g.add(mk(cyl(0.035, 0.05, 1.1, 10), mat(0x4a2e10, 0.9), 0, 0.7, 0));
  // Leaves
  const leafMat = matD(0x2d5a2a, 0.85);
  for (let i=0; i<9; i++) {
    const a = (i/9)*Math.PI*2, r=0.05+Math.random()*0.12, h=1.1+Math.random()*0.55;
    const lf = mk(new THREE.PlaneGeometry(0.28+Math.random()*0.18, 0.38+Math.random()*0.2), leafMat,
      Math.cos(a)*r, h, Math.sin(a)*r, -0.3+Math.random()*0.3, a, 0);
    g.add(lf);
  }
  g.userData.totalHeight = 1.65;
  return g;
}

function buildSnakePlant() {
  const g = new THREE.Group();
  const p = pot(0.16, 0.12, 0.22); p.position.y = 0; g.add(p);
  const colors = [0x2a5a28, 0x3a7030, 0x1e4020];
  for (let i=0; i<7; i++) {
    const a=(i/7)*Math.PI*2+0.2, r=0.05+Math.random()*0.06;
    const h=0.45+Math.random()*0.45, lean=0.08+Math.random()*0.06;
    const lf = mk(box(0.07, h, 0.018), mat(colors[i%3], 0.8),
      Math.cos(a)*r, 0.22+h/2, Math.sin(a)*r, Math.cos(a)*lean, a, Math.sin(a)*lean);
    g.add(lf);
  }
  g.userData.totalHeight = 0.95;
  return g;
}

function buildOliveTree() {
  const g = new THREE.Group();
  const p = pot(0.26, 0.22, 0.38); p.position.y = 0; g.add(p);
  // Trunk segments (slight bends)
  const trunkMat = mat(0x5a4828, 0.9);
  [[0,0.6,0,0,0], [0.04,0.95,0.02,0.08,0.1], [0,1.25,-0.03,-0.06,0.2]].forEach(([x,y,z,rx,rz]) =>
    g.add(mk(cyl(0.04,0.06,0.45,12), trunkMat, x, y, z, rx, 0, rz)));
  // Branches + foliage
  const foliageMat = mat(0x6a7848, 0.9);
  [[0,1.55,0,0.38],[0.28,1.4,0.1,0.25],[-0.22,1.45,-0.1,0.28],[0.1,1.65,-0.18,0.22],[-0.08,1.5,0.22,0.24]].forEach(([x,y,z,r]) =>
    g.add(mk(sph(r, 14, 10), foliageMat, x, y, z)));
  g.userData.totalHeight = 1.85;
  return g;
}

function buildSucculent() {
  const g = new THREE.Group();
  const p = pot(0.22, 0.17, 0.12, 0xC06830); p.position.y = 0; g.add(p);
  // Soil
  g.add(mk(cyl(0.2, 0.2, 0.02, 24), mat(0x3a2810, 0.95), 0, 0.13, 0));
  // Succulents
  const cols = [0x4a7a38, 0x6a8a48, 0x88aa58, 0x3a6a2a];
  [[0,0],[0.12,0.08],[-0.1,0.06],[0.05,-0.1],[-0.07,-0.08],[0.13,-0.05]].forEach(([sx,sz],i) => {
    const r=0.06+Math.random()*0.04;
    // Rosette: stacked squashed spheres
    for (let l=0; l<4; l++) {
      const lr = r*(1-l*0.18), ly=0.13+l*0.045;
      g.add(mk(sph(lr,10,8), mat(cols[i%cols.length],0.85), sx, ly, sz));
    }
  });
  g.userData.totalHeight = 0.35;
  return g;
}

function buildFloorSpot() {
  const g = new THREE.Group();
  const metal = mat(0x202020, 0.3, 0.8);
  // Base
  g.add(mk(cyl(0.18, 0.22, 0.06, 32), mat(0x181818,0.4,0.7), 0, 0.03, 0));
  // Pole
  g.add(mk(cyl(0.025,0.03,1.2,16), metal, 0, 0.66, 0));
  // Head (cone + disk)
  const head = new THREE.Group();
  head.add(mk(cyl(0.12, 0.06, 0.22, 24), metal, 0, 0.11, 0));
  head.add(mk(cyl(0.115, 0.115, 0.01, 24), mat(0xfff8e0,0.3,0.1), 0, 0.225, 0));
  head.position.set(0, 1.3, 0);
  head.rotation.z = 0.5; // angled
  g.add(head);
  // Actual light
  const light = new THREE.PointLight(0xfff5d0, 1.8, 5, 1.5);
  light.position.set(0.12, 1.3, 0);
  light.castShadow = false; // perf
  g.add(light);
  g.userData.totalHeight = 1.5;
  g.userData.lightSource = light;
  g.userData.isLight = true;
  g.userData.lightColor = '#fff5d0';
  g.userData.lightIntensity = 1.8;
  return g;
}

function buildFloorLamp() {
  const g = new THREE.Group();
  const brass = mat(0xB8902A, 0.3, 0.75);
  const dark  = mat(0x1a1008, 0.6, 0.5);
  // Decorative base
  g.add(mk(cyl(0.2,0.24,0.08,32), dark, 0, 0.04, 0));
  g.add(mk(cyl(0.08,0.2,0.1,32),  brass, 0, 0.13, 0));
  g.add(mk(sph(0.08,16,12), brass, 0, 0.24, 0));
  // Pole
  g.add(mk(cyl(0.022,0.025,1.2,16), brass, 0, 0.84, 0));
  // Shade (open cone — double-sided)
  g.add(mk(cyl(0.28, 0.12, 0.32, 32), matD(0xD4B86A, 0.7), 0, 1.6, 0));
  // Inner shade (lighter to simulate glow)
  g.add(mk(cyl(0.27, 0.11, 0.31, 32), matD(0xFFF8E0, 0.85), 0, 1.6, 0));
  // Finial
  g.add(mk(sph(0.04,12,8), brass, 0, 1.78, 0));
  // Actual light
  const light = new THREE.PointLight(0xffe8a0, 2.2, 6, 1.2);
  light.position.set(0, 1.5, 0);
  light.castShadow = false;
  g.add(light);
  g.userData.totalHeight = 1.8;
  g.userData.lightSource = light;
  g.userData.isLight = true;
  g.userData.lightColor = '#ffe8a0';
  g.userData.lightIntensity = 2.2;
  return g;
}

function buildCustomBox() {
  const g = new THREE.Group();
  const m = mat(0xE07830, 0.7);
  g.add(mk(box(0.5, 0.5, 0.5), m, 0, 0.25, 0));
  g.userData.totalHeight = 0.5;
  g.userData.isCustom = true;
  g.userData.customMat = m;
  return g;
}

// ─── Item catalog ─────────────────────────────────────────────────────────────
const ITEMS = [
  { id:'marble-sphere', cat:'sculpture', name:'Marble Sphere',      desc:'Polished Carrara marble',      icon:'⚪', build:buildMarbleSphere  },
  { id:'totem',         cat:'sculpture', name:'Abstract Totem',     desc:'Stacked geometric forms',       icon:'🔲', build:buildAbstractTotem },
  { id:'urn',           cat:'sculpture', name:'Classical Urn',      desc:'Neoclassical stone urn',        icon:'🏺', build:buildClassicalUrn  },
  { id:'spiral',        cat:'sculpture', name:'Spiral Form',        desc:'Bronze torus-knot sculpture',   icon:'🌀', build:buildSpiralForm    },
  { id:'easel',         cat:'sketching', name:"Artist's Easel",     desc:'Canvas, stool & sketchbook',    icon:'🖌', build:buildEasel         },
  { id:'study-table',   cat:'sketching', name:'Study Table',        desc:'Drawing table with chair',      icon:'📐', build:buildStudyTable    },
  { id:'fiddle-leaf',   cat:'plants',   name:'Fiddle Leaf Fig',     desc:'Tall statement plant',           icon:'🌿', build:buildFiddleLeaf    },
  { id:'snake-plant',   cat:'plants',   name:'Snake Plant',         desc:'Architectural upright leaves',  icon:'🌱', build:buildSnakePlant    },
  { id:'olive-tree',    cat:'plants',   name:'Olive Tree',          desc:'Mediterranean elegance',         icon:'🌳', build:buildOliveTree     },
  { id:'succulent',     cat:'plants',   name:'Succulent Cluster',   desc:'Low terracotta arrangement',    icon:'🪴', build:buildSucculent     },
  { id:'floor-spot',    cat:'lights',   name:'Floor Spotlight',     desc:'Adjustable cone light',         icon:'💡', build:buildFloorSpot     },
  { id:'floor-lamp',    cat:'lights',   name:'Vintage Floor Lamp',  desc:'Warm ambient glow',             icon:'🪔', build:buildFloorLamp     },
  { id:'custom-box',    cat:'custom',   name:'Custom Block',        desc:'Resize, recolor freely',        icon:'📦', build:buildCustomBox     },
];

// ─── Rotation handle ──────────────────────────────────────────────────────────
const handleMat = new THREE.MeshStandardMaterial({
  color:0xffd060, metalness:0.75, roughness:0.2,
  emissive:new THREE.Color(0x554400), emissiveIntensity:0.4,
});
const handleGeo = new THREE.SphereGeometry(0.07, 16, 12);

function addHandle(group) {
  if (group.userData.rotHandle) return;
  const h = new THREE.Mesh(handleGeo, handleMat);
  h.userData.isInstallHandle = true;
  h.position.set(0, (group.userData.totalHeight ?? 1) + 0.15, 0);
  group.add(h); group.userData.rotHandle = h;
}
function removeHandle(group) {
  if (!group.userData.rotHandle) return;
  group.remove(group.userData.rotHandle); group.userData.rotHandle = null;
}

// ─── Highlight ────────────────────────────────────────────────────────────────
function highlight(group, on) {
  group.traverse(c => {
    if (c.isMesh && c.material && !c.userData.isInstallHandle) {
      c.material.emissive    = c.material.emissive || new THREE.Color();
      c.material.emissiveIntensity = on ? 0.2 : 0;
      c.material.emissive.setHex(on ? 0x664422 : 0x000000);
    }
  });
}

// ─── State ────────────────────────────────────────────────────────────────────
let _scene, _camera, _renderer, _controls;
let installMode    = false;
let placingGroup   = null;
let selectedGroup  = null;
let installations  = [];
let selectedItem   = null;  // item def
let isDragging     = false;
let isRotating     = false;
let prevMouseX     = 0;
let currentScale   = 1.0;
const MIN_SCALE    = 0.3, MAX_SCALE = 3.0;

const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
const _hitPt     = new THREE.Vector3();

// ─── UI refs ──────────────────────────────────────────────────────────────────
let panel, selBar, lightPanel, hintBar, crosshair;
let activeCat = 'sculpture';

// ─── Placement helpers ────────────────────────────────────────────────────────
function getNDC(e) {
  const r = _renderer.domElement.getBoundingClientRect();
  mouse.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  mouse.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
}

function castFloor() {
  raycaster.setFromCamera(mouse, _camera);
  if (raycaster.ray.intersectPlane(floorPlane, _hitPt)) {
    if (_hitPt.x > -6.5 && _hitPt.x < 6.5 && _hitPt.z > -5.5 && _hitPt.z < 5.5)
      return _hitPt.clone();
  }
  return null;
}

function enterInstallMode(item) {
  selectedItem  = item;
  installMode   = true;
  currentScale  = 1.0;
  placingGroup  = item.build();
  placingGroup.userData.itemId = item.id;
  placingGroup.userData.itemCat = item.cat;
  placingGroup.visible = false;
  _scene.add(placingGroup);

  crosshair.style.display = 'block';
  hintBar.style.display   = 'block';
  hintBar.textContent     = `Placing: ${item.name}  |  Click floor to place  |  Scroll to resize  |  ESC cancel`;
  _controls.enabled = false;
  panel.style.display = 'none';
}

function exitInstallMode() {
  installMode = false;
  if (placingGroup) { _scene.remove(placingGroup); placingGroup = null; }
  crosshair.style.display = 'none';
  hintBar.style.display   = 'none';
  _controls.enabled = true;
}

// ─── Selection ────────────────────────────────────────────────────────────────
function selectInstall(group) {
  if (selectedGroup && selectedGroup !== group) {
    highlight(selectedGroup, false); removeHandle(selectedGroup);
  }
  selectedGroup = group;
  highlight(group, true); addHandle(group);
  updateSelBar();
  if (group.userData.isLight) showLightPanel(group);
  else hideLightPanel();
}

function deselectInstall() {
  if (selectedGroup) { highlight(selectedGroup, false); removeHandle(selectedGroup); }
  selectedGroup = null;
  if (selBar) selBar.style.display = 'none';
  hideLightPanel();
}

function deleteInstall() {
  if (!selectedGroup) return;
  removeHandle(selectedGroup);
  _scene.remove(selectedGroup);
  installations = installations.filter(a => a !== selectedGroup);
  selectedGroup = null;
  if (selBar) selBar.style.display = 'none';
  hideLightPanel();
}

function scaleInstall(group, factor) {
  const s = THREE.MathUtils.clamp((group.userData.currentScale ?? 1) * factor, MIN_SCALE, MAX_SCALE);
  group.scale.setScalar(s);
  group.userData.currentScale = s;
  updateSelBar();
}

// ─── Event handlers ───────────────────────────────────────────────────────────
function onMouseMove(e) {
  // Rotate selected via handle drag (Y axis, mouse X movement)
  if (isRotating && selectedGroup) {
    const dx = e.clientX - prevMouseX;
    selectedGroup.rotation.y -= dx * 0.008;
    prevMouseX = e.clientX;
    return;
  }

  if (!installMode) {
    // Drag placed installation on floor
    if (isDragging && selectedGroup) {
      getNDC(e);
      const hit = castFloor();
      if (hit) { selectedGroup.position.x = hit.x; selectedGroup.position.z = hit.z; }
    }
    return;
  }

  getNDC(e);
  if (placingGroup) {
    const hit = castFloor();
    if (hit) { placingGroup.position.copy(hit); placingGroup.visible = true; }
    else     { placingGroup.visible = false; }
  }
}

function onMouseDown(e) {
  if (e.button !== 0) return;
  getNDC(e);
  raycaster.setFromCamera(mouse, _camera);

  if (installMode) {
    e.preventDefault();
    if (placingGroup) {
      const hit = castFloor();
      if (hit) {
        placingGroup.position.copy(hit);
        placingGroup.visible = true;
        placingGroup.userData.currentScale = currentScale;
        installations.push(placingGroup);
        placingGroup = null;
        exitInstallMode();
      }
    }
    return;
  }

  // Check rotation handle first
  const handles = installations.filter(a=>a.userData.rotHandle).map(a=>a.userData.rotHandle);
  const hHits = raycaster.intersectObjects(handles);
  if (hHits.length) {
    const parent = installations.find(a=>a.userData.rotHandle===hHits[0].object);
    if (parent) {
      selectInstall(parent); isRotating = true; prevMouseX = e.clientX;
      e.preventDefault(); return;
    }
  }

  // Click on installation mesh
  const allMeshes = [];
  installations.forEach(a => a.traverse(c => { if (c.isMesh && !c.userData.isInstallHandle) allMeshes.push(c); }));
  const hits = raycaster.intersectObjects(allMeshes);
  if (hits.length) {
    const parent = installations.find(a => { let found=false; a.traverse(c=>{if(c===hits[0].object)found=true;}); return found; });
    if (parent) { selectInstall(parent); isDragging = true; return; }
  }
  deselectInstall();
}

function onMouseUp() { isDragging = false; isRotating = false; }

function onWheel(e) {
  if (installMode && placingGroup) {
    e.preventDefault();
    currentScale = THREE.MathUtils.clamp(currentScale + (e.deltaY > 0 ? -0.05 : 0.05), MIN_SCALE, MAX_SCALE);
    placingGroup.scale.setScalar(currentScale);
    return;
  }
  if (!installMode && selectedGroup) {
    e.preventDefault();
    scaleInstall(selectedGroup, e.deltaY > 0 ? 0.92 : 1.08);
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (installMode) exitInstallMode();
    else deselectInstall();
    return;
  }
  if (e.key === 'r' || e.key === 'R') {
    const t = placingGroup || selectedGroup;
    if (t) t.rotation.y += Math.PI / 2;
  }
  if (e.key === 'Delete') deleteInstall();
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function buildUI() {
  // Toggle button
  const btn = document.createElement('button');
  btn.textContent = '🗿 Objects';
  Object.assign(btn.style, {
    position:'fixed', top:'62px', left:'16px',
    padding:'10px 16px', background:'rgba(20,12,4,0.82)',
    color:'#f0e6d0', border:'1px solid #8a6a3a',
    borderRadius:'6px', cursor:'pointer', fontSize:'14px',
    fontFamily:'serif', letterSpacing:'0.04em', zIndex:100,
    backdropFilter:'blur(4px)',
  });
  btn.addEventListener('mouseenter', ()=>btn.style.background='rgba(90,50,10,0.9)');
  btn.addEventListener('mouseleave', ()=>btn.style.background='rgba(20,12,4,0.82)');
  document.body.appendChild(btn);

  // Panel
  panel = document.createElement('div');
  Object.assign(panel.style, {
    position:'fixed', top:'108px', left:'16px',
    background:'rgba(12,7,3,0.94)', border:'1px solid #6a4a20',
    borderRadius:'10px', padding:'18px 18px',
    color:'#f0e0c0', fontFamily:'serif', zIndex:200,
    display:'none', width:'310px',
    backdropFilter:'blur(10px)',
    boxShadow:'0 8px 32px rgba(0,0,0,0.7)',
    maxHeight:'70vh', overflowY:'auto',
  });
  document.body.appendChild(panel);

  btn.addEventListener('click', () => {
    panel.style.display = panel.style.display==='none' ? 'block' : 'none';
  });

  // Title
  const title = document.createElement('div');
  title.textContent = 'Gallery Objects';
  Object.assign(title.style, {
    fontSize:'15px', letterSpacing:'0.1em', textAlign:'center',
    marginBottom:'14px', borderBottom:'1px solid #3a2510', paddingBottom:'10px',
  });
  panel.appendChild(title);

  // Category tabs
  const tabRow = document.createElement('div');
  Object.assign(tabRow.style, { display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'14px' });
  const tabBtns = {};
  CATS.forEach(cat => {
    const tb = document.createElement('button');
    tb.textContent = cat.label;
    Object.assign(tb.style, {
      padding:'5px 9px', fontSize:'11px', fontFamily:'serif',
      border:'1px solid #5a3a10', borderRadius:'4px', cursor:'pointer',
      color:'#f0e0c0', background:'rgba(255,255,255,0.05)', whiteSpace:'nowrap',
    });
    tb.addEventListener('click', () => {
      activeCat = cat.id;
      Object.values(tabBtns).forEach(b => {
        b.style.background = 'rgba(255,255,255,0.05)'; b.style.borderColor = '#5a3a10';
      });
      tb.style.background = 'rgba(200,144,58,0.35)'; tb.style.borderColor = '#c8903a';
      renderGrid();
    });
    if (cat.id === activeCat) { tb.style.background='rgba(200,144,58,0.35)'; tb.style.borderColor='#c8903a'; }
    tabBtns[cat.id] = tb;
    tabRow.appendChild(tb);
  });
  panel.appendChild(tabRow);

  // Item grid container
  const gridWrap = document.createElement('div');
  gridWrap.id = 'install-grid';
  panel.appendChild(gridWrap);

  function renderGrid() {
    gridWrap.innerHTML = '';
    const items = ITEMS.filter(it => it.cat === activeCat);
    const grid = document.createElement('div');
    Object.assign(grid.style, { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' });
    items.forEach(item => {
      const card = document.createElement('div');
      Object.assign(card.style, {
        background:'rgba(255,255,255,0.04)', border:'1px solid #3a2510',
        borderRadius:'7px', padding:'10px 10px 8px',
        cursor:'pointer', transition:'border-color 0.12s, background 0.12s',
      });
      card.innerHTML = `
        <div style="font-size:24px;text-align:center;margin-bottom:6px">${item.icon}</div>
        <div style="font-size:12px;font-weight:bold;margin-bottom:3px;color:#f0e0c0">${item.name}</div>
        <div style="font-size:10px;color:#907850;line-height:1.4">${item.desc}</div>`;
      card.addEventListener('mouseenter', () => { card.style.borderColor='#c8903a'; card.style.background='rgba(200,144,58,0.12)'; });
      card.addEventListener('mouseleave', () => { card.style.borderColor='#3a2510'; card.style.background='rgba(255,255,255,0.04)'; });
      card.addEventListener('click', () => { panel.style.display='none'; enterInstallMode(item); });
      grid.appendChild(card);
    });
    gridWrap.appendChild(grid);
  }
  renderGrid();

  // ── Placement HUD ──────────────────────────────────────────────────────────
  crosshair = document.createElement('div');
  crosshair.textContent = '⊕';
  Object.assign(crosshair.style, {
    position:'fixed', top:'50%', left:'50%',
    transform:'translate(-50%,-50%)',
    color:'rgba(255,240,200,0.7)', fontSize:'26px',
    pointerEvents:'none', display:'none', userSelect:'none', zIndex:99,
  });
  document.body.appendChild(crosshair);

  hintBar = document.createElement('div');
  Object.assign(hintBar.style, {
    position:'fixed', bottom:'56px', left:'20px',
    color:'rgba(240,220,180,0.75)', fontSize:'12px',
    fontFamily:'serif', pointerEvents:'none', zIndex:100,
    textShadow:'0 1px 4px rgba(0,0,0,0.8)', display:'none',
  });
  document.body.appendChild(hintBar);

  // ── Selection bar ─────────────────────────────────────────────────────────
  selBar = document.createElement('div');
  Object.assign(selBar.style, {
    position:'fixed', bottom:'56px', left:'50%',
    transform:'translateX(-50%)',
    background:'rgba(12,7,3,0.90)', border:'1px solid #6a4a20',
    borderRadius:'8px', padding:'9px 16px',
    color:'#f0e0c0', fontFamily:'serif', fontSize:'13px',
    display:'none', zIndex:200, gap:'10px', alignItems:'center',
    backdropFilter:'blur(6px)', whiteSpace:'nowrap',
  });

  const selLabel = document.createElement('span'); selLabel.id='install-sel-label';
  selBar.appendChild(selLabel);

  const sep = () => { const s=document.createElement('span'); s.textContent='|'; s.style.cssText='opacity:0.25;margin:0 2px'; selBar.appendChild(s); };
  const sbtn = (txt, tip, fn) => {
    const b=document.createElement('button'); b.textContent=txt; b.title=tip;
    Object.assign(b.style, { background:'rgba(255,255,255,0.06)', border:'1px solid #5a3a10', color:'#f0e0c0', borderRadius:'4px', padding:'4px 11px', cursor:'pointer', fontSize:'13px', fontFamily:'serif' });
    b.addEventListener('mouseenter',()=>b.style.background='rgba(200,144,58,0.28)');
    b.addEventListener('mouseleave',()=>b.style.background='rgba(255,255,255,0.06)');
    b.addEventListener('click', fn);
    selBar.appendChild(b);
  };

  sep();
  sbtn('－','Shrink', ()=>scaleInstall(selectedGroup, 0.85));
  sbtn('＋','Grow',   ()=>scaleInstall(selectedGroup, 1.18));
  sep();
  sbtn('🗑 Delete','Delete (Del)', deleteInstall);
  sep();
  const hint2=document.createElement('span'); hint2.textContent='Drag ● rotate  ·  ESC'; hint2.style.cssText='opacity:0.38;font-size:11px'; selBar.appendChild(hint2);
  document.body.appendChild(selBar);

  // ── Light control panel ───────────────────────────────────────────────────
  lightPanel = document.createElement('div');
  Object.assign(lightPanel.style, {
    position:'fixed', bottom:'100px', left:'50%',
    transform:'translateX(-50%)',
    background:'rgba(12,7,3,0.92)', border:'1px solid #6a4a20',
    borderRadius:'8px', padding:'14px 20px',
    color:'#f0e0c0', fontFamily:'serif', fontSize:'13px',
    display:'none', zIndex:200, gap:'14px', alignItems:'center',
    backdropFilter:'blur(6px)', whiteSpace:'nowrap',
  });

  const lpTitle = document.createElement('span');
  lpTitle.textContent = '💡 Light';
  lpTitle.style.cssText = 'font-size:12px;opacity:0.7;flex-shrink:0';
  lightPanel.appendChild(lpTitle);

  // Color
  const lColorWrap = document.createElement('label');
  lColorWrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer';
  lColorWrap.textContent = 'Color ';
  const lColorInput = document.createElement('input');
  lColorInput.type = 'color'; lColorInput.id = 'light-color-input';
  Object.assign(lColorInput.style, { width:'30px', height:'24px', border:'1px solid #5a3a10', borderRadius:'3px', background:'transparent', cursor:'pointer', padding:'1px' });
  lColorInput.addEventListener('input', () => {
    if (!selectedGroup?.userData.lightSource) return;
    selectedGroup.userData.lightSource.color.setStyle(lColorInput.value);
    selectedGroup.userData.lightColor = lColorInput.value;
  });
  lColorWrap.appendChild(lColorInput);
  lightPanel.appendChild(lColorWrap);

  // Intensity
  const lIntWrap = document.createElement('label');
  lIntWrap.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px';
  lIntWrap.textContent = 'Brightness ';
  const lIntSlider = document.createElement('input');
  lIntSlider.type='range'; lIntSlider.id='light-int-input';
  lIntSlider.min='0'; lIntSlider.max='8'; lIntSlider.step='0.1';
  Object.assign(lIntSlider.style, { width:'90px', accentColor:'#c8903a' });
  lIntSlider.addEventListener('input', () => {
    if (!selectedGroup?.userData.lightSource) return;
    const v = parseFloat(lIntSlider.value);
    selectedGroup.userData.lightSource.intensity = v;
    selectedGroup.userData.lightIntensity = v;
  });
  lIntWrap.appendChild(lIntSlider);
  lightPanel.appendChild(lIntWrap);

  document.body.appendChild(lightPanel);
}

function updateSelBar() {
  if (!selectedGroup) return;
  const item = ITEMS.find(it => it.id === selectedGroup.userData.itemId) ?? { name:'Object' };
  const s = (selectedGroup.userData.currentScale ?? 1).toFixed(2);
  const lbl = selBar.querySelector('#install-sel-label');
  if (lbl) lbl.textContent = `${item.name}  ×${s}`;
  selBar.style.display = 'flex';
}

function showLightPanel(group) {
  const lc = lightPanel.querySelector('#light-color-input');
  const li = lightPanel.querySelector('#light-int-input');
  if (lc) lc.value = group.userData.lightColor ?? '#ffffff';
  if (li) li.value = group.userData.lightIntensity ?? 1;
  lightPanel.style.display = 'flex';
}
function hideLightPanel() { if (lightPanel) lightPanel.style.display = 'none'; }

// ─── Public init ─────────────────────────────────────────────────────────────
export function createInstallations(scene, camera, renderer, controls) {
  _scene = scene; _camera = camera; _renderer = renderer; _controls = controls;
  buildUI();
  const cv = renderer.domElement;
  cv.addEventListener('mousemove', onMouseMove);
  cv.addEventListener('mousedown', onMouseDown);
  cv.addEventListener('mouseup',   onMouseUp);
  cv.addEventListener('wheel',     onWheel, { passive:false });
  window.addEventListener('keydown', onKeyDown);
}
