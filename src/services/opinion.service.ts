import OpenAI from "openai";
import { extractionConfig } from "../config/extractionConfig";
import { logger } from "../utils/loggerUtil";
interface OpinionInput {
  filename: string;
  format: string;
  content: string;
  fields: Array<{
    field_type: string;
    extracted_value: string;
    confidence_score: number;
  }>;
  compliance: {
    score: number;
    status: string;
    violations: Array<{
      type: string;
      severity: string;
      article: string;
      value: string;
      remediation: string;
    }>;
  };
}
const OPINION_SYSTEM_PROMPT = `Você é um especialista sênior em LGPD (Lei Geral de Proteção de Dados Pessoais) brasileira e em governança documental.Sua função é analisar a estrutura e o conteúdo de um documento, avaliar sua conformidade com a LGPD e gerar um parecer completo.ETAPAS DA ANÁLISE:1. **ANÁLISE ESTRUTURAL** — Identifique quais seções estão presentes no documento e quais estão ausentes:   - Objetivo do documento   - Finalidade do tratamento dos dados   - Base legal utilizada   - Dados coletados   - Controle de acesso   - Compartilhamento de dados   - Retenção e descarte   - Responsável pelo tratamento (DPO)   - Direitos dos titulares   - Medidas de segurança2. **INFERÊNCIA DE CONTEXTO** — Com base no conteúdo, INFIRA possíveis bases legais mesmo quando não declaradas explicitamente:   - "folha de pagamento" → possível obrigação legal/trabalhista (Art. 7, II)   - "nota fiscal" → possível obrigação legal (Art. 7, II)   - "marketing" → possível consentimento (Art. 7, I)   - "prestação de serviço" → possível execução de contrato (Art. 7, V)   - "recrutamento" → possível interesse legítimo (Art. 7, IX)   - Sempre sinalize que é uma inferência e recomende validação jurídica3. **PONTUAÇÃO DE COMPLETUDE** — Calcule um score de completude documental (0-100%) baseado em quantas seções obrigatórias estão presentes.4. **SEÇÕES AUSENTES** — Liste explicitamente cada seção importante que não foi encontrada no documento.O parecer deve conter:1. **resumo_executivo** — visão geral do documento e seu nível de conformidade2. **pontuacao_completude** — número de 0 a 100 representando o quão completo é o documento3. **secoes_presentes** — lista de seções encontradas no documento4. **secoes_ausentes** — lista de seções importantes que estão faltando5. **pontos_fortes** — o que o documento trata corretamente6. **inferencias_lei** — possíveis bases legais inferidas do contexto (com ressalva de validação)7. **nao_conformidades** — violações identificadas com artigo e risco8. **recomendacoes** — ações corretivas por prioridade (alta, media, baixa)9. **riscos_legais** — potenciais consequências jurídicas10. **analise_dados_pessoais** — categorias de dados, dados sensíveis e nível de riscoSeja técnico mas acessível. Use linguagem clara para profissionais de TI e Direito.Responda APENAS com JSON neste formato:{  "resumo_executivo": "string",  "pontuacao_completude": number,  "secoes_presentes": ["string"],  "secoes_ausentes": ["string"],  "pontos_fortes": ["string"],  "inferencias_lei": [{"contexto": "string", "base_legal_provavel": "string", "artigo": "string", "ressalva": "string"}],  "nao_conformidades": [{"violacao": "string", "artigo": "string", "risco": "string"}],  "recomendacoes": [{"acao": "string", "prioridade": "alta|media|baixa"}],  "riscos_legais": ["string"],  "analise_dados_pessoais": {"categorias": ["string"], "dados_sensiveis": ["string"], "nivel_risco": "baixo|medio|alto"}}`;
export class OpinionService {
  private client: OpenAI;
  private model: string;
  constructor() {
    this.client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: extractionConfig.groq.apiKey,
    });
    this.model = extractionConfig.groq.model;
  }
  async generate(input: OpinionInput): Promise<Record<string, unknown>> {
    const startTime = Date.now();
    const { filename, content } = input;
    const fieldsText = input.fields
      .map(
        (f) =>
          `- ${f.field_type}: "${f.extracted_value}" (confiança: ${f.confidence_score}%)`,
      )
      .join("\n");
    const violationsText = input.compliance.violations
      .map(
        (v) =>
          `- Tipo: ${v.type} | Gravidade: ${v.severity} | Artigo: ${v.article} | Valor: "${v.value}" | Remediação: ${v.remediation}`,
      )
      .join("\n");
    const userPrompt = `Arquivo analisado: ${input.filename}Formato: ${input.format}CONTEÚDO DO DOCUMENTO:---${content.substring(0, 4000)}---Campos extraídos pela IA:${fieldsText}Resultado de Compliance:- Score: ${input.compliance.score}/100- Status: ${input.compliance.status}- Total de violações: ${input.compliance.violations.length}Violações encontradas:${violationsText || "Nenhuma violação encontrada."}Com base no conteúdo ACIMA, gere o parecer completo seguindo todas as etapas (análise estrutural, inferência de contexto, pontuação de completude, seções ausentes).`;
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: OPINION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      });
      const duration = Date.now() - startTime;
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("Empty response from Groq");
      }
      const parsed = JSON.parse(responseText) as Record<string, unknown>;
      logger.info(
        { filename, duration, model: this.model },
        "Opinion generated successfully",
      );
      return parsed;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        { err: error, filename, duration },
        "Opinion generation failed",
      );
      throw error;
    }
  }
}
export const opinionService = new OpinionService();
