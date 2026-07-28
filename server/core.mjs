import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_BODY_BYTES = 1_000_000;
const DEFAULT_DB_PATH = resolve(process.env.PROMPT_WORDS_DB ?? './data/prompt-words.db');
const PROVIDERS = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: process.env.OPENROUTER_MODEL ?? 'openai/gpt-5.4',
    envKey: 'OPENROUTER_API_KEY',
    enabled: true,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro',
    envKey: 'DEEPSEEK_API_KEY',
    enabled: true,
  },
  sakana: {
    id: 'sakana',
    name: 'Sakana AI / Fugu',
    baseUrl: process.env.SAKANA_BASE_URL ?? '',
    defaultModel: process.env.SAKANA_MODEL ?? 'fugu-ultra',
    envKey: 'SAKANA_API_KEY',
    enabled: Boolean(process.env.SAKANA_BASE_URL),
  },
  custom: {
    id: 'custom',
    name: 'OpenAI-compatible custom endpoint',
    baseUrl: process.env.CUSTOM_LLM_BASE_URL ?? '',
    defaultModel: process.env.CUSTOM_LLM_MODEL ?? '',
    envKey: 'CUSTOM_LLM_API_KEY',
    enabled: Boolean(process.env.CUSTOM_LLM_BASE_URL),
  },
};

let db;

function getDb() {
  if (db) return db;
  mkdirSync(dirname(DEFAULT_DB_PATH), { recursive: true });
  db = new DatabaseSync(DEFAULT_DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      title TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      platform TEXT NOT NULL,
      language TEXT NOT NULL,
      brief TEXT NOT NULL,
      prompt_zh TEXT NOT NULL DEFAULT '',
      prompt_en TEXT NOT NULL DEFAULT '',
      negative_prompt TEXT NOT NULL DEFAULT '',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      favorite INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompts_favorite ON prompts(favorite, created_at DESC);
  `);
  return db;
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('請求內容過大');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('JSON 格式不正確');
  }
}

function safeString(value, max = 20_000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function providerPublicConfig(provider) {
  return {
    id: provider.id,
    name: provider.name,
    defaultModel: provider.defaultModel,
    enabled: provider.enabled,
    keyConfigured: Boolean(process.env[provider.envKey]),
    note: provider.id === 'sakana' && !provider.enabled
      ? '請先在伺服器設定 SAKANA_BASE_URL；API Key 可由介面暫時輸入或使用環境變數。'
      : undefined,
  };
}

function normalizeOutput(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(cleaned);
    return {
      title: safeString(parsed.title, 160) || 'AI 影片提示詞',
      promptZh: safeString(parsed.promptZh ?? parsed.prompt_zh),
      promptEn: safeString(parsed.promptEn ?? parsed.prompt_en),
      negativePrompt: safeString(parsed.negativePrompt ?? parsed.negative_prompt, 5000),
      shotPlan: Array.isArray(parsed.shotPlan ?? parsed.shot_plan)
        ? (parsed.shotPlan ?? parsed.shot_plan).slice(0, 16).map((item) => safeString(item, 500)).filter(Boolean)
        : [],
      notes: Array.isArray(parsed.notes)
        ? parsed.notes.slice(0, 12).map((item) => safeString(item, 500)).filter(Boolean)
        : [],
    };
  } catch {
    return {
      title: 'AI 影片提示詞',
      promptZh: raw,
      promptEn: '',
      negativePrompt: '',
      shotPlan: [],
      notes: ['模型未回傳 JSON，已保留原始內容。'],
    };
  }
}

function makeSystemPrompt() {
  return `你是專業的 AI 影片提示詞導演與提示工程師。你的任務是把使用者構想改寫成可直接用於影片生成模型的精準提示詞。

必要原則：
1. 明確描述主體、動作、場景、鏡頭、運鏡、光線、色彩、材質、節奏與時間連續性。
2. 避免空泛形容詞、互相衝突的鏡頭指令、無法視覺化的抽象敘述。
3. 保持人物、服裝、道具、環境與物理狀態跨鏡頭一致。
4. 對短片建立清楚的起承轉合，必要時提供逐鏡頭節拍。
5. 不虛構使用者沒有要求的品牌、名人、著作權角色或敏感內容。
6. 僅輸出有效 JSON，不要 markdown，不要解釋。

JSON schema：
{
  "title": "簡短標題",
  "promptZh": "完整繁體中文影片提示詞",
  "promptEn": "完整英文影片提示詞",
  "negativePrompt": "應避免的畫面問題，以逗號分隔",
  "shotPlan": ["鏡頭 1", "鏡頭 2"],
  "notes": ["可選的使用提醒"]
}`;
}

function makeUserPrompt(input) {
  const languageInstruction = input.language === 'zh'
    ? '以繁體中文為主，英文欄位仍提供精簡對照。'
    : input.language === 'en'
      ? '以英文為主，繁體中文欄位仍提供精簡對照。'
      : '繁體中文與英文都要完整提供。';

  return `請產生高品質影片提示詞。

目標平台：${input.platform || '通用影片模型'}
輸出語言：${languageInstruction}
影片構想：${input.brief}
既有提示詞草稿：${input.basePrompt || '無'}
影片長度：${input.duration ? `${input.duration} 秒` : '由內容決定'}
風格與視覺方向：${input.style || '電影感、敘事清楚、視覺一致'}
運鏡偏好：${input.camera || '依內容選擇最合理運鏡'}
必須保留：${input.mustInclude || '無特別指定'}
必須避免：${input.avoid || '常見生成瑕疵、文字水印、肢體錯誤、閃爍、身份漂移'}
提示詞密度：${input.density || 'rich'}

請將概念具體化，但不要擅自改變核心意圖。`;
}

async function callProvider({ providerId, apiKey, model, input }) {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error('不支援的 AI 供應商');
  if (!provider.enabled || !provider.baseUrl) {
    throw new Error(`${provider.name} 尚未設定伺服器 Base URL`);
  }

  const token = safeString(apiKey, 10_000) || process.env[provider.envKey] || '';
  if (!token) throw new Error(`缺少 ${provider.name} API Key`);

  const selectedModel = safeString(model, 240) || provider.defaultModel;
  if (!selectedModel) throw new Error('請指定模型 ID');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL ?? 'http://localhost:5173';
    headers['X-OpenRouter-Title'] = process.env.OPENROUTER_APP_NAME ?? 'Prompt Words';
  }

  const payload = {
    model: selectedModel,
    messages: [
      { role: 'system', content: makeSystemPrompt() },
      { role: 'user', content: makeUserPrompt(input) },
    ],
    temperature: 0.7,
    max_tokens: 5000,
    response_format: { type: 'json_object' },
    stream: false,
  };

  if (providerId === 'deepseek' && selectedModel === 'deepseek-v4-pro') {
    payload.thinking = { type: 'enabled' };
    payload.reasoning_effort = 'high';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  let response;
  try {
    response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.message || text.slice(0, 600) || `HTTP ${response.status}`;
    throw new Error(`${provider.name} 呼叫失敗：${message}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('模型沒有回傳可用內容');

  return {
    provider: providerId,
    model: data?.model || selectedModel,
    usage: data?.usage ?? null,
    result: normalizeOutput(content),
  };
}

function mapPrompt(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    title: row.title,
    provider: row.provider,
    model: row.model,
    platform: row.platform,
    language: row.language,
    brief: row.brief,
    promptZh: row.prompt_zh,
    promptEn: row.prompt_en,
    negativePrompt: row.negative_prompt,
    metadata: JSON.parse(row.metadata_json || '{}'),
    favorite: Boolean(row.favorite),
  };
}

function listPrompts(url) {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 30, 1), 100);
  const favorite = url.searchParams.get('favorite');
  const database = getDb();
  const rows = favorite === 'true'
    ? database.prepare('SELECT * FROM prompts WHERE favorite = 1 ORDER BY created_at DESC LIMIT ?').all(limit)
    : database.prepare('SELECT * FROM prompts ORDER BY created_at DESC LIMIT ?').all(limit);
  return rows.map(mapPrompt);
}

function savePrompt(body) {
  const now = new Date().toISOString();
  const id = safeString(body.id, 100) || randomUUID();
  const title = safeString(body.title, 160) || '未命名影片提示詞';
  const record = {
    id,
    createdAt: now,
    updatedAt: now,
    title,
    provider: safeString(body.provider, 80) || 'manual',
    model: safeString(body.model, 240),
    platform: safeString(body.platform, 80) || 'general',
    language: safeString(body.language, 20) || 'both',
    brief: safeString(body.brief),
    promptZh: safeString(body.promptZh),
    promptEn: safeString(body.promptEn),
    negativePrompt: safeString(body.negativePrompt, 5000),
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    favorite: Boolean(body.favorite),
  };
  if (!record.promptZh && !record.promptEn) throw new Error('至少需要一個提示詞內容');

  getDb().prepare(`
    INSERT INTO prompts (
      id, created_at, updated_at, title, provider, model, platform, language,
      brief, prompt_zh, prompt_en, negative_prompt, metadata_json, favorite
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      updated_at = excluded.updated_at,
      title = excluded.title,
      provider = excluded.provider,
      model = excluded.model,
      platform = excluded.platform,
      language = excluded.language,
      brief = excluded.brief,
      prompt_zh = excluded.prompt_zh,
      prompt_en = excluded.prompt_en,
      negative_prompt = excluded.negative_prompt,
      metadata_json = excluded.metadata_json,
      favorite = excluded.favorite
  `).run(
    record.id, record.createdAt, record.updatedAt, record.title, record.provider, record.model,
    record.platform, record.language, record.brief, record.promptZh, record.promptEn,
    record.negativePrompt, JSON.stringify(record.metadata), record.favorite ? 1 : 0,
  );

  return record;
}

function toggleFavorite(id, body) {
  const row = getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(id);
  if (!row) return null;
  const favorite = typeof body.favorite === 'boolean' ? body.favorite : !Boolean(row.favorite);
  const updatedAt = new Date().toISOString();
  getDb().prepare('UPDATE prompts SET favorite = ?, updated_at = ? WHERE id = ?').run(favorite ? 1 : 0, updatedAt, id);
  return mapPrompt(getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(id));
}

function deletePrompt(id) {
  const result = getDb().prepare('DELETE FROM prompts WHERE id = ?').run(id);
  return result.changes > 0;
}

export function createApiHandler() {
  return async function apiHandler(req, res, next) {
    try {
      const origin = req.headers.origin;
      if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const url = new URL(req.url || '/', 'http://localhost');
      if (!url.pathname.startsWith('/api/')) {
        if (next) return next();
        return json(res, 404, { error: 'Not found' });
      }

      if (req.method === 'GET' && url.pathname === '/api/health') {
        return json(res, 200, { ok: true, database: DEFAULT_DB_PATH, node: process.version });
      }

      if (req.method === 'GET' && url.pathname === '/api/providers') {
        return json(res, 200, { providers: Object.values(PROVIDERS).map(providerPublicConfig) });
      }

      if (req.method === 'POST' && url.pathname === '/api/generate') {
        const body = await readJson(req);
        const brief = safeString(body.brief);
        const basePrompt = safeString(body.basePrompt);
        if (!brief && !basePrompt) throw new Error('請先輸入影片構想或建立基礎提示詞');
        const result = await callProvider({
          providerId: safeString(body.provider, 40),
          apiKey: safeString(body.apiKey, 10_000),
          model: safeString(body.model, 240),
          input: {
            brief,
            basePrompt,
            platform: safeString(body.platform, 80),
            language: safeString(body.language, 20),
            duration: Number.isFinite(body.duration) ? body.duration : null,
            style: safeString(body.style, 1000),
            camera: safeString(body.camera, 1000),
            mustInclude: safeString(body.mustInclude, 2000),
            avoid: safeString(body.avoid, 2000),
            density: safeString(body.density, 20),
          },
        });
        return json(res, 200, result);
      }

      if (req.method === 'GET' && url.pathname === '/api/prompts') {
        return json(res, 200, { prompts: listPrompts(url) });
      }

      if (req.method === 'POST' && url.pathname === '/api/prompts') {
        return json(res, 201, { prompt: savePrompt(await readJson(req)) });
      }

      const favoriteMatch = url.pathname.match(/^\/api\/prompts\/([^/]+)\/favorite$/);
      if (req.method === 'PATCH' && favoriteMatch) {
        const prompt = toggleFavorite(decodeURIComponent(favoriteMatch[1]), await readJson(req));
        return prompt ? json(res, 200, { prompt }) : json(res, 404, { error: '找不到提示詞' });
      }

      const promptMatch = url.pathname.match(/^\/api\/prompts\/([^/]+)$/);
      if (req.method === 'DELETE' && promptMatch) {
        const deleted = deletePrompt(decodeURIComponent(promptMatch[1]));
        return deleted ? json(res, 200, { ok: true }) : json(res, 404, { error: '找不到提示詞' });
      }

      return json(res, 404, { error: 'API endpoint not found' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      const status = message.includes('缺少') || message.includes('請') || message.includes('不支援') ? 400 : 500;
      return json(res, status, { error: message });
    }
  };
}
