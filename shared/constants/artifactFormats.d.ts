export declare const SUPPORTED_FORMATS: readonly ["PDF", "DOCX", "MARKDOWN", "TXT", "PY", "JS", "TS", "JAVA", "CS", "GO", "RUST", "JSON", "YAML"];
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];
export declare const FORMAT_CATEGORIES: Record<string, SupportedFormat[]>;
export declare const FORMAT_MIME_TYPES: Record<SupportedFormat, string>;
export declare const FORMAT_EXTENSIONS: Record<SupportedFormat, string[]>;
export declare function detectFormat(filename: string): SupportedFormat | null;
export declare function getFormatCategory(format: SupportedFormat): string;
//# sourceMappingURL=artifactFormats.d.ts.map