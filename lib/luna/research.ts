export type ResearchJob = { id: string; userId: string; question: string; sources: string[]; status: "queued" | "running" | "completed" | "failed" };
export function createResearchJob(input: Omit<ResearchJob, "status">): ResearchJob { return { ...input, status: "queued" }; }
export function completeResearchJob(job: ResearchJob, sources: string[]) { return { ...job, sources, status: "completed" as const }; }
