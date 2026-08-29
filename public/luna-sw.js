self.addEventListener("push", (event) => {
  let data = { title: "LUNA", body: "Neue Erinnerung" };
  try { data = event.data ? event.data.json() : data; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, tag: data.tag || "luna" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
