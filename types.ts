
export enum AppStep {
  TOPIC = 1,
  SCRIPT = 2,
  CHARACTERS = 3,
  PANELS = 4,
}

export type Character = {
  id: string;
  name: string;
  summary: string;
  visual: string;
  referenceImageUrl?: string;
  isGenerating?: boolean;
};

export type Dialogue = {
  by: string;
  text: string;
};

export type Overlay = {
  id:string;
  panelId: number;
  kind: 'balloon' | 'narration';
  design: 'standard' | 'rounded' | 'cloud' | 'spiky' | 'simple' | 'webtoon' | 'narration' | 'cinematic' | 'rectangle';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  speaker: string;
  style: {
    fontSize: number;
    textAlign: 'left' | 'center' | 'right';
    fontFamily: string;
    strokeWidth: number;
    lineHeight: number;
  };
  tail: { x: number; y: number; offset: number; } | null; // Pointer for the speech bubble, coords are % of panel
};

export type Panel = {
  idx: number; // 1-based index
  scene: string;
  action: string;
  dialogue: Dialogue[];
  notes: string;
  imageUrl?: string;
  isGenerating?: boolean;
  overlays: Overlay[];
  aspectRatio?: '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
};

export type Script = {
  characters: Omit<Character, 'id' | 'referenceImageUrl' | 'isGenerating'>[];
  panels: Omit<Panel, 'imageUrl' | 'isGenerating' | 'overlays' | 'aspectRatio'>[];
  tone: string;
};

export type InstagramPost = {
  caption: string;
  hashtags: string;
};

export type Project = {
  title: string;
  genre: string;
  style: string;
  format: '4-cut' | 'continuous';
  script: {
    characters: Character[];
    panels: Panel[];
    tone: string;
  } | null;
  instagramPost: InstagramPost | null;
};