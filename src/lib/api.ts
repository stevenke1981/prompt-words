export interface ProviderInfo {
  id: string;
  name: string;
  defaultModel: string;
  enabled: boolean;
  keyConfigured: boolean;
  note?: string;
}

export interface GeneratedPrompt {
  title: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  shotPlan: string[];
  notes: string[];
}

export interface PromptRecord {
  title: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  id: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
  model: string;
  platform: string;
  language: string;
  brief: string;
  metadata: Record<string, unknown>;
  favorite: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${response.status}`);
  }
  return data as T;
}

export const promptApi = {
  providers: () => request<{ providers: ProviderInfo[] }>('/api/providers'),
  generate: (body: Record<string, unknown>) => request<{
    provider: string;
    model: string;
    usage: Record<string, number> | null;
    result: GeneratedPrompt;
  }>('/api/generate', { method: 'POST', body: JSON.stringify(body) }),
  list: () => request<{ prompts: PromptRecord[] }>('/api/prompts?limit=50'),
  save: (body: Record<string, unknown>) => request<{ prompt: PromptRecord }>('/api/prompts', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  favorite: (id: string, favorite: boolean) => request<{ prompt: PromptRecord }>(
    `/api/prompts/${encodeURIComponent(id)}/favorite`,
    { method: 'PATCH', body: JSON.stringify({ favorite }) },
  ),
  remove: (id: string) => request<{ ok: boolean }>(`/api/prompts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
