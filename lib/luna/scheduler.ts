export type LunaSchedule = { id: string; userId: string; runAt: string; task: string; timezone?: string; enabled: boolean };

export function createSchedule(input: Omit<LunaSchedule, "enabled">): LunaSchedule {
  const date = new Date(input.runAt);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid schedule time");
  return { ...input, runAt: date.toISOString(), enabled: true };
}

export function isDue(schedule: LunaSchedule, now = new Date()) {
  return schedule.enabled && new Date(schedule.runAt).getTime() <= now.getTime();
}
