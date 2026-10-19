import React, { useState, useEffect, useRef } from 'react';
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
import { audioEngine } from './services/audioEngine';
import { ThreeCanvas } from './components/ThreeCanvas';
import { Header } from './components/Header';
import { InfoModal } from './components/InfoModal';
import { PortfolioDock } from './components/PortfolioDock';
import { FloatingWaveBadge } from './components/FloatingWaveBadge';
import { OrbitHoverTooltip } from './components/OrbitHoverTooltip';
import { Toast } from './components/Toast';
import { LoadingScreen } from './components/LoadingScreen';

export const App: React.FC = () => {
  // Theme Mode (Light / Dark)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const savedTheme = localStorage.getItem('avatar_portfolio_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    } catch (e) {}
    return 'light';
  });

  // Profile Configuration
  const [profileConfig] = useState<ProfileConfig>(INITIAL_PROFILE_CONFIG);

  const [currentPersonaId, setCurrentPersonaId] = useState<PersonaId>('explorer');
  const currentPersona = profileConfig.personas[currentPersonaId];

  // 3D Male Avatar Model Preset (Default to open-source GitHub model: RPG Boy)
  const [activeModelId] = useState<BuiltinModelId>(() => {
    try {
      const savedModel = localStorage.getItem('avatar_portfolio_model');
      if (savedModel && (savedModel === 'boy-avatar' || savedModel === 'procedural')) {
        return savedModel as BuiltinModelId;
      }
    } catch (e) {}
    return 'boy-avatar';
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

  const handlePlayVoice = (text: string) => {
    if (isSpeaking) {
      audioEngine.stopVoice();
    } else {
      audioEngine.playVoiceIntro(text);
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

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D WebGL Canvas */}
      <ThreeCanvas
        currentPersona={currentPersona}
        accessories={accessories}
        hairColor={hairColor}
        themeMode={themeMode}
        activeModelId={activeModelId}
        onSelectOrbitItem={handleSelectOrbitItem}
        onHoverOrbitItem={setHoverData}
        onUpdateBadgeCoords={setBadgeCoords}
        onModelLoadedMessage={showToast}
        onLoadProgress={(pct, text) => {
          setLoadingProgress(pct);
          setLoadingStatusText(text);
        }}
        onLoadComplete={() => {
          setIsLoadingComplete(true);
        }}
      />

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
        onToggleTheme={handleToggleTheme}
        onToggleBGM={handleToggleBGM}
        onToggleSFX={handleToggleSFX}
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
        currentPersonaId={currentPersonaId}
        themeMode={themeMode}
        activeOrbitModuleId={activeOrbitModuleId}
        onSelectModule={handleSelectOrbitItem}
        onSelectPersona={handleSelectPersona}
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
