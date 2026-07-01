export const SUPPORTED_FORMATS = [
  'PDF', 'DOCX', 'MARKDOWN', 'TXT',
  'PY', 'JS', 'TS', 'JAVA', 'CS', 'GO', 'RUST',
  'JSON', 'YAML',
] as const;

export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

export const FORMAT_CATEGORIES: Record<string, SupportedFormat[]> = {
  document: ['PDF', 'DOCX', 'MARKDOWN', 'TXT'],
  code: ['PY', 'JS', 'TS', 'JAVA', 'CS', 'GO', 'RUST'],
  data: ['JSON', 'YAML'],
} as const;

export const FORMAT_MIME_TYPES: Record<SupportedFormat, string> = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  MARKDOWN: 'text/markdown',
  TXT: 'text/plain',
  PY: 'text/x-python',
  JS: 'text/javascript',
  TS: 'application/typescript',
  JAVA: 'text/x-java-source',
  CS: 'text/plain',
  GO: 'text/x-go',
  RUST: 'text/x-rust',
  JSON: 'application/json',
  YAML: 'application/x-yaml',
};

export const FORMAT_EXTENSIONS: Record<SupportedFormat, string[]> = {
  PDF: ['.pdf'],
  DOCX: ['.docx'],
  MARKDOWN: ['.md', '.markdown'],
  TXT: ['.txt'],
  PY: ['.py'],
  JS: ['.js', '.jsx'],
  TS: ['.ts', '.tsx'],
  JAVA: ['.java'],
  CS: ['.cs'],
  GO: ['.go'],
  RUST: ['.rs'],
  JSON: ['.json'],
  YAML: ['.yml', '.yaml'],
};

export function detectFormat(filename: string): SupportedFormat | null {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  for (const [format, extensions] of Object.entries(FORMAT_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return format as SupportedFormat;
    }
  }
  return null;
}

export function getFormatCategory(format: SupportedFormat): string {
  for (const [category, formats] of Object.entries(FORMAT_CATEGORIES)) {
    if (formats.includes(format)) {
      return category;
    }
  }
  return 'unknown';
}
