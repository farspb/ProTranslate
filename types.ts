export enum Language {
  ENGLISH = 'English',
  PERSIAN = 'Persian (Farsi)',
  AUTO = 'Auto Detect',
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: Language;
  targetLanguage: Language;
}

export type LoadingState = 'idle' | 'reading' | 'translating' | 'success' | 'error';

export interface FileData {
  name: string;
  content: string;
  extension: string;
}