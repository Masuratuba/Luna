export async function registerLunaNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  await navigator.serviceWorker.register("/luna-sw.js");
  return true;
}

export function scheduleLocalReminder(title: string, body: string, runAt: string): number | null {
  if (typeof window === "undefined" || Notification.permission !== "granted") return null;
  const delay = new Date(runAt).getTime() - Date.now();
  if (delay < 0 || !Number.isFinite(delay)) return null;
  return window.setTimeout(() => new Notification(title, { body, tag: "luna-reminder" }), delay);
}
