export type Reflection = { outcome: "success" | "partial" | "failure"; whatWorked: string[]; issues: string[]; nextActions: string[] };
export function reflect(input: { success: boolean; issues?: string[]; nextActions?: string[] }): Reflection {
  const issues = input.issues ?? [];
  return { outcome: input.success ? (issues.length ? "partial" : "success") : "failure", whatWorked: input.success ? ["Execution completed"] : [], issues, nextActions: input.nextActions ?? [] };
}
