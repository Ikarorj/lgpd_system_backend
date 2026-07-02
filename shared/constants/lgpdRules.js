"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LGPD_ARTICLES = exports.CONFIDENCE_LEVELS = exports.FLAG_THRESHOLD = exports.ENCRYPTION_STATUSES = exports.STORAGE_METHODS = exports.DATA_SUBJECT_RIGHTS = exports.FIELD_TYPES = exports.DATA_CATEGORIES = exports.LEGAL_BASES = void 0;
exports.LEGAL_BASES = [
    'consentimento',
    'consentimento_expresso',
    'interesse_legitimo',
    'obrigacao_legal',
    'execucao_contrato',
    'protecao_credito',
    'proteger_interesse',
    'estudos_publicos',
    'exercicio_direitos',
    'processo_judicial',
    'saude_protecao',
    'nao_declarado',
];
exports.DATA_CATEGORIES = [
    'nome',
    'cpf',
    'cnpj',
    'email',
    'telefone',
    'endereco',
    'ip_address',
    'localizacao',
    'dados_biometricos',
    'dados_bancarios',
    'dados_saude',
    'dados_geneticos',
    'orientacao_sexual',
    'religiao',
    'dados_crianca',
    'user_agent',
    'cookies',
    'navegacao',
    'dados_trabalho',
    'dados_academicos',
];
exports.FIELD_TYPES = [
    'data_categories',
    'legal_basis',
    'retention_period',
    'processing_purpose',
    'third_party_sharing',
    'data_subject_rights',
    'storage_method',
    'encryption_status',
];
exports.DATA_SUBJECT_RIGHTS = [
    'direito_acesso',
    'direito_retificacao',
    'direito_exclusao',
    'direito_esquecimento',
    'direito_portabilidade',
    'direito_oposicao',
    'direito_informacao',
    'direito_revisao_automatizada',
];
exports.STORAGE_METHODS = [
    'banco_dados_relacional',
    'banco_dados_nao_relacional',
    'armazenamento_arquivos',
    'data_lake',
    'cache_em_memoria',
    'logs',
    'backup',
    'servico_terceiros',
    'nao_especificado',
];
exports.ENCRYPTION_STATUSES = [
    'aes_256',
    'tls_1_3',
    'criptografia_assimetrica',
    'hash_sha256',
    'nenhuma',
    'nao_especificado',
];
exports.FLAG_THRESHOLD = 50;
exports.CONFIDENCE_LEVELS = {
    HIGH: 80,
    MEDIUM: 50,
    LOW: 20,
};
exports.LGPD_ARTICLES = {
    CONSENTIMENTO: ['Art. 5', 'Art. 7', 'Art. 8', 'Art. 9'],
    INTERESSE_LEGITIMO: ['Art. 7', 'Art. 10'],
    OBRIGACAO_LEGAL: ['Art. 7', 'Art. 11'],
    DIREITOS_TITULAR: ['Art. 17', 'Art. 18', 'Art. 19', 'Art. 20', 'Art. 21'],
    SEGURANCA: ['Art. 46', 'Art. 47', 'Art. 48', 'Art. 49'],
    TRANSFERENCIA: ['Art. 33', 'Art. 34', 'Art. 35'],
    PENALIDADES: ['Art. 52', 'Art. 53', 'Art. 54'],
};
