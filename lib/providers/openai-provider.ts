import OpenAI from "openai";

export type LunaModelRequest = Readonly<{
  input: string;
  model?: string;
}>;

export type LunaModelResponse = Readonly<{
  text: string;
  model: string;
}>;

/** Server-only OpenAI adapter. It reads credentials from the environment. */
export class OpenAIProvider {
  readonly name = "openai";
  private readonly client: OpenAI;

  constructor(apiKey = process.env.OPENAI_API_KEY) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    this.client = new OpenAI({ apiKey });
  }

  async respond(request: LunaModelRequest): Promise<LunaModelResponse> {
    const model = request.model ?? process.env.LUNA_OPENAI_MODEL ?? "gpt-5.6-luna";
    const response = await this.client.responses.create({ model, input: request.input });
    return { text: response.output_text, model };
  }
}
