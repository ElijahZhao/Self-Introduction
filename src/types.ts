export type PersonaId = 'explorer' | 'creator' | 'lifestyle';
export type OrbitModuleId = 'about' | 'projects' | 'hobbies' | 'contact';
export type ThemeMode = 'light' | 'dark';

export interface ActionLink {
  label: string;
  labelEn?: string;
  actionPersona?: PersonaId;
  copyText?: string;
}

export interface ProjectItem {
  name: string;
  nameEn?: string;
  tagline: string;
  taglineEn?: string;
  desc: string;
  descEn?: string;
  tech: string[];
  techEn?: string[];
  highlights: string[];
  highlightsEn?: string[];
  demoUrl?: string;
  demoUrl2?: string;
  repoUrl: string;
  accent?: string;
}

export interface OtherRepo {
  name: string;
  url: string;
}

export interface ModuleData {
  title: string;
  titleEn?: string;
  subtitle: string;
  subtitleEn?: string;
  text: string;
  textEn?: string;
  tags: string[];
  tagsEn?: string[];
  links: ActionLink[];
  projectList?: ProjectItem[];
  otherRepos?: OtherRepo[];
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
  nameEn?: string;
  emoji: string;
  badgeClass: string;
  accentHex: string;
  orbitColor: number;
  bgInner: string;
  bgOuter: string;
  bgInnerDark: string;
  bgOuterDark: string;
  desc: string;
  descEn?: string;
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

export type BuiltinModelId =
  | 'char-classic-capybara'
  | 'char-scholar'
  | 'char-worker'
  | 'char-home'
  | 'char-sports';

export interface ModelPreset {
  id: BuiltinModelId;
  name: string;
  nameEn?: string;
  source: string;
  path: string;
  desc: string;
  descEn?: string;
  emoji: string;
  hasAnimations?: boolean;
}