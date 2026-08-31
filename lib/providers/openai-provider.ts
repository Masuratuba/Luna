import OpenAI from "openai";

export type LunaModelRequest = Readonly<{
  input: string;
  model?: string;
}>;

export type LunaModelResponse = Readonly<{
  text: string;
  model: string;
}>;

const MAX_INPUT_CHARS = 20_000;
const OPENAI_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = "gpt-5.6-luna";

export function validateLunaModelRequest(request: LunaModelRequest): LunaModelRequest {
  if (!request || typeof request.input !== "string") throw new Error("OPENAI_INPUT_REQUIRED");
  const input = request.input.trim();
  if (!input) throw new Error("OPENAI_INPUT_REQUIRED");
  if (input.length > MAX_INPUT_CHARS) throw new Error("OPENAI_INPUT_TOO_LARGE");

  const model = typeof request.model === "string" ? request.model.trim() : undefined;
  if (model === "") throw new Error("OPENAI_MODEL_REQUIRED");
  return model ? { input, model } : { input };
}

export function resolveLunaModel(request: LunaModelRequest, configuredModel?: string): string {
  const requested = typeof request.model === "string" ? request.model.trim() : "";
  if (requested) return requested;
  const configured = configuredModel?.trim() || DEFAULT_MODEL;
  if (!configured) throw new Error("OPENAI_MODEL_REQUIRED");
  return configured;
}

/** Server-only OpenAI adapter. It reads credentials from the environment. */
export class OpenAIProvider {
  readonly name = "openai";
  private readonly client: OpenAI;

  constructor(apiKey = process.env.OPENAI_API_KEY) {
    if (!apiKey?.trim()) throw new Error("OPENAI_API_KEY is not configured");
    this.client = new OpenAI({ apiKey, timeout: OPENAI_TIMEOUT_MS, maxRetries: 2 });
  }

  async respond(request: LunaModelRequest): Promise<LunaModelResponse> {
    const validated = validateLunaModelRequest(request);
    const model = resolveLunaModel(validated, process.env.LUNA_OPENAI_MODEL);
    const response = await this.client.responses.create({
      model,
      input: validated.input,
      store: false,
    });
    return { text: response.output_text, model };
  }
}
