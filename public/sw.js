// 웹 푸시 수신용 서비스 워커. 서버(lib/notify.ts)가 {title, body, url}을 보냄
self.addEventListener("push", (event) => {
  const d = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(d.title || "Band2Meet", {
      body: d.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: d.url || "/" },
    }),
  );
});

// 알림을 누르면 앱을 열고 해당 화면으로
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus().then(() => c.navigate(url));
      }
      return self.clients.openWindow(url);
    }),
  );
});
