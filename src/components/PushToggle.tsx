"use client";

import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription, sendTestPush } from "@/app/notification-actions";

// VAPID 공개키(base64url) → Uint8Array
function keyBytes(base64: string) {
  const b = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const btn = "rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:brightness-110 disabled:opacity-50";
const small = "rounded border px-2 py-1 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700";

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState(ios && !standalone ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setMsg("");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
      await savePushSubscription(JSON.parse(JSON.stringify(sub)));
      setState("on");
    } catch {
      setMsg("푸시 알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) {
      await deletePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
    setBusy(false);
  };

  const box = "flex flex-col gap-2 rounded border p-4 text-sm";
  if (state === "loading") return null;
  if (state === "ios-install")
    return (
      <div className={box}>
        <p className="font-medium">휴대폰 푸시 알림</p>
        <p className="text-zinc-500">아이폰은 홈 화면에 추가한 앱에서만 푸시 알림을 받을 수 있어요. 사파리 공유 버튼 → “홈 화면에 추가” 후, 홈 화면 앱에서 이 화면을 열어 알림을 켜주세요.</p>
      </div>
    );
  if (state === "unsupported")
    return <p className="text-sm text-zinc-500">이 브라우저는 푸시 알림을 지원하지 않아요. 알림은 이 목록에서 확인할 수 있어요.</p>;
  if (state === "denied")
    return (
      <div className={box}>
        <p className="font-medium">푸시 알림이 차단돼 있어요</p>
        <p className="text-zinc-500">휴대폰/브라우저 설정에서 Band2Meet 알림을 허용한 뒤 다시 열어주세요.</p>
      </div>
    );
  return (
    <div className={`${box} flex-row flex-wrap items-center`}>
      <span className="flex-1">
        <span className="font-medium">휴대폰 푸시 알림</span>{" "}
        <span className={state === "on" ? "text-accent" : "text-zinc-500"}>{state === "on" ? "켜짐" : "꺼짐"}</span>
      </span>
      {state === "on" ? (
        <>
          <button className={small} disabled={busy} onClick={() => sendTestPush().then(() => setMsg("테스트 알림을 보냈어요."))}>테스트</button>
          <button className={small} disabled={busy} onClick={turnOff}>끄기</button>
        </>
      ) : (
        <button className={btn} disabled={busy} onClick={turnOn}>푸시 알림 켜기</button>
      )}
      {msg && <p className="w-full text-xs text-zinc-500">{msg}</p>}
    </div>
  );
}
