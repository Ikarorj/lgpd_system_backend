import { FileValidatorService } from "../../../src/services/fileValidator.service";
describe("FileValidatorService", () => {
  let service: FileValidatorService;
  beforeEach(() => {
    service = new FileValidatorService();
  });
  const makeFile = (
    overrides: Partial<{
      filename: string;
      mimetype: string;
      data: Buffer;
      size: number;
    }> = {},
  ) => ({
    filename: overrides.filename ?? "teste.pdf",
    mimetype: overrides.mimetype ?? "application/pdf",
    data: overrides.data ?? Buffer.from("conteúdo pdf falso"),
    size: overrides.size ?? 1024,
  });
  describe("validateFiles", () => {
    it("deve retornar erro quando nenhum arquivo é fornecido", () => {
      const result = service.validateFiles([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No files provided");
      expect(result.validatedFiles).toHaveLength(0);
    });
    it("deve retornar erro quando arquivos é undefined", () => {
      const result = service.validateFiles(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("No files provided");
    });
    it("deve retornar erro quando muitos arquivos", () => {
      const files = Array.from({ length: 11 }, (_, i) =>
        makeFile({ filename: `arquivo${i}.pdf` }),
      );
      const result = service.validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Maximum 10 files per batch");
      expect(result.validatedFiles).toHaveLength(0);
    });
    it("deve retornar erro para arquivo vazio", () => {
      const files = [makeFile({ size: 0, data: Buffer.alloc(0) })];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("File is empty");
    });
    it("deve retornar erro para arquivo que excede tamanho máximo", () => {
      const files = [makeFile({ size: 10485761 })];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("exceeds maximum");
    });
    it("deve retornar erro para formato não suportado", () => {
      const files = [makeFile({ filename: "teste.exe" })];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unsupported file format");
    });
    it("deve retornar erro para MIME type incompatível", () => {
      const files = [
        makeFile({ filename: "teste.pdf", mimetype: "text/plain" }),
      ];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("MIME type");
    });
    it("deve aceitar arquivo PDF válido", () => {
      const files = [makeFile()];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validatedFiles).toHaveLength(1);
      expect(result.validatedFiles[0].format).toBe("PDF");
      expect(result.validatedFiles[0].size_bytes).toBe(1024);
    });
    it("deve aceitar arquivo TXT válido", () => {
      const files = [
        makeFile({ filename: "anotacoes.txt", mimetype: "text/plain" }),
      ];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(true);
      expect(result.validatedFiles[0].format).toBe("TXT");
    });
    it("deve aceitar arquivo JSON válido", () => {
      const files = [
        makeFile({ filename: "dados.json", mimetype: "application/json" }),
      ];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(true);
      expect(result.validatedFiles[0].format).toBe("JSON");
    });
    it("deve aceitar arquivo TS válido", () => {
      const files = [
        makeFile({ filename: "index.ts", mimetype: "application/typescript" }),
      ];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(true);
      expect(result.validatedFiles[0].format).toBe("TS");
    });
    it("deve aceitar arquivo DOCX válido", () => {
      const files = [
        makeFile({
          filename: "relatorio.docx",
          mimetype:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      ];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(true);
      expect(result.validatedFiles[0].format).toBe("DOCX");
    });
    it("deve coletar erros de múltiplos arquivos inválidos", () => {
      const files = [
        makeFile({ filename: "bom.pdf" }),
        makeFile({
          filename: "ruim.exe",
          mimetype: "application/x-msdownload",
        }),
        makeFile({
          filename: "vazio.txt",
          size: 0,
          data: Buffer.alloc(0),
          mimetype: "text/plain",
        }),
      ];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.validatedFiles).toHaveLength(1);
    });
    it("não deve aceitar MIME type quando formato é null", () => {
      const isValid = (service as any).isValidMimeType("text/plain", null);
      expect(isValid).toBe(false);
    });
    it("deve aceitar se MIME type é string vazia", () => {
      const files = [makeFile({ mimetype: "" })];
      const result = service.validateFiles(files);
      expect(result.valid).toBe(true);
    });
  });
  describe("opções customizadas", () => {
    it("deve usar tamanho máximo customizado", () => {
      const customService = new FileValidatorService({ maxFileSize: 500 });
      const files = [makeFile({ size: 600 })];
      const result = customService.validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("exceeds maximum");
    });
    it("deve usar limite máximo de arquivos customizado", () => {
      const customService = new FileValidatorService({ maxFiles: 2 });
      const files = Array.from({ length: 3 }, (_, i) =>
        makeFile({ filename: `arquivo${i}.pdf` }),
      );
      const result = customService.validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Maximum 2 files per batch");
    });
    it("deve usar formatos permitidos customizados", () => {
      const customService = new FileValidatorService({
        allowedFormats: ["PDF"],
      });
      const files = [
        makeFile({ filename: "teste.txt", mimetype: "text/plain" }),
      ];
      const result = customService.validateFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Format "TXT" is not allowed');
    });
  });
});
