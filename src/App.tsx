import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
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
import { INITIAL_PROFILE_CONFIG, HAIR_PALETTES } from './data/profileConfig';
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
import { GsapEntrance } from './components/GsapEntrance';

export const App: React.FC = () => (
  <LangProvider>
    <AppInner />
  </LangProvider>
);

const AppInner: React.FC = () => {
  // Theme Mode (Light / Dark)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const savedTheme = localStorage.getItem('avatar_portfolio_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    } catch (e) {}
    return 'light';
  });

  // Fluid Cursor: enabled + style (rainbow / star-sky)
  const [cursorEnabled, setCursorEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('avatar_portfolio_cursor_enabled');
      if (saved === '0') return false;
    } catch (e) {}
    return true;
  });
  const [cursorStyle, setCursorStyle] = useState<'rainbow' | 'star'>(() => {
    try {
      const saved = localStorage.getItem('avatar_portfolio_cursor_style');
      if (saved === 'rainbow' || saved === 'star') return saved;
    } catch (e) {}
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
    } catch (e) {}
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
  const [hairIndex, setHairIndex] = useState<number>(0);

  // Audio state
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [bgmInitialized, setBgmInitialized] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // View & Modal state
  const [activeOrbitModuleId, setActiveOrbitModuleId] = useState<OrbitModuleId | null>(null);
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
  const [loadingStatusText, setLoadingStatusText] = useState('正在初始化 3D 展台与渲染引擎...');
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);

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
    } catch (e) {}
    audioEngine.playSFX('mode');
    showToast(nextTheme === 'dark' ? '已切换至沉浸深色星轨模式 🌙' : '已切换至明亮轻拟态展台 ☀️');
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
    } catch (e) {}
    audioEngine.playSFX('tap');
    showToast(next ? '流体光标已开启 ✨' : '流体光标已关闭');
  };

  const handleSetCursorStyle = (style: 'rainbow' | 'star') => {
    setCursorStyle(style);
    try {
      localStorage.setItem('avatar_portfolio_cursor_style', style);
    } catch (e) {}
    audioEngine.playSFX('tap');
    showToast(style === 'rainbow' ? '光标样式：彩虹流体 🌈' : '光标样式：星夜流光 ✨');
  };

  const handleSelectModel = (id: BuiltinModelId) => {
    if (id === activeModelId) return;
    audioEngine.playSFX('dressup');
    setActiveModelId(id);
    try {
      localStorage.setItem('avatar_portfolio_model', id);
    } catch (e) {}
    const preset = MODEL_PRESETS.find((p) => p.id === id);
    if (preset) {
      showToast(`已召唤主角：${preset.name} ${preset.emoji}`);
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

    showToast(`已切换身份：${newPersona.name}`);
  };

  const handleToggleAccessory = (key: keyof AccessoryState) => {
    audioEngine.playSFX('tap');
    setAccessories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCycleHairColor = () => {
    audioEngine.playSFX('tap');
    const nextIdx = (hairIndex + 1) % HAIR_PALETTES.length;
    setHairIndex(nextIdx);
    setHairColor(HAIR_PALETTES[nextIdx]);
    showToast(`发色已切换 (${nextIdx + 1}/${HAIR_PALETTES.length})`);
  };

  const handleSelectOrbitItem = (moduleId: OrbitModuleId) => {
    audioEngine.playSFX('ripple');
    setActiveOrbitModuleId(moduleId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    audioEngine.stopVoice();
    audioEngine.playSFX('close');
    setIsModalOpen(false);
  };

  const handlePlayVoice = (text: string, voiceKey?: string) => {
    if (isSpeaking) {
      audioEngine.stopVoice();
    } else {
      audioEngine.playVoiceIntro(text, voiceKey ? `${voiceKey}-${lang}` : undefined);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    audioEngine.playSFX('tap');
    showToast('已成功复制到剪贴板！');
  };

  // Mobile cycle orbit
  const orbitOrder: OrbitModuleId[] = ['about', 'projects', 'hobbies', 'contact'];
  const [mobileOrbitIndex, setMobileOrbitIndex] = useState(0);
  const handleCycleOrbitMobile = () => {
    const nextId = orbitOrder[mobileOrbitIndex % orbitOrder.length];
    setMobileOrbitIndex((prev) => prev + 1);
    handleSelectOrbitItem(nextId);
  };

  const handleWelcomeInteract = () => {
    audioEngine.playSFX('ripple');
    showToast('切换了一条粒子文字');
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
      <Suspense fallback={null}>
        <ThreeCanvas
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
          onLoadProgress={(pct, text) => {
            setLoadingProgress(pct);          setLoadingStatusText(text);
          }}
          onLoadComplete={() => {
            setIsLoadingComplete(true);
          }}
        />
      </Suspense>

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
