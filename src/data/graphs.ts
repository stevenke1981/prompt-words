import type { GraphNode, GraphState } from '../types';
import { makeNode, newId } from '../lib/graph';

/** 以串接方式建立圖譜：nodes 依序接上輸出節點 */
function wire(nodes: GraphNode[], outputX: number, outputY: number): GraphState {
  const output = makeNode('output', outputX, outputY);
  return {
    nodes: [...nodes, output],
    edges: nodes.map((n) => ({ id: newId(), from: n.id })),
  };
}

/** 簡便：建立 category 節點並預選 */
function cat(x: number, y: number, categoryId: string, selected: string[]): GraphNode {
  const n = makeNode('category', x, y, categoryId);
  n.data = { kind: 'category', categoryId, selected };
  return n;
}

/** 簡便：建立文字節點 */
function txt(x: number, y: number, kind: 'subject' | 'action' | 'text', zh: string, en: string): GraphNode {
  const n = makeNode(kind, x, y);
  n.data = { kind, zh, en };
  return n;
}

/** 簡便：建立秒數節點 */
function dur(x: number, y: number, seconds: number): GraphNode {
  const n = makeNode('duration', x, y);
  n.data = { kind: 'duration', seconds };
  return n;
}

/** 簡便：建立導演指令節點 */
function dir(
  x: number,
  y: number,
  s: { aspectRatio?: string | null; mode?: string; audioIntent?: string | null; density?: 'compact' | 'rich' | null; antiSlop?: boolean },
): GraphNode {
  const n = makeNode('director', x, y);
  n.data = {
    kind: 'director',
    settings: {
      aspectRatio: s.aspectRatio ?? '16:9',
      mode: s.mode ?? 'T2V',
      audioIntent: s.audioIntent ?? null,
      density: s.density ?? null,
      antiSlop: s.antiSlop ?? false,
    },
  };
  return n;
}

/** 首次進入節點工作台的起始圖譜 */
export function defaultGraph(): GraphState {
  const subject = txt(40, 40, 'subject', '一位穿紅風衣的年輕女子', 'a young woman in a red trench coat');
  const action = txt(40, 280, 'action', '緩步走在雨中', 'walking slowly through the rain');
  const camera = cat(350, 30, 'camera', ['tracking']);
  const scene = cat(350, 260, 'scene', ['rainy']);
  const duration = dur(350, 500, 10);
  return wire([subject, action, camera, scene, duration], 700, 130);
}

export interface GraphSample {
  id: string;
  zh: string;
  en: string;
  desc: string;
  build: () => GraphState;
}

export const GRAPH_SAMPLES: GraphSample[] = [
  /* ── 1 ── */
  {
    id: 'cinematic-oner',
    zh: '電影感一鏡到底',
    en: 'Cinematic Oner',
    desc: '紅衣女子雨夜回眸：穩定器跟拍＋霓虹逆光＋21:9',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位穿紅風衣的年輕女子', 'a young woman in a red trench coat'),
          txt(30, 250, 'action', '緩步走在雨中，緩緩回頭望向鏡頭', 'walking slowly through the rain, turning to look at the camera'),
          cat(340, 20, 'camera', ['steadicam', 'tracking']),
          cat(340, 230, 'shot', ['mediumCloseUp']),
          cat(340, 440, 'lighting', ['neon', 'backlight']),
          cat(630, 20, 'mood', ['melancholic']),
          dur(630, 230, 15),
          dir(630, 420, { aspectRatio: '21:9', audioIntent: 'ambient', density: 'rich', antiSlop: true }),
        ],
        940,
        140,
      ),
  },
  /* ── 2 ── */
  {
    id: 'product-ad',
    zh: '產品廣告',
    en: 'Product Ad',
    desc: '香水模板＋棚拍輪廓光＋精簡密度 16:9',
    build: () => {
      const t = makeNode('template', 30, 40);
      t.data = {
        kind: 'template',
        templateId: 'product',
        values: {
          product: { zh: '一瓶琥珀色香水', en: 'an amber perfume bottle' },
          feature: { zh: '緩慢旋轉，液體飛濺', en: 'slowly rotating, liquid splashing' },
          background: { zh: '純黑背景', en: 'a pure black background' },
        },
        selectValues: { camera: ['sliderReveal'], lighting: ['studio'] },
      };
      return wire([t, cat(380, 40, 'lighting', ['rimLight']), dur(380, 280, 10), dir(380, 470, { audioIntent: 'score', density: 'compact', antiSlop: true })], 720, 130);
    },
  },
  /* ── 3 ── */
  {
    id: 'timeline-multi',
    zh: '多鏡頭時間軸',
    en: 'Multi-shot Timeline',
    desc: '竹林武士三節拍，時間軸接管動作',
    build: () => {
      const tl = makeNode('timeline', 340, 30);
      tl.data = {
        kind: 'timeline',
        beats: [
          { id: newId(), start: 0, end: 3, zh: '竹林大遠景，霧氣流動', en: 'extreme wide of bamboo forest, mist drifting' },
          { id: newId(), start: 3, end: 6, zh: '武士緩步穿過竹徑', en: 'samurai walks along the bamboo path' },
          { id: newId(), start: 6, end: 8, zh: '猛然轉身拔刀', en: 'suddenly turning and drawing the blade' },
        ],
      };
      return wire(
        [
          txt(30, 30, 'subject', '一位戴斗笠的原創武士', 'an original samurai in a straw hat'),
          cat(30, 260, 'camera', ['lateralTrack', 'crashZoom']),
          tl,
          dur(340, 360, 10),
          dir(650, 30, { aspectRatio: 'auto', audioIntent: 'sound-design' }),
        ],
        960,
        120,
      );
    },
  },
  /* ── 4 ── */
  {
    id: 'anime-sakura',
    zh: '動漫少女櫻花',
    en: 'Anime Sakura Girl',
    desc: '粉髮少女櫻花樹下奔跑，動漫風格＋夢幻氛圍',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位粉髮飄逸的少女', 'a girl with flowing pink hair'),
          txt(30, 250, 'action', '在櫻花樹下歡快奔跑', 'running joyfully under cherry blossom trees'),
          cat(340, 20, 'style', ['anime']),
          cat(340, 230, 'camera', ['tracking', 'pushIn']),
          cat(340, 440, 'mood', ['dreamy', 'joyful']),
          cat(630, 20, 'lighting', ['soft', 'goldenHour']),
          dur(630, 230, 10),
        ],
        940,
        120,
      ),
  },
  /* ── 5 ── */
  {
    id: 'horror-chase',
    zh: '恐怖片追逐',
    en: 'Horror Chase',
    desc: '手持攝影＋低調明暗＋不祥氛圍，廢墟追逐',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位驚恐回頭的年輕女子', 'a terrified young woman looking back'),
          txt(30, 250, 'action', '在黑暗走廊中全力奔跑', 'sprinting through a dark corridor'),
          cat(340, 20, 'camera', ['handheld', 'tracking']),
          cat(340, 230, 'scene', ['ruins']),
          cat(340, 440, 'lighting', ['lowKeyChiaroscuro']),
          cat(630, 20, 'mood', ['ominous', 'tense']),
          cat(630, 210, 'pacing', ['fastPaced']),
          dur(630, 420, 10),
          dir(920, 30, { aspectRatio: '21:9', audioIntent: 'sound-design', antiSlop: true }),
        ],
        920,
        280,
      ),
  },
  /* ── 6 ── */
  {
    id: 'nature-timelapse',
    zh: '自然延時攝影',
    en: 'Nature Timelapse',
    desc: '山脈雲海延時＋黃金時刻光線',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '壯麗山脈與流動雲海', 'majestic mountains with flowing clouds'),
          cat(340, 20, 'camera', ['static']),
          cat(340, 230, 'pacing', ['timeLapse']),
          cat(340, 440, 'lighting', ['goldenHour']),
          cat(630, 20, 'mood', ['peaceful', 'epic']),
          cat(630, 210, 'quality', ['hdr', 'colorGraded']),
          dur(630, 420, 15),
          dir(920, 30, { aspectRatio: '16:9', audioIntent: 'ambient' }),
        ],
        920,
        280,
      ),
  },
  /* ── 7 ── */
  {
    id: 'portrait-beauty',
    zh: '人像美妝特寫',
    en: 'Portrait Beauty',
    desc: '85mm 淺景深特寫＋窗光柔光＋浪漫氛圍',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位銀髮優雅的老奶奶', 'an elegant silver-haired grandmother'),
          txt(30, 250, 'action', '微笑著望向鏡頭', 'smiling gently at the camera'),
          cat(340, 20, 'shot', ['closeUp']),
          cat(340, 230, 'lens', ['lens85']),
          cat(340, 440, 'lighting', ['windowSoft']),
          cat(630, 20, 'mood', ['romantic', 'nostalgic']),
          dur(630, 210, 10),
          dir(630, 400, { aspectRatio: '9:16', audioIntent: 'score' }),
        ],
        940,
        120,
      ),
  },
  /* ── 8 ── */
  {
    id: 'scifi-portal',
    zh: '科幻傳送門',
    en: 'Sci-fi Portal',
    desc: '太空人面對發光傳送門＋體積光＋史詩氛圍',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位頭盔映著星光的太空人', 'an astronaut with starlight on the visor'),
          txt(30, 250, 'action', '緩步走向發光的傳送門', 'walking slowly toward a glowing portal'),
          cat(340, 20, 'scene', ['space']),
          cat(340, 230, 'camera', ['pushIn', 'orbit']),
          cat(340, 440, 'lighting', ['volumetric']),
          cat(630, 20, 'vfx', ['portal', 'particles']),
          cat(630, 210, 'mood', ['epic', 'mysterious']),
          dur(630, 420, 15),
          dir(920, 30, { aspectRatio: '21:9', mode: 'T2V', audioIntent: 'score', density: 'rich', antiSlop: true }),
        ],
        920,
        280,
      ),
  },
  /* ── 9 ── */
  {
    id: 'documentary-street',
    zh: '街頭紀錄片',
    en: 'Street Documentary',
    desc: '手持街拍＋陰天柔光＋真實電影風格',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位在街頭賣花的老人', 'an elderly street flower vendor'),
          txt(30, 250, 'action', '低頭整理花束，抬頭微笑', 'arranging flowers, then looking up with a smile'),
          cat(340, 20, 'camera', ['handheldBreath']),
          cat(340, 230, 'style', ['verite', 'streetPhoto']),
          cat(340, 440, 'lighting', ['overcastSoft']),
          cat(630, 20, 'scene', ['urban']),
          dur(630, 210, 15),
          dir(630, 400, { aspectRatio: '16:9', audioIntent: 'ambient' }),
        ],
        940,
        120,
      ),
  },
  /* ── 10 ── */
  {
    id: 'music-video',
    zh: '音樂錄影帶',
    en: 'Music Video',
    desc: '街頭舞者即興＋霓虹燈＋快節奏卡點',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位在街頭即興的舞者', 'a street dancer improvising'),
          txt(30, 250, 'action', '隨節奏旋轉跳躍', 'spinning and leaping to the beat'),
          cat(340, 20, 'camera', ['orbit', 'crashZoom']),
          cat(340, 230, 'scene', ['neonAlley']),
          cat(340, 440, 'lighting', ['neon']),
          cat(630, 20, 'pacing', ['fastPaced']),
          cat(630, 210, 'style', ['commercial']),
          dur(630, 420, 15),
          dir(920, 30, { aspectRatio: '9:16', audioIntent: 'beat-sync', density: 'rich' }),
        ],
        920,
        280,
      ),
  },
  /* ── 11 ── */
  {
    id: 'car-commercial',
    zh: '汽車廣告',
    en: 'Car Commercial',
    desc: '鍍鉻跑車公路飛馳＋變形鏡頭光暈',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一台鍍鉻復古跑車', 'a chrome vintage sports car'),
          txt(30, 250, 'action', '在開闊公路上高速飛馳', 'speeding along an open highway'),
          cat(340, 20, 'camera', ['tracking', 'lateralTrack']),
          cat(340, 230, 'scene', ['highway']),
          cat(340, 440, 'lighting', ['goldenHour', 'lensFlare']),
          cat(630, 20, 'style', ['autoAd']),
          cat(630, 210, 'quality', ['colorGraded', 'hdr']),
          dur(630, 420, 10),
          dir(920, 30, { aspectRatio: '21:9', audioIntent: 'score', density: 'compact', antiSlop: true }),
        ],
        920,
        280,
      ),
  },
  /* ── 12 ── */
  {
    id: 'food-asmr',
    zh: '美食 ASMR',
    en: 'Food ASMR',
    desc: '微距美食特寫＋棚拍燈＋慢動作',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一碗冒著熱氣的拉麵', 'a steaming bowl of ramen'),
          txt(30, 250, 'action', '筷子夾起麵條，湯汁滴落', 'chopsticks lifting noodles, broth dripping'),
          cat(340, 20, 'shot', ['macro']),
          cat(340, 230, 'lens', ['lensMacro']),
          cat(340, 440, 'lighting', ['studio', 'warmCoolContrast']),
          cat(630, 20, 'pacing', ['slowMotion']),
          cat(630, 210, 'style', ['foodAd']),
          dur(630, 420, 10),
          dir(920, 30, { aspectRatio: '9:16', audioIntent: 'sound-design' }),
        ],
        920,
        280,
      ),
  },
  /* ── 13 ── */
  {
    id: 'wedding-cinematic',
    zh: '婚禮電影感',
    en: 'Wedding Cinematic',
    desc: '新人擁抱＋黃金時刻逆光＋浪漫氛圍',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一對穿著禮服的新人', 'a couple in wedding attire'),
          txt(30, 250, 'action', '緊緊擁抱，額頭相觸', 'embracing tightly, foreheads touching'),
          cat(340, 20, 'camera', ['pushInReveal', 'orbit']),
          cat(340, 230, 'shot', ['mediumCloseUp']),
          cat(340, 440, 'lighting', ['goldenHour', 'backlight']),
          cat(630, 20, 'mood', ['romantic', 'ethereal']),
          cat(630, 210, 'pacing', ['slowMotion']),
          dur(630, 420, 15),
          dir(920, 30, { aspectRatio: '16:9', audioIntent: 'score', density: 'rich' }),
        ],
        920,
        280,
      ),
  },
  /* ── 14 ── */
  {
    id: 'cyberpunk-neon',
    zh: '賽博朋克霓虹',
    en: 'Cyberpunk Neon',
    desc: '霓虹小巷＋全息投影＋賽博朋克風格',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位機械義肢的駭客少女', 'a hacker girl with cybernetic arms'),
          txt(30, 250, 'action', '在霓虹小巷中疾走回頭', 'speed-walking through a neon alley, glancing back'),
          cat(340, 20, 'scene', ['neonAlley']),
          cat(340, 230, 'style', ['cyberpunk']),
          cat(340, 440, 'lighting', ['neon', 'volumetric']),
          cat(630, 20, 'vfx', ['hologram', 'particles']),
          cat(630, 210, 'camera', ['tracking', 'rackFocus']),
          dur(630, 420, 10),
          dir(920, 30, { aspectRatio: '21:9', audioIntent: 'score', antiSlop: true }),
        ],
        920,
        280,
      ),
  },
  /* ── 15 ── */
  {
    id: 'underwater-dream',
    zh: '水下夢幻',
    en: 'Underwater Dream',
    desc: '發光水母深海漂浮＋體積光＋空靈氛圍',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一隻在深海中發光的水母', 'a glowing jellyfish in the deep sea'),
          txt(30, 250, 'action', '觸手緩緩飄動，光芒脈動', 'tentacles drifting, light pulsing'),
          cat(340, 20, 'scene', ['underwater']),
          cat(340, 230, 'camera', ['pushIn', 'floating']),
          cat(340, 440, 'lighting', ['volumetric']),
          cat(630, 20, 'mood', ['ethereal', 'peaceful']),
          cat(630, 210, 'pacing', ['slowMotion']),
          dur(630, 420, 15),
          dir(920, 30, { aspectRatio: '16:9', audioIntent: 'ambient' }),
        ],
        920,
        280,
      ),
  },
  /* ── 16 ── */
  {
    id: 'western-standoff',
    zh: '西部片對峙',
    en: 'Western Standoff',
    desc: '沙漠對峙＋烈日硬光＋緊張氛圍＋子彈時間',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '兩位面對面的牛仔', 'two cowboys facing each other'),
          txt(30, 250, 'action', '手懸在槍套上方，眼神對峙', 'hands hovering over holsters, locked eyes'),
          cat(340, 20, 'scene', ['desert']),
          cat(340, 230, 'camera', ['lockedOff', 'crashZoom']),
          cat(340, 440, 'lighting', ['harshSun']),
          cat(630, 20, 'mood', ['tense']),
          cat(630, 210, 'vfx', ['bulletTime']),
          cat(630, 420, 'style', ['cinematic']),
          dur(920, 30, 10),
          dir(920, 240, { aspectRatio: '21:9', audioIntent: 'sound-design', antiSlop: true }),
        ],
        920,
        450,
      ),
  },
  /* ── 17 ── */
  {
    id: 'kdrama-romance',
    zh: '韓劇浪漫',
    en: 'K-drama Romance',
    desc: '韓劇浪漫風格＋雪景＋窗光柔光＋OST 時刻',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位圍著紅圍巾的年輕女子', 'a young woman in a red scarf'),
          txt(30, 250, 'action', '在雪中回頭，髮絲飄動', 'turning in the snow, hair drifting'),
          cat(340, 20, 'style', ['kdramaRomance', 'ostMoment']),
          cat(340, 230, 'scene', ['snow']),
          cat(340, 440, 'lighting', ['windowSoft', 'soft']),
          cat(630, 20, 'mood', ['romantic', 'nostalgic']),
          cat(630, 210, 'camera', ['pushInReveal']),
          dur(630, 420, 10),
          dir(920, 30, { aspectRatio: '16:9', audioIntent: 'score' }),
        ],
        920,
        280,
      ),
  },
  /* ── 18 ── */
  {
    id: 'sports-action',
    zh: '運動動作',
    en: 'Sports Action',
    desc: '攀岩者岩壁＋手持跟拍＋爆發性動作',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一位攀在岩壁上的登山者', 'a climber on a rock face'),
          txt(30, 250, 'action', '奮力向上攀爬，肌肉緊繃', 'straining upward, muscles taut'),
          cat(340, 20, 'camera', ['handheld', 'tracking']),
          cat(340, 230, 'shot', ['mediumShot', 'lowAngle']),
          cat(340, 440, 'lighting', ['harshSun']),
          cat(630, 20, 'pacing', ['explosive']),
          cat(630, 210, 'mood', ['tense', 'energetic']),
          dur(630, 420, 10),
          dir(920, 30, { aspectRatio: '16:9', audioIntent: 'sound-design' }),
        ],
        920,
        280,
      ),
  },
  /* ── 19 ── */
  {
    id: 'abstract-particles',
    zh: '抽象粒子',
    en: 'Abstract Particles',
    desc: '發光粒子飛舞＋超現實風格＋空靈氛圍',
    build: () =>
      wire(
        [
          txt(30, 30, 'text', '無數發光粒子在虛空中飛舞聚合', 'countless glowing particles swirling and coalescing in the void'),
          cat(340, 20, 'style', ['surreal', 'minimalist']),
          cat(340, 230, 'vfx', ['particles', 'energyBeam']),
          cat(340, 440, 'lighting', ['volumetric']),
          cat(630, 20, 'mood', ['ethereal', 'mysterious']),
          cat(630, 210, 'pacing', ['gentle']),
          dur(630, 420, 10),
          dir(920, 30, { aspectRatio: '1:1', audioIntent: 'score' }),
        ],
        920,
        280,
      ),
  },
  /* ── 20 ── */
  {
    id: 'vlog-travel',
    zh: '旅行 Vlog',
    en: 'Travel Vlog',
    desc: '旅行 Vlog 手持自拍＋天台日落＋活力氛圍',
    build: () =>
      wire(
        [
          txt(30, 30, 'subject', '一個撐黃雨傘的孩子', 'a child holding a yellow umbrella'),
          txt(30, 250, 'action', '在天台上興奮地轉圈自拍', 'spinning excitedly on a rooftop, selfie style'),
          cat(340, 20, 'style', ['travelVlog', 'vlog']),
          cat(340, 230, 'camera', ['handheld']),
          cat(340, 440, 'scene', ['rooftop']),
          cat(630, 20, 'lighting', ['goldenHour']),
          cat(630, 210, 'mood', ['joyful', 'energetic']),
          dur(630, 420, 15),
          dir(920, 30, { aspectRatio: '9:16', audioIntent: 'voiceover' }),
        ],
        920,
        280,
      ),
  },
];
