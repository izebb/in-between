// Copy the UMD builds that the sandboxed stage loads (Motion, GSAP) into public/vendor.
// They are only fetched when someone runs code in those dialects.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "package.json"));
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const out = resolve(root, "public/vendor");
mkdirSync(out, { recursive: true });
const files = [
  [resolve(pkgDir("motion"), "dist/motion.js"), "motion.js"],
  [resolve(pkgDir("gsap"), "dist/gsap.min.js"), "gsap.min.js"],
  [resolve(pkgDir("gsap"), "dist/CustomEase.min.js"), "CustomEase.min.js"],
];
for (const [from, to] of files) copyFileSync(from, resolve(out, to));
console.log(`vendor: ${files.length} files → public/vendor`);
