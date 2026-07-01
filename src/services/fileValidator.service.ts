import {
  detectFormat,
  SUPPORTED_FORMATS,
  FORMAT_MIME_TYPES,
} from "../../shared/constants/artifactFormats";
export interface FileValidationOptions {
  maxFiles: number;
  maxFileSize: number;
  allowedFormats: readonly string[];
}
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  validatedFiles: ValidatedFile[];
}
export interface ValidatedFile {
  filename: string;
  format: string;
  size_bytes: number;
  data: Buffer;
}
interface UploadFile {
  filename: string;
  mimetype: string;
  data: Buffer;
  size: number;
}
const defaultOptions: FileValidationOptions = {
  maxFiles: 10,
  maxFileSize: 10485760,
  allowedFormats: SUPPORTED_FORMATS,
};
export class FileValidatorService {
  private options: FileValidationOptions;
  constructor(options: Partial<FileValidationOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }
  validateFiles(files: UploadFile[]): FileValidationResult {
    const errors: string[] = [];
    const validatedFiles: ValidatedFile[] = [];
    if (!files || files.length === 0) {
      return {
        valid: false,
        errors: ["No files provided"],
        validatedFiles: [],
      };
    }
    if (files.length > this.options.maxFiles) {
      errors.push(
        `Maximum ${this.options.maxFiles} files per batch. Received ${files.length}.`,
      );
      return { valid: false, errors, validatedFiles: [] };
    }
    for (const file of files) {
      const fileErrors = this.validateSingleFile(file);
      if (fileErrors.length > 0) {
        errors.push(...fileErrors);
      } else {
        const format = detectFormat(file.filename);
        validatedFiles.push({
          filename: file.filename,
          format: format ?? "UNKNOWN",
          size_bytes: file.size,
          data: file.data,
        });
      }
    }
    return { valid: errors.length === 0, errors, validatedFiles };
  }
  private validateSingleFile(file: UploadFile): string[] {
    const errors: string[] = [];
    if (file.size === 0) {
      errors.push(`${file.filename}: File is empty`);
      return errors;
    }
    if (file.size > this.options.maxFileSize) {
      errors.push(
        `${file.filename}: File size (${file.size} bytes) exceeds maximum (${this.options.maxFileSize} bytes)`,
      );
    }
    const format = detectFormat(file.filename);
    if (!format) {
      errors.push(`${file.filename}: Unsupported file format`);
    } else if (!this.options.allowedFormats.includes(format)) {
      errors.push(`${file.filename}: Format "${format}" is not allowed`);
    }
    const mimeType = file.mimetype;
    if (mimeType && !this.isValidMimeType(mimeType, format)) {
      errors.push(
        `${file.filename}: MIME type "${mimeType}" does not match extension`,
      );
    }
    return errors;
  }
  private isValidMimeType(mimeType: string, format: string | null): boolean {
    if (!format) return false;
    const expected =
      FORMAT_MIME_TYPES[format as keyof typeof FORMAT_MIME_TYPES];
    return expected === mimeType;
  }
}
export const fileValidatorService = new FileValidatorService();
