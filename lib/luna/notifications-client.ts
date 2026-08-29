export async function registerLunaNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) return false;
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return false;
  await navigator.serviceWorker.register("/luna-sw.js");
  return true;
}

export async function scheduleLocalReminder(title: string, body: string, runAt: string, url = "/"): Promise<number | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) return null;
  if (Notification.permission !== "granted") return null;

  const runAtMs = new Date(runAt).getTime();
  if (!Number.isFinite(runAtMs)) return null;
  const delay = runAtMs - Date.now();
  if (delay < 0 || delay > 2147483647) return null;

  const registration = await navigator.serviceWorker.ready;
  const timeoutId = window.setTimeout(() => {
    void registration.showNotification(title, {
      body,
      tag: "luna-reminder",
      data: { url },
    });
  }, delay);

  return timeoutId;
}
