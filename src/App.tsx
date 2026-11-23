import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { LangProvider, useLang } from './i18n';
import {
  PersonaId,
  OrbitModuleId,
  ScreenCoord,
  AccessoryState,
  ProfileConfig,
  ThemeMode,
  BuiltinModelId,
} from './types';
import { INITIAL_PROFILE_CONFIG } from './data/profileConfig';
import { MODEL_PRESETS, MODEL_IDS } from './data/modelsConfig';
import { audioEngine } from './services/audioEngine';
// Three.js is the single heaviest dependency (~1MB min). Code-split it so the
// first paint is just the UI shell + loading screen; the 3D stage (and all of
// three) loads while the visitor is already watching progress.
const ThreeCanvas = lazy(() =>
  import('./components/ThreeCanvas').then((m) => ({ default: m.ThreeCanvas }))
);
import { Header } from './components/Header';
import { InfoModal } from './components/InfoModal';
import { PortfolioDock } from './components/PortfolioDock';
import { FloatingWaveBadge } from './components/FloatingWaveBadge';
import { OrbitHoverTooltip } from './components/OrbitHoverTooltip';
import { Toast } from './components/Toast';
import { LoadingScreen } from './components/LoadingScreen';
import { AuroraBackground } from './components/AuroraBackground';
import { SplashCursor } from './components/SplashCursor';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StageFallback, StageFailureReason } from './components/StageFallback';
import { isWebGL2Supported } from './utils/webglSupport';

export const App: React.FC = () => (
  <LangProvider>
    <AppInner />
  </LangProvider>
);

// View & Modal state. A module can be opened straight from the URL (?p=about),
// which makes each section shareable and lets the phone back button close the
// card instead of leaving the site.
const MODULE_IDS: OrbitModuleId[] = ['about', 'projects', 'hobbies', 'contact'];
const readModuleFromUrl = (): OrbitModuleId | null => {
  try {
    const value = new URLSearchParams(window.location.search).get('p');
    return value && (MODULE_IDS as string[]).includes(value) ? (value as OrbitModuleId) : null;
  } catch {
    return null;
  }
};

const AppInner: React.FC = () => {
  const { lang, pick } = useLang();
  // Theme Mode (Light / Dark)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const savedTheme = localStorage.getItem('avatar_portfolio_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    } catch {}
    // First visit: respect the OS preference instead of forcing a bright stage
    // into someone who runs a dark desktop.
    try {
      if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {}
    return 'light';
  });

  // Fluid Cursor: enabled + style (rainbow / star-sky)
  const [cursorEnabled, setCursorEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('avatar_portfolio_cursor_enabled');
      if (saved === '0') return false;
    } catch {}
    return true;
  });
  const [cursorStyle, setCursorStyle] = useState<'rainbow' | 'star'>(() => {
    try {
      const saved = localStorage.getItem('avatar_portfolio_cursor_style');
      if (saved === 'rainbow' || saved === 'star') return saved;
    } catch {}
    return 'rainbow';
  });

  // Profile Configuration
  const [profileConfig] = useState<ProfileConfig>(INITIAL_PROFILE_CONFIG);

  const [currentPersonaId, setCurrentPersonaId] = useState<PersonaId>('explorer');
  const currentPersona = profileConfig.personas[currentPersonaId];

  // 3D 主角团（5 个手办模型，底部导航坞切换 + localStorage 记忆）
  const [activeModelId, setActiveModelId] = useState<BuiltinModelId>(() => {
    try {
      const savedModel = localStorage.getItem('avatar_portfolio_model');
      if (savedModel && (MODEL_IDS as string[]).includes(savedModel)) {
        return savedModel as BuiltinModelId;
      }
    } catch {}
    return 'char-classic-capybara';
  });

  // Accessory DIY state initialized from current persona outfit
  const [accessories, setAccessories] = useState<AccessoryState>({
    starClip: currentPersona.outfit.starClip,
    glasses: currentPersona.outfit.glasses,
    beret: currentPersona.outfit.beret,
    headphones: currentPersona.outfit.headphones,
  });

  const [hairColor, setHairColor] = useState<number>(currentPersona.outfit.hairColor);

  // Audio state
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [bgmInitialized, setBgmInitialized] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const initialDeepLink = useMemo(() => readModuleFromUrl(), []);
  const pendingDeepLinkRef = useRef<OrbitModuleId | null>(initialDeepLink);
  const pushedByModalRef = useRef(false);
  const [activeOrbitModuleId, setActiveOrbitModuleId] = useState<OrbitModuleId | null>(
    initialDeepLink
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Immersive fullscreen: once the browser enters fullscreen, hide all
  // navigation chrome (header controls + bottom dock) for a clean viewing
  // stage. Esc (or the floating exit button) leaves fullscreen and restores it.
  const [immersive, setImmersive] = useState(false);
  useEffect(() => {
    const onFsChange = () => setImmersive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    // Esc also exits CSS-simulated immersive mode (native fullscreen handles Esc itself)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && immersive && !document.fullscreenElement) {
        setImmersive(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('keydown', onKey);
    };
  }, [immersive]);
  const handleToggleFullscreen = () => {
    const fsApiAvailable = typeof document.documentElement.requestFullscreen === 'function';
    if (immersive) {
      // Exit: leave native fullscreen if active, then close immersive CSS mode
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setImmersive(false);
    } else {
      // Enter: prefer native Fullscreen API; fall back to pure-CSS immersive
      // mode when the API is unavailable (iOS Safari) or the call is rejected.
      if (fsApiAvailable) {
        document.documentElement.requestFullscreen().catch(() => {
          setImmersive(true);
        });
      } else {
        setImmersive(true);
      }
    }
  };

  // Hover & 3D Pinning
  const [hoverData, setHoverData] = useState<{
    id: OrbitModuleId;
    emoji: string;
    label: string;
    coords: ScreenCoord;
  } | null>(null);
  const [badgeCoords, setBadgeCoords] = useState<ScreenCoord | null>(null);

  // 3D Model Loading Progress State
  const [loadingProgress, setLoadingProgress] = useState(15);
  const [loadingStatusText, setLoadingStatusText] = useState(
    pick('正在初始化 3D 展台与渲染引擎...', 'Initializing the 3D stage...')
  );
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

  // 3D stage availability. A missing WebGL2 context used to throw inside the
  // stage effect → React unmounted the root → blank page. Probe first, and keep
  // a runtime channel for context loss / crashed renders.
  const webglSupported = useMemo(() => isWebGL2Supported(), []);
  const [stageFailure, setStageFailure] = useState<StageFailureReason | null>(null);
  // Bumping the key remounts the stage so a retry rebuilds scene state cleanly.
  const [stageKey, setStageKey] = useState(0);

  const handleReloadStage = () => {
    setStageFailure(null);
    setStageKey((k) => k + 1);
  };

  // The loading overlay only fades at 100%. If the stage can never start, the
  // overlay must not sit at 15% forever with nothing to click.
  useEffect(() => {
    if (!webglSupported || stageFailure) {
      // Deliberate: the overlay is already showing, and jumping it to 100% is
      // the only way to release it when no loader will ever report progress.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingProgress(100);
      setIsLoadingComplete(true);
      setLoadingStatusText(
        webglSupported
          ? pick('3D 展台已暂停，已切换文字模式', 'Stage paused — switched to text mode')
          : pick('当前设备不支持 WebGL2，已切换文字模式', 'WebGL2 unavailable — switched to text mode')
      );
    }
  }, [webglSupported, stageFailure, pick]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Sync background gradient colors and dark class with current persona & themeMode
  useEffect(() => {
    const isDark = themeMode === 'dark';
    document.body.classList.toggle('dark', isDark);

    const inner = isDark ? currentPersona.bgInnerDark : currentPersona.bgInner;
    const outer = isDark ? currentPersona.bgOuterDark : currentPersona.bgOuter;
    document.documentElement.style.setProperty('--bg-inner', inner);
    document.documentElement.style.setProperty('--bg-outer', outer);
    audioEngine.setPersona(currentPersonaId);
  }, [currentPersona, currentPersonaId, themeMode]);

  // Handle first user gesture to auto-wake BGM
  useEffect(() => {
    let handled = false;
    const handleFirstGesture = async () => {
      if (!handled) {
        handled = true;
        setBgmInitialized(true);
        await audioEngine.toggleBGM(true);
      }
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
    };
  }, []);

  // Listen for audio engine state changes
  useEffect(() => {
    const unsubSpeaking = audioEngine.onSpeakingChange(setIsSpeaking);
    const unsubBGM = audioEngine.onBGMChange((p) => {
      setBgmPlaying(p);
      setBgmInitialized(true);
    });
    const unsubSFX = audioEngine.onSFXChange(setSfxEnabled);

    return () => {
      unsubSpeaking();
      unsubBGM();
      unsubSFX();
    };
  }, []);

  // Handlers
  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    try {
      localStorage.setItem('avatar_portfolio_theme', nextTheme);
    } catch {}
    audioEngine.playSFX('mode');
    showToast(
      nextTheme === 'dark'
        ? pick('已切换至沉浸深色星轨模式 🌙', 'Switched to the dark starfield 🌙')
        : pick('已切换至明亮轻拟态展台 ☀️', 'Switched to the bright stage ☀️')
    );
  };

  const handleToggleBGM = async () => {
    setBgmInitialized(true);
    await audioEngine.toggleBGM();
  };

  const handleToggleSFX = () => {
    const nextState = audioEngine.toggleSFX();
    setSfxEnabled(nextState);
  };

  const handleToggleCursor = () => {
    const next = !cursorEnabled;
    setCursorEnabled(next);
    try {
      localStorage.setItem('avatar_portfolio_cursor_enabled', next ? '1' : '0');
    } catch {}
    audioEngine.playSFX('tap');
    showToast(next ? pick('流体光标已开启 ✨', 'Fluid cursor on ✨') : pick('流体光标已关闭', 'Fluid cursor off'));
  };

  const handleSetCursorStyle = (style: 'rainbow' | 'star') => {
    setCursorStyle(style);
    try {
      localStorage.setItem('avatar_portfolio_cursor_style', style);
    } catch {}
    audioEngine.playSFX('tap');
    showToast(
      style === 'rainbow'
        ? pick('光标样式：彩虹流体 🌈', 'Cursor: rainbow fluid 🌈')
        : pick('光标样式：星夜流光 ✨', 'Cursor: star trail ✨')
    );
  };

  const handleSelectModel = (id: BuiltinModelId) => {
    if (id === activeModelId) return;
    audioEngine.playSFX('dressup');
    setActiveModelId(id);
    try {
      localStorage.setItem('avatar_portfolio_model', id);
    } catch {}
    const preset = MODEL_PRESETS.find((p) => p.id === id);
    if (preset) {
      showToast(
        `${pick('已召唤主角：', 'Character summoned: ')}${pick(preset.name, preset.nameEn || preset.name)} ${preset.emoji}`
      );
    }
  };

  const handleSelectPersona = (id: PersonaId) => {
    if (id === currentPersonaId) return;
    audioEngine.playSFX('dressup');
    setCurrentPersonaId(id);

    const newPersona = profileConfig.personas[id];
    setAccessories({
      starClip: newPersona.outfit.starClip,
      glasses: newPersona.outfit.glasses,
      beret: newPersona.outfit.beret,
      headphones: newPersona.outfit.headphones,
    });
    setHairColor(newPersona.outfit.hairColor);

    showToast(
      `${pick('已切换身份：', 'Persona switched: ')}${pick(newPersona.name, newPersona.nameEn || newPersona.name)}`
    );
  };

  // Open a module and mirror it into the URL. `push` is skipped when the URL
  // already points at this module (deep-link boot) so closing it does not eat a
  // history entry that was never pushed.
  const openModuleCard = (moduleId: OrbitModuleId, options?: { push?: boolean }) => {
    const inUrl = readModuleFromUrl();
    setActiveOrbitModuleId(moduleId);
    setIsModalOpen(true);
    if (options?.push === false || inUrl === moduleId) return;
    try {
      window.history.pushState({ module: moduleId }, '', `?p=${moduleId}`);
      pushedByModalRef.current = true;
    } catch {}
  };

  const closeModuleCard = (options?: { fromPop?: boolean }) => {
    setIsModalOpen(false);
    if (options?.fromPop) return;
    if (pushedByModalRef.current) {
      // Let the browser pop the entry we pushed; popstate then syncs our state.
      pushedByModalRef.current = false;
      try {
        window.history.back();
      } catch {}
      return;
    }
    // Direct deep-link entry: drop the query instead of leaving the page.
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {}
  };

  const handleSelectOrbitItem = (moduleId: OrbitModuleId) => {
    audioEngine.playSFX('ripple');
    openModuleCard(moduleId);
  };

  const handleCloseModal = () => {
    audioEngine.stopVoice();
    audioEngine.playSFX('close');
    closeModuleCard();
  };

  // Browser back/forward drives the card, not the page.
  useEffect(() => {
    const onPopState = () => {
      pushedByModalRef.current = false;
      const moduleId = readModuleFromUrl();
      if (moduleId) {
        setActiveOrbitModuleId(moduleId);
        setIsModalOpen(true);
      } else {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // A shared ?p=about link opens the card once the stage is allowed to show;
  // opening it behind the loading overlay would just look like a black screen.
  useEffect(() => {
    if (!isLoadingComplete) return;
    const pending = pendingDeepLinkRef.current;
    if (!pending) return;
    pendingDeepLinkRef.current = null;
    openModuleCard(pending, { push: false });
  }, [isLoadingComplete]);

  const handlePlayVoice = (text: string, voiceKey?: string) => {
    if (isSpeaking) {
      audioEngine.stopVoice();
    } else {
      audioEngine.playVoiceIntro(
        text,
        voiceKey ? `${voiceKey}-${lang}` : undefined,
        (msg) => showToast(msg)
      );
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    audioEngine.playSFX('tap');
    showToast(pick('已成功复制到剪贴板！', 'Copied to clipboard!'));
  };

  const handleWelcomeInteract = () => {
    audioEngine.playSFX('ripple');
    showToast(pick('切换了一条粒子文字', 'Particle message switched'));
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* Animated aurora backdrop behind the 3D stage */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <AuroraBackground
          colorStops={
            themeMode === 'dark'
              ? ['#3b4a7a', '#1f2937', '#5b4a8a']
              : ['#dbe7ff', '#ffe9d2', '#ffd9e6']
          }
          direction="top"
          height={0.55}
          amplitude={1.2}
          blend={0.65}
          glow={0.7}
          brightness={0.55}
          layers={2}
          speed={0.8}
          lightMode={themeMode !== 'dark'}
          opacity={0.85}
        />
      </div>

      {/* Fullscreen splash cursor fluid effect (toggleable, rainbow / star-sky styles) */}
      {cursorEnabled && (
        <SplashCursor
          colors={
            cursorStyle === 'star'
              ? ['#7dd3fc', '#a78bfa', '#f0f9ff', '#67e8f9']
              : ['#4f8cff', '#2dd4bf', '#ffd166']
          }
          rainbow={cursorStyle === 'rainbow'}
          colorSpeed={cursorStyle === 'star' ? 0.35 : 0.9}
          intensity={cursorStyle === 'star' ? 0.5 : 0.7}
          size={cursorStyle === 'star' ? 0.8 : 0.9}
          swirl={2.4}
          trail={cursorStyle === 'star' ? 1.2 : 0.8}
          momentum={0.8}
          shading={0.9}
          quality="medium"
          clickSplash
          theme={themeMode === 'dark' ? 'dark' : 'light'}
          zIndex={40}
        />
      )}

      {/* 3D WebGL Canvas (lazy: three.js chunk streams in behind the loading screen) */}
      {webglSupported && !stageFailure ? (
        <ErrorBoundary
          onError={() => setStageFailure('crash')}
          fallback={() => (
            <StageFallback
              reason="crash"
              onRetry={handleReloadStage}
              onViewText={() => handleSelectOrbitItem('about')}
            />
          )}
        >
          <Suspense fallback={null}>
            <ThreeCanvas
              key={stageKey}
              currentPersona={currentPersona}
              accessories={accessories}
              hairColor={hairColor}
              themeMode={themeMode}
              activeModelId={activeModelId}
              onSelectOrbitItem={handleSelectOrbitItem}
              onHoverOrbitItem={setHoverData}
              onUpdateBadgeCoords={setBadgeCoords}
              onWelcomeInteract={handleWelcomeInteract}
              onModelLoadedMessage={showToast}
              onFatalError={(reason) => setStageFailure(reason ?? 'context-lost')}
              onLoadProgress={(pct, text) => {
                setLoadingProgress(pct);          setLoadingStatusText(text);
              }}
              onLoadComplete={() => {
                setIsLoadingComplete(true);
              }}
            />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <StageFallback
          reason={stageFailure || 'unsupported'}
          onRetry={stageFailure === 'unsupported' ? undefined : handleReloadStage}
          onViewText={() => handleSelectOrbitItem('about')}
        />
      )}

      {/* Floating 3D Audio Waveform Badge */}
      <FloatingWaveBadge coords={badgeCoords} />

      {/* Hover Tooltip for Orbiting Items */}
      <OrbitHoverTooltip hoverData={hoverData} />

      {/* Top Navigation & Status Bar */}
      <Header
        userName={profileConfig.name}
        currentPersona={currentPersona}
        themeMode={themeMode}
        bgmPlaying={bgmPlaying}
        bgmInitialized={bgmInitialized}
        sfxEnabled={sfxEnabled}
        cursorEnabled={cursorEnabled}
        cursorStyle={cursorStyle}
        immersive={immersive}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleTheme={handleToggleTheme}
        onToggleBGM={handleToggleBGM}
        onToggleSFX={handleToggleSFX}
        onToggleCursor={handleToggleCursor}
        onSetCursorStyle={handleSetCursorStyle}
      />

      {/* Center Frosted-Glass Info Modal */}
      <InfoModal
        isOpen={isModalOpen}
        moduleId={activeOrbitModuleId}
        currentPersona={currentPersona}
        themeMode={themeMode}
        isSpeaking={isSpeaking}
        onClose={handleCloseModal}
        onPlayVoice={handlePlayVoice}
        onSwitchPersona={handleSelectPersona}
        onCopyText={handleCopyText}
      />

      {/* Bottom Personal Portfolio Navigation Dock */}
      <PortfolioDock
        activeModelId={activeModelId}
        themeMode={themeMode}
        activeOrbitModuleId={activeOrbitModuleId}
        immersive={immersive}
        stageDown={!webglSupported || !!stageFailure}
        onSelectModule={handleSelectOrbitItem}
        onSelectModel={handleSelectModel}
      />

      {/* Glassmorphism Circular 3D Asset Loading Progress Indicator */}
      <LoadingScreen
        progress={loadingProgress}
        statusText={loadingStatusText}
        themeMode={themeMode}
        isComplete={isLoadingComplete}
      />

      {/* Toast Notification */}
      <Toast message={toastMessage} />
    </div>
  );
};
