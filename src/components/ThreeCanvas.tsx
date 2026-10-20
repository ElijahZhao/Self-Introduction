import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MODEL_PRESETS } from '../data/modelsConfig';
import { getModelCandidateUrls } from '../utils/assetUrl';
import gsap from 'gsap';
import { useLang } from '../i18n';
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

interface ActiveShockwave {
  group: THREE.Group;
  primaryRing: THREE.Mesh;
  glowRing: THREE.Mesh;
  sparkles: THREE.Mesh[];
  age: number;
  duration: number;
  maxScale: number;
}

interface ActivePunch {
  group: THREE.Group;
  baseScale: THREE.Vector3;
  timer: number;
  duration: number;
}

// Boost base-color texture saturation without touching scene lighting.
// Re-renders the texture through a canvas with CSS saturate filter, keeps
// brightness (lighting domain) untouched. Returns a new texture (or the
// original when canvas/filter is unavailable).
const boostTextureSaturation = (tex: THREE.Texture | null, factor: number): THREE.Texture | null => {
  if (!tex || !tex.image) return tex;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement;
  if (!img || !img.width || !img.height) return tex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return tex;
    ctx.filter = `saturate(${factor})`;
    ctx.drawImage(img as CanvasImageSource, 0, 0);
    const boosted = new THREE.CanvasTexture(canvas);
    boosted.colorSpace = tex.colorSpace;
    boosted.flipY = tex.flipY;
    boosted.wrapS = tex.wrapS;
    boosted.wrapT = tex.wrapT;
    boosted.anisotropy = tex.anisotropy;
    tex.dispose();
    return boosted;
  } catch {
    // fallback: keep original texture on any canvas/filter failure
    return tex;
  }
};


interface ThreeCanvasProps {
  currentPersona: PersonaConfig;
  accessories: AccessoryState;
  hairColor: number;
  themeMode: ThemeMode;
  activeModelId: BuiltinModelId;
  onSelectOrbitItem: (moduleId: OrbitModuleId) => void;
  onHoverOrbitItem: (item: { id: OrbitModuleId; emoji: string; label: string; coords: ScreenCoord } | null) => void;
  onUpdateBadgeCoords: (coords: ScreenCoord | null) => void;
  onModelLoadedMessage?: (msg: string) => void;
  onLoadProgress?: (progress: number, statusText: string) => void;
  onLoadComplete?: () => void;
  onWelcomeInteract?: () => void;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  currentPersona,
  accessories,
  hairColor,
  themeMode,
  activeModelId,
  onSelectOrbitItem,
  onHoverOrbitItem,
  onUpdateBadgeCoords,
  onModelLoadedMessage,
  onLoadProgress,
  onLoadComplete,
  onWelcomeInteract,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // References to 3D scene objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterPivotRef = useRef<THREE.Group | null>(null);
  const externalModelRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionsRef = useRef<{ [key: string]: THREE.AnimationAction }>({});
  const activeOrbitTargetRef = useRef<THREE.Group | null>(null);
  // Drone-swarm welcome text (points sampled from canvas-rendered text)
  const textPointsRef = useRef<THREE.Points | null>(null);
  const textGroupRef = useRef<THREE.Group | null>(null);
  const textHoverRef = useRef(false);
  const textColliderRef = useRef<THREE.Mesh | null>(null);

  // Lights & Materials for theme adaptation
  const lightsRef = useRef<{
    hemiLight?: THREE.HemisphereLight;
    dirLight?: THREE.DirectionalLight;
    fillLight?: THREE.DirectionalLight;
    rimLight?: THREE.DirectionalLight;
    themeRimLight?: THREE.PointLight;
    backHighlightLight?: THREE.DirectionalLight;
  }>({});

  const pedestalMeshesRef = useRef<{
    baseBottom?: THREE.Mesh;
    baseTop?: THREE.Mesh;
    pedestalMat?: THREE.MeshStandardMaterial;
    seamMat?: THREE.MeshBasicMaterial;
    grooveMat?: THREE.MeshBasicMaterial;
    contactShadowMat?: THREE.MeshBasicMaterial;
  }>({});

  const orbitingItemsRef = useRef<THREE.Group[]>([]);
  const orbitRingsRef = useRef<THREE.Object3D[]>([]);
  const rippleRingsRef = useRef<{ mesh: THREE.Mesh; active: boolean; age: number; delay: number }[]>([]);
  const ambientParticlesRef = useRef<{
    group: THREE.Group | null;
    mat: THREE.PointsMaterial | null;
  }>({ group: null, mat: null });
  const shockwavesRef = useRef<ActiveShockwave[]>([]);
  const punchedItemsRef = useRef<ActivePunch[]>([]);
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

  // --- Loading orchestration: real aggregated progress across every GLB ---
  // Critical set = current character + 3 interactive orbit GLBs (saturn, earth-moon,
  // pickup sphere); the paper plane is procedural and ready instantly. All decorative
  // GLBs are tracked too so the progress bar reflects true remaining work.
  const loadedModelsRef = useRef<Set<string>>(new Set());
  const criticalModelsRef = useRef<Set<string>>(new Set());
  const allModelsRef = useRef<string[]>([]);
  const releasedRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);
  const perfFrameRef = useRef(0);
  const { lang, pick } = useLang();
  // Current character path, readable from the loading orchestration callbacks
  // (force-release fallback must wait for the protagonist, never release an
  // empty pedestal ahead of it).
  const characterPathRef = useRef<string>('');
  // Fully-decoded character GLB scenes for instant persona switching. After the
  // first load, the other 4 characters are warmed in the background so a switch
  // just re-parents a ready scene instead of re-parsing Draco on the main thread.
  const characterSceneCacheRef = useRef<Map<string, THREE.Group>>(new Map());
  // GPU-pre-warmed character paths: their textures/geometry were already
  // uploaded once via renderer.compile(), so the first switch is a cheap
  // re-parent instead of a synchronous buffer upload on the critical path.
  const gpuWarmedRef = useRef<Set<string>>(new Set());

  // Keep latest callbacks in ref
  const callbacksRef = useRef({
    onSelectOrbitItem,
    onHoverOrbitItem,
    onUpdateBadgeCoords,
    onModelLoadedMessage,
    onLoadProgress,
    onLoadComplete,
    onWelcomeInteract,
  });
  useEffect(() => {
    callbacksRef.current = {
      onSelectOrbitItem,
      onHoverOrbitItem,
      onUpdateBadgeCoords,
      onModelLoadedMessage,
      onLoadProgress,
      onLoadComplete,
      onWelcomeInteract,
    };
  });

  // Report a model as arrived; recompute aggregated progress. Critical models
  // (character + interactive orbit GLBs) gate the loading-screen release, with
  // an 8s fallback timer so a slow decoration can never trap the visitor.
  const reportModelArrived = (url: string) => {
    // Once released, freeze progress at 100 — later arrivals (or the 8s
    // fallback) must not drag the LoadingScreen back below its fade-out
    // threshold of 100.
    if (releasedRef.current) return;
    loadedModelsRef.current.add(url);
    const all = allModelsRef.current;
    const total = all.length || 1;
    const done = all.filter((u) => loadedModelsRef.current.has(u)).length;
    const criticalDone =
      criticalModelsRef.current.size > 0
        ? [...criticalModelsRef.current].every((u) => loadedModelsRef.current.has(u))
        : false;
    const pct = Math.min(95, Math.round(15 + (done / total) * 80));
    const text = criticalDone
      ? pick(`正在补缀环绕装饰 (${done}/${total})…`, `Finishing decorations (${done}/${total})…`)
      : pick(`正在构筑展台 (${done}/${total})…`, `Building stage (${done}/${total})…`);
    callbacksRef.current.onLoadProgress?.(pct, text);
    if (criticalDone && !releasedRef.current) {
      releasedRef.current = true;
      if (releaseTimerRef.current) window.clearTimeout(releaseTimerRef.current);
      // LoadingScreen fades out only at displayPercent >= 100, so push to 100
      // on release; decorations keep streaming in underneath.
      callbacksRef.current.onLoadProgress?.(100, pick('展台就绪，正在补缀环绕细节…','Stage ready, finishing details…'));
      callbacksRef.current.onLoadComplete?.();
    }
  };

  const forceReleaseLoading = () => {
    if (releasedRef.current) return;
    // The protagonist is the core of the pedestal: the 8s fallback exists so a
    // slow decoration can never trap the visitor, but it must NOT release ahead
    // of the character (that produced an empty stage). If the character has not
    // arrived yet, skip — reportModelArrived() re-checks on arrival.
    if (!loadedModelsRef.current.has(characterPathRef.current)) return;
    releasedRef.current = true;
    callbacksRef.current.onLoadProgress?.(100, pick('展台就绪','Ready'));
    callbacksRef.current.onLoadComplete?.();
  };

  // Background byte-prefetch of the other 4 character GLBs via THREE.Cache, so
  // switching personas later skips the network round-trip on weak connections.
  const prefetchCharacterModels = (currentPath: string) => {
    THREE.Cache.enabled = true;
    MODEL_PRESETS.forEach((p) => {
      if (p.path === currentPath) return;
      const url = getModelCandidateUrls(p.path)[0];
      if (!url || THREE.Cache.get(url)) return;
      fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.arrayBuffer();
        })
        .then((buf) => {
          try {
            THREE.Cache.add(url, buf);
          } catch (e) {}
        })
        .catch(() => {});
    });
  };

  // Shared character polish used by both the live loader and the warm cache:
  // vinyl material tuning + pedestal calibration (same rules for both paths so
  // a warmed scene is visually identical to one loaded on demand).
  const prepareCharacterScene = (scene: THREE.Object3D) => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const m = (child as THREE.Mesh).material;
        if (m && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const stdMat = m as THREE.MeshStandardMaterial;
          stdMat.roughness = 0.65;
          stdMat.metalness = Math.max(stdMat.metalness ?? 0.05, 0.08);
          stdMat.envMapIntensity = 0.7;
          stdMat.map = boostTextureSaturation(stdMat.map, 1.25);
        }
      }
    });

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetHeight = 2.25;
    const scale = targetHeight / maxDim;
    scene.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(scene);
    scene.position.y = -scaledBox.min.y;
    scene.position.x = -(scaledBox.min.x + scaledBox.max.x) / 2;
    scene.position.z = -(scaledBox.min.z + scaledBox.max.z) / 2;

    // Persist the pedestal calibration so a warmed/cached scene can be reset to
    // its exact pose before each entrance animation (entrance tweens scale/y and
    // must never accumulate across rapid switches).
    scene.userData.pedestal = {
      scale,
      x: scene.position.x,
      y: scene.position.y,
      z: scene.position.z,
    };
  };

  // Entrance animation pool: 5 distinct arrival motions, picked at random on
  // every persona switch. Each entry starts from a deliberate off-pedestal pose
  // and lands exactly on the calibrated pose, so warmed/cached scenes never
  // accumulate tween state across rapid switches.
  type EntranceAnim = (scene: THREE.Object3D, s0: number, y0: number) => void;
  const entranceAnimations: EntranceAnim[] = [
    // 1. Spring pop: scale up with overshoot + rise
    (scene, s0, y0) => {
      scene.scale.setScalar(s0 * 0.8);
      scene.position.y = y0 - 0.38;
      gsap.to(scene.scale, { x: s0, y: s0, z: s0, duration: 0.55, ease: 'back.out(1.4)' });
      gsap.to(scene.position, { y: y0, duration: 0.55, ease: 'power2.out' });
    },
    // 2. Side turn-in: swing around from a half-rotation
    (scene, s0, y0) => {
      scene.rotation.y = -Math.PI / 2;
      scene.scale.setScalar(s0 * 0.85);
      gsap.to(scene.rotation, { y: 0, duration: 0.7, ease: 'power2.out' });
      gsap.to(scene.scale, { x: s0, y: s0, z: s0, duration: 0.7, ease: 'back.out(1.6)' });
    },
    // 3. Zoom fade: pure scale-up from 0.5
    (scene, s0, y0) => {
      scene.scale.setScalar(s0 * 0.5);
      gsap.to(scene.scale, { x: s0, y: s0, z: s0, duration: 0.6, ease: 'power2.out' });
    },
    // 4. Drop from above: bouncy landing
    (scene, s0, y0) => {
      scene.position.y = y0 + 1.0;
      scene.scale.setScalar(s0 * 0.9);
      gsap.to(scene.position, { y: y0, duration: 0.8, ease: 'bounce.out' });
      gsap.to(scene.scale, { x: s0, y: s0, z: s0, duration: 0.5, ease: 'power2.out' });
    },
    // 5. Jelly wobble: overshoot then settle
    (scene, s0, y0) => {
      scene.scale.setScalar(s0 * 0.7);
      scene.position.y = y0 - 0.2;
      gsap.to(scene.scale, {
        keyframes: [
          { x: s0 * 1.12, y: s0 * 1.12, z: s0 * 1.12, duration: 0.32 },
          { x: s0, y: s0, z: s0, duration: 0.28 },
        ],
        ease: 'power2.out',
      });
      gsap.to(scene.position, { y: y0, duration: 0.45, ease: 'power2.out' });
    },
  ];

  // Decode the other 4 character GLBs in the background (DRACO + material
  // polish + calibration) so switching personas later is an instant re-parent,
  // not a main-thread parse. Runs after each successful load; idempotent.
  // Warm the other 4 character GLBs in the background — but ONLY after the
  // loading screen has been released, one at a time (600ms stagger), and only
  // in browser idle slots. Decoding 4 × ~800KB Draco buffers simultaneously
  // right after the protagonist is ready is the main cause of the long "empty
  // pedestal" hang: it saturates the main thread and starves every other load.
  // Each decoded scene is also pushed through renderer.compile() on a hidden
  // scene so textures/geometry are already on the GPU — the first switch is
  // then a cheap re-parent instead of a synchronous upload stall.
  const warmCharacterCache = (currentPath: string) => {
    const pending = MODEL_PRESETS.filter(
      (p) => p.path !== currentPath && !characterSceneCacheRef.current.has(p.path)
    );
    if (pending.length === 0) return;
    const idleScheduler =
      (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
        .requestIdleCallback || ((cb: () => void) => window.setTimeout(cb, 0));

    pending.forEach((p, i) => {
      const url = getModelCandidateUrls(p.path)[0];
      if (!url) return;
      // Wait for the visitor to be released first, then stagger one decode per
      // ~600ms so a single frame never runs two heavy decodes back to back.
      window.setTimeout(() => {
        idleScheduler(() => {
          if (characterSceneCacheRef.current.has(p.path)) return;
          const warmLoader = new GLTFLoader();
          const warmDraco = new DRACOLoader();
          warmDraco.setDecoderPath('draco/');
          warmLoader.setDRACOLoader(warmDraco);
          warmLoader.load(
            url,
            (gltf) => {
              if (characterSceneCacheRef.current.has(p.path)) return;
              try {
                prepareCharacterScene(gltf.scene);
                characterSceneCacheRef.current.set(p.path, gltf.scene);
                // GPU pre-warm: upload geometry + WebP textures to the GL
                // context via a hidden compile scene, then drop it. Subsequent
                // switches re-parent the cached scene with zero upload stall.
                if (rendererRef.current && !gpuWarmedRef.current.has(p.path)) {
                  const hidden = new THREE.Scene();
                  hidden.add(gltf.scene);
                  if (cameraRef.current) {
                    rendererRef.current.compile(hidden, cameraRef.current);
                  }
                  hidden.remove(gltf.scene);
                  gpuWarmedRef.current.add(p.path);
                }
              } catch (e) {}
            },
            undefined,
            () => {}
          );
        });
      }, 1500 + i * 600);
    });
  };

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

  // Spawn high-impact translucent 3D expanding shockwave ring at world coordinates
  const spawn3DShockwave = (worldPos: THREE.Vector3, colorHex: number = 0x38bdf8) => {
    if (!sceneRef.current) return;
    const group = new THREE.Group();
    group.position.copy(worldPos);

    // 1. Primary High-Definition Crisp Expanding Ring
    const primaryGeo = new THREE.RingGeometry(0.82, 0.98, 64);
    const primaryMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const primaryRing = new THREE.Mesh(primaryGeo, primaryMat);
    primaryRing.rotation.x = -Math.PI / 2;
    primaryRing.scale.set(0.12, 0.12, 0.12);
    group.add(primaryRing);

    // 2. Halo Glow Ring
    const glowGeo = new THREE.RingGeometry(0.66, 0.86, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.scale.set(0.1, 0.1, 0.1);
    group.add(glowRing);

    // 3. High-Speed Radial Burst Sparks for punchy hit feedback
    const sparkles: THREE.Mesh[] = [];
    const sparkCount = 14;
    for (let i = 0; i < sparkCount; i++) {
      const spark = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.045, 0),
        new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const speed = 2.2 + Math.random() * 1.5;
      spark.userData = {
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        vy: (Math.random() - 0.5) * 0.6,
      };
      sparkles.push(spark);
      group.add(spark);
    }

    sceneRef.current.add(group);
    shockwavesRef.current.push({
      group,
      primaryRing,
      glowRing,
      sparkles,
      age: 0,
      duration: 0.55,
      maxScale: 1.85,
    });
  };

  // Elastic recoil bounce for clicked 3D objects
  const elasticPunchItem = (target: THREE.Group) => {
    const existing = punchedItemsRef.current.find((p) => p.group === target);
    if (existing) {
      existing.timer = 0;
      return;
    }
    punchedItemsRef.current.push({
      group: target,
      baseScale: target.scale.clone(),
      timer: 0,
      duration: 0.35,
    });
  };

  // Trigger blue 3D ripple around orbit item
  const trigger3DRippleAt = (targetGroup: THREE.Group) => {
    activeOrbitTargetRef.current = targetGroup;
    spawn3DShockwave(targetGroup.position, currentPersona.orbitColor || 0x38bdf8);
    elasticPunchItem(targetGroup);
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

    // Register every GLB that will stream in during this mount (character is
    // registered by its own loading effect; orbit + decor models listed here).
    const currentPreset =
      MODEL_PRESETS.find((p) => p.id === activeModelId) || MODEL_PRESETS[0];
    const characterPath = currentPreset.path;
    characterPathRef.current = characterPath;
    allModelsRef.current = [
      characterPath,
      'models/saturn.glb',
      'models/earth_moon.glb',
      'models/orb-pickup_sphere-transformed.glb',
      'models/orb-planet_5-transformed.glb',
      'models/orb-spaceship_finnthefrog-transformed.glb',
      'models/orb-rover_1-transformed.glb',
      'models/orb-rover_2-transformed.glb',
      'models/decor-speeder.glb',
      'models/decor-satellite-dish.glb',
      'models/decor-astronaut.glb',
      'models/decor-miner.glb',
      'models/decor-meteor.glb',
    ];
    criticalModelsRef.current = new Set([
      characterPath,
      'models/saturn.glb',
      'models/earth_moon.glb',
      'models/orb-pickup_sphere-transformed.glb',
    ]);
    // Fallback release: never trap the visitor behind a slow decoration.
    releaseTimerRef.current = window.setTimeout(forceReleaseLoading, 8000);

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
    renderer.toneMappingExposure = 0.7;
    rendererRef.current = renderer;

    // Orbit controls: drag to orbit around the scene, wheel/pinch to zoom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.72, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 4.6;
    controls.maxDistance = 13;
    controls.minPolarAngle = 0.3;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.rotateSpeed = 0.75;
    renderer.domElement.style.touchAction = 'none';
    controlsRef.current = controls;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio-like ambient environment (soft global fill, lifts model shading)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environmentScene = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(environmentScene, 0.04).texture;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Studio Key, Fill and Rim Lights
    // Warm soft key light with natural skin-tone tint
    const hemiLight = new THREE.HemisphereLight(0xfff0dc, 0xe8d5bc, 0.55);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffe6c4, 0.5);
    dirLight.position.set(-4.5, 5.0, 5.8);
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
    dirLight.shadow.radius = 4;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffddbb, 0.3);
    fillLight.position.set(-4.5, 3.8, 3.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe3c2, 0.6);
    rimLight.position.set(-4.2, 4.5, -4.8);
    scene.add(rimLight);

    // Dynamic Theme-based Point Light for rich volumetric rim edge lighting
    const themeRimLight = new THREE.PointLight(currentPersona.orbitColor || 0x38bdf8, 1.2, 9, 1.8);
    themeRimLight.position.set(-2.8, 2.4, -3.2);
    scene.add(themeRimLight);

    // Back glancing highlight for crisp hair and shoulder silhouette
    const backHighlightLight = new THREE.DirectionalLight(0xfff2e0, 0.45);
    backHighlightLight.position.set(3.8, 5.2, -4.5);
    scene.add(backHighlightLight);

    lightsRef.current = { hemiLight, dirLight, fillLight, rimLight, themeRimLight, backHighlightLight };

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
      const isDecorative = !meta.id;
      if (!isDecorative) {
        const collider = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 16, 16),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        collider.userData = { orbitId: meta.id };
        group.add(collider);
        group.userData = { ...meta, collider };
      } else {
        group.userData = { ...meta };
      }
      scene.add(group);
      orbitingItemsRef.current.push(group);
    };

    // -------------------------------------------------------------------------
    // Load Open-Source 3D Models for Orbiting Items (Saturn, Fox, Plane, Earth-Moon)
    // -------------------------------------------------------------------------
    const gltfOrbitLoader = new GLTFLoader();
    const orbitDracoLoader = new DRACOLoader();
    orbitDracoLoader.setDecoderPath('draco/');
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
          reportModelArrived('models/saturn.glb');
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
          reportModelArrived('models/earth_moon.glb');
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
    // Decorative Orbiting Orbs (no interaction) — Quaternius Ultimate Space Kit
    // (CC0-1.0, https://quaternius.com/packs/ultimatespacekit.html)
    // -------------------------------------------------------------------------
    const loadDecorativeOrb = (
      group: THREE.Group,
      fileName: string,
      scale: number,
      tiltDeg = 0
    ) => {
      const urls = getModelCandidateUrls(`models/${fileName}`);
      const load = (idx = 0) => {
        if (idx >= urls.length) return;
        gltfOrbitLoader.load(
          urls[idx],
          (gltf) => {
            const s = gltf.scene;
            const b = new THREE.Box3().setFromObject(s);
            const size = b.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            s.scale.setScalar(scale / maxDim);
            if (tiltDeg) s.rotation.z = THREE.MathUtils.degToRad(tiltDeg);
            s.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            group.add(s);
            reportModelArrived(`models/${fileName}`);
          },
          undefined,
          () => load(idx + 1)
        );
      };
      load();
    };

    // Tiny planet (outer-most orbit)
    const tinyPlanetGroup = new THREE.Group();
    loadDecorativeOrb(tinyPlanetGroup, 'orb-planet_5-transformed.glb', 0.4);
    registerItem(tinyPlanetGroup, {
      emoji: '🪨',
      label: '小行星',
      radius: 6.1,
      angle: 0.7,
      speed: 0.12,
      baseY: 0.1,
      orientToTangent: true,
    });

    // Spaceship (outer orbit, tilted flight pose)
    const spaceshipGroup = new THREE.Group();
    loadDecorativeOrb(spaceshipGroup, 'orb-spaceship_finnthefrog-transformed.glb', 0.5, 18);
    registerItem(spaceshipGroup, {
      emoji: '🚀',
      label: '小飞船',
      radius: 5.55,
      angle: 3.4,
      speed: 0.16,
      baseY: 0.55,
      orientToTangent: true,
    });

    // Lunar rover (mid-outer orbit, low altitude)
    const roverGroup = new THREE.Group();
    loadDecorativeOrb(roverGroup, 'orb-rover_1-transformed.glb', 0.42);
    registerItem(roverGroup, {
      emoji: '🛰️',
      label: '月球车',
      radius: 4.9,
      angle: 5.1,
      speed: 0.19,
      baseY: -0.05,
      orientToTangent: true,
    });

    // Rover mk2 (outer orbit) + glowing pickup sphere (inner decor orbit)
    const rover2Group = new THREE.Group();
    loadDecorativeOrb(rover2Group, 'orb-rover_2-transformed.glb', 0.45);
    registerItem(rover2Group, {
      emoji: '🚙',
      label: '探索车',
      radius: 5.9,
      angle: 1.9,
      speed: 0.14,
      baseY: 0.3,
      orientToTangent: true,
    });

    // -------------------------------------------------------------------------
    // Scene decorations (Kenney Space Kit, CC0-1.0, static GLBs, no textures —
    // mesh vertex colors only, so rendering is deterministic across GPUs).
    // All are pure decorations (no id → not interactive, no collider).
    // -------------------------------------------------------------------------

    // Craft Speeder A — hovering sci-fi speeder (2 m wide source)
    const decorSpeederGroup = new THREE.Group();
    loadDecorativeOrb(decorSpeederGroup, 'decor-speeder.glb', 0.55);
    registerItem(decorSpeederGroup, {
      emoji: '🏎️',
      label: '悬浮快艇',
      radius: 5.25,
      angle: 2.35,
      speed: 0.17,
      baseY: 0.5,
      orientToTangent: true,
    });

    // Satellite Dish Detailed — comms dish on the outer ring
    const decorDishGroup = new THREE.Group();
    loadDecorativeOrb(decorDishGroup, 'decor-satellite-dish.glb', 0.5);
    registerItem(decorDishGroup, {
      emoji: '📡',
      label: '卫星天线',
      radius: 6.35,
      angle: 0.15,
      speed: 0.11,
      baseY: 0.12,
      orientToTangent: true,
    });

    // Astronaut A — standing space explorer near the stage floor
    const decorAstronautGroup = new THREE.Group();
    loadDecorativeOrb(decorAstronautGroup, 'decor-astronaut.glb', 0.9);
    registerItem(decorAstronautGroup, {
      emoji: '🧑‍🚀',
      label: '宇航员',
      radius: 4.72,
      angle: 4.75,
      speed: 0.21,
      baseY: -0.05,
      orientToTangent: true,
    });

    // Craft Miner — cargo mining ship cruising the outer orbit
    const decorMinerGroup = new THREE.Group();
    loadDecorativeOrb(decorMinerGroup, 'decor-miner.glb', 0.5);
    registerItem(decorMinerGroup, {
      emoji: '⛏️',
      label: '采矿船',
      radius: 5.7,
      angle: 5.85,
      speed: 0.15,
      baseY: 0.55,
      orientToTangent: true,
    });

    // Meteor Detailed — rocky meteorite on the outermost ring
    const decorMeteorGroup = new THREE.Group();
    loadDecorativeOrb(decorMeteorGroup, 'decor-meteor.glb', 0.45);
    registerItem(decorMeteorGroup, {
      emoji: '☄️',
      label: '陨石',
      radius: 6.55,
      angle: 3.05,
      speed: 0.1,
      baseY: 0.35,
      orientToTangent: true,
    });

    const glowSphereGroup = new THREE.Group();
    loadDecorativeOrb(glowSphereGroup, 'orb-pickup_sphere-transformed.glb', 0.55);
    registerItem(glowSphereGroup, {
      id: 'hobbies',
      emoji: '🔮',
      label: '技能图谱',
      radius: 3.6,
      angle: 4.4,
      speed: 0.22,
      baseY: 0.75,
    });

    // -------------------------------------------------------------------------
    // Drone-Swarm Welcome Text ("欢迎来访者" as a particle constellation)
    // Canvas 2D → pixel sampling → THREE.Points; floats above behind the stage.
    // -------------------------------------------------------------------------
    try {
      const msg = '欢迎来访者';
      const cvs = document.createElement('canvas');
      cvs.width = 640;
      cvs.height = 180;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.font = '900 96px "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(msg, cvs.width / 2, cvs.height / 2);

        const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
        const positions: number[] = [];
        const step = 3; // sample every 3px → denser constellation
        for (let y = 0; y < cvs.height; y += step) {
          for (let x = 0; x < cvs.width; x += step) {
            const alpha = imgData[(y * cvs.width + x) * 4 + 3];
            if (alpha > 128) {
              positions.push((x - cvs.width / 2) * 0.011, -(y - cvs.height / 2) * 0.011, 0);
            }
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
          color: 0x4da6ff,
          size: 0.07,
          transparent: true,
          opacity: 0.95,
          sizeAttenuation: true,
          depthWrite: false,
        });
        const pts = new THREE.Points(geo, mat);
        const textGroup = new THREE.Group();
        textGroup.add(pts);
        textGroup.position.set(0, 3.7, -1.4);
        textGroup.rotation.x = -0.05;
        scene.add(textGroup);
        textPointsRef.current = pts;
        textGroupRef.current = textGroup;

        // Invisible collider for hover/click interaction on the welcome text
        const textCollider = new THREE.Mesh(
          new THREE.SphereGeometry(1.35, 12, 12),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        textCollider.userData = { isWelcomeText: true };
        textCollider.scale.set(2.6, 0.9, 1.2);
        textGroup.add(textCollider);
        textColliderRef.current = textCollider;
      }
    } catch (e) {
      console.warn('Drone text generation failed:', e);
    }

    // -------------------------------------------------------------------------
    // Ambient Particle Field & Saturn-style Particle Ring (decorative, no light)
    // -------------------------------------------------------------------------
    const ambientParticlesGroup = new THREE.Group();
    const particleCount = 420;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const band = i < 260 ? 0 : 1; // 0: inner soft halo, 1: outer particle ring
      const radius = band === 0
        ? 1.7 + Math.random() * 1.6
        : 3.6 + Math.random() * 1.9;
      const angle = Math.random() * Math.PI * 2;
      const yBase = band === 0
        ? 0.1 + Math.random() * 1.8
        : -0.55 + Math.random() * 1.3;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = yBase;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
      particleRadii[i] = radius;
      particleSpeeds[i] = 0.05 + Math.random() * 0.14;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: currentPersona.orbitColor || 0x5ba8ff,
      size: 0.035,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.userData = { speeds: particleSpeeds, radii: particleRadii, count: particleCount };
    ambientParticlesGroup.add(particles);
    ambientParticlesGroup.position.y = 0.15;
    scene.add(ambientParticlesGroup);
    ambientParticlesRef.current = { group: ambientParticlesGroup, mat: particleMat };

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
      // Let OrbitControls own camera drag; suppress hover feedback while dragging
      if (controlsRef.current) controlsRef.current.enabled = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateMouseCoords(e);

      if (isDraggingRef.current) {
        return; // camera orbit handled by OrbitControls
      }

      if (!cameraRef.current) return;
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Welcome-text hover (drone constellation)
      if (textColliderRef.current) {
        const textHits = raycaster.intersectObject(textColliderRef.current, false);
        if (textHits.length > 0) {
          if (!textHoverRef.current) {
            textHoverRef.current = true;
            audioEngine.playSFX('hover');
          }
          document.body.style.cursor = 'pointer';
          callbacksRef.current.onHoverOrbitItem(null);
          return;
        }
      }
      textHoverRef.current = false;

      const colliders = orbitingItemsRef.current
        .map((g) => g.userData.collider)
        .filter((c): c is THREE.Object3D => !!c);
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

      // Welcome-text tap: particle burst + shockwave + welcome callback
      if (textColliderRef.current) {
        const textHits = raycaster.intersectObject(textColliderRef.current, false);
        if (textHits.length > 0) {
          const hitP = textHits[0].point.clone();
          spawn3DShockwave(hitP, 0x4da6ff);
          audioEngine.playSFX('tap');
          callbacksRef.current.onWelcomeInteract?.();
          return;
        }
      }

      const orbitColliders = orbitingItemsRef.current
        .map((g) => g.userData.collider)
        .filter((c): c is THREE.Object3D => !!c);
      const characterHitMeshes: THREE.Object3D[] = [];
      if (characterPivotRef.current) {
        characterPivotRef.current.traverse((c) => {
          if ((c as THREE.Mesh).isMesh && c.visible) {
            characterHitMeshes.push(c);
          }
        });
      }

      const intersects = raycaster.intersectObjects([...orbitColliders, ...characterHitMeshes], true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const hitPos = hit.point;

        // Check if orbit module collider was hit
        let hitId: OrbitModuleId | null = null;
        let itemGroup: THREE.Group | undefined;
        let cur: THREE.Object3D | null = hit.object;
        while (cur) {
          if (cur.userData?.orbitId) {
            hitId = cur.userData.orbitId as OrbitModuleId;
            itemGroup = orbitingItemsRef.current.find((g) => g.userData.id === hitId);
            break;
          }
          cur = cur.parent;
        }

        if (itemGroup && hitId) {
          // Trigger high-impact 3D expanding shockwave ring at exact intersection point
          const ripplePos = hitPos.clone();
          spawn3DShockwave(ripplePos, currentPersona.orbitColor || 0x38bdf8);
          elasticPunchItem(itemGroup);
          audioEngine.playSFX('tap');
          activeOrbitTargetRef.current = itemGroup;
          callbacksRef.current.onSelectOrbitItem(hitId);
        } else if (characterPivotRef.current) {
          // Character model or center stage tapped
          const impactPos = hitPos ? hitPos.clone() : new THREE.Vector3(0, 0.13, 0);
          spawn3DShockwave(impactPos, currentPersona.orbitColor || 0x38bdf8);
          if (externalModelRef.current) {
            elasticPunchItem(externalModelRef.current);
          }
          characterJumpVelocityRef.current = 0.082;
          audioEngine.playSFX('dressup');
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
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Update orbit controls damping
      if (controlsRef.current) controlsRef.current.update();

      // Update Skeletal Animations (Character)
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      // Smooth rotation dampening
      currentRotationYRef.current += (targetRotationYRef.current - currentRotationYRef.current) * 0.11;
      const rot = currentRotationYRef.current;
      if (characterPivotRef.current) {
        characterPivotRef.current.rotation.y = rot;

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

      // Dynamic Environmental Rim & Contour Lighting micro-adjustment on model rotation
      const lights = lightsRef.current;
      if (lights.rimLight) {
        // High-angle silhouette rim light dynamically sweeps to catch hair & shoulder contours
        const rimAngle = -rot * 0.65 + Math.PI * 0.82;
        const rimDist = 5.2;
        lights.rimLight.position.set(
          Math.sin(rimAngle) * rimDist,
          4.5 + Math.sin(rot * 0.75) * 0.45,
          Math.cos(rimAngle) * rimDist
        );
      }

      if (lights.themeRimLight) {
        // Theme-colored soft volumetric point light follows opposite side at shoulder height
        const themeAngle = -rot * 0.82 - Math.PI * 0.65;
        const themeDist = 3.3;
        lights.themeRimLight.position.set(
          Math.sin(themeAngle) * themeDist,
          2.0 + Math.cos(rot * 0.5) * 0.35,
          Math.cos(themeAngle) * themeDist
        );
      }

      if (lights.backHighlightLight) {
        // Crisp hair and shoulder edge glint
        const backAngle = -rot * 0.38 + Math.PI * 1.18;
        lights.backHighlightLight.position.set(
          Math.sin(backAngle) * 4.6,
          5.0,
          Math.cos(backAngle) * 4.6
        );
      }

      if (lights.fillLight) {
        // Soft front-fill balance
        const fillAngle = -rot * 0.22 - Math.PI * 0.28;
        lights.fillLight.position.set(
          Math.sin(fillAngle) * 4.4,
          3.6,
          Math.cos(fillAngle) * 4.4
        );
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
            -0.07,            Math.sin(obj.userData.angle) * obj.userData.radius
          );
        }
      });

      // Ambient particle field: slow collective spin + per-particle bob
      const ap = ambientParticlesRef.current;
      if (ap.group && ap.mat) {
        ap.group.rotation.y += delta * 0.03;
        const posAttr = (ap.group.children[0] as THREE.Points)?.geometry.getAttribute('position');
        if (posAttr) {
          const speeds = ap.group.children[0].userData.speeds as Float32Array;
          const radii = ap.group.children[0].userData.radii as Float32Array;
          const count = speeds?.length ?? 0;
          const arr = posAttr.array as Float32Array;
          for (let i = 0; i < count; i++) {
            const angle = Math.atan2(arr[i * 3 + 2], arr[i * 3]);
            const nextAngle = angle + speeds[i] * delta;
            arr[i * 3] = Math.cos(nextAngle) * radii[i];
            arr[i * 3 + 2] = Math.sin(nextAngle) * radii[i];
            arr[i * 3 + 1] += Math.sin(elapsed * 1.4 + i) * 0.0004;
          }
          posAttr.needsUpdate = true;
        }
        ap.mat.color.set(currentPersona.orbitColor || 0x5ba8ff);
      }

      // Drone-swarm welcome text: gentle float, slow spin, breathing opacity
      if (textGroupRef.current && textPointsRef.current) {
        const tg = textGroupRef.current;
        tg.position.y = 3.7 + Math.sin(elapsed * 0.5) * 0.12;
        tg.rotation.y = Math.sin(elapsed * 0.22) * 0.18;
        const tm = textPointsRef.current.material as THREE.PointsMaterial;
        tm.opacity = 0.75 + Math.sin(elapsed * 0.9) * 0.2;
        // Hover: swell the constellation for an interactive feel
        const targetSize = textHoverRef.current ? 0.105 : 0.07;
        tm.size += (targetSize - tm.size) * Math.min(1, delta * 8);
      }

      // Update Expanding 3D Shockwave Rings (Translucent & Dissipating at Exact Hit Coordinate)
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.age += delta / sw.duration;
        if (sw.age >= 1.0) {
          scene.remove(sw.group);
          sw.primaryRing.geometry.dispose();
          (sw.primaryRing.material as THREE.Material).dispose();
          sw.glowRing.geometry.dispose();
          (sw.glowRing.material as THREE.Material).dispose();
          sw.sparkles.forEach((s) => {
            s.geometry.dispose();
            (s.material as THREE.Material).dispose();
          });
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        // Fast ease-out cubic for punchy impact
        const t = sw.age;
        const ease = 1 - Math.pow(1 - t, 3);
        const currentScale = 0.15 + ease * sw.maxScale;
        sw.primaryRing.scale.set(currentScale, currentScale, currentScale);
        sw.glowRing.scale.set(currentScale * 0.88, currentScale * 0.88, currentScale * 0.88);

        const fade = Math.max(0, 1 - t);
        (sw.primaryRing.material as THREE.MeshBasicMaterial).opacity = fade * 0.92;
        (sw.glowRing.material as THREE.MeshBasicMaterial).opacity = fade * 0.68;

        sw.sparkles.forEach((spark) => {
          spark.position.x += spark.userData.vx * delta;
          spark.position.z += spark.userData.vz * delta;
          spark.position.y += spark.userData.vy * delta;
          spark.rotation.x += 0.18;
          spark.rotation.y += 0.18;
          (spark.material as THREE.MeshBasicMaterial).opacity = fade * 0.95;
          spark.scale.setScalar(Math.max(0.08, fade));
        });
      }

      // Update Elastic Item Punches (Hit Impact Bounce)
      for (let i = punchedItemsRef.current.length - 1; i >= 0; i--) {
        const p = punchedItemsRef.current[i];
        p.timer += delta;
        if (p.timer >= p.duration) {
          p.group.scale.copy(p.baseScale);
          punchedItemsRef.current.splice(i, 1);
        } else {
          const t = p.timer / p.duration;
          // Spring overshoot oscillation
          const bounce = Math.sin(t * Math.PI * 2.5) * Math.exp(-t * 5.5) * 0.22;
          const factor = 1 + bounce;
          p.group.scale.set(p.baseScale.x * factor, p.baseScale.y * factor, p.baseScale.z * factor);
        }
      }

      // Floating Badge positioning
      if (activeOrbitTargetRef.current) {
        const screenPos = toScreenPosition(activeOrbitTargetRef.current.position);
        callbacksRef.current.onUpdateBadgeCoords(screenPos);
      } else {
        callbacksRef.current.onUpdateBadgeCoords(null);
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

      // Lightweight perf survey: log draw calls & triangle count every 120
      // frames (roughly every 2 s at 60 fps) after the first 300 frames, so
      // scene additions can be sanity-checked without a profiler.
      perfFrameRef.current++;
      if (perfFrameRef.current === 300 || perfFrameRef.current % 120 === 0) {
        const info = renderer.info.render;
        console.info(
          `[perf] frame=${perfFrameRef.current} drawCalls=${info.calls} triangles=${info.triangles}`
        );
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
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
        lights.rimLight.intensity = 1.35;
      } else {
        lights.rimLight.color.setHex(currentPersona.orbitColor);
        lights.rimLight.intensity = 0.95;
      }
    }

    if (lights.themeRimLight) {
      lights.themeRimLight.color.setHex(currentPersona.orbitColor);
      lights.themeRimLight.intensity = isDark ? 2.4 : 1.7;
    }

    if (lights.backHighlightLight) {
      lights.backHighlightLight.color.setHex(isDark ? 0xffffff : 0xfffaed);
      lights.backHighlightLight.intensity = isDark ? 0.9 : 0.72;
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

  // Sync Persona colors & jump hop on persona change
  useEffect(() => {
    if (pedestalMeshesRef.current.seamMat) {
      pedestalMeshesRef.current.seamMat.color.setHex(currentPersona.orbitColor);
    }

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

  // Load Model Preset GLB（5 个手办主角团，静态模型 + 待机浮动）
  useEffect(() => {
    // Candidate URLs and Model Meta resolution
    const preset = MODEL_PRESETS.find((p) => p.id === activeModelId) || MODEL_PRESETS[0];
    const modelDisplayName = pick(preset.name, preset.nameEn || preset.name);
    const candidateUrls = getModelCandidateUrls(preset.path);

    callbacksRef.current.onModelLoadedMessage?.(pick(`正在载入 3D 模型【${modelDisplayName}】...`, `Loading 3D model [${modelDisplayName}]...`));

    let isCancelled = false;
    const loader = new GLTFLoader();
    
    // Draco 解码器本地分发（public/draco/，随 three r160 附带），
    // 避免运行时依赖 gstatic CDN——5 个主角模型均为 Draco 编码，解码器是硬依赖
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('draco/');
    loader.setDRACOLoader(dracoLoader);

    const tryLoadCandidate = (index: number) => {
      if (isCancelled) return;
      if (index >= candidateUrls.length) {
        console.error('All model candidate URLs failed to load:', candidateUrls);
        callbacksRef.current.onModelLoadedMessage?.(pick(`载入 3D 模型【${modelDisplayName}】失败，已保留原模型`,`Failed to load [${modelDisplayName}], keeping current`));
        // Mark arrival anyway so the loading screen can never be stuck behind a
        // broken character asset (the release fallback also waits on it).
        reportModelArrived(preset.path);
        return;
      }

      const targetUrl = candidateUrls[index];
      loader.load(
        targetUrl,
        (gltf) => {
          if (isCancelled || !characterPivotRef.current) return;
          // Keep the outgoing character on stage during the switch; fade it out
          // only once the new one is ready (cross-fade, no empty pedestal gap).
          const outgoing = externalModelRef.current;
          if (mixerRef.current) {
            mixerRef.current.stopAllAction();
            mixerRef.current = null;
          }
          currentActionsRef.current = {};

          // Prefer the warm-decoded scene when available (instant switch); the
          // cache entry was already polished + calibrated by prepareCharacterScene.
          let modelScene: THREE.Group;
          const cached = characterSceneCacheRef.current.get(preset.path);
          if (cached) {
            modelScene = cached;
          } else {
            modelScene = gltf.scene;
            prepareCharacterScene(modelScene);
          }
          externalModelRef.current = modelScene;

          // Bone Armature Animations (Idle, Wave, Dance)
          if (gltf.animations && gltf.animations.length > 0 && !cached) {
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

          // Entrance animation: pick one of 5 arrival motions at random.
          // Reset to the calibrated pedestal pose first so entrance tweens
          // never accumulate on a reused (warmed) scene.
          const cal = (modelScene.userData.pedestal as
            | { scale: number; x: number; y: number; z: number }
            | undefined);
          if (cal) {
            modelScene.scale.setScalar(cal.scale);
            modelScene.position.set(cal.x, cal.y, cal.z);
          }
          const s0 = cal ? cal.scale : modelScene.scale.x;
          const y0 = cal ? cal.y : modelScene.position.y;
          const pickEntrance =
            entranceAnimations[Math.floor(Math.random() * entranceAnimations.length)];
          pickEntrance(modelScene, s0, y0);
          characterPivotRef.current.add(modelScene);

          // Fade the outgoing model out underneath the fresh entrance.
          if (outgoing && outgoing !== modelScene) {
            const oldScale = outgoing.scale.x;
            gsap.to(outgoing.scale, {
              x: oldScale * 0.88,
              y: oldScale * 0.88,
              z: oldScale * 0.88,
              duration: 0.22,
              ease: 'power2.in',
              onComplete: () => {
                characterPivotRef.current?.remove(outgoing);
              },
            });
          }

          audioEngine.playSFX('dressup');
          callbacksRef.current.onModelLoadedMessage?.(pick(`已载入：${modelDisplayName}`,`Loaded: ${modelDisplayName}`));
          // Report arrival into the aggregated loader; the loading screen is
          // released once all critical models (character + interactive orbit
          // GLBs) are in, with an 8s fallback timer that never runs ahead of
          // the protagonist.
          reportModelArrived(preset.path);
          // Byte-prefetch + full DRACO warm-decode of the other characters so
          // the next switch is instant.
          prefetchCharacterModels(preset.path);
          warmCharacterCache(preset.path);
        },
        (xhr) => {
          if (xhr.lengthComputable && xhr.total > 0) {
            const raw = Math.round((xhr.loaded / xhr.total) * 100);
            const mapped = Math.min(98, Math.max(28, Math.round(28 + raw * 0.7)));
            callbacksRef.current.onLoadProgress?.(mapped, pick(`正在加载 3D 角色 (${mapped}%)...`,`Loading 3D character (${mapped}%)...`));
          } else if (xhr.loaded > 0) {
            const approxTotal = 1.0 * 1024 * 1024;
            const approx = Math.min(95, Math.max(28, Math.round(28 + (xhr.loaded / approxTotal) * 68)));
            callbacksRef.current.onLoadProgress?.(approx, pick(`正在传输 3D 资产数据...`,`Transferring 3D assets...`));
          }
        },
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
    };
  }, [activeModelId]);

  return <div id="canvas-container" ref={containerRef} aria-label="3D 角色与星轨交互画布" />;
};
