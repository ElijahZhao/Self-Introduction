import * as THREE from 'three';

/**
 * Programmatic rigging for low-poly blocky GLB characters (Sketchfab exports
 * like the Minecraft Steve/Villager/Wolf set). These models are single merged
 * meshes with NO skeleton and NO animation clips. Because their vertices form
 * discrete box clusters (arms / torso / head / legs do not share vertices),
 * we can:
 *   1. classify every vertex into a body part by spatial position,
 *   2. build a simple bone hierarchy (humanoid or quadruped),
 *   3. skin the mesh with hard weights (1 bone per vertex),
 *   4. synthesize Minecraft-style walk / idle animation clips.
 */

export type RigKind = 'human' | 'quadruped';

export interface RigResult {
  /** Scene node holding the bone hierarchy (mixer root). */
  skeletonRoot: THREE.Object3D;
  skinned: THREE.SkinnedMesh;
  walkClip: THREE.AnimationClip;
  idleClip: THREE.AnimationClip;
}

const PART_HUMAN = ['root', 'spine', 'head', 'arm_l', 'arm_r', 'leg_l', 'leg_r'] as const;
const PART_QUAD = ['root', 'body', 'head', 'leg_fr', 'leg_fl', 'leg_br', 'leg_bl'] as const;
type HumanPart = (typeof PART_HUMAN)[number];
type QuadPart = (typeof PART_QUAD)[number];

function buildSkeleton(
  kind: RigKind,
  bbMin: THREE.Vector3,
  bbMax: THREE.Vector3,
  armXTh: number
): { rootBone: THREE.Bone; bones: THREE.Bone[]; partIndex: Record<string, number> } {
  const h = bbMax.y - bbMin.y;
  const y = (r: number) => bbMin.y + h * r;
  const hipY = y(0.34);
  const bones: THREE.Bone[] = [];
  const partIndex: Record<string, number> = {};
  const add = (name: string, x: number, yy: number, z: number, parent: THREE.Bone | null) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, yy, z);
    if (parent) parent.add(b);
    bones.push(b);
    partIndex[name] = bones.length - 1;
    return b;
  };

  if (kind === 'human') {
    const root = add('root', 0, hipY, 0, null);
    const spine = add('spine', 0, y(0.48), 0, root);
    add('head', 0, y(0.86), 0, spine);
    add('arm_l', -armXTh, y(0.56), 0, spine);
    add('arm_r', armXTh, y(0.56), 0, spine);
    add('leg_l', -1.1, hipY, 0, root);
    add('leg_r', 1.1, hipY, 0, root);
    return { rootBone: root, bones, partIndex };
  }

  // quadruped: body center at mid-height of the body band, head in front (+z)
  const bodyY = y(0.55);
  const root = add('root', 0, y(0.42), 0, null);
  const body = add('body', 0, bodyY, 0, root);
  add('head', 0, y(0.85), (bbMax.z - bbMin.z) * 0.32, body);
  const legX = Math.max(1.2, (bbMax.x - bbMin.x) * 0.36);
  const frontZ = (bbMax.z - bbMin.z) * 0.22;
  const backZ = -(bbMax.z - bbMin.z) * 0.2;
  add('leg_fr', legX, bodyY, frontZ, body);
  add('leg_fl', -legX, bodyY, frontZ, body);
  add('leg_br', legX, bodyY, backZ, body);
  add('leg_bl', -legX, bodyY, backZ, body);
  return { rootBone: root, bones, partIndex };
}

function classifyHuman(p: THREE.Vector3, bbMin: THREE.Vector3, bbMax: THREE.Vector3, armXTh: number): HumanPart {
  const h = Math.max(1e-6, bbMax.y - bbMin.y);
  const ry = (p.y - bbMin.y) / h;
  if (ry < 0.34) return p.x >= 0 ? 'leg_r' : 'leg_l';
  if (ry > 0.78) return 'head';
  if (Math.abs(p.x) > armXTh) return p.x > 0 ? 'arm_r' : 'arm_l';
  return 'spine';
}

function classifyQuad(p: THREE.Vector3, bbMin: THREE.Vector3, bbMax: THREE.Vector3): QuadPart {
  const h = Math.max(1e-6, bbMax.y - bbMin.y);
  const ry = (p.y - bbMin.y) / h;
  const zc = (p.z - bbMin.z) / Math.max(1e-6, bbMax.z - bbMin.z);
  if (ry > 0.82) return 'head';
  if (ry < 0.4) {
    const front = zc > 0.5;
    return (p.x >= 0 ? front ? 'leg_fr' : 'leg_br' : front ? 'leg_fl' : 'leg_bl');
  }
  return 'body';
}

/**
 * Rig a blocky character in place: replaces the first mesh inside `root` with
 * a skinned version and attaches a bone hierarchy + synthesized clips.
 * `root` must already be scaled to final size; bones live in root's local space
 * (same space as the mesh geometry).
 */
export function rigBlockyModel(root: THREE.Object3D, kind: RigKind): RigResult | null {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const srcMesh = meshes[0];
  if (!srcMesh) return null;
  const geo = srcMesh.geometry;
  if (!geo.attributes.position) return null;

  // Bounding box of vertices in root-local space.
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const bbMin = new THREE.Vector3(Infinity, Infinity, Infinity);
  const bbMax = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    bbMin.min(v);
    bbMax.max(v);
  }
  const armXTh = Math.max(1.6, (bbMax.x - bbMin.x) * 0.34);

  const { rootBone, bones, partIndex } = buildSkeleton(kind, bbMin, bbMax, armXTh);

  // Classify vertices + hard skin weights.
  const skinIndex = new Uint16Array(posAttr.count);
  const skinWeight = new Float32Array(posAttr.count * 4);
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    const part = kind === 'human' ? classifyHuman(v, bbMin, bbMax, armXTh) : classifyQuad(v, bbMin, bbMax);
    const boneIdx = partIndex[part];
    skinIndex[i] = boneIdx;
    skinWeight[i * 4] = 1;
  }

  const skinGeo = geo.clone();
  skinGeo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 1));
  skinGeo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  const mat = Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material;
  const skinned = new THREE.SkinnedMesh(skinGeo, (mat as THREE.Material).clone());

  // Replace mesh in scene graph.
  const parent = srcMesh.parent;
  if (!parent) return null;
  parent.remove(srcMesh);
  const skeletonRoot = new THREE.Object3D();
  skeletonRoot.name = '__rigRoot__';
  skeletonRoot.add(rootBone);
  parent.add(skeletonRoot);
  parent.add(skinned);
  parent.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skinned.bind(skeleton);

  // Synthesized animation clips.
  const walkClip = makeWalkClip(kind, partIndex, kind === 'human' ? 0.9 : 0.55);
  const idleClip = makeIdleClip();
  return { skeletonRoot, skinned, walkClip, idleClip };
}

const BONE_NAME_FIX = {
  spine: 'spine',
  head: 'head',
  arm_l: 'arm_l',
  arm_r: 'arm_r',
  leg_l: 'leg_l',
  leg_r: 'leg_r',
  body: 'body',
  leg_fr: 'leg_fr',
  leg_fl: 'leg_fl',
  leg_br: 'leg_br',
  leg_bl: 'leg_bl',
} as const;

function qTrack(boneName: string, times: number[], eulers: number[][]): THREE.QuaternionKeyframeTrack {
  const values: number[] = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const eu of eulers) {
    e.set(eu[0], eu[1], eu[2]);
    q.setFromEuler(e);
    values.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values);
}

/** Minecraft-style walk cycle. Human: swinging arms + legs (opposite phase),
 *  small body bob. Quadruped: diagonal gait (front-right + back-left together). */
function makeWalkClip(kind: RigKind, partIndex: Record<string, number>, period: number): THREE.AnimationClip {
  const n = 12;
  const times: number[] = [];
  for (let i = 0; i <= n; i++) times.push((period * i) / n);
  const sin = (phase: number, amp: number) => {
    const out: number[][] = [];
    for (let i = 0; i <= n; i++) {
      const t = (Math.PI * 2 * i) / n;
      out.push([Math.sin(t + phase) * amp, 0, 0]);
    }
    return out;
  };
  const tracks: THREE.KeyframeTrack[] = [];
  if (kind === 'human') {
    tracks.push(qTrack('arm_l', times, sin(0, 0.55)));
    tracks.push(qTrack('arm_r', times, sin(Math.PI, 0.55)));
    tracks.push(qTrack('leg_l', times, sin(Math.PI, 0.42)));
    tracks.push(qTrack('leg_r', times, sin(0, 0.42)));
    // body bob: 2 bobs per cycle
    const bobTimes = times;
    const bobValues: number[] = [];
    for (let i = 0; i <= n; i++) bobValues.push(0.07 * Math.abs(Math.sin((Math.PI * 2 * i) / n)));
    tracks.push(new THREE.NumberKeyframeTrack('spine.position[y]', bobTimes, bobValues));
  } else {
    // diagonal gait: fr+bl in phase, fl+br in opposite phase
    tracks.push(qTrack('leg_fr', times, sin(0, 0.4)));
    tracks.push(qTrack('leg_bl', times, sin(0, 0.4)));
    tracks.push(qTrack('leg_fl', times, sin(Math.PI, 0.4)));
    tracks.push(qTrack('leg_br', times, sin(Math.PI, 0.4)));
    const bobTimes = times;
    const bobValues: number[] = [];
    for (let i = 0; i <= n; i++) bobValues.push(0.045 * Math.abs(Math.sin((Math.PI * 2 * i) / n)));
    tracks.push(new THREE.NumberKeyframeTrack('body.position[y]', bobTimes, bobValues));
  }
  return new THREE.AnimationClip(`mc_walk_${kind}`, period, tracks);
}

function makeIdleClip(): THREE.AnimationClip {
  // Zero-length static clip: bones keep their rest pose.
  return new THREE.AnimationClip('mc_idle', 1 / 60, []);
}
