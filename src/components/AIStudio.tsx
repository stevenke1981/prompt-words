import { useEffect, useMemo, useState } from 'react';
import '../ai-studio.css';
import type { Language, Platform } from '../types';
import { copyText } from '../lib/clipboard';
import { promptApi } from '../lib/api';
import type { GeneratedPrompt, PromptRecord, ProviderInfo } from '../lib/api';

interface AIStudioProps {
  basePromptZh: string;
  basePromptEn: string;
  platform: Platform;
  language: Language;
  duration: number | null;
}

const EMPTY_RESULT: GeneratedPrompt = {
  title: '',
  promptZh: '',
  promptEn: '',
  negativePrompt: '',
  shotPlan: [],
  notes: [],
};

interface ProviderCredentials {
  apiKey: string;
  baseUrl: string;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AIStudio({ basePromptZh, basePromptEn, platform, language, duration }: AIStudioProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState('openrouter');
  const [model, setModel] = useState('');
  const [credentials, setCredentials] = useState<Record<string, ProviderCredentials>>({});
  const [brief, setBrief] = useState('');
  const [style, setStyle] = useState('電影感、自然光影、角色一致、動作連續、細節清晰');
  const [camera, setCamera] = useState('依敘事使用建立鏡頭、跟拍、特寫與平滑轉場');
  const [mustInclude, setMustInclude] = useState('');
  const [avoid, setAvoid] = useState('閃爍、畫面跳動、角色身份漂移、肢體變形、文字水印、過度銳化');
  const [result, setResult] = useState<GeneratedPrompt>(EMPTY_RESULT);
  const [usedProvider, setUsedProvider] = useState('');
  const [usedModel, setUsedModel] = useState('');
  const [history, setHistory] = useState<PromptRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatabase, setShowDatabase] = useState(false);

  const activeProvider = useMemo(
    () => providers.find((item) => item.id === provider),
    [provider, providers],
  );
  const activeCredentials = credentials[provider] ?? { apiKey: '', baseUrl: '' };
  const updateCredentials = (patch: Partial<ProviderCredentials>) => {
    setCredentials((current) => {
      const currentCredentials = current[provider] ?? { apiKey: '', baseUrl: '' };
      return {
        ...current,
        [provider]: { ...currentCredentials, ...patch },
      };
    });
  };

  const basePrompt = language === 'zh'
    ? basePromptZh
    : language === 'en'
      ? basePromptEn
      : [basePromptZh, basePromptEn].filter(Boolean).join('\n\n--- English draft ---\n');

  const loadHistory = async () => {
    try {
      const data = await promptApi.list();
      setHistory(data.prompts);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法讀取資料庫');
    }
  };

  useEffect(() => {
    void promptApi.providers()
      .then(({ providers: items }) => {
        setProviders(items);
        const firstEnabled = items.find((item) => item.enabled) ?? items[0];
        if (firstEnabled) {
          setProvider(firstEnabled.id);
          setModel(firstEnabled.defaultModel);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '無法讀取供應商設定'));
    void loadHistory();
  }, []);

  useEffect(() => {
    if (activeProvider) setModel(activeProvider.defaultModel);
  }, [activeProvider]);

  const generate = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await promptApi.generate({
        provider,
        model,
        apiKey: activeCredentials.apiKey,
        baseUrl: activeCredentials.baseUrl,
        brief,
        basePrompt,
        platform,
        language,
        duration,
        style,
        camera,
        mustInclude,
        avoid,
        density: 'rich',
      });
      setResult(data.result);
      setUsedProvider(data.provider);
      setUsedModel(data.model);
      setNotice('AI 提示詞已產生。API Key 僅用於本次請求，不會寫入資料庫。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失敗');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!result.promptZh && !result.promptEn) return;
    setSaving(true);
    setError('');
    try {
      await promptApi.save({
        ...result,
        provider: usedProvider || provider,
        model: usedModel || model,
        platform,
        language,
        brief,
        metadata: { duration, style, camera, mustInclude, avoid, shotPlan: result.shotPlan, notes: result.notes },
      });
      setNotice('已存入 SQLite 資料庫。');
      await loadHistory();
      setShowDatabase(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const loadRecord = (record: PromptRecord) => {
    setResult({
      title: record.title,
      promptZh: record.promptZh,
      promptEn: record.promptEn,
      negativePrompt: record.negativePrompt,
      shotPlan: Array.isArray(record.metadata?.shotPlan) ? record.metadata.shotPlan as string[] : [],
      notes: [],
    });
    setBrief(record.brief);
    setUsedProvider(record.provider);
    setUsedModel(record.model);
    setNotice(`已載入「${record.title}」。`);
  };

  const toggleFavorite = async (record: PromptRecord) => {
    try {
      const { prompt } = await promptApi.favorite(record.id, !record.favorite);
      setHistory((current) => current.map((item) => item.id === record.id ? prompt : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失敗');
    }
  };

  const removeRecord = async (record: PromptRecord) => {
    try {
      await promptApi.remove(record.id);
      setHistory((current) => current.filter((item) => item.id !== record.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗');
    }
  };

  return (
    <section className="ai-studio" aria-labelledby="ai-studio-title">
      <div className="ai-studio-head">
        <div>
          <span className="ai-kicker">AI DIRECTOR</span>
          <h2 id="ai-studio-title">AI 影片提示詞工作室</h2>
          <p>把表單草稿交給模型補全鏡頭語言、連續性、負面提示詞與分鏡節拍。</p>
        </div>
        <button type="button" className="db-toggle" onClick={() => setShowDatabase((value) => !value)}>
          ◫ 提示詞資料庫 <span>{history.length}</span>
        </button>
      </div>

      <div className="ai-grid">
        <div className="ai-config-card">
          <div className="ai-field-grid">
            <label className="ai-field">
              <span>AI 供應商</span>
              <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                {providers.map((item) => (
                  <option key={item.id} value={item.id} disabled={!item.enabled}>
                    {item.name}{item.enabled ? '' : '（尚未設定）'}
                  </option>
                ))}
              </select>
            </label>
            <label className="ai-field">
              <span>模型 ID</span>
              <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如 deepseek-v4-pro" />
            </label>
          </div>

          {activeProvider?.note && <p className="provider-note">{activeProvider.note}</p>}

          <label className="ai-field">
            <span>API Key</span>
            <input
              type="password"
              value={activeCredentials.apiKey}
              onChange={(event) => updateCredentials({ apiKey: event.target.value })}
              placeholder={activeProvider?.keyConfigured ? '伺服器已設定；可留空' : '只保留在目前頁面記憶體中'}
              autoComplete="off"
            />
            <small>不寫入 localStorage 或資料庫；正式部署建議改用伺服器環境變數。</small>
          </label>

          {(provider === 'sakana' || provider === 'custom') && (
            <label className="ai-field">
              <span>Base URL</span>
              <input
                value={activeCredentials.baseUrl}
                onChange={(event) => updateCredentials({ baseUrl: event.target.value })}
                placeholder={
                  provider === 'sakana'
                    ? '例如 https://api.sakana.ai/v1'
                    : '例如 https://api.openai.com/v1'
                }
              />
              <small>輸入 API 端點網址，結尾不需要 /chat/completions。</small>
            </label>
          )}

          <label className="ai-field">
            <span>影片構想／故事意圖</span>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              rows={4}
              placeholder="例如：一位太空植物學家在火星溫室發現第一朵藍色花，從孤獨轉為希望。"
            />
          </label>

          <button type="button" className="advanced-toggle" onClick={() => setShowAdvanced((value) => !value)}>
            {showAdvanced ? '− 收起導演控制' : '+ 展開導演控制'}
          </button>

          {showAdvanced && (
            <div className="advanced-panel">
              <label className="ai-field">
                <span>視覺風格</span>
                <input value={style} onChange={(event) => setStyle(event.target.value)} />
              </label>
              <label className="ai-field">
                <span>鏡頭與運鏡</span>
                <input value={camera} onChange={(event) => setCamera(event.target.value)} />
              </label>
              <label className="ai-field">
                <span>必須保留</span>
                <textarea value={mustInclude} onChange={(event) => setMustInclude(event.target.value)} rows={2} />
              </label>
              <label className="ai-field">
                <span>必須避免</span>
                <textarea value={avoid} onChange={(event) => setAvoid(event.target.value)} rows={2} />
              </label>
            </div>
          )}

          <div className="base-prompt-box">
            <div className="base-prompt-head">
              <span>目前表單草稿</span>
              <span>{basePrompt.length} 字元</span>
            </div>
            <p>{basePrompt || '先在下方表單選擇主體、動作、場景與鏡頭；也可只輸入上方影片構想。'}</p>
          </div>

          <button type="button" className="ai-generate" onClick={() => void generate()} disabled={busy || !activeProvider?.enabled}>
            {busy ? '正在生成…' : '✦ 使用 AI 產生專業提示詞'}
          </button>
        </div>

        <div className="ai-result-card">
          <div className="ai-result-head">
            <div>
              <span className="ai-kicker">RESULT</span>
              <h3>{result.title || '等待生成'}</h3>
            </div>
            {(result.promptZh || result.promptEn) && (
              <button type="button" className="save-db" onClick={() => void save()} disabled={saving}>
                {saving ? '儲存中…' : '存入資料庫'}
              </button>
            )}
          </div>

          {!result.promptZh && !result.promptEn ? (
            <div className="ai-empty">
              <strong>從一句概念變成可生成的影片腳本</strong>
              <p>AI 會補上鏡頭尺度、運鏡、光線、節奏、角色一致性與負面提示詞。</p>
            </div>
          ) : (
            <div className="ai-output-stack">
              {result.promptZh && (
                <article className="ai-output">
                  <div><span>繁體中文</span><button type="button" onClick={() => void copyText(result.promptZh)}>複製</button></div>
                  <p>{result.promptZh}</p>
                </article>
              )}
              {result.promptEn && (
                <article className="ai-output">
                  <div><span>English</span><button type="button" onClick={() => void copyText(result.promptEn)}>Copy</button></div>
                  <p>{result.promptEn}</p>
                </article>
              )}
              {result.negativePrompt && (
                <article className="ai-output negative-output">
                  <div><span>Negative prompt</span><button type="button" onClick={() => void copyText(result.negativePrompt)}>複製</button></div>
                  <p>{result.negativePrompt}</p>
                </article>
              )}
              {result.shotPlan.length > 0 && (
                <article className="shot-plan">
                  <span>分鏡節拍</span>
                  <ol>{result.shotPlan.map((shot, index) => <li key={`${index}-${shot}`}>{shot}</li>)}</ol>
                </article>
              )}
            </div>
          )}

          {error && <p className="ai-message error" role="alert">{error}</p>}
          {notice && <p className="ai-message success" role="status">{notice}</p>}
        </div>
      </div>

      {showDatabase && (
        <div className="database-panel">
          <div className="database-head">
            <div><strong>SQLite 提示詞資料庫</strong><span>永久保存 AI 產生結果，不保存 API Key</span></div>
            <button type="button" onClick={() => void loadHistory()}>重新整理</button>
          </div>
          {history.length === 0 ? (
            <p className="database-empty">尚未儲存提示詞。</p>
          ) : (
            <div className="database-list">
              {history.map((record) => (
                <article className="database-item" key={record.id}>
                  <button type="button" className={`favorite-star${record.favorite ? ' active' : ''}`} onClick={() => void toggleFavorite(record)} aria-label="切換收藏">★</button>
                  <button type="button" className="database-load" onClick={() => loadRecord(record)}>
                    <strong>{record.title}</strong>
                    <span>{record.provider} · {record.model || '未指定模型'} · {formatDate(record.createdAt)}</span>
                    <p>{record.promptZh || record.promptEn}</p>
                  </button>
                  <button type="button" className="database-delete" onClick={() => void removeRecord(record)} aria-label="刪除">×</button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
