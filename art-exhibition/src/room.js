import * as THREE from 'three';

// Room dimensions (meters)
const W = 14;  // width  (x-axis)
const H = 6;   // height (y-axis)
const D = 12;  // depth  (z-axis)

// ─── Materials ────────────────────────────────────────────────────────────────

function makeMaterial(color, roughness = 0.8, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.FrontSide });
}

const matMainWall  = makeMaterial(0x8B1A1A, 0.85); // deep red — back wall
const matSideWall  = makeMaterial(0xf5f0e8, 0.9);  // warm white — side + front walls
const matFloor     = makeMaterial(0x1a1410, 0.6, 0.1); // very dark brown
const matCeiling   = makeMaterial(0xf0ece2, 0.9);  // off-white

// Surfaces that can be recoloured at runtime
const ROOM_MATS = { mainWall: matMainWall, sideWall: matSideWall, floor: matFloor, ceiling: matCeiling };

export function setRoomColor(target, hex) {
  const mat = ROOM_MATS[target];
  if (mat) mat.color.setStyle(hex);
}
const matColumn    = makeMaterial(0xe8e0d0, 0.75); // stone column
const matMolding   = makeMaterial(0xede5d5, 0.8);  // plaster molding
const matDoor      = makeMaterial(0x2e1206, 0.6, 0.05); // dark mahogany door
const matDoorFrame = makeMaterial(0xd8cdb8, 0.75); // stone door surround

// ─── Helpers ──────────────────────────────────────────────────────────────────

function box(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(rt, rb, h, seg, mat, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ─── Neoclassical Door ────────────────────────────────────────────────────────

// Door opening: 1.8 m wide, 2.6 m tall, centred on the front wall (z = -D/2)
const DOOR_W  = 1.8;
const DOOR_H  = 2.6;
const DOOR_Z  = -D / 2; // front wall z-position

function createDoor() {
  const g = new THREE.Group();
  const wt = 0.3; // wall thickness

  // ── Wall panels around the opening ──────────────────────────────────────
  const sideW = (W - DOOR_W) / 2;          // 6.1 m each side
  const sideX = W / 2 - sideW / 2;         // 3.95 m from centre

  g.add(box(sideW, H, wt, matSideWall, -sideX, H / 2, DOOR_Z)); // left
  g.add(box(sideW, H, wt, matSideWall,  sideX, H / 2, DOOR_Z)); // right
  // top fill above door opening
  g.add(box(DOOR_W, H - DOOR_H, wt, matSideWall, 0, DOOR_H + (H - DOOR_H) / 2, DOOR_Z));

  // ── Neoclassical door surround ───────────────────────────────────────────
  const fw = 0.14;  // frame member width
  const fd = 0.18;  // frame depth (protrusion from wall face)
  const fz = DOOR_Z + wt / 2 + fd / 2;

  // Left jamb
  g.add(box(fw, DOOR_H + fw, fd, matDoorFrame, -DOOR_W / 2 - fw / 2, (DOOR_H + fw) / 2, fz));
  // Right jamb
  g.add(box(fw, DOOR_H + fw, fd, matDoorFrame,  DOOR_W / 2 + fw / 2, (DOOR_H + fw) / 2, fz));
  // Top lintel
  g.add(box(DOOR_W + fw * 2, fw, fd, matDoorFrame, 0, DOOR_H + fw / 2, fz));

  // Entablature (decorative beam above lintel)
  const entH = 0.22;
  g.add(box(DOOR_W + fw * 2 + 0.1, entH, fd + 0.04, matDoorFrame, 0, DOOR_H + fw + entH / 2, fz));

  // Pediment cap strip
  g.add(box(DOOR_W + fw * 2 + 0.2, 0.07, fd + 0.06, matDoorFrame, 0, DOOR_H + fw + entH + 0.035, fz));

  // ── Door leaves (double door, both closed) ───────────────────────────────
  const leafW  = DOOR_W / 2 - 0.02; // slight gap at centre
  const leafH  = DOOR_H - 0.04;
  const leafD  = 0.06;
  const leafZ  = DOOR_Z + wt / 2 - leafD / 2;

  // Left leaf
  const leftLeaf = box(leafW, leafH, leafD, matDoor, -DOOR_W / 4, leafH / 2 + 0.02, leafZ);
  g.add(leftLeaf);
  // Right leaf
  const rightLeaf = box(leafW, leafH, leafD, matDoor,  DOOR_W / 4, leafH / 2 + 0.02, leafZ);
  g.add(rightLeaf);

  // Panel moulding insets (raised panels on each leaf)
  const panMat = makeMaterial(0x3a1608, 0.55, 0.05);
  const pz = leafZ - leafD / 2 - 0.01;
  for (const lx of [-DOOR_W / 4, DOOR_W / 4]) {
    // Upper panel
    g.add(box(leafW - 0.14, leafH * 0.42, 0.025, panMat, lx, leafH * 0.68, pz));
    // Lower panel
    g.add(box(leafW - 0.14, leafH * 0.42, 0.025, panMat, lx, leafH * 0.24, pz));
  }

  // Door handles (small cylinders)
  const matHandle = makeMaterial(0xb8960c, 0.3, 0.9); // brass
  g.add(cylinder(0.025, 0.025, 0.12, 12, matHandle, -0.06, 1.05, pz - 0.05).rotateX(Math.PI / 2));
  g.add(cylinder(0.025, 0.025, 0.12, 12, matHandle,  0.06, 1.05, pz - 0.05).rotateX(Math.PI / 2));

  return g;
}

// ─── Neoclassical Column ──────────────────────────────────────────────────────

function createColumn(x, z) {
  const group = new THREE.Group();

  // Base plinth
  group.add(box(0.55, 0.25, 0.55, matColumn, x, 0.125, z));
  // Shaft
  group.add(cylinder(0.2, 0.22, H - 0.7, 24, matColumn, x, H / 2, z));
  // Capital
  group.add(box(0.5, 0.2, 0.5, matColumn, x, H - 0.35, z));
  // Capital neck ring
  group.add(cylinder(0.22, 0.22, 0.08, 24, matColumn, x, H - 0.46, z));

  return group;
}

// ─── Cornice / Crown Molding strip ────────────────────────────────────────────

function createCorniceStrip(length, x, z, ry = 0) {
  const g = new THREE.Group();
  // Main bed molding
  g.add(box(length, 0.18, 0.22, matMolding, 0, 0, 0));
  // Ovolo (rounded) fillet above — approximated as thin box
  g.add(box(length, 0.06, 0.08, matMolding, 0, 0.12, -0.07));
  g.position.set(x, H - 0.12, z);
  g.rotation.y = ry;
  return g;
}

// ─── Chair Rail Molding ───────────────────────────────────────────────────────

function createChairRailStrip(length, x, z, ry = 0) {
  const g = new THREE.Group();
  g.add(box(length, 0.08, 0.12, matMolding, 0, 0, 0));
  g.position.set(x, 0.95, z);
  g.rotation.y = ry;
  return g;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function createRoom(scene) {
  const group = new THREE.Group();

  // ── Walls ──────────────────────────────────────────────────────────────────

  // Back wall (main — red, positive Z)
  group.add(box(W, H, 0.3, matMainWall, 0, H / 2, D / 2));

  // Front wall (entry side) — built inside createDoor() with opening
  group.add(createDoor());

  // Left wall
  group.add(box(0.3, H, D, matSideWall, -W / 2, H / 2, 0));

  // Right wall
  group.add(box(0.3, H, D, matSideWall, W / 2, H / 2, 0));

  // ── Floor ──────────────────────────────────────────────────────────────────
  const floor = box(W, 0.2, D, matFloor, 0, -0.1, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // ── Ceiling ────────────────────────────────────────────────────────────────
  group.add(box(W, 0.2, D, matCeiling, 0, H + 0.1, 0));

  // ── Columns (pairs along side walls) ──────────────────────────────────────
  const colXL = -W / 2 + 0.6;
  const colXR =  W / 2 - 0.6;
  const colZPositions = [-D / 2 + 1.5, -D / 6, D / 6, D / 2 - 1.5];

  for (const cz of colZPositions) {
    group.add(createColumn(colXL, cz));
    group.add(createColumn(colXR, cz));
  }

  // ── Cornice molding (crown) ────────────────────────────────────────────────
  // Along back wall (red)
  group.add(createCorniceStrip(W, 0, D / 2 - 0.15));
  // Along front wall
  group.add(createCorniceStrip(W, 0, -D / 2 + 0.15, Math.PI));
  // Along left wall
  group.add(createCorniceStrip(D, -W / 2 + 0.15, 0, Math.PI / 2));
  // Along right wall
  group.add(createCorniceStrip(D, W / 2 - 0.15, 0, -Math.PI / 2));

  // ── Chair rail molding ─────────────────────────────────────────────────────
  group.add(createChairRailStrip(W, 0, D / 2 - 0.15));
  group.add(createChairRailStrip(W, 0, -D / 2 + 0.15, Math.PI));
  group.add(createChairRailStrip(D, -W / 2 + 0.15, 0, Math.PI / 2));
  group.add(createChairRailStrip(D, W / 2 - 0.15, 0, -Math.PI / 2));

  // ── Baseboard ─────────────────────────────────────────────────────────────
  const matBase = makeMaterial(0xddd5c5, 0.85);
  group.add(box(W, 0.15, 0.08, matBase, 0, 0.075, D / 2 - 0.19));
  group.add(box(W, 0.15, 0.08, matBase, 0, 0.075, -D / 2 + 0.19, 0, Math.PI));
  group.add(box(D, 0.15, 0.08, matBase, -W / 2 + 0.19, 0.075, 0, 0, Math.PI / 2));
  group.add(box(D, 0.15, 0.08, matBase, W / 2 - 0.19, 0.075, 0, 0, -Math.PI / 2));

  scene.add(group);
  return group;
}
