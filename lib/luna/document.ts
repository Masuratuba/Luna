export type LunaDocument = { id: string; name: string; mimeType: string; text?: string; metadata?: Record<string, unknown> };
export function documentSummary(document: LunaDocument) { return { id: document.id, name: document.name, mimeType: document.mimeType, characters: document.text?.length ?? 0 }; }
