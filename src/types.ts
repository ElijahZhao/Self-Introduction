export type PersonaId = 'explorer' | 'creator' | 'lifestyle';
export type OrbitModuleId = 'about' | 'projects' | 'hobbies' | 'contact';
export type ThemeMode = 'light' | 'dark';

export interface ActionLink {
  label: string;
  actionPersona?: PersonaId;
  copyText?: string;
}

export interface ModuleData {
  title: string;
  subtitle: string;
  text: string;
  tags: string[];
  links: ActionLink[];
}

export interface OutfitConfig {
  topColor: number;
  collarColor: number;
  skirtColor: number;
  shoeColor: number;
  hairColor: number;
  starClip: boolean;
  glasses: boolean;
  beret: boolean;
  headphones: boolean;
  propType: 'none' | 'laptop' | 'camera';
}

export interface PersonaConfig {
  id: PersonaId;
  name: string;
  emoji: string;
  badgeClass: string;
  accentHex: string;
  orbitColor: number;
  bgInner: string;
  bgOuter: string;
  bgInnerDark: string;
  bgOuterDark: string;
  desc: string;
  outfit: OutfitConfig;
  modules: Record<OrbitModuleId, ModuleData>;
}

export interface ProfileConfig {
  name: string;
  personas: Record<PersonaId, PersonaConfig>;
}

export interface AccessoryState {
  starClip: boolean;
  glasses: boolean;
  beret: boolean;
  headphones: boolean;
}

export interface OrbitItemMeta {
  id: OrbitModuleId;
  emoji: string;
  label: string;
  radius: number;
  angle: number;
  speed: number;
  baseY: number;
  orientToTangent?: boolean;
}

export interface ScreenCoord {
  x: number;
  y: number;
}

export type BuiltinModelId = 'boy-avatar' | 'procedural' | 'custom';

export interface ModelPreset {
  id: BuiltinModelId;
  name: string;
  source: string;
  path: string;
  desc: string;
  emoji: string;
  hasAnimations?: boolean;
}
