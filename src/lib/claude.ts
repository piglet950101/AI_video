import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import { log } from "./logger";

// Lazy-initialized. Instantiating Anthropic({apiKey:""}) at module load would fail
// during Next.js build when the env is not yet populated.
let _anthropic: Anthropic | null = null;
function anthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Add it in Vercel → Project Settings → Environment Variables.",
    );
  }
  _anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _anthropic;
}

const MODEL = "claude-sonnet-4-6";

// The system prompt is cached via Anthropic's prompt caching — saves ~80% of cost
// across repeat variant calls for the same 10 scripts.
const SYSTEM_PROMPT_PT_BR = `
Você é o braço de copywriting do canal do Marcelo Guetta, arquiteto com 47 anos de
experiência e mais de 250 obras realizadas. O tom é espartano, direto, autoritativo.
Sem adjetivos floridos. Sem emojis (ou no máximo 1 por post). Sempre assumir que o
público (construção/reforma, Brasil, heterogêneo) tem medo real de errar e perder dinheiro.

Regras por plataforma:
- INSTAGRAM_REEL: gancho nos primeiros 2 segundos (max 60 caracteres), legenda 80-150
  caracteres, 5 hashtags em pt-BR, CTA curta apontando para o vídeo longo da série
  ou para errozero.online via {CTA_LINK}.
- INSTAGRAM_FEED: texto denso mas escaneável, 200-400 caracteres, 8 hashtags em pt-BR,
  CTA apontando para link na bio ou {CTA_LINK}.
- FACEBOOK: tom ligeiramente mais institucional, 300-500 caracteres, sem hashtags,
  CTA via {CTA_LINK}.

Entregue SEMPRE JSON válido com este shape EXATO:
{
  "INSTAGRAM_REEL":  { "hook": string, "caption": string, "hashtags": string[], "cta": string },
  "INSTAGRAM_FEED":  { "hook": string, "caption": string, "hashtags": string[], "cta": string },
  "FACEBOOK":        { "hook": string, "caption": string, "hashtags": string[], "cta": string }
}

Não inclua markdown, backticks ou explicação. SOMENTE JSON.
`.trim();

export interface PlatformVariant {
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
}

export interface VariantPack {
  INSTAGRAM_REEL: PlatformVariant;
  INSTAGRAM_FEED: PlatformVariant;
  FACEBOOK: PlatformVariant;
}

interface GenerateArgs {
  title: string;
  body: string;
  cta: string;
  ctaLink: string;
}

export async function generateVariants(args: GenerateArgs): Promise<VariantPack> {
  const userMsg = [
    `Título/Gancho original: ${args.title}`,
    ``,
    `Roteiro base:`,
    args.body,
    ``,
    `CTA desejada: ${args.cta}`,
    `Link do CTA (substituir {CTA_LINK}): ${args.ctaLink}`,
    ``,
    `Gere as 3 variações em JSON conforme a especificação do sistema.`,
  ].join("\n");

  try {
    const response = await anthropicClient().messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT_PT_BR,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    const content = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd < 0) {
      throw new Error(`No JSON found in Claude response: ${content.slice(0, 200)}`);
    }
    const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as VariantPack;

    // Replace {CTA_LINK} literal if model didn't inline it
    for (const platform of ["INSTAGRAM_REEL", "INSTAGRAM_FEED", "FACEBOOK"] as const) {
      const v = parsed[platform];
      v.caption = v.caption.replace(/\{CTA_LINK\}/g, args.ctaLink);
      v.cta = v.cta.replace(/\{CTA_LINK\}/g, args.ctaLink);
    }

    log.info("claude variants generated", {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens,
      cacheCreation: response.usage.cache_creation_input_tokens,
    });

    return parsed;
  } catch (e) {
    log.error("claude variants failed", { error: String(e) });
    throw e;
  }
}
