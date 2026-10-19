import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MODEL_PRESETS } from '../data/modelsConfig';
import { getModelCandidateUrls } from '../utils/assetUrl';
import {
  PersonaConfig,
  OrbitModuleId,
  ScreenCoord,
  AccessoryState,
  ThemeMode,
  BuiltinModelId,
} from '../types';
import { audioEngine } from '../services/audioEngine';
import { createContactShadowTexture } from '../utils/faceTextureGenerator';

interface ThreeCanvasProps {
  currentPersona: PersonaConfig;
  accessories: AccessoryState;
  hairColor: number;
  themeMode: ThemeMode;
  activeModelId: BuiltinModelId;
  externalModelFile: File | null;
  onSelectOrbitItem: (moduleId: OrbitModuleId) => void;
  onHoverOrbitItem: (item: { id: OrbitModuleId; emoji: string; label: string; coords: ScreenCoord } | null) => void;
  onUpdateBadgeCoords: (coords: ScreenCoord | null) => void;
  onModelLoadedMessage?: (msg: string) => void;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  currentPersona,
  accessories,
  hairColor,
  themeMode,
  activeModelId,
  externalModelFile,
  onSelectOrbitItem,
  onHoverOrbitItem,
  onUpdateBadgeCoords,
  onModelLoadedMessage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // References to 3D scene objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterPivotRef = useRef<THREE.Group | null>(null);
  const characterRootRef = useRef<THREE.Group | null>(null);
  const externalModelRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const foxMixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionsRef = useRef<{ [key: string]: THREE.AnimationAction }>({});
  const leftEyeGroupRef = useRef<THREE.Group | null>(null);
  const rightEyeGroupRef = useRef<THREE.Group | null>(null);
  const ahogeRef = useRef<THREE.Mesh | null>(null);
  const activeOrbitTargetRef = useRef<THREE.Group | null>(null);

  // Lights & Materials for theme adaptation
  const lightsRef = useRef<{
    hemiLight?: THREE.HemisphereLight;
    dirLight?: THREE.DirectionalLight;
    fillLight?: THREE.DirectionalLight;
    rimLight?: THREE.DirectionalLight;
  }>({});

  const pedestalMeshesRef = useRef<{
    baseBottom?: THREE.Mesh;
    baseTop?: THREE.Mesh;
    pedestalMat?: THREE.MeshStandardMaterial;
    seamMat?: THREE.MeshBasicMaterial;
    grooveMat?: THREE.MeshBasicMaterial;
    contactShadowMat?: THREE.MeshBasicMaterial;
  }>({});

  const outfitMeshesRef = useRef<{
    skinMat?: THREE.MeshPhysicalMaterial;
    hairMat?: THREE.MeshStandardMaterial;
    topMat?: THREE.MeshPhysicalMaterial;
    collarMat?: THREE.MeshStandardMaterial;
    skirtMat?: THREE.MeshStandardMaterial;
    shoeMat?: THREE.MeshStandardMaterial;
    hoodiePocket?: THREE.Mesh;
    hoodieBack?: THREE.Mesh;
    sailorCollarGroup?: THREE.Group;
    cardiganButtons?: THREE.Group;
    starClip?: THREE.Mesh;
    glasses?: THREE.Group;
    beret?: THREE.Group;
    headphones?: THREE.Group;
    laptop?: THREE.Group;
    camera?: THREE.Group;
  }>({});

  const orbitingItemsRef = useRef<THREE.Group[]>([]);
  const orbitRingsRef = useRef<THREE.Object3D[]>([]);
  const rippleRingsRef = useRef<{ mesh: THREE.Mesh; active: boolean; age: number; delay: number }[]>([]);
  const dressupParticlesRef = useRef<THREE.Mesh[]>([]);

  // Drag-to-rotate and motion state
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const targetRotationYRef = useRef(0.12);
  const currentRotationYRef = useRef(0.12);
  const characterJumpOffsetRef = useRef(0);
  const characterJumpVelocityRef = useRef(0);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const hoveredItemRef = useRef<THREE.Group | null>(null);

  // Keep latest callbacks in ref
  const callbacksRef = useRef({
    onSelectOrbitItem,
    onHoverOrbitItem,
    onUpdateBadgeCoords,
    onModelLoadedMessage,
  });
  useEffect(() => {
    callbacksRef.current = {
      onSelectOrbitItem,
      onHoverOrbitItem,
      onUpdateBadgeCoords,
      onModelLoadedMessage,
    };
  });

  // Project 3D vector to 2D screen coordinate
  const toScreenPosition = (worldVec: THREE.Vector3): ScreenCoord => {
    if (!cameraRef.current) return { x: 0, y: 0 };
    const vec = worldVec.clone();
    vec.project(cameraRef.current);
    const widthHalf = 0.5 * window.innerWidth;
    const heightHalf = 0.5 * window.innerHeight;
    return {
      x: vec.x * widthHalf + widthHalf,
      y: -(vec.y * heightHalf) + heightHalf,
    };
  };

  // Trigger blue 3D ripple around orbit item
  const trigger3DRippleAt = (targetGroup: THREE.Group) => {
    activeOrbitTargetRef.current = targetGroup;
    rippleRingsRef.current.forEach((r, idx) => {
      r.active = true;
      r.age = -idx * 0.18;
      r.mesh.visible = true;
      r.mesh.position.copy(targetGroup.position);
      r.mesh.position.y = Math.max(0.02, targetGroup.position.y - 0.08);
      r.mesh.scale.set(0.2, 0.2, 0.2);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
    });
  };

  // Burst particles for dress-up sparkles
  const spawnDressupBurst = (hexColor: number) => {
    if (!sceneRef.current) return;
    for (let i = 0; i < 22; i++) {
      const p = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.075, 0),
        new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity: 0.95 })
      );
      const angle = (i / 22) * Math.PI * 2;
      const r = 0.45 + Math.random() * 0.25;
      p.position.set(Math.cos(angle) * r, 0.95 + (Math.random() - 0.5) * 0.4, Math.sin(angle) * r);
      p.userData = {
        vx: Math.cos(angle) * (0.035 + Math.random() * 0.02),
        vy: 0.032 + Math.random() * 0.035,
        vz: Math.sin(angle) * (0.035 + Math.random() * 0.02),
        life: 1.0,
      };
      sceneRef.current.add(p);
      dressupParticlesRef.current.push(p);
    }
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 3.8, 8.4);
    camera.lookAt(0, 0.72, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Cinema-grade ACES Filmic Tone Mapping
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Studio Key, Fill and Rim Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xdfe4ea, 0.98);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff8f0, 0.92);
    dirLight.position.set(4.2, 7.8, 5.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 22;
    const d = 4.2;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0004;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe0e7ff, 0.52);
    fillLight.position.set(-4.5, 3.8, 3.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.72);
    rimLight.position.set(-4.2, 4.5, -4.8);
    scene.add(rimLight);

    lightsRef.current = { hemiLight, dirLight, fillLight, rimLight };

    // Floor Shadow Receiver Plane
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.14 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.22;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // -------------------------------------------------------------------------
    // Build Double-Tier Pedestal & Orbit Rings
    // -------------------------------------------------------------------------
    const pedestalGroup = new THREE.Group();
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.04,
    });
    pedestalMeshesRef.current.pedestalMat = pedestalMat;

    const baseBottom = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.48, 0.16, 64),
      pedestalMat
    );
    baseBottom.position.y = -0.12;
    baseBottom.receiveShadow = true;
    baseBottom.castShadow = true;
    pedestalGroup.add(baseBottom);
    pedestalMeshesRef.current.baseBottom = baseBottom;

    const seamMat = new THREE.MeshBasicMaterial({
      color: currentPersona.orbitColor,
      transparent: true,
      opacity: 0.78,
    });
    const seamRing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.36, 1.36, 0.035, 64),
      seamMat
    );
    seamRing.position.y = -0.02;
    pedestalGroup.add(seamRing);
    pedestalMeshesRef.current.seamMat = seamMat;

    const baseTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.32, 1.35, 0.14, 64),
      pedestalMat
    );
    baseTop.position.y = 0.06;
    baseTop.receiveShadow = true;
    baseTop.castShadow = true;
    pedestalGroup.add(baseTop);
    pedestalMeshesRef.current.baseTop = baseTop;

    const grooveMat = new THREE.MeshBasicMaterial({ color: 0xdce3ef, side: THREE.DoubleSide });
    const topGroove = new THREE.Mesh(new THREE.RingGeometry(1.12, 1.15, 64), grooveMat);
    topGroove.rotation.x = -Math.PI / 2;
    topGroove.position.y = 0.132;
    pedestalGroup.add(topGroove);
    pedestalMeshesRef.current.grooveMat = grooveMat;

    // Soft Blurred Contact Shadow Disc
    const contactShadowTexture = createContactShadowTexture();
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTexture,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    });
    const contactShadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), contactShadowMat);
    contactShadowDisc.rotation.x = -Math.PI / 2;
    contactShadowDisc.position.y = 0.133;
    pedestalGroup.add(contactShadowDisc);
    pedestalMeshesRef.current.contactShadowMat = contactShadowMat;

    scene.add(pedestalGroup);

    // 3 Concentric Glowing Orbital Rings
    const radii = [2.05, 2.68, 3.32];
    orbitRingsRef.current = [];
    radii.forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.015, radius + 0.015, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: idx === 1 ? 0.75 : 0.5,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = -0.08 + idx * 0.01;
      scene.add(ringMesh);
      orbitRingsRef.current.push(ringMesh);

      // Track beads
      const beadMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
      );
      beadMesh.userData = { radius, angle: idx * 2.1 + 0.8, speed: 0.18 + idx * 0.04 };
      scene.add(beadMesh);
      orbitRingsRef.current.push(beadMesh);
    });

    // -------------------------------------------------------------------------
    // Build Masterpiece 3D Chibi Figurines & External Loader Group
    // -------------------------------------------------------------------------
    const characterPivot = new THREE.Group();
    characterPivot.position.set(0, 0.13, 0);
    scene.add(characterPivot);
    characterPivotRef.current = characterPivot;

    const characterRoot = new THREE.Group();
    characterPivot.add(characterRoot);
    characterRootRef.current = characterRoot;

    // Polymer Clay / Porcelain Materials
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xffede3,
      roughness: 0.28,
      metalness: 0.0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.15,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xffdcd2),
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor || currentPersona.outfit.hairColor,
      roughness: 0.34,
      metalness: 0.03,
    });
    const topMat = new THREE.MeshPhysicalMaterial({
      color: currentPersona.outfit.topColor,
      roughness: 0.38,
      clearcoat: 0.18,
      sheen: 0.4,
    });
    const collarMat = new THREE.MeshStandardMaterial({
      color: currentPersona.outfit.collarColor,
      roughness: 0.36,
    });
    const skirtMat = new THREE.MeshStandardMaterial({
      color: currentPersona.outfit.skirtColor,
      roughness: 0.38,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: currentPersona.outfit.shoeColor,
      roughness: 0.28,
    });

    outfitMeshesRef.current.skinMat = skinMat;
    outfitMeshesRef.current.hairMat = hairMat;
    outfitMeshesRef.current.topMat = topMat;
    outfitMeshesRef.current.collarMat = collarMat;
    outfitMeshesRef.current.skirtMat = skirtMat;
    outfitMeshesRef.current.shoeMat = shoeMat;

    // 1. Chubby Legs & Chunky Rounded Platform Shoes
    [-0.19, 0.19].forEach((xPos) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(xPos, 0, 0);

      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.095, 0.38, 32), skinMat);
      leg.position.set(0, 0.26, 0);
      leg.castShadow = true;
      legGroup.add(leg);

      const sock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.112, 0.102, 0.12, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 })
      );
      sock.position.set(0, 0.14, 0);
      legGroup.add(sock);

      const frillTorus = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.022, 12, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 })
      );
      frillTorus.rotation.x = Math.PI / 2;
      frillTorus.position.set(0, 0.19, 0);
      legGroup.add(frillTorus);

      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, 0.065, 0.035);

      const shoeUpper = new THREE.Mesh(new THREE.SphereGeometry(0.135, 32, 32), shoeMat);
      shoeUpper.scale.set(1.04, 0.78, 1.42);
      shoeUpper.castShadow = true;
      shoeGroup.add(shoeUpper);

      const shoeSole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.138, 0.142, 0.045, 32),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 })
      );
      shoeSole.scale.set(1.04, 1.0, 1.42);
      shoeSole.position.y = -0.052;
      shoeGroup.add(shoeSole);

      legGroup.add(shoeGroup);
      characterRoot.add(legGroup);
    });

    // 2. Pleated Skirt with Smooth Flared Clay Volume
    const skirtGroup = new THREE.Group();
    skirtGroup.position.set(0, 0.55, 0);

    const skirtBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.46, 0.36, 40), skirtMat);
    skirtBase.castShadow = true;
    skirtGroup.add(skirtBase);

    const pleatsCount = 18;
    for (let p = 0; p < pleatsCount; p++) {
      const angle = (p / pleatsCount) * Math.PI * 2;
      const pleatBar = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.35, 0.035), skirtMat);
      const r = 0.29 + (0.45 - 0.29) * 0.5;
      pleatBar.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      pleatBar.rotation.y = -angle;
      pleatBar.rotation.x = 0.22;
      skirtGroup.add(pleatBar);
    }
    characterRoot.add(skirtGroup);

    // 3. Rounded Chubby Torso
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.88, 0);

    const chestSphere = new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 32), topMat);
    chestSphere.scale.set(1.02, 0.88, 0.88);
    chestSphere.position.set(0, 0.08, 0);
    chestSphere.castShadow = true;
    torsoGroup.add(chestSphere);

    const tummySphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 32), topMat);
    tummySphere.scale.set(1.05, 0.95, 0.96);
    tummySphere.position.set(0, -0.06, 0.015);
    tummySphere.castShadow = true;
    torsoGroup.add(tummySphere);

    // Explorer Details: Sailor Collar
    const sailorCollarGroup = new THREE.Group();
    sailorCollarGroup.position.set(0, 0.17, 0);

    const collarFlap = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.32, 0.14, 32), collarMat);
    sailorCollarGroup.add(collarFlap);

    const backFlap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.22), collarMat);
    backFlap.position.set(0, 0.02, -0.21);
    backFlap.rotation.x = 0.18;
    backFlap.castShadow = true;
    sailorCollarGroup.add(backFlap);

    const tieBow = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 1), collarMat);
    tieBow.scale.set(1.3, 1.45, 0.55);
    tieBow.position.set(0, -0.11, 0.29);
    sailorCollarGroup.add(tieBow);

    torsoGroup.add(sailorCollarGroup);
    outfitMeshesRef.current.sailorCollarGroup = sailorCollarGroup;

    // Creator Hoodie Details
    const hoodiePocket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), topMat);
    hoodiePocket.position.set(0, -0.08, 0.27);
    hoodiePocket.visible = currentPersona.id === 'creator';
    torsoGroup.add(hoodiePocket);
    outfitMeshesRef.current.hoodiePocket = hoodiePocket;

    const hoodieBack = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), topMat);
    hoodieBack.scale.set(1.1, 0.65, 0.6);
    hoodieBack.position.set(0, 0.12, -0.25);
    hoodieBack.visible = currentPersona.id === 'creator';
    torsoGroup.add(hoodieBack);
    outfitMeshesRef.current.hoodieBack = hoodieBack;

    // Lifestyle Cardigan Details
    const cardiganButtons = new THREE.Group();
    [-0.08, 0.01, 0.1].forEach((by) => {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.01, 16),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.25 })
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, by, 0.295);
      cardiganButtons.add(btn);
    });
    cardiganButtons.visible = currentPersona.id === 'lifestyle';
    torsoGroup.add(cardiganButtons);
    outfitMeshesRef.current.cardiganButtons = cardiganButtons;

    characterRoot.add(torsoGroup);

    // 4. Arms & Hands
    [-0.36, 0.36].forEach((xPos, idx) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(xPos, 1.04, 0.02);
      armGroup.rotation.z = idx === 0 ? 0.35 : -0.35;
      armGroup.rotation.x = 0.22;

      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.118, 0.34, 24), topMat);
      sleeve.position.y = -0.15;
      sleeve.castShadow = true;
      armGroup.add(sleeve);

      const sleeveCuff = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.02, 12, 24), collarMat);
      sleeveCuff.rotation.x = Math.PI / 2;
      sleeveCuff.position.y = -0.3;
      armGroup.add(sleeveCuff);

      const handGroup = new THREE.Group();
      handGroup.position.set(0, -0.38, 0);

      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 24), skinMat);
      palm.scale.set(1.0, 1.05, 0.9);
      handGroup.add(palm);

      const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 16), skinMat);
      thumb.position.set(idx === 0 ? 0.065 : -0.065, 0.02, 0.04);
      handGroup.add(thumb);

      armGroup.add(handGroup);
      characterRoot.add(armGroup);
    });

    // 5. Head Group with 3D Anime Face (Facing forward +Z!)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.62, 0);
    characterRoot.add(headGroup);

    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.58, 64, 64), skinMat);
    headSphere.scale.set(1.10, 0.98, 1.02);
    headSphere.castShadow = true;
    headGroup.add(headSphere);

    [-0.32, 0.32].forEach((xPos) => {
      const chubbyCheek = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 32), skinMat);
      chubbyCheek.scale.set(0.9, 0.85, 0.7);
      chubbyCheek.position.set(xPos, -0.09, 0.27);
      headGroup.add(chubbyCheek);
    });

    [-0.56, 0.56].forEach((xPos) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 20), skinMat);
      ear.scale.set(0.38, 0.78, 0.58);
      ear.position.set(xPos, -0.04, 0.02);
      ear.rotation.y = xPos < 0 ? 0.28 : -0.28;
      headGroup.add(ear);
    });

    [-0.28, 0.28].forEach((xPos) => {
      const blushMat = new THREE.MeshBasicMaterial({
        color: 0xff8e9e,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), blushMat);
      blush.position.set(xPos, -0.07, 0.54);
      blush.rotation.y = xPos < 0 ? -0.28 : 0.28;
      blush.rotation.x = -0.08;
      headGroup.add(blush);
    });

    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf4a28c, roughness: 0.3 })
    );
    nose.position.set(0, -0.05, 0.61);
    headGroup.add(nose);

    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xc95353 });
    const mouthArc = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.011, 16, 32, Math.PI * 0.7),
      mouthMat
    );
    mouthArc.rotation.z = Math.PI * 1.15;
    mouthArc.position.set(0, -0.155, 0.58);
    headGroup.add(mouthArc);

    // 3D Anime Eyes
    const create3DEye = (isLeft: boolean): THREE.Group => {
      const eyeGroup = new THREE.Group();
      const xPos = isLeft ? -0.22 : 0.22;
      eyeGroup.position.set(xPos, 0.04, 0.52);
      eyeGroup.rotation.y = isLeft ? -0.22 : 0.22;
      eyeGroup.rotation.x = -0.04;

      const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.155, 32, 32), scleraMat);
      sclera.scale.set(0.92, 1.14, 0.22);
      eyeGroup.add(sclera);

      const irisGroup = new THREE.Group();
      irisGroup.position.set(0, -0.01, 0.025);

      const irisOuter = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 32, 32),
        new THREE.MeshStandardMaterial({ color: 0x4a2c1b, roughness: 0.2 })
      );
      irisOuter.scale.set(0.82, 1.02, 0.24);
      irisGroup.add(irisOuter);

      const irisGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xd49b6a })
      );
      irisGlow.scale.set(0.78, 0.55, 0.24);
      irisGlow.position.set(0, -0.04, 0.015);
      irisGroup.add(irisGlow);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0x180f0b })
      );
      pupil.scale.set(0.75, 0.95, 0.25);
      pupil.position.set(0, 0.01, 0.028);
      irisGroup.add(pupil);

      const highlightBig = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      highlightBig.position.set(isLeft ? -0.04 : 0.04, 0.048, 0.04);
      irisGroup.add(highlightBig);

      const highlightSmall = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      highlightSmall.position.set(isLeft ? 0.035 : -0.035, -0.045, 0.04);
      irisGroup.add(highlightSmall);

      eyeGroup.add(irisGroup);

      const lashMat = new THREE.MeshStandardMaterial({ color: 0x221513, roughness: 0.3 });
      const lashArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.018, 12, 32, Math.PI * 0.58),
        lashMat
      );
      lashArc.rotation.z = Math.PI * 0.21;
      lashArc.scale.x = isLeft ? 1 : -1;
      lashArc.position.set(0, 0.082, 0.035);
      eyeGroup.add(lashArc);

      const browArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.012, 10, 24, Math.PI * 0.44),
        new THREE.MeshStandardMaterial({ color: hairColor || 0xb9aea8, roughness: 0.4 })
      );
      browArc.rotation.z = Math.PI * 0.28;
      browArc.scale.x = isLeft ? 1 : -1;
      browArc.position.set(0, 0.22, -0.01);
      eyeGroup.add(browArc);

      return eyeGroup;
    };

    const leftEye = create3DEye(true);
    const rightEye = create3DEye(false);
    headGroup.add(leftEye);
    headGroup.add(rightEye);
    leftEyeGroupRef.current = leftEye;
    rightEyeGroupRef.current = rightEye;

    // Hair Group (Firmly at back and crown, leaving front face completely open!)
    const hairGroup = new THREE.Group();
    headGroup.add(hairGroup);

    // Back hair hemisphere only covering the back half of head
    const hairBackShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.64, 32, 32, Math.PI * 0.5, Math.PI, 0, Math.PI),
      hairMat
    );
    hairBackShell.position.set(0, 0.02, -0.06);
    hairBackShell.castShadow = true;
    hairGroup.add(hairBackShell);

    // Front soft bangs
    const bangsData = [
      { x: -0.26, y: 0.36, z: 0.42, rx: 0.24, rz: -0.35, sx: 1.05, sy: 1.25, sz: 0.55 },
      { x: -0.09, y: 0.42, z: 0.46, rx: 0.22, rz: -0.14, sx: 1.15, sy: 1.35, sz: 0.58 },
      { x: 0.08, y: 0.42, z: 0.46, rx: 0.22, rz: 0.12, sx: 1.15, sy: 1.35, sz: 0.58 },
      { x: 0.26, y: 0.36, z: 0.42, rx: 0.24, rz: 0.34, sx: 1.05, sy: 1.25, sz: 0.55 },
    ];
    bangsData.forEach((b) => {
      const strand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), hairMat);
      strand.scale.set(b.sx, b.sy, b.sz);
      strand.position.set(b.x, b.y, b.z);
      strand.rotation.x = b.rx;
      strand.rotation.z = b.rz;
      strand.castShadow = true;
      hairGroup.add(strand);
    });

    // Inward-curling twin side locks
    [-0.56, 0.56].forEach((xPos) => {
      const sideLock = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), hairMat);
      sideLock.scale.set(0.7, 1.8, 0.8);
      sideLock.position.set(xPos, 0.02, 0.12);
      sideLock.rotation.z = xPos < 0 ? 0.2 : -0.2;
      sideLock.castShadow = true;
      hairGroup.add(sideLock);
    });

    const ahoge = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.032, 16, 32, Math.PI * 1.3),
      hairMat
    );
    ahoge.position.set(0.06, 0.66, 0.05);
    ahoge.rotation.z = 0.62;
    ahoge.castShadow = true;
    hairGroup.add(ahoge);
    ahogeRef.current = ahoge;

    // Accessories
    const starClip = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.095, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.18,
        metalness: 0.75,
        emissive: 0x5a3500,
      })
    );
    starClip.scale.set(1.2, 1.2, 0.4);
    starClip.position.set(-0.46, 0.22, 0.45);
    starClip.rotation.y = -0.52;
    headGroup.add(starClip);
    outfitMeshesRef.current.starClip = starClip;

    // Glasses
    const glassesGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.4 });
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      transmission: 0.8,
    });
    [-0.22, 0.22].forEach((xPos) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 12, 32), frameMat);
      rim.position.set(xPos, 0.02, 0.565);
      rim.rotation.y = xPos < 0 ? -0.18 : 0.18;
      glassesGroup.add(rim);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.125, 24), lensMat);
      lens.position.set(xPos, 0.02, 0.566);
      lens.rotation.y = xPos < 0 ? -0.18 : 0.18;
      glassesGroup.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), frameMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.03, 0.58);
    glassesGroup.add(bridge);
    glassesGroup.visible = accessories.glasses;
    headGroup.add(glassesGroup);
    outfitMeshesRef.current.glasses = glassesGroup;

    // Beret
    const beretGroup = new THREE.Group();
    const beretMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 });
    const beretDome = new THREE.Mesh(new THREE.SphereGeometry(0.54, 32, 24), beretMat);
    beretDome.scale.set(1.18, 0.38, 1.15);
    beretDome.position.set(-0.08, 0.56, 0.02);
    beretDome.rotation.z = 0.2;
    beretGroup.add(beretDome);
    beretGroup.visible = accessories.beret;
    headGroup.add(beretGroup);
    outfitMeshesRef.current.beret = beretGroup;

    // Headphones
    const headphonesGroup = new THREE.Group();
    const hpBandMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.6 });
    const hpCupMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 12, 48, Math.PI), hpBandMat);
    band.position.set(0, 0.08, 0.02);
    band.rotation.z = Math.PI;
    headphonesGroup.add(band);
    [-0.64, 0.64].forEach((xPos) => {
      const earcup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.065, 24), hpCupMat);
      earcup.rotation.z = Math.PI / 2;
      earcup.position.set(xPos, 0.0, 0.02);
      headphonesGroup.add(earcup);
    });
    headphonesGroup.visible = accessories.headphones;
    headGroup.add(headphonesGroup);
    outfitMeshesRef.current.headphones = headphonesGroup;

    // Props: Laptop & Camera
    const laptopGroup = new THREE.Group();
    const laptopMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.018, 0.26), laptopMat);
    laptopGroup.add(basePlate);
    const screenPlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.25, 0.014), laptopMat);
    screenPlate.position.set(0, 0.12, -0.13);
    screenPlate.rotation.x = -0.32;
    laptopGroup.add(screenPlate);
    laptopGroup.position.set(0.62, 0.92, 0.35);
    laptopGroup.rotation.y = -0.45;
    laptopGroup.visible = currentPersona.outfit.propType === 'laptop';
    characterRoot.add(laptopGroup);
    outfitMeshesRef.current.laptop = laptopGroup;

    const cameraGroup = new THREE.Group();
    const camBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.19, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x4b3832, roughness: 0.5 })
    );
    cameraGroup.add(camBody);
    const camLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.09, 24),
      new THREE.MeshStandardMaterial({ color: 0xd4a373, metalness: 0.5, roughness: 0.3 })
    );
    camLens.rotation.x = Math.PI / 2;
    camLens.position.set(0, 0, 0.09);
    cameraGroup.add(camLens);
    cameraGroup.position.set(0, 0.78, 0.34);
    cameraGroup.visible = currentPersona.outfit.propType === 'camera';
    characterRoot.add(cameraGroup);
    outfitMeshesRef.current.camera = cameraGroup;

    // Hit collider for character rotation drag
    const hitCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 2.5, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitCylinder.position.y = 1.1;
    hitCylinder.userData = { isCharacter: true };
    characterPivot.add(hitCylinder);

    // -------------------------------------------------------------------------
    // Build 4 Orbiting 3D Objects
    // -------------------------------------------------------------------------
    orbitingItemsRef.current = [];

    const registerItem = (group: THREE.Group, meta: any) => {
      const collider = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      collider.userData = { orbitId: meta.id };
      group.add(collider);
      group.userData = { ...meta, collider };
      scene.add(group);
      orbitingItemsRef.current.push(group);
    };

    // -------------------------------------------------------------------------
    // Load Open-Source 3D Models for Orbiting Items (Saturn, Fox, Plane, Earth-Moon)
    // -------------------------------------------------------------------------
    const gltfOrbitLoader = new GLTFLoader();
    const orbitDracoLoader = new DRACOLoader();
    orbitDracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    gltfOrbitLoader.setDRACOLoader(orbitDracoLoader);

    // 1. 🪐 Saturn (SolarSystemLowPoly GitHub)
    const planetGroup = new THREE.Group();
    // Elegant placeholder while GLB streams in
    const saturnPlaceholder = new THREE.Group();
    const planetSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xf3d5b5, roughness: 0.38, metalness: 0.05 })
    );
    planetSphere.castShadow = true;
    saturnPlaceholder.add(planetSphere);
    const saturnRing = new THREE.Mesh(
      new THREE.RingGeometry(0.33, 0.52, 64),
      new THREE.MeshStandardMaterial({
        color: 0xe8c49e,
        side: THREE.DoubleSide,
        roughness: 0.42,
        transparent: true,
        opacity: 0.9,
      })
    );
    saturnRing.rotation.x = Math.PI * 0.42;
    saturnRing.rotation.y = 0.22;
    saturnPlaceholder.add(saturnRing);
    planetGroup.add(saturnPlaceholder);

    const saturnUrls = getModelCandidateUrls('models/saturn.glb');
    const loadSaturnModel = (idx = 0) => {
      if (idx >= saturnUrls.length) return;
      gltfOrbitLoader.load(
        saturnUrls[idx],
        (gltf) => {
          saturnPlaceholder.visible = false;
          const s = gltf.scene;
          const b = new THREE.Box3().setFromObject(s);
          const size = b.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          s.scale.setScalar(0.58 / maxDim);
          s.rotation.z = THREE.MathUtils.degToRad(26.7);
          s.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          planetGroup.add(s);
        },
        undefined,
        () => loadSaturnModel(idx + 1)
      );
    };
    loadSaturnModel();

    registerItem(planetGroup, {
      id: 'about',
      emoji: '🪐',
      label: '关于我',
      radius: 2.15,
      angle: 2.3,
      speed: 0.22,
      baseY: 0.28,
    });

    // 2. ✈️ Origami Paper Airplane (Video exact aesthetic: crisp matte paper, dihedral wings & keel)
    const planeGroup = new THREE.Group();
    const planeGeo = new THREE.BufferGeometry();
    const paperVertices = new Float32Array([
      // Left wing upper
      0, 0, 0.46,   -0.42, 0.08, -0.28,   -0.05, 0.02, -0.22,
      // Right wing upper
      0, 0, 0.46,    0.05, 0.02, -0.22,    0.42, 0.08, -0.28,
      // Central fold left keel
      0, 0, 0.46,   -0.05, 0.02, -0.22,    0, -0.15, -0.26,
      // Central fold right keel
      0, 0, 0.46,    0, -0.15, -0.26,     0.05, 0.02, -0.22,
      // Wing underside bevel left
      0, -0.15, -0.26, -0.05, 0.02, -0.22, -0.42, 0.08, -0.28,
      // Wing underside bevel right
      0, -0.15, -0.26,  0.42, 0.08, -0.28,   0.05, 0.02, -0.22,
    ]);
    planeGeo.setAttribute('position', new THREE.BufferAttribute(paperVertices, 3));
    planeGeo.computeVertexNormals();

    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeo, paperMat);
    planeMesh.castShadow = true;
    planeGroup.add(planeMesh);

    // Subtle dark fold line along the center ridge
    const creaseMat = new THREE.LineBasicMaterial({ color: 0xd1d5db, linewidth: 2 });
    const creaseGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.46),
      new THREE.Vector3(0, 0.02, -0.22),
    ]);
    const creaseLine = new THREE.Line(creaseGeo, creaseMat);
    planeGroup.add(creaseLine);

    registerItem(planeGroup, {
      id: 'projects',
      emoji: '✈️',
      label: '代表作品',
      radius: 3.82,
      angle: 0.45,
      speed: 0.32,
      baseY: 0.38,
      orientToTangent: true,
    });

    // 3. 🦊 Little Fox (KhronosGroup official animated low-poly Fox from GitHub)
    const foxGroup = new THREE.Group();
    // Warm low-poly placeholder while Fox GLB is loading
    const foxPlaceholder = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.28, 16),
      new THREE.MeshStandardMaterial({ color: 0xe76f51, roughness: 0.4 })
    );
    foxPlaceholder.position.y = 0.14;
    foxGroup.add(foxPlaceholder);

    const foxUrls = getModelCandidateUrls('models/fox.glb');
    const loadFoxModel = (idx = 0) => {
      if (idx >= foxUrls.length) return;
      gltfOrbitLoader.load(
        foxUrls[idx],
        (gltf) => {
          foxPlaceholder.visible = false;
          const fs = gltf.scene;
          const b = new THREE.Box3().setFromObject(fs);
          const size = b.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          fs.scale.setScalar(0.48 / maxDim);
          const b2 = new THREE.Box3().setFromObject(fs);
          fs.position.y = -b2.min.y;
          fs.position.x = -(b2.min.x + b2.max.x) / 2;
          fs.position.z = -(b2.min.z + b2.max.z) / 2;
          fs.rotation.y = -Math.PI / 2;
          fs.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          foxGroup.add(fs);

          // Setup Fox Bone Animation (Survey / idle look-around)
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(fs);
            foxMixerRef.current = mixer;
            const surveyClip =
              gltf.animations.find((a) => a.name.toLowerCase().includes('survey')) ||
              gltf.animations[0];
            const action = mixer.clipAction(surveyClip);
            action.play();
          }
        },
        undefined,
        () => loadFoxModel(idx + 1)
      );
    };
    loadFoxModel();

    registerItem(foxGroup, {
      id: 'hobbies',
      emoji: '🦊',
      label: '技能图谱',
      radius: 2.95,
      angle: -0.85,
      speed: 0.20,
      baseY: -0.04,
      orientToTangent: true,
    });

    // 4. 🎧 Celestial Orbit Node / Earth-Moon (SolarSystemLowPoly GitHub)
    const contactGroup = new THREE.Group();
    const earthPlaceholder = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.35 })
    );
    earthPlaceholder.castShadow = true;
    contactGroup.add(earthPlaceholder);

    const earthUrls = getModelCandidateUrls('models/earth_moon.glb');
    const loadEarthModel = (idx = 0) => {
      if (idx >= earthUrls.length) return;
      gltfOrbitLoader.load(
        earthUrls[idx],
        (gltf) => {
          earthPlaceholder.visible = false;
          const es = gltf.scene;
          const b = new THREE.Box3().setFromObject(es);
          const size = b.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          es.scale.setScalar(0.48 / maxDim);
          es.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          contactGroup.add(es);
        },
        undefined,
        () => loadEarthModel(idx + 1)
      );
    };
    loadEarthModel();

    registerItem(contactGroup, {
      id: 'contact',
      emoji: '🎧',
      label: '联络交流',
      radius: 4.55,
      angle: 2.2,
      speed: 0.16,
      baseY: 0.35,
    });

    // -------------------------------------------------------------------------
    // Concentric Blue Soundwave Ripple Pool
    // -------------------------------------------------------------------------
    rippleRingsRef.current = [];
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.RingGeometry(0.18, 0.24, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4da6ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
      });
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      rippleRingsRef.current.push({
        mesh,
        active: false,
        age: 0,
        delay: i * 0.16,
      });
    }

    // -------------------------------------------------------------------------
    // Pointer Events
    // -------------------------------------------------------------------------
    const updateMouseCoords = (e: MouseEvent | PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      updateMouseCoords(e);
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateMouseCoords(e);

      if (isDraggingRef.current) {
        const deltaX = e.clientX - dragStartXRef.current;
        dragStartXRef.current = e.clientX;
        targetRotationYRef.current += deltaX * 0.013;
        return;
      }

      if (!cameraRef.current) return;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const colliders = orbitingItemsRef.current.map((g) => g.userData.collider);
      const intersects = raycaster.intersectObjects(colliders, false);

      if (intersects.length > 0) {
        const hitId = intersects[0].object.userData.orbitId as OrbitModuleId;
        const itemGroup = orbitingItemsRef.current.find((g) => g.userData.id === hitId);
        if (itemGroup) {
          if (hoveredItemRef.current !== itemGroup) {
            hoveredItemRef.current = itemGroup;
            audioEngine.playSFX('hover');
          }
          document.body.style.cursor = 'pointer';
          const screenPos = toScreenPosition(itemGroup.position);
          callbacksRef.current.onHoverOrbitItem({
            id: hitId,
            emoji: itemGroup.userData.emoji,
            label: itemGroup.userData.label,
            coords: screenPos,
          });
          return;
        }
      }

      hoveredItemRef.current = null;
      document.body.style.cursor = 'default';
      callbacksRef.current.onHoverOrbitItem(null);
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false;
      const moveDist = Math.hypot(
        e.clientX - pointerDownPosRef.current.x,
        e.clientY - pointerDownPosRef.current.y
      );
      if (moveDist > 6) return;

      updateMouseCoords(e);
      if (!cameraRef.current) return;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const colliders = orbitingItemsRef.current.map((g) => g.userData.collider);
      const intersects = raycaster.intersectObjects(colliders, false);

      if (intersects.length > 0) {
        const hitId = intersects[0].object.userData.orbitId as OrbitModuleId;
        const itemGroup = orbitingItemsRef.current.find((g) => g.userData.id === hitId);
        if (itemGroup) {
          trigger3DRippleAt(itemGroup);
          callbacksRef.current.onSelectOrbitItem(hitId);
        }
      }
    };

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('resize', handleResize);

    // -------------------------------------------------------------------------
    // Animation Loop
    // -------------------------------------------------------------------------
    const clock = new THREE.Clock();
    let blinkTimer = 0;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Update Skeletal Animations (Character & Fox)
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      if (foxMixerRef.current) {
        foxMixerRef.current.update(delta);
      }

      // Smooth rotation dampening
      currentRotationYRef.current += (targetRotationYRef.current - currentRotationYRef.current) * 0.11;
      if (characterPivotRef.current) {
        characterPivotRef.current.rotation.y = currentRotationYRef.current;

        if (characterJumpOffsetRef.current > 0 || characterJumpVelocityRef.current !== 0) {
          characterJumpOffsetRef.current += characterJumpVelocityRef.current;
          characterJumpVelocityRef.current -= 0.0065;
          if (characterJumpOffsetRef.current <= 0) {
            characterJumpOffsetRef.current = 0;
            characterJumpVelocityRef.current = 0;
          }
        }
        // Subtle floating bobbing
        characterPivotRef.current.position.y =
          0.13 + Math.sin(elapsed * 2.2) * 0.022 + characterJumpOffsetRef.current;
      }

      // Natural eye blinking on procedural 3D eyes
      blinkTimer += delta;
      if (blinkTimer > 3.4) {
        const blinkPhase = (blinkTimer - 3.4) / 0.14;
        if (blinkPhase < 1) {
          const scaleY = Math.max(0.06, Math.abs(Math.cos(blinkPhase * Math.PI)));
          if (leftEyeGroupRef.current) leftEyeGroupRef.current.scale.y = scaleY;
          if (rightEyeGroupRef.current) rightEyeGroupRef.current.scale.y = scaleY;
        } else {
          if (leftEyeGroupRef.current) leftEyeGroupRef.current.scale.y = 1;
          if (rightEyeGroupRef.current) rightEyeGroupRef.current.scale.y = 1;
          blinkTimer = 0;
        }
      }

      // Ahoge gentle swaying
      if (ahogeRef.current) {
        ahogeRef.current.rotation.z = 0.62 + Math.sin(elapsed * 3.2) * 0.06;
      }

      // Prop float
      if (outfitMeshesRef.current.laptop?.visible) {
        outfitMeshesRef.current.laptop.position.y = 0.92 + Math.sin(elapsed * 3.0) * 0.035;
      }

      // Orbiting items
      const orbitSpeedMultiplier = hoveredItemRef.current ? 0.25 : 1.0;
      orbitingItemsRef.current.forEach((group, idx) => {
        const meta = group.userData;
        meta.angle += meta.speed * delta * orbitSpeedMultiplier;
        const x = Math.cos(meta.angle) * meta.radius;
        const z = Math.sin(meta.angle) * meta.radius;
        const bobY = meta.baseY + Math.sin(elapsed * 2.6 + idx * 1.5) * 0.055;
        group.position.set(x, bobY, z);

        if (meta.orientToTangent) {
          const tangentAngle = -meta.angle;
          group.rotation.y = tangentAngle;
          group.rotation.z = Math.sin(elapsed * 2.2) * 0.12;
        } else if (meta.id === 'hobbies') {
          group.rotation.y = -meta.angle + Math.PI * 0.25;
        } else {
          group.rotation.y += delta * 0.65;
        }
      });

      // Track beads
      orbitRingsRef.current.forEach((obj) => {
        if (obj.userData?.radius) {
          obj.userData.angle += obj.userData.speed * delta;
          obj.position.set(
            Math.cos(obj.userData.angle) * obj.userData.radius,
            -0.07,
            Math.sin(obj.userData.angle) * obj.userData.radius
          );
        }
      });

      // Ripples & Floating Badge positioning
      if (activeOrbitTargetRef.current) {
        const screenPos = toScreenPosition(activeOrbitTargetRef.current.position);
        callbacksRef.current.onUpdateBadgeCoords(screenPos);

        rippleRingsRef.current.forEach((r) => {
          if (!r.active) return;
          r.age += delta * 0.95;
          if (!activeOrbitTargetRef.current) return;
          r.mesh.position.x = activeOrbitTargetRef.current.position.x;
          r.mesh.position.z = activeOrbitTargetRef.current.position.z;
          if (r.age < 0) {
            (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
            return;
          }
          const progress = r.age % 1.0;
          const scale = 0.35 + progress * 3.4;
          r.mesh.scale.set(scale, scale, scale);
          (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - progress) * 0.68);
        });
      } else {
        callbacksRef.current.onUpdateBadgeCoords(null);
        rippleRingsRef.current.forEach((r) => {
          r.active = false;
          r.mesh.visible = false;
        });
      }

      // Dressup Particles
      const particles = dressupParticlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.x += p.userData.vx;
        p.position.y += p.userData.vy;
        p.position.z += p.userData.vz;
        p.rotation.x += 0.08;
        p.rotation.y += 0.08;
        p.userData.life -= delta * 1.6;
        (p.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.userData.life);
        if (p.userData.life <= 0) {
          scene.remove(p);
          particles.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, []);

  // Update theme lighting, pedestal & rings
  useEffect(() => {
    const isDark = themeMode === 'dark';
    const lights = lightsRef.current;

    if (lights.hemiLight) {
      if (isDark) {
        lights.hemiLight.color.setHex(0x475569);
        lights.hemiLight.groundColor.setHex(0x0f172a);
        lights.hemiLight.intensity = 0.7;
      } else {
        lights.hemiLight.color.setHex(0xffffff);
        lights.hemiLight.groundColor.setHex(0xdfe4ea);
        lights.hemiLight.intensity = 0.98;
      }
    }

    if (lights.dirLight) {
      if (isDark) {
        lights.dirLight.color.setHex(0xcfd8dc);
        lights.dirLight.intensity = 0.68;
      } else {
        lights.dirLight.color.setHex(0xfff8f0);
        lights.dirLight.intensity = 0.92;
      }
    }

    if (lights.rimLight) {
      if (isDark) {
        lights.rimLight.color.setHex(currentPersona.orbitColor);
        lights.rimLight.intensity = 1.15;
      } else {
        lights.rimLight.color.setHex(0xdbeafe);
        lights.rimLight.intensity = 0.72;
      }
    }

    const pedestal = pedestalMeshesRef.current;
    if (pedestal.pedestalMat) {
      pedestal.pedestalMat.color.setHex(isDark ? 0x182234 : 0xf8fafc);
      pedestal.pedestalMat.roughness = isDark ? 0.45 : 0.28;
    }
    if (pedestal.grooveMat) {
      pedestal.grooveMat.color.setHex(isDark ? 0x223048 : 0xdce3ef);
    }
    if (pedestal.seamMat) {
      pedestal.seamMat.color.setHex(currentPersona.orbitColor);
      pedestal.seamMat.opacity = isDark ? 0.95 : 0.78;
    }
    if (pedestal.contactShadowMat) {
      pedestal.contactShadowMat.opacity = isDark ? 0.85 : 0.76;
    }

    orbitRingsRef.current.forEach((obj, idx) => {
      if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.RingGeometry) {
        (obj.material as THREE.MeshBasicMaterial).color.setHex(
          isDark ? currentPersona.orbitColor : 0xffffff
        );
        (obj.material as THREE.MeshBasicMaterial).opacity = isDark ? 0.65 : idx === 1 ? 0.75 : 0.5;
      }
    });
  }, [themeMode, currentPersona]);

  // Sync Persona outfit colors & jump hop on persona change
  useEffect(() => {
    const o = currentPersona.outfit;
    const meshes = outfitMeshesRef.current;
    if (meshes.topMat) meshes.topMat.color.setHex(o.topColor);
    if (meshes.collarMat) meshes.collarMat.color.setHex(o.collarColor);
    if (meshes.skirtMat) meshes.skirtMat.color.setHex(o.skirtColor);
    if (meshes.shoeMat) meshes.shoeMat.color.setHex(o.shoeColor);
    if (meshes.hairMat) meshes.hairMat.color.setHex(hairColor || o.hairColor);

    if (pedestalMeshesRef.current.seamMat) {
      pedestalMeshesRef.current.seamMat.color.setHex(currentPersona.orbitColor);
    }

    if (meshes.sailorCollarGroup) {
      meshes.sailorCollarGroup.visible = currentPersona.id === 'explorer';
    }
    if (meshes.hoodiePocket) {
      meshes.hoodiePocket.visible = currentPersona.id === 'creator';
    }
    if (meshes.hoodieBack) {
      meshes.hoodieBack.visible = currentPersona.id === 'creator';
    }
    if (meshes.cardiganButtons) {
      meshes.cardiganButtons.visible = currentPersona.id === 'lifestyle';
    }

    if (meshes.starClip) meshes.starClip.visible = accessories.starClip;
    if (meshes.glasses) meshes.glasses.visible = accessories.glasses;
    if (meshes.beret) meshes.beret.visible = accessories.beret;
    if (meshes.headphones) meshes.headphones.visible = accessories.headphones;

    if (meshes.laptop) meshes.laptop.visible = o.propType === 'laptop';
    if (meshes.camera) meshes.camera.visible = o.propType === 'camera';

    // Play persona hop / wave action if available
    targetRotationYRef.current += Math.PI * 2;
    characterJumpVelocityRef.current = 0.088;
    spawnDressupBurst(currentPersona.orbitColor);

    // If active model has a wave / dance action, trigger it
    if (currentActionsRef.current['Wave']) {
      const waveAction = currentActionsRef.current['Wave'];
      waveAction.reset().fadeIn(0.2).play();
      setTimeout(() => {
        waveAction.fadeOut(0.3);
      }, 1800);
    } else if (currentActionsRef.current['Dance']) {
      const danceAction = currentActionsRef.current['Dance'];
      danceAction.reset().fadeIn(0.2).play();
      setTimeout(() => {
        danceAction.fadeOut(0.4);
      }, 2000);
    }
  }, [currentPersona, accessories, hairColor]);

  // Load Model Preset or Custom GLB
  useEffect(() => {
    // 1. Procedural Mode
    if (activeModelId === 'procedural') {
      if (externalModelRef.current && characterPivotRef.current) {
        characterPivotRef.current.remove(externalModelRef.current);
        externalModelRef.current = null;
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      currentActionsRef.current = {};
      if (characterRootRef.current) {
        characterRootRef.current.visible = true;
      }
      callbacksRef.current.onModelLoadedMessage?.('已切换为纯前端手作黏土 Q 版小人');
      return;
    }

    // 2. Candidate URLs and Model Meta resolution
    let candidateUrls: string[] = [];
    let isBlob = false;
    let modelDisplayName = '';

    if (activeModelId === 'custom' && externalModelFile) {
      const blobUrl = URL.createObjectURL(externalModelFile);
      candidateUrls = [blobUrl];
      isBlob = true;
      modelDisplayName = externalModelFile.name;
    } else {
      const preset = MODEL_PRESETS.find((p) => p.id === activeModelId) || MODEL_PRESETS[0];
      modelDisplayName = preset.name;
      candidateUrls = getModelCandidateUrls(preset.path);
    }

    callbacksRef.current.onModelLoadedMessage?.(`正在载入 3D 模型【${modelDisplayName}】...`);

    let isCancelled = false;
    const loader = new GLTFLoader();
    
    // Optional DRACO decoder support for user-uploaded custom models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(dracoLoader);

    const tryLoadCandidate = (index: number) => {
      if (isCancelled) return;
      if (index >= candidateUrls.length) {
        console.error('All model candidate URLs failed to load:', candidateUrls);
        callbacksRef.current.onModelLoadedMessage?.(`载入 3D 模型【${modelDisplayName}】失败，已保留原模型`);
        return;
      }

      const targetUrl = candidateUrls[index];
      loader.load(
        targetUrl,
        (gltf) => {
          if (isCancelled || !characterPivotRef.current) return;
          if (externalModelRef.current) {
            characterPivotRef.current.remove(externalModelRef.current);
            externalModelRef.current = null;
          }
          if (mixerRef.current) {
            mixerRef.current.stopAllAction();
            mixerRef.current = null;
          }
          currentActionsRef.current = {};

          const modelScene = gltf.scene;
          externalModelRef.current = modelScene;

          // 1. Remove background Plane mesh if present
          const planeMesh = modelScene.getObjectByName('Plane');
          if (planeMesh && planeMesh.parent) {
            planeMesh.parent.remove(planeMesh);
          }

          // 2. Hide all weapon meshes for boy avatar so character is peaceful & modern
          const weaponNames = new Set([
            'One-handed Sword',
            'shield_02',
            'Two-handed Sword',
            'quiver_02',
            'arrow_02',
            'stick_02',
            'bow_03',
            'Plane',
            'shield',
            'Two_Handed_Weapon',
            'bow',
            'rope',
            'bow_H1',
            'bow_H2',
            'bow_L1',
            'bow_L2',
            'stick',
            'One_Handed_Weapon_L',
            'arrow',
            'quiver',
          ]);

          modelScene.traverse((child) => {
            if (weaponNames.has(child.name)) {
              child.visible = false;
            }
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // 3. Calibrate scale and position directly onto pedestal
          if (activeModelId === 'boy-avatar') {
            // RPG Boy has skeleton height ~1.6m; scale to 1.38 brings height to 2.22m on pedestal
            modelScene.scale.setScalar(1.38);
            modelScene.position.set(0, 0, 0);
          } else {
            // Generic bounding box sizing for user-uploaded custom models
            const box = new THREE.Box3().setFromObject(modelScene);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const targetHeight = 2.25;
            const scale = targetHeight / maxDim;
            modelScene.scale.setScalar(scale);

            const scaledBox = new THREE.Box3().setFromObject(modelScene);
            modelScene.position.y = -scaledBox.min.y;
            modelScene.position.x = -(scaledBox.min.x + scaledBox.max.x) / 2;
            modelScene.position.z = -(scaledBox.min.z + scaledBox.max.z) / 2;
          }

          // Bone Armature Animations (Idle, Wave, Dance)
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(modelScene);
            mixerRef.current = mixer;

            gltf.animations.forEach((clip) => {
              currentActionsRef.current[clip.name] = mixer.clipAction(clip);
            });

            // Play default Idle or first animation
            const idleAction =
              currentActionsRef.current['Idle'] ||
              currentActionsRef.current['idle'] ||
              mixer.clipAction(gltf.animations[0]);
            idleAction.play();
          }

          // Hide procedural mesh and show loaded GLB
          if (characterRootRef.current) {
            characterRootRef.current.visible = false;
          }
          characterPivotRef.current.add(modelScene);
          audioEngine.playSFX('dressup');
          callbacksRef.current.onModelLoadedMessage?.(`已载入：${modelDisplayName}`);
        },
        undefined,
        (err) => {
          console.warn(`Failed to load model from candidate ${index + 1}/${candidateUrls.length} (${targetUrl}):`, err);
          if (!isCancelled) {
            tryLoadCandidate(index + 1);
          }
        }
      );
    };

    tryLoadCandidate(0);

    return () => {
      isCancelled = true;
      if (isBlob && candidateUrls[0]) {
        URL.revokeObjectURL(candidateUrls[0]);
      }
    };
  }, [activeModelId, externalModelFile]);

  return <div id="canvas-container" ref={containerRef} aria-label="3D 角色与星轨交互画布" />;
};
