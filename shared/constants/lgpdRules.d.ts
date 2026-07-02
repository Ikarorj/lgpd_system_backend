export declare const LEGAL_BASES: readonly ["consentimento", "consentimento_expresso", "interesse_legitimo", "obrigacao_legal", "execucao_contrato", "protecao_credito", "proteger_interesse", "estudos_publicos", "exercicio_direitos", "processo_judicial", "saude_protecao", "nao_declarado"];
export declare const DATA_CATEGORIES: readonly ["nome", "cpf", "cnpj", "email", "telefone", "endereco", "ip_address", "localizacao", "dados_biometricos", "dados_bancarios", "dados_saude", "dados_geneticos", "orientacao_sexual", "religiao", "dados_crianca", "user_agent", "cookies", "navegacao", "dados_trabalho", "dados_academicos"];
export declare const FIELD_TYPES: readonly ["data_categories", "legal_basis", "retention_period", "processing_purpose", "third_party_sharing", "data_subject_rights", "storage_method", "encryption_status"];
export declare const DATA_SUBJECT_RIGHTS: readonly ["direito_acesso", "direito_retificacao", "direito_exclusao", "direito_esquecimento", "direito_portabilidade", "direito_oposicao", "direito_informacao", "direito_revisao_automatizada"];
export declare const STORAGE_METHODS: readonly ["banco_dados_relacional", "banco_dados_nao_relacional", "armazenamento_arquivos", "data_lake", "cache_em_memoria", "logs", "backup", "servico_terceiros", "nao_especificado"];
export declare const ENCRYPTION_STATUSES: readonly ["aes_256", "tls_1_3", "criptografia_assimetrica", "hash_sha256", "nenhuma", "nao_especificado"];
export declare const FLAG_THRESHOLD = 50;
export declare const CONFIDENCE_LEVELS: {
    readonly HIGH: 80;
    readonly MEDIUM: 50;
    readonly LOW: 20;
};
export declare const LGPD_ARTICLES: {
    readonly CONSENTIMENTO: readonly ["Art. 5", "Art. 7", "Art. 8", "Art. 9"];
    readonly INTERESSE_LEGITIMO: readonly ["Art. 7", "Art. 10"];
    readonly OBRIGACAO_LEGAL: readonly ["Art. 7", "Art. 11"];
    readonly DIREITOS_TITULAR: readonly ["Art. 17", "Art. 18", "Art. 19", "Art. 20", "Art. 21"];
    readonly SEGURANCA: readonly ["Art. 46", "Art. 47", "Art. 48", "Art. 49"];
    readonly TRANSFERENCIA: readonly ["Art. 33", "Art. 34", "Art. 35"];
    readonly PENALIDADES: readonly ["Art. 52", "Art. 53", "Art. 54"];
};
export type LegalBasis = (typeof LEGAL_BASES)[number];
export type DataCategory = (typeof DATA_CATEGORIES)[number];
export type FieldType = (typeof FIELD_TYPES)[number];
export type DataSubjectRight = (typeof DATA_SUBJECT_RIGHTS)[number];
export type StorageMethod = (typeof STORAGE_METHODS)[number];
export type EncryptionStatus = (typeof ENCRYPTION_STATUSES)[number];
//# sourceMappingURL=lgpdRules.d.ts.map