/**
 * Curated list of languages offered in the profile picker. Kept deliberately
 * short — the common languages of online team games — rather than the full
 * ISO 639 set, which would be noise in a chip selector.
 */
export const LANGUAGES = [
  "English",
  "Spanish",
  "Portuguese",
  "French",
  "German",
  "Russian",
  "Turkish",
  "Arabic",
  "Italian",
  "Polish",
  "Dutch",
  "Swedish",
  "Japanese",
  "Korean",
  "Chinese",
  "Hindi",
  "Vietnamese",
  "Indonesian",
  "Filipino",
  "Thai",
] as const;

export type Language = (typeof LANGUAGES)[number];

const LANGUAGE_SET = new Set<string>(LANGUAGES);

export function isLanguage(value: string): value is Language {
  return LANGUAGE_SET.has(value);
}
