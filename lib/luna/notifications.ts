export type LunaNotification = { title: string; body: string; tag?: string; url?: string };

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

export function notify(notification: LunaNotification): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  new Notification(notification.title, { body: notification.body, tag: notification.tag });
  return true;
}
