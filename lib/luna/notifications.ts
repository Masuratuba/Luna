export type LunaNotification = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
};

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

export async function notify(notification: LunaNotification): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(notification.title, {
      body: notification.body,
      tag: notification.tag,
      data: { url: notification.url || "/" },
    });
    return true;
  }

  new Notification(notification.title, {
    body: notification.body,
    tag: notification.tag,
  });
  return true;
}
