# Sistema de Compliance LGPD - Backend

> Projeto extraído de um repositório monolítico para desacoplamento de backend e frontend, produzido por meio do **Speckit** com **SDD (Specification-Driven Development)**.

API backend para análise de conformidade de documentos com a **Lei Geral de Proteção de Dados Pessoais (LGPD)**, Lei nº 13.709/2018.

O sistema permite o upload de documentos (PDF, DOCX, código-fonte, etc.), extração automatizada de campos de dados pessoais via IA, verificação de conformidade com artigos da LGPD e geração de pareceres jurídicos.

---

## Funcionalidades

- **Upload de Documentos** — Upload de múltiplos formatos (PDF, DOCX, TXT, código-fonte, JSON, YAML) com validação de tamanho, formato e MIME type; deduplicação via SHA-256.
- **Extração Inteligente de Dados** — Utiliza IA (Groq LLM) para extrair 8 categorias de campos: categorias de dados, base legal, período de retenção, finalidade de processamento, compartilhamento com terceiros, direitos do titular, método de armazenamento e status de criptografia.
- **Pontuação de Confiança** — Cada campo extraído recebe um score de 0–100; campos abaixo de 50 são sinalizados para revisão humana.
- **Verificação de Conformidade** — Motor com 16 regras de violação da LGPD que analisa os campos extraídos e gera violações com severidade (CRÍTICA, ALTA, MÉDIA, BAIXA), artigos de referência e orientações de remediação.
- **Relatório de Conformidade** — Score geral (0–100) e status (COMPLIANT / PARTIALLY_COMPLIANT / NON_COMPLIANT / INSUFFICIENT_DATA).
- **Parecer Jurídico** — Geração automatizada de parecer legal detalhado via IA.
- **Autenticação JWT** — Via Supabase Auth com registro e login de usuários.

---

## Tecnologias

| Tecnologia | Versão | Finalidade |
|---|---|---|
| **Node.js** | >= 20 | Runtime |
| **TypeScript** | ^5.9 | Linguagem |
| **Fastify** | ^4.26 | Framework HTTP |
| **Supabase** | ^2.110 | Banco PostgreSQL, Auth e Storage |
| **Groq API** | — | IA para extração e parecer jurídico (LLaMA 3.1 8B) |
| **Zod** | ^3.22 | Validação de schemas |
| **node-pg-migrate** | ^7.0 | Migrações de banco |
| **Jest** | ^29.7 | Testes unitários |
| **Pino** | ^8.17 | Logging estruturado |

### Dependências principais

- `fastify`, `@fastify/cors`, `@fastify/multipart`, `@fastify/rate-limit`, `@fastify/static`, `@fastify/swagger`, `@fastify/swagger-ui`
- `@supabase/supabase-js` (cliente Supabase)
- `openai` (cliente compatível com API Groq)
- `pg`, `node-pg-migrate` (PostgreSQL)
- `zod` (validação)
- `pdf-parse`, `docx`, `jszip` (processamento de documentos)
- `pino`, `pino-pretty` (logging)

---

## Estrutura do Projeto

```
lgpd_system_backend/
├── .env                        # Variáveis de ambiente
├── .migrc                      # Configuração do node-pg-migrate
├── package.json
├── tsconfig.json
├── jest.config.js
├── migrations/                 # Migrações SQL (11 arquivos)
│   ├── 001-create-users.sql
│   ├── 002-create-artifacts.sql
│   ├── 003-create-extraction-results.sql
│   ├── 004-create-extracted-fields.sql
│   ├── 005-create-audit-log.sql
│   ├── 006-create-indexes.sql
│   ├── 007-create-exports.sql
│   ├── 008-create-compliance-tables.sql
│   ├── 009-add-user-password.sql
│   ├── 010-add-violation-types.sql
│   └── 000-all.sql
├── shared/                     # Código compartilhado
│   ├── constants/
│   │   ├── artifactFormats.ts  # Formatos suportados e MIME types
│   │   └── lgpdRules.ts        # Constantes da LGPD
│   └── types/
│       └── apiContracts.types.ts # DTOs e tipos dos contratos
├── src/
│   ├── app.ts                  # Entry point (factory buildApp)
│   ├── seed.ts                 # Script de seed do banco
│   ├── config/
│   │   └── extractionConfig.ts # Config do motor de extração
│   ├── controllers/            # Handlers HTTP
│   │   ├── auth.controller.ts
│   │   ├── compliance.controller.ts
│   │   ├── extraction.controller.ts
│   │   ├── opinion.controller.ts
│   │   └── upload.controller.ts
│   ├── middleware/              # Middlewares Fastify
│   │   ├── auth.middleware.ts
│   │   ├── cors.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── logging.middleware.ts
│   ├── models/                 # Interfaces TypeScript
│   │   ├── artifact.model.ts
│   │   ├── compliance-report.model.ts
│   │   ├── compliance-violation.model.ts
│   │   ├── export.model.ts
│   │   ├── extracted-field.model.ts
│   │   └── extraction-result.model.ts
│   ├── queues/
│   │   └── extractionQueue.ts  # Fila inline de extração
│   ├── repositories/           # Camada de dados (Supabase)
│   │   ├── artifact.repository.ts
│   │   ├── compliance.repository.ts
│   │   └── extraction.repository.ts
│   ├── routes/                 # Definição de rotas Fastify
│   │   ├── auth.routes.ts
│   │   ├── compliance.routes.ts
│   │   ├── extractions.routes.ts
│   │   └── uploads.routes.ts
│   ├── services/               # Lógica de negócio
│   │   ├── artifact.service.ts
│   │   ├── compliance.service.ts
│   │   ├── confidenceScorer.service.ts
│   │   ├── extraction.service.ts
│   │   ├── extractionEngine.interface.ts
│   │   ├── fileValidator.service.ts
│   │   ├── groqExtraction.adapter.ts
│   │   ├── mockExtraction.adapter.ts
│   │   └── opinion.service.ts
│   ├── types/
│   │   └── pdf-parse.d.ts
│   └── utils/
│       ├── errorHandlerUtil.ts
│       ├── extractionFieldMapperUtil.ts
│       ├── extractionPromptsUtil.ts
│       ├── loggerUtil.ts
│       ├── requestValidator.ts
│       ├── supabaseAdminClient.ts
│       ├── supabaseClient.ts
│       └── supabaseStorage.ts
├── tests/
│   └── unit/
│       └── services/
│           ├── artifact.service.test.ts
│           ├── compliance.service.test.ts
│           ├── confidenceScorer.service.test.ts
│           ├── fileValidator.service.test.ts
│           └── mockExtraction.adapter.test.ts
└── uploads/                    # Arquivos enviados (organizados por sessão)
```

---

## Arquitetura

O sistema segue o padrão **Service-Repository-Controller**:

```
Cliente HTTP → Fastify Router → Middleware (auth, validação)
                                  → Controller (req/res)
                                      → Service (regras de negócio)
                                          → Repository (Supabase DB/Storage)
```

- **Controllers** — Camada fina que trata requisição/resposta HTTP.
- **Services** — Orquestram a lógica de negócio (extração, compliance, pontuação).
- **Repositories** — Abstraem operações no Supabase (banco PostgreSQL + Storage).
- **Models** — Interfaces TypeScript (sem ORM).

### Motor de Extração (Strategy Pattern)

```typescript
interface ExtractionEngine {
  extract(content: string, filename: string, format: string): Promise<ExtractionOutput>;
  getEngineName(): string;
  getEngineVersion(): string;
}
```

- `GroqExtractionAdapter` — Usa Groq API (LLaMA 3.1 8B) via cliente compatível com OpenAI.
- `MockExtractionAdapter` — Implementação baseada em regras para desenvolvimento/testes.

### Motor de Regras de Compliance

16 regras declarativas de violação da LGPD, cada uma com:
- Tipo, severidade, artigo, categoria
- Função de condição que examina campos extraídos
- Texto de remediação

O score de conformidade é calculado como:
```
score = 100 - (CRITICAL * 30) - (HIGH * 15) - (MEDIUM * 5) - (LOW * 2)
```
Clamped no intervalo [0, 100].

---

## Limitações

### API Groq

- **Rate limit** — O plano gratuito da Groq impõe limites de requisições por minuto e tokens por minuto/dia, podendo impactar o throughput em cenários de uso intenso.
- **Janela de contexto** — O modelo `llama-3.1-8b-instant` possui janela de contexto limitada (8K tokens). Documentos muito extensos podem ser truncados antes do envio para extração.
- **Disponibilidade** — Dependente da disponibilidade do serviço Groq; sem fallback automático para outro provedor.
- **Custo** — O uso em produção requer chave com créditos; a aplicação não possui gerenciamento de cota ou alertas de consumo.

### Extração em PDFs com Pouco Conteúdo

- **Baixa densidade de texto** — PDFs contendo predominantemente imagens (scans sem OCR), gráficos ou tabelas podem resultar em texto extraído insuficiente para análise significativa.
- **Documentos muito curtos** — Arquivos com poucos caracteres ou informações genéricas tendem a produzir extrações com baixa pontuação de confiança e Classification como `INSUFFICIENT_DATA`.
- **Falsos negativos** — A ausência de informações explícitas não implica necessariamente conformidade; o sistema pode não detectar violações em documentos com redação genérica ou ambígua.
- **Formatação** — A biblioteca `pdf-parse` pode não preservar a estrutura original do documento (cabeçalhos, listas, seções), afetando a qualidade da extração semântica.

---

## API Endpoints

Todos os endpoints protegidos (`🔒`) requerem header `Authorization: Bearer <token>`.

### Health Check

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status da API |

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Login (email/senha) |
| `POST` | `/api/v1/auth/register` | Registrar novo usuário |
| `GET`  | `/api/v1/auth/me` | 🔒 Dados do usuário atual |
| `POST` | `/api/v1/auth/verify` | Verificar token JWT |

### Upload de Documentos

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/artifacts/upload` | 🔒 Upload de arquivos (multipart) |
| `GET`  | `/api/v1/artifacts/upload/:uploadSessionId` | 🔒 Status da sessão de upload |
| `GET`  | `/api/v1/artifacts/:artifactId` | 🔒 Detalhes do artifact |

### Extração

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/extractions` | 🔒 Listar extrações (paginado) |
| `GET` | `/api/v1/extractions/by-artifact/:artifactId` | 🔒 Extração por artifact |
| `GET` | `/api/v1/extractions/:extractionId` | 🔒 Resultado da extração com campos |
| `GET` | `/api/v1/extractions/:extractionId/flagged` | 🔒 Campos sinalizados |

### Compliance

| Método | Rota | Descrição |
|---|---|---|
| `GET`   | `/api/v1/extractions/:extractionId/compliance` | 🔒 Relatório de conformidade |
| `POST`  | `/api/v1/extractions/:extractionId/compliance/run` | 🔒 Executar verificação |
| `POST`  | `/api/v1/extractions/:extractionId/opinion` | 🔒 Gerar parecer jurídico |
| `PATCH` | `/api/v1/compliance/violations/:violationId` | 🔒 Atualizar status de violação |

---

## Formatos de Arquivo Suportados

| Formato | Extensões | MIME Type |
|---|---|---|
| PDF | `.pdf` | `application/pdf` |
| DOCX | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Markdown | `.md`, `.mdx` | `text/markdown` |
| Texto | `.txt` | `text/plain` |
| Python | `.py` | `text/x-python` |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | `text/javascript` |
| TypeScript | `.ts`, `.tsx` | `text/typescript` |
| Java | `.java` | `text/x-java` |
| C# | `.cs` | `text/x-csharp` |
| Go | `.go` | `text/x-go` |
| Rust | `.rs` | `text/x-rust` |
| JSON | `.json` | `application/json` |
| YAML | `.yaml`, `.yml` | `text/yaml` |

Tamanho máximo: **10 MB** por arquivo.

---

## Banco de Dados

PostgreSQL via Supabase com migrações gerenciadas pelo `node-pg-migrate`.

### Principais Tabelas

| Tabela | Descrição |
|---|---|
| `users` | Usuários sincronizados com Supabase Auth |
| `artifacts` | Metadados dos arquivos enviados |
| `extraction_results` | Resultados dos jobs de extração |
| `extracted_fields` | Campos extraídos individualmente |
| `compliance_reports` | Relatórios de conformidade |
| `compliance_violations` | Violações individuais por relatório |
| `exports` | Exportações |
| `audit_log` | Trilha de auditoria |

### Executar Migrações

```bash
npm run migrate:up
```

---

## Instalação e Execução

### Pré-requisitos

- Node.js >= 20
- Conta Supabase (ou banco PostgreSQL)
- Chave de API Groq (para modo produção)

### Passos

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd lgpd_system_backend

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 4. Executar migrações
npm run migrate:up

# 5. Iniciar em desenvolvimento
npm run dev

# 6. Build para produção
npm run build
npm start
```

### Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Iniciar com hot-reload (`tsx watch`) |
| `npm run build` | Compilar TypeScript |
| `npm start` | Iniciar versão compilada |
| `npm test` | Executar testes |
| `npm run test:unit` | Testes unitários |
| `npm run test:coverage` | Testes com cobertura |
| `npm run migrate:up` | Rodar migrações pendentes |
| `npm run migrate:down` | Reverter última migração |
| `npm run lint` | Verificar lint |
| `npm run seed` | Popular banco com dados iniciais |

---

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `NODE_ENV` | Ambiente (`development`, `production`) | `development` |
| `PORT` | Porta do servidor | `3000` |
| `HOST` | Host do servidor | `0.0.0.0` |
| `DATABASE_URL` | URL de conexão PostgreSQL | — |
| `SUPABASE_URL` | URL do projeto Supabase | — |
| `SUPABASE_ANON_KEY` | Chave anônima Supabase | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço Supabase | — |
| `GROQ_API_KEY` | Chave da API Groq | — |
| `GROQ_MODEL` | Modelo Groq | `llama-3.1-8b-instant` |
| `STORAGE_MAX_FILE_SIZE_MB` | Tamanho máximo de upload | `10` |
| `STORAGE_UPLOAD_DIR` | Diretório de uploads | `uploads` |
| `EXTRACTION_TIMEOUT_MS` | Timeout da extração | `30000` |
| `EXTRACTION_MAX_PARALLEL_JOBS` | Jobs paralelos máximos | `5` |
| `LOG_LEVEL` | Nível de log (`debug`, `info`, `warn`, `error`) | `info` |
| `CORS_ORIGIN` | Origem permitida para CORS | `http://localhost:5173` |

---

## Testes

O projeto utiliza **Jest** com `ts-jest`.

```bash
# Todos os testes
npm test

# Apenas testes unitários
npm run test:unit

# Com cobertura
npm run test:coverage
```

Os testes seguem o padrão de mocks com `jest.mock()` para isolar as unidades. Atualmente existem **5 suites de testes unitários** cobrindo os serviços principais.

---

## Estrutura de Violações LGPD

O motor de compliance verifica 16 tipos de violação:

| Tipo | Severidade | Artigo |
|---|---|---|
| `missing_legal_basis` | CRITICAL | Art. 7º |
| `invalid_consent` | HIGH | Art. 8º |
| `excessive_data_collection` | MEDIUM | Art. 6º |
| `insufficient_security` | CRITICAL | Art. 46 |
| `inadequate_retention` | MEDIUM | Art. 15 |
| `missing_dpo_contact` | HIGH | Art. 41 |
| `no_processing_records` | HIGH | Art. 37 |
| `incomplete_subject_rights` | MEDIUM | Art. 18 |
| `unauthorized_third_party_sharing` | HIGH | Art. 7º |
| `international_transfer_risk` | MEDIUM | Art. 33 |
| `no_impact_assessment` | LOW | Art. 38 |
| `inadequate_privacy_policy` | MEDIUM | Art. 9º |
| `no_breach_response_plan` | HIGH | Art. 48 |
| `insufficient_data_quality` | LOW | Art. 6º |
| `no_accountability_measures` | MEDIUM | Art. 6º |
| `no_data_protection_officer` | MEDIUM | Art. 41 |

---

## Licença

Este projeto é proprietário. Todos os direitos reservados.
