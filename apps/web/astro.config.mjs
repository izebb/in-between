// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";

export default defineConfig({
  site: "https://inbetween.pages.dev",
  integrations: [svelte(), mdx()],
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
  devToolbar: { enabled: false },
  markdown: {
    // Colours come from the pencil palette in styles/code.css, so light/dark both work.
    shikiConfig: { theme: "css-variables", wrap: false },
  },
  vite: {
    ssr: { noExternal: ["@inbetween/core", "@inbetween/codegen", "@inbetween/editor"] },
  },
});
