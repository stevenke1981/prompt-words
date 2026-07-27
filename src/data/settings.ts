import type { Settings } from '../types';

export interface AspectRatio {
  id: string;
  label: string;
  w: number;
  h: number;
  zh: string;
  en: string;
  verified: boolean;
  note?: string;
}

export interface ModeOption {
  id: string;
  zh: string;
  en: string;
  framingZh: string;
  framingEn: string;
  note?: string;
}

export interface AudioIntent {
  id: string;
  label: string;
  zh: string;
  en: string;
  note?: string;
}

export const ASPECT_RATIOS: AspectRatio[] = [
  { id: '16:9', label: '16:9', w: 16, h: 9, zh: '16:9 橫屏', en: '16:9 horizontal / web', verified: true, note: 'Seedance aspect_ratio 參數；電影場景的最強預設。' },
  { id: '9:16', label: '9:16', w: 9, h: 16, zh: '9:16 豎屏', en: '9:16 vertical social', verified: true, note: '主體置中，避免邊緣關鍵動作。' },
  { id: '1:1', label: '1:1', w: 1, h: 1, zh: '1:1 方形', en: '1:1 square', verified: true, note: '對稱產品構圖表現佳。' },
  { id: '4:3', label: '4:3', w: 4, h: 3, zh: '4:3 標準', en: '4:3 standard', verified: true },
  { id: '3:4', label: '3:4', w: 3, h: 4, zh: '3:4 豎屏', en: '3:4 vertical', verified: true },
  { id: '21:9', label: '21:9', w: 21, h: 9, zh: '21:9 寬幅影院', en: '21:9 widescreen / cinema', verified: true, note: 'capability-map 稱之為影院格式。' },
  { id: 'auto', label: 'auto', w: 0, h: 0, zh: '自動', en: 'auto', verified: true, note: '模型依提示複雜度自動決定；多鏡頭的強預設。' },
  { id: '4:5', label: '4:5', w: 4, h: 5, zh: '4:5 資訊流', en: '4:5 feed ad', verified: false, note: '僅為創意／交付比例，非已驗證的 Seedance 渲染參數。' },
  { id: '1.85', label: '1.85', w: 185, h: 100, zh: '1.85 院線', en: '1.85 theatrical', verified: false, note: '僅為創意／交付比例，非已驗證的渲染參數。' },
  { id: '2.39', label: '2.39', w: 239, h: 100, zh: '2.39 寬銀幕', en: '2.39 widescreen drama', verified: false, note: '僅為創意／交付比例，非已驗證的渲染參數。' },
];

export const MODES: ModeOption[] = [
  {
    id: 'T2V', zh: '文生影片', en: 'Text to video',
    framingZh: '原創文生影片場景：首句給出主體，再寫一個有終點的動作、一個運鏡、物理光源與有意圖的聲音。',
    framingEn: 'Original text-to-video scene: name the subject in the first clause, then one action with an endpoint, one camera move, physical lighting, and intentional sound.',
    note: 'generate_audio 預設開啟，音訊不另計生成成本。',
  },
  {
    id: 'I2V', zh: '圖生影片', en: 'Image to video',
    framingZh: '@Image1 為參考圖；完整保留主體、產品與構圖，僅改變運動、光線與鏡頭。',
    framingEn: '@Image1 is the reference; preserve its subject, product, and composition exactly — only motion, lighting, and camera change.',
    note: '只寫影像無法呈現的部分；勿把影像欄位送到 t2v 端點。',
  },
  {
    id: 'V2V', zh: '影片編輯／延續', en: 'Video to video',
    framingZh: '@Video1 為源片段；保持相同的主體路徑與鏡頭節奏，僅改變指定的差異——不改變身份、服裝、背景佈局或運動節奏。',
    framingEn: '@Video1 is the source clip; preserve the same subject path and camera timing, and change only the stated delta — do not change identity, clothing, background layout, or motion rhythm.',
    note: 'extend 為表面條件功能；fal 無獨立 extend 端點，改以參考生影片延續。',
  },
  {
    id: 'R2V', zh: '參考生影片', en: 'Reference to video',
    framingZh: '每個參考只給一個角色並附排除：@Image1 鎖定身份；@Video1 僅參考運鏡節奏（不複製人物、場景或品牌）；@Audio1 僅參考節奏與能量。',
    framingEn: 'Give each reference exactly one role with an exclusion: @Image1 controls identity; @Video1 controls camera rhythm only (do not transfer performer, room, or logo); @Audio1 controls tempo and energy only.',
    note: '表面條件上限（fal）：@Image×9、@Video×3、@Audio×3、≤12 檔；音訊參考需 ≥1 影像或影片。',
  },
  {
    id: 'FLF2V', zh: '首尾幀生影片', en: 'First-last-frame to video',
    framingZh: '@Image1 為首幀、@Image2 為尾幀；保持同一主體、服裝與場景佈局，只生成兩幀之間的連續過渡。',
    framingEn: '@Image1 is the first frame and @Image2 is the last frame; preserve the same subject identity, outfit, and scene layout, and generate only the continuous transition between the two frames.',
    note: '欄位名稱依表面而異（first_frame/last_frame 或 promptImage 位置）。',
  },
];

export const AUDIO_INTENTS: AudioIntent[] = [
  { id: 'none', label: 'Silent', zh: '靜音／無音訊', en: 'Sound: silence — no music, no SFX, no dialogue.' },
  { id: 'ambient', label: 'Ambient', zh: '環境音', en: 'Sound: an ambience bed (room tone / location atmosphere, e.g. distant traffic, wind).' },
  { id: 'dialogue', label: 'Dialogue', zh: '對白＋口型', en: 'Dialogue: speaker says a short quoted line; locked medium close-up, no head turn during the line; reduce music/SFX under the line.' },
  { id: 'score', label: 'Score', zh: '配樂', en: 'Music: name the texture/energy (e.g. "no music until after the line"); score in post for multi-clip pieces — audio is not continuous across calls.' },
  { id: 'sound-design', label: 'Sound design', zh: '音效設計', en: 'SFX: one or two event-locked sounds at a named time (e.g. "cup lands on table at 2s"); choose ambience plus one key SFX, avoid dense competing layers.' },
  { id: 'beat-sync', label: 'Beat-sync', zh: '卡點／音訊為時鐘', en: '@Audio1 provides tempo only; tie each downbeat to exactly one visible event (a cut, a pose, a light pulse); mute video references so @Audio1 is the only clock.' },
  { id: 'voiceover', label: 'Voiceover', zh: '旁白', en: 'Voiceover narration.', note: '離畫旁白為未驗證模式；倉庫僅記錄畫內口型對白與語音參考路徑。' },
];

export const DENSITY = {
  compactWordRange: [40, 110] as const,
  compactZh: '本片段只承載一個有終點變化的可見節拍；簡短但密集，不要含糊——主體、動作、鏡頭、光線、聲音各寫一句。',
  compactEn: 'Keep this clip to one visible beat with a changed endpoint; dense, not vague — one sentence each for subject, action, camera, light, and sound.',
  richZh: '明確主投入（身份／運動／場景密度三者之一）與一個次投入，其餘刻意精簡；10–15 秒內最多 2–3 個標記鏡頭，每個鏡頭一個動作加一個運鏡。',
  richEn: 'Name the primary spend (one of identity / motion / scene density) and one secondary; economize everything else on purpose. Up to 2–3 labeled shots in a 10–15s clip, one action and one camera move each.',
};

export const ANTI_SLOP = {
  avoidZh: ['電影感', '氛圍感', '高級感', '大片感', '質感（單獨使用）', '震撼', '唯美', '史詩級', '絕美', '超高清', '8K', '4K', '傑作', '頂級品質', '酷炫轉場'],
  avoidEn: ['cinematic', 'epic', 'stunning', 'beautiful', 'dramatic', 'dynamic', 'magical', 'professional', 'ultra-realistic', '8K', '4K', 'ultra-HD', 'high quality', 'masterpiece', 'award-winning', 'trending on ArtStation', 'Unreal Engine', 'RAW', 'insanely detailed', 'highly detailed', 'visually striking', 'atmosphere of mystery', 'cool transition', 'vibey', 'no blur', 'no artifacts'],
  directiveZh: '若相機、麥克風、測光表或秒表無法檢測，就重寫。把每個感覺詞拆解成製造它的物理元素——景別＋運鏡＋速度、光源＋方向＋行為、材質＋紋理＋運動；用正面描述鎖定畫面，否定句只放在約束槽（如「無字幕、無水印」）。',
  directiveEn: 'If a camera, microphone, light meter, or stopwatch cannot detect it, rewrite it. Decompose each empty evaluator into observable production language — camera verb + speed + viewpoint, light source + direction + behavior, material + texture + motion. Lock the positive instead of naming flaws; keep negation only in the constraint slot (e.g. "no on-screen text, no watermark").',
};

export const DEFAULT_SETTINGS: Settings = {
  aspectRatio: '16:9',
  mode: 'T2V',
  audioIntent: null,
  density: null,
  antiSlop: false,
};

export function getAspectRatio(id: string | null): AspectRatio | undefined {
  return id ? ASPECT_RATIOS.find((a) => a.id === id) : undefined;
}
export function getMode(id: string): ModeOption | undefined {
  return MODES.find((m) => m.id === id);
}
export function getAudioIntent(id: string | null): AudioIntent | undefined {
  return id ? AUDIO_INTENTS.find((a) => a.id === id) : undefined;
}
