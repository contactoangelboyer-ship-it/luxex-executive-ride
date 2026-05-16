import { createRequire } from "node:module";
  import path from "node:path";
  import { fileURLToPath } from "node:url";
  import { build as esbuild } from "esbuild";
  import esbuildPluginPino from "esbuild-plugin-pino";
  import { rm, mkdir, writeFile } from "node:fs/promises";

  globalThis.require = createRequire(import.meta.url);

  const artifactDir = path.dirname(fileURLToPath(import.meta.url));

  const EXTERNALS = [
    "*.node","sharp","better-sqlite3","sqlite3","canvas","bcrypt","argon2","fsevents","re2",
    "farmhash","xxhash-addon","bufferutil","utf-8-validate","ssh2","cpu-features","dtrace-provider",
    "isolated-vm","lightningcss","pg-native","oracledb","mongodb-client-encryption","nodemailer",
    "handlebars","knex","typeorm","protobufjs","onnxruntime-node","@tensorflow/*","@prisma/client",
    "@mikro-orm/*","@grpc/*","@swc/*","@aws-sdk/*","@azure/*","@opentelemetry/*","@google-cloud/*",
    "@google/*","googleapis","google-auth-library","firebase-admin","@parcel/watcher","@sentry/profiling-node",
    "@tree-sitter/*","aws-sdk","classic-level","dd-trace","ffi-napi","grpc","hiredis","kerberos",
    "leveldown","miniflare","mysql2","newrelic","odbc","piscina","realm","ref-napi","rocksdb",
    "sass-embedded","sequelize","serialport","snappy","tinypool","usb","workerd","wrangler",
    "zeromq","zeromq-prebuilt","playwright","puppeteer","puppeteer-core","electron",
  ];

  // Packages that are external in the regular Replit build but must be bundled
  // in the serverless build because Vercel's function environment has no node_modules.
  // @google-cloud/storage and its auth dependencies are pure-JS and safe to bundle.
  const SERVERLESS_REBUNDLE = ["@google-cloud/*","@google/*","googleapis","google-auth-library"];

  // Extra externals for the serverless build only.
  // React/Clerk packages can bundle browser-only globals that crash Node.js cold starts.
  const SERVERLESS_EXTRA_EXTERNALS = [
    "react","react-dom","react/jsx-runtime","react/jsx-dev-runtime",
    "@react-email/*","@clerk/express","@clerk/shared","@clerk/backend","@clerk/*",
  ];

  const SERVERLESS_EXTERNALS = EXTERNALS
    .filter(e => !SERVERLESS_REBUNDLE.some(r => e === r || (r.endsWith("/*") && e.startsWith(r.slice(0,-1)))))
    .concat(SERVERLESS_EXTRA_EXTERNALS, ["pino-pretty","thread-stream","node-cron"]);

  const BANNER = {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
  import __bannerPath from 'node:path';
  import __bannerUrl from 'node:url';

  globalThis.require = __bannerCrReq(import.meta.url);
  globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
  globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
  };

  async function buildAll() {
    const distDir = path.resolve(artifactDir, "dist");
    await rm(distDir, { recursive: true, force: true });

    // Build 1: regular server entry (used by Replit workflow)
    await esbuild({
      entryPoints: [path.resolve(artifactDir, "src/index.ts")],
      platform: "node",
      bundle: true,
      format: "esm",
      outdir: distDir,
      outExtension: { ".js": ".mjs" },
      logLevel: "info",
      external: EXTERNALS,
      sourcemap: "linked",
      plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
      banner: BANNER,
    });

    // Build 2: serverless handler for Vercel (exports Express app, no listen())
    const funcDir = path.resolve(artifactDir, ".vercel/output/functions/api.func");
    await rm(path.resolve(artifactDir, ".vercel/output"), { recursive: true, force: true });
    await mkdir(funcDir, { recursive: true });

    await esbuild({
      entryPoints: [path.resolve(artifactDir, "src/serverless.ts")],
      platform: "node",
      bundle: true,
      format: "esm",
      outfile: path.resolve(funcDir, "index.mjs"),
      logLevel: "info",
      // Replace pino with a console.log stub — pino's worker-thread internals can crash Vercel Node.js 22
        alias: { "pino": path.resolve(artifactDir, "src/lib/pino-stub.js") },
        external: SERVERLESS_EXTERNALS,
      sourcemap: false,
      banner: BANNER,
    });

    // .vc-config.json — tells Vercel how to run the function
    await writeFile(
      path.resolve(funcDir, ".vc-config.json"),
      JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: true }, null, 2),
    );

    // Vercel Build Output config — routes all traffic to the function
    // Reminders are triggered via external cron (cron-job.org) calling GET /api/cron/reminders
    await writeFile(
      path.resolve(artifactDir, ".vercel/output/config.json"),
      JSON.stringify({ version: 3, routes: [{ src: "/(.*)", dest: "/api" }] }, null, 2),
    );

    console.log("\u2705 Build complete: dist/index.mjs (Replit) + .vercel/output/ (Vercel serverless)");
  }

  buildAll().catch((err) => { console.error(err); process.exit(1); });
  