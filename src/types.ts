export type Platform = 'seedance' | 'grok';
export type Language = 'zh' | 'en' | 'both';
export type BuilderMode = 'form' | 'template';

export interface TagOption {
  id: string;
  /** UI chip 顯示文字（中文標籤） */
  label: string;
  /** 中文提示詞文字 */
  zh: string;
  /** 英文提示詞文字 */
  en: string;
}

export interface Category {
  id: string;
  zh: string;
  en: string;
  icon: string;
  multi: boolean;
  options: TagOption[];
}

export interface TemplateField {
  id: string;
  zhLabel: string;
  enLabel: string;
  type: 'text' | 'select';
  placeholderZh?: string;
  placeholderEn?: string;
  /** select 欄位用的選項；text 欄位為雙語輸入 */
  options?: TagOption[];
  multi?: boolean;
  /** 英文組裝時的包裝語法，{v} 為欄位值 */
  wrapEn?: string;
  /** 中文組裝時的包裝語法 */
  wrapZh?: string;
}

export interface PromptTemplate {
  id: string;
  zh: string;
  en: string;
  icon: string;
  descZh: string;
  descEn: string;
  fields: TemplateField[];
  suffixEn: string;
  suffixZh: string;
  /** 完整範例提示詞（可一鍵查看／複製） */
  exampleZh?: string;
  exampleEn?: string;
}

export interface FormState {
  subjectZh: string;
  subjectEn: string;
  actionZh: string;
  actionEn: string;
  /** categoryId -> 選中的 option id 陣列 */
  selections: Record<string, string[]>;
  duration: number | null;
  /** 是否啟用分秒動作時間軸 */
  timelineEnabled: boolean;
  /** 分秒節拍（啟用時優先於單一動作欄位） */
  beats: Beat[];
}

/** 時間軸上的單個節拍：[start, end) 秒 + 雙語動作描述 */
export interface Beat {
  id: string;
  start: number;
  end: number;
  zh: string;
  en: string;
}

export interface TemplateState {
  templateId: string;
  /** fieldId -> { zh, en }（text 欄位） */
  values: Record<string, { zh: string; en: string }>;
  /** fieldId -> option id 陣列（select 欄位） */
  selectValues: Record<string, string[]>;
  duration: number | null;
}

/** 全域「導演控制台」設定（參考 Seedance 2.0 工作流） */
export interface Settings {
  /** 畫面比例 id；null 表示未設定 */
  aspectRatio: string | null;
  /** 生成模式 id（T2V/I2V/V2V/R2V/FLF2V） */
  mode: string;
  /** 聲音意圖 id；null 表示未設定 */
  audioIntent: string | null;
  /** 提示詞密度；null 表示自動 */
  density: 'compact' | 'rich' | null;
  /** 反陳腔／精確化開關 */
  antiSlop: boolean;
}

export interface HistoryEntry {
  id: string;
  ts: number;
  platform: Platform;
  mode: BuilderMode;
  zh: string;
  en: string;
  favorite: boolean;
  form: FormState;
  template: TemplateState;
  settings: Settings;
}
