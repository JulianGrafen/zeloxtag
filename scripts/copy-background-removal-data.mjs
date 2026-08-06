/**
 * Self-host @imgly/background-removal ONNX/WASM assets for COEP-safe same-origin loading.
 * Avoids CDN blocks (firewalls, ad blockers) on first-run model fetch.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "1.7.0";
const CDN_TARBALL = `https://staticimgly.com/@imgly/background-removal-data/${VERSION}/package.tgz`;
const cacheDir = join(root, "node_modules", ".cache", "background-removal-data");
const tarballPath = join(cacheDir, `package-${VERSION}.tgz`);
const extractDir = join(cacheDir, "extracted");
const publicDist = join(
  root,
  "public",
  "background-removal-data",
  VERSION,
  "dist",
);

const REQUIRED_RESOURCES = [
  "/models/isnet_quint8",
  "/onnxruntime-web/ort-wasm-simd-threaded.wasm",
  "/onnxruntime-web/ort-wasm-simd-threaded.mjs",
];

async function downloadTarball() {
  mkdirSync(cacheDir, { recursive: true });
  if (existsSync(tarballPath) && statSync(tarballPath).size > 1_000_000) {
    console.log(`Using cached tarball ${tarballPath}`);
    return;
  }

  console.log(`Downloading background-removal data ${VERSION}…`);
  const response = await fetch(CDN_TARBALL);
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download ${CDN_TARBALL}: ${response.status} ${response.statusText}`,
    );
  }
  await pipeline(response.body, createWriteStream(tarballPath));
  console.log(`Saved ${tarballPath}`);
}

function extractTarball() {
  mkdirSync(extractDir, { recursive: true });
  const resourcesPath = join(extractDir, "package", "dist", "resources.json");
  if (!existsSync(resourcesPath)) {
    execFileSync("tar", ["-xzf", tarballPath, "-C", extractDir], {
      stdio: "inherit",
    });
  }
  if (!existsSync(resourcesPath)) {
    throw new Error("resources.json missing after tarball extract");
  }
  return JSON.parse(readFileSync(resourcesPath, "utf8"));
}

function collectRequiredFiles(resourceMap) {
  const files = new Set(["resources.json"]);
  for (const key of REQUIRED_RESOURCES) {
    const entry = resourceMap[key];
    if (!entry) {
      throw new Error(`Resource entry missing in resources.json: ${key}`);
    }
    for (const chunk of entry.chunks ?? []) {
      files.add(chunk.name);
    }
  }
  return files;
}

function copyAssets(files) {
  const sourceDist = join(extractDir, "package", "dist");
  mkdirSync(publicDist, { recursive: true });

  for (const file of files) {
    const source = join(sourceDist, file);
    const target = join(publicDist, file);
    if (!existsSync(source)) {
      throw new Error(`Missing asset in package: ${file}`);
    }
    const data = readFileSync(source);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
  }

  const resourcesSource = join(sourceDist, "resources.json");
  writeFileSync(join(publicDist, "resources.json"), readFileSync(resourcesSource));
}

async function main() {
  try {
    await downloadTarball();
    const resourceMap = extractTarball();
    const files = collectRequiredFiles(resourceMap);
    copyAssets(files);
    console.log(
      `Copied ${files.size} background-removal assets → ${publicDist}`,
    );
  } catch (error) {
    console.warn(
      "[copy-background-removal-data] skipped:",
      error instanceof Error ? error.message : error,
    );
    console.warn(
      "Client cutout will fall back to IMG.LY CDN when local assets are missing.",
    );
  }
}

await main();
