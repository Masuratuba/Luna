export type BackupRecord = { id: string; createdAt: string; scope: string; checksum?: string };
export function createBackupRecord(input: Omit<BackupRecord, "createdAt">): BackupRecord { return { ...input, createdAt: new Date().toISOString() }; }
