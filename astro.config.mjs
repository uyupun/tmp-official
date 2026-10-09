// @ts-check

import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), basicSsl()],
  },
  // 代替フォントで一瞬表示されると違和感が大きいため、どちらも読み込み完了まで描画を待つ（font-display: block）
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Pirata One",
      cssVariable: "--font-pirata-one",
      fallbacks: ["cursive"],
      display: "block",
    },
    {
      provider: fontProviders.google(),
      name: "Zen Kaku Gothic New",
      cssVariable: "--font-zen-kaku-gothic-new",
      // Google Fonts は日本語を文字範囲ごとに分割して配信するため、ページで使う文字の分だけ読み込まれる
      subsets: ["japanese", "latin"],
      display: "block",
    },
  ],
});
