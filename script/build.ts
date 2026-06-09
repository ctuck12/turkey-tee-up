import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "node:fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("building vercel api function...");
  // Build as IIFE-style wrapper: the entry file exports are collected, then we
  // re-export the default handler as a plain CJS function at the very end.
  await esbuild({
    entryPoints: ["server/vercel-handler.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "api/index.js",
    external: ["@vercel/node"],
    logLevel: "info",
    // Force the CJS bundle to expose a callable handler.
    // esbuild wraps ESM default exports as { __esModule: true, default: fn }.
    // @vercel/node checks module.exports directly as a function, OR .default.
    // This footer handles both cases by unwrapping if needed.
    footer: {
      js: [
        "// Vercel handler unwrap",
        "(function() {",
        "  var _exp = module.exports;",
        "  if (typeof _exp === 'function') return;",
        "  // Try common export locations",
        "  var fn = _exp && (_exp.default || _exp.handler);",
        "  if (typeof fn === 'function') { module.exports = fn; }",
        "})();",
      ].join("\n"),
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
