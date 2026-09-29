import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Chapter bodies. The outline (titles, parts, instruments) lives in src/lib/curriculum.ts.
const chapters = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/chapters" }),
  schema: z.object({
    number: z.number(),
    lede: z.string(),
  }),
});

export const collections = { chapters };
