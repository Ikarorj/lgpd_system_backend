"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORMAT_EXTENSIONS = exports.FORMAT_MIME_TYPES = exports.FORMAT_CATEGORIES = exports.SUPPORTED_FORMATS = void 0;
exports.detectFormat = detectFormat;
exports.getFormatCategory = getFormatCategory;
exports.SUPPORTED_FORMATS = [
    'PDF', 'DOCX', 'MARKDOWN', 'TXT',
    'PY', 'JS', 'TS', 'JAVA', 'CS', 'GO', 'RUST',
    'JSON', 'YAML',
];
exports.FORMAT_CATEGORIES = {
    document: ['PDF', 'DOCX', 'MARKDOWN', 'TXT'],
    code: ['PY', 'JS', 'TS', 'JAVA', 'CS', 'GO', 'RUST'],
    data: ['JSON', 'YAML'],
};
exports.FORMAT_MIME_TYPES = {
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
exports.FORMAT_EXTENSIONS = {
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
function detectFormat(filename) {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    for (const [format, extensions] of Object.entries(exports.FORMAT_EXTENSIONS)) {
        if (extensions.includes(ext)) {
            return format;
        }
    }
    return null;
}
function getFormatCategory(format) {
    for (const [category, formats] of Object.entries(exports.FORMAT_CATEGORIES)) {
        if (formats.includes(format)) {
            return category;
        }
    }
    return 'unknown';
}
