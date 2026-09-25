import type { MetadataRoute } from "next";

// 홈 화면에 추가했을 때 앱처럼(주소창 없이) 열리게. scope가 "/"라 모든 페이지가 앱 안에서 열림
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Band2Meet",
    short_name: "Band2Meet",
    description: "밴드 합주 일정 수합",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
