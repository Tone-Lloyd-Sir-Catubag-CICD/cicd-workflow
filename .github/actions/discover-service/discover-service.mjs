#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const IGNORED_DIRS = new Set([
  ".git",
  ".github",
  ".gradle",
  ".idea",
  ".next",
  ".nx",
  ".expo",
  ".turbo",
  ".vercel",
  "Pods",
  "android/build",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "tmp",
]);

const GLOBAL_TRIGGER_FILES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "npm-shrinkwrap.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "nx.json",
  "tsconfig.base.json",
  "tsconfig.json",
  ".nvmrc",
]);

const STACK_ALIASES = new Map([
  ["node", "nodejs"],
  ["nodejs", "nodejs"],
  ["nestjs", "nestjs"],
  ["nest", "nestjs"],
  ["react", "react"],
  ["next", "nextjs"],
  ["nextjs", "nextjs"],
  ["react-native", "react-native"],
  ["reactnative", "react-native"],
  ["rn", "react-native"],
  ["expo", "expo"],
]);

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }

    parsed[key] = next;
    i += 1;
  }
  return parsed;
}

function normalizeStack(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  return STACK_ALIASES.get(normalized) || normalized;
}

function normalizeRelativePath(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === ".") {
    return ".";
  }

  return raw
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
}

function toPosix(relativePath) {
  return normalizeRelativePath(relativePath);
}

function exists(targetPath) {
  try {
    fs.accessSync(targetPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isDirectory(targetPath) {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function readJson(targetPath) {
  try {
    return JSON.parse(fs.readFileSync(targetPath, "utf8"));
  } catch {
    return null;
  }
}

function escapeForLog(value) {
  return String(value).replace(/\r/g, "").replace(/\n/g, "\\n");
}

function detectChangedFiles(repositoryRoot) {
  if (process.env.CHANGED_FILES) {
    return process.env.CHANGED_FILES.split(/\r?\n/)
      .map((entry) => toPosix(entry))
      .filter(Boolean);
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  const eventName = process.env.GITHUB_EVENT_NAME;
  let payload = null;

  if (eventPath && exists(eventPath)) {
    payload = readJson(eventPath);
  }

  let baseSha = "";
  let headSha = process.env.GITHUB_SHA || "";

  if (eventName === "pull_request" || eventName === "pull_request_target") {
    baseSha = payload?.pull_request?.base?.sha || "";
    headSha = payload?.pull_request?.head?.sha || headSha;
  } else if (eventName === "push") {
    baseSha = payload?.before || "";
    headSha = payload?.after || headSha;
  }

  if (baseSha && !/^0+$/.test(baseSha) && headSha) {
    try {
      const diff = execFileSync("git", ["diff", "--name-only", baseSha, headSha], {
        cwd: repositoryRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });

      return diff
        .split(/\r?\n/)
        .map((entry) => toPosix(entry))
        .filter(Boolean);
    } catch {
      // Fall through to no-op behavior.
    }
  }

  return [];
}

function walkForPackageCandidates(repositoryRoot) {
  const candidates = [];

  function visit(relativeDir) {
    const normalizedDir = relativeDir ? toPosix(relativeDir) : ".";
    const absoluteDir = normalizedDir === "."
      ? repositoryRoot
      : path.join(repositoryRoot, normalizedDir);

    if (exists(path.join(absoluteDir, "package.json"))) {
      candidates.push(normalizedDir);
    }

    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entryRelative = normalizedDir === "."
        ? entry.name
        : `${normalizedDir}/${entry.name}`;

      if (entry.name.startsWith(".") || IGNORED_DIRS.has(entry.name) || IGNORED_DIRS.has(entryRelative)) {
        continue;
      }

      visit(entryRelative);
    }
  }

  visit(".");
  return candidates;
}

function collectDependencies(pkg) {
  return {
    ...(pkg?.dependencies || {}),
    ...(pkg?.devDependencies || {}),
    ...(pkg?.peerDependencies || {}),
    ...(pkg?.optionalDependencies || {}),
  };
}

function hasAnyFile(absoluteDir, fileNames) {
  return fileNames.some((fileName) => exists(path.join(absoluteDir, fileName)));
}

function inferPackageManager(absoluteDir) {
  if (exists(path.join(absoluteDir, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (exists(path.join(absoluteDir, "yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}

function defaultInstallCommand(packageManager) {
  switch (packageManager) {
    case "pnpm":
      return "corepack enable && pnpm install --frozen-lockfile";
    case "yarn":
      return "corepack enable && yarn install --immutable || yarn install --frozen-lockfile";
    default:
      return "npm ci";
  }
}

function buildScriptCommand(packageManager, scriptName) {
  switch (packageManager) {
    case "pnpm":
      return `pnpm ${scriptName}`;
    case "yarn":
      return `yarn ${scriptName}`;
    default:
      return `npm run ${scriptName}`;
  }
}

function scriptBodyContainsCoverage(body) {
  return /(^|\s)(coverage|c8|nyc)(\s|$)|--coverage/.test(String(body || ""));
}

function findFirstScript(scripts, names) {
  for (const name of names) {
    if (typeof scripts[name] === "string" && scripts[name].trim() !== "") {
      return name;
    }
  }
  return "";
}

function inspectCandidate(repositoryRoot, relativeDir) {
  const absoluteDir = relativeDir === "."
    ? repositoryRoot
    : path.join(repositoryRoot, relativeDir);
  const pkg = readJson(path.join(absoluteDir, "package.json")) || {};
  const deps = collectDependencies(pkg);
  const scripts = pkg.scripts || {};
  const packageManager = inferPackageManager(absoluteDir);
  const packageName = typeof pkg.name === "string" && pkg.name.trim() !== ""
    ? pkg.name.trim()
    : path.basename(absoluteDir);

  const hasNest = Boolean(
    deps["@nestjs/core"] ||
    deps["@nestjs/common"] ||
    hasAnyFile(absoluteDir, ["nest-cli.json"]),
  );
  const hasExpo = Boolean(
    deps.expo ||
    hasAnyFile(absoluteDir, ["app.json", "app.config.js", "app.config.mjs", "app.config.ts"]),
  );
  const hasReactNative = Boolean(
    deps["react-native"] ||
    (isDirectory(path.join(absoluteDir, "android")) && isDirectory(path.join(absoluteDir, "ios"))),
  );
  const hasNext = Boolean(
    deps.next ||
    hasAnyFile(absoluteDir, ["next.config.js", "next.config.mjs", "next.config.ts"]),
  );
  const hasReact = Boolean(deps.react);
  const hasTypeScript = exists(path.join(absoluteDir, "tsconfig.json"));
  const hasPlaywright = Boolean(
    deps["@playwright/test"] ||
    hasAnyFile(absoluteDir, [
      "playwright.config.js",
      "playwright.config.mjs",
      "playwright.config.ts",
      "playwright.config.cjs",
    ]) ||
    isDirectory(path.join(absoluteDir, "tests", "e2e")),
  );
  const hasK6 = Boolean(
    scripts["test:performance"] ||
    scripts["perf:test"] ||
    isDirectory(path.join(absoluteDir, "tests", "performance")) ||
    exists(path.join(absoluteDir, "tests", "performance.js")) ||
    exists(path.join(absoluteDir, "tests", "performance.ts")),
  );
  const isWorkspaceRoot = Array.isArray(pkg.workspaces) || typeof pkg.workspaces === "object";
  const depth = relativeDir === "." ? 0 : relativeDir.split("/").length;

  return {
    relativeDir,
    absoluteDir,
    packageName,
    packageManager,
    scripts,
    hasNest,
    hasExpo,
    hasReactNative,
    hasNext,
    hasReact,
    hasTypeScript,
    hasPlaywright,
    hasK6,
    isWorkspaceRoot,
    depth,
  };
}

function candidateMatchesStack(candidate, stack) {
  switch (stack) {
    case "nestjs":
      return candidate.hasNest;
    case "nextjs":
      return candidate.hasNext;
    case "react":
      return candidate.hasReact && !candidate.hasNext && !candidate.hasReactNative && !candidate.hasExpo;
    case "react-native":
      return candidate.hasReactNative && !candidate.hasExpo;
    case "expo":
      return candidate.hasExpo;
    case "nodejs":
      return !candidate.hasNest && !candidate.hasNext && !candidate.hasReact && !candidate.hasReactNative && !candidate.hasExpo
        ? true
        : !candidate.hasNest && !candidate.hasNext && !candidate.hasReactNative && !candidate.hasExpo;
    default:
      return false;
  }
}

function inferBuildOutputPath(candidate, stack) {
  if (stack === "nextjs") {
    return ".next";
  }

  if (stack === "react") {
    if (
      hasAnyFile(candidate.absoluteDir, [
        "vite.config.js",
        "vite.config.ts",
        "vite.config.mjs",
        "vite.config.cjs",
      ])
    ) {
      return "dist";
    }

    const pkg = readJson(path.join(candidate.absoluteDir, "package.json")) || {};
    const deps = collectDependencies(pkg);
    if (deps["react-scripts"]) {
      return "build";
    }
    return "dist";
  }

  if (stack === "react-native" || stack === "expo") {
    return "";
  }

  return "dist";
}

function inferCoverageSummaryPath(candidate) {
  if (exists(path.join(candidate.absoluteDir, "coverage", "coverage-summary.json"))) {
    return "coverage/coverage-summary.json";
  }
  return "coverage/coverage-summary.json";
}

function inferCommands(candidate, stack) {
  const { scripts, packageManager } = candidate;
  const installCommand = defaultInstallCommand(packageManager);
  const lintScript = findFirstScript(scripts, ["lint"]);
  const formatScript = findFirstScript(scripts, ["format:check", "fmt:check", "lint:format"]);
  const integrationScript = findFirstScript(scripts, ["test:integration", "integration:test"]);
  const contractScript = findFirstScript(scripts, ["test:contract", "contract:test"]);
  const componentScript = findFirstScript(scripts, ["test:component", "component:test", "test:ui", "test"]);
  const e2eScript = findFirstScript(scripts, ["test:e2e", "e2e", "e2e:test"]);

  let unitScript = "";
  for (const name of ["test:coverage", "coverage", "test:ci", "test:unit", "test"]) {
    const body = scripts[name];
    if (!body) {
      continue;
    }

    if (name === "test:coverage" || name === "coverage" || scriptBodyContainsCoverage(body)) {
      unitScript = name;
      break;
    }
  }

  const lintCommand = lintScript ? buildScriptCommand(packageManager, lintScript) : "";
  const formatCommand = formatScript ? buildScriptCommand(packageManager, formatScript) : "";
  const typecheckCommand = scripts.typecheck
    ? buildScriptCommand(packageManager, "typecheck")
    : (candidate.hasTypeScript ? "npx tsc --noEmit" : "");
  const unitTestCommand = unitScript ? buildScriptCommand(packageManager, unitScript) : "";
  const integrationTestCommand = integrationScript ? buildScriptCommand(packageManager, integrationScript) : "";
  const contractTestCommand = contractScript ? buildScriptCommand(packageManager, contractScript) : "";
  const componentTestCommand = (stack === "react" || stack === "nextjs") && componentScript
    ? buildScriptCommand(packageManager, componentScript)
    : "";
  const e2eTestCommand = (stack === "nodejs" || stack === "nestjs") && e2eScript
    ? buildScriptCommand(packageManager, e2eScript)
    : "";
  const buildCommand = scripts.build ? buildScriptCommand(packageManager, "build") : "";
  const playwrightTestsDirectory = isDirectory(path.join(candidate.absoluteDir, "tests", "e2e"))
    ? "tests/e2e"
    : "";
  const runPlaywright = (stack === "react" || stack === "nextjs") && candidate.hasPlaywright && playwrightTestsDirectory !== "";
  const runK6 = (stack === "react" || stack === "nextjs") && candidate.hasK6;

  let k6ScriptPath = "";
  if (runK6) {
    if (isDirectory(path.join(candidate.absoluteDir, "tests", "performance"))) {
      k6ScriptPath = "tests/performance";
    } else if (exists(path.join(candidate.absoluteDir, "tests", "performance.js"))) {
      k6ScriptPath = "tests/performance.js";
    } else if (exists(path.join(candidate.absoluteDir, "tests", "performance.ts"))) {
      k6ScriptPath = "tests/performance.ts";
    } else {
      k6ScriptPath = "tests/performance";
    }
  }

  return {
    packageManager,
    installCommand,
    lintCommand,
    formatCommand,
    typecheckCommand,
    unitTestCommand,
    integrationTestCommand,
    componentTestCommand,
    contractTestCommand,
    e2eTestCommand,
    buildCommand,
    buildOutputPath: inferBuildOutputPath(candidate, stack),
    coverageSummaryPath: inferCoverageSummaryPath(candidate),
    runPlaywright,
    playwrightCommand: runPlaywright ? "npx playwright test --project={browser}" : "",
    playwrightTestsDirectory,
    runK6,
    k6ScriptPath,
  };
}

function serviceNameFromPackage(candidate, overrideName) {
  if (overrideName) {
    return overrideName;
  }

  const cleanedPackage = candidate.packageName.startsWith("@")
    ? candidate.packageName.split("/").slice(-1)[0]
    : candidate.packageName;

  return cleanedPackage.replace(/[^A-Za-z0-9._-]+/g, "-");
}

function countDirectMatches(relativeDir, changedFiles) {
  if (relativeDir === ".") {
    return changedFiles.length;
  }

  const prefix = `${relativeDir}/`;
  return changedFiles.filter((filePath) => filePath === relativeDir || filePath.startsWith(prefix)).length;
}

function isGlobalChange(filePath) {
  if (filePath.startsWith(".github/")) {
    return true;
  }

  if (filePath.includes("/")) {
    return false;
  }

  return GLOBAL_TRIGGER_FILES.has(filePath);
}

function shouldRunForCandidate(candidate, changedFiles, eventName) {
  if (eventName === "workflow_dispatch" || changedFiles.length === 0) {
    return true;
  }

  return changedFiles.some((filePath) => {
    if (isGlobalChange(filePath)) {
      return true;
    }

    if (candidate.relativeDir === ".") {
      return true;
    }

    return filePath === candidate.relativeDir || filePath.startsWith(`${candidate.relativeDir}/`);
  });
}

function rankCandidate(candidate, changedFiles) {
  const matchedFiles = countDirectMatches(candidate.relativeDir, changedFiles);
  const specializationScore =
    (candidate.hasNest ? 20 : 0) +
    (candidate.hasNext ? 20 : 0) +
    (candidate.hasExpo ? 20 : 0) +
    (candidate.hasReactNative ? 20 : 0);
  const scriptScore = candidate.scripts.build ? 6 : 0;
  const workspacePenalty = candidate.isWorkspaceRoot ? 8 : 0;

  return {
    ...candidate,
    matchedFiles,
    score: matchedFiles * 100 + candidate.depth * 10 + specializationScore + scriptScore - workspacePenalty,
  };
}

function fail(message, details = []) {
  console.error(`❌ ${message}`);
  for (const detail of details) {
    console.error(`   - ${detail}`);
  }
  process.exit(1);
}

function selectCandidate(candidates, changedFiles, stack, overridePath) {
  if (overridePath) {
    const normalizedOverride = normalizeRelativePath(overridePath);
    const overrideCandidate = candidates.find((candidate) => candidate.relativeDir === normalizedOverride);
    if (!overrideCandidate) {
      fail(`The requested service-path '${normalizedOverride}' was not found.`, candidates.map((candidate) => candidate.relativeDir));
    }
    return {
      candidate: overrideCandidate,
      reason: "manual-override",
    };
  }

  if (candidates.length === 0) {
    fail(`No '${stack}' service candidates were detected in this repository.`);
  }

  if (candidates.length === 1) {
    return {
      candidate: candidates[0],
      reason: "single-candidate",
    };
  }

  const ranked = candidates
    .map((candidate) => rankCandidate(candidate, changedFiles))
    .sort((left, right) => right.score - left.score);

  const changedOnly = ranked.filter((candidate) => candidate.matchedFiles > 0);
  if (changedOnly.length === 1) {
    return {
      candidate: changedOnly[0],
      reason: "changed-files",
    };
  }

  if (changedOnly.length > 1) {
    const [best, second] = changedOnly;
    if (best.score > second.score) {
      return {
        candidate: best,
        reason: "best-changed-match",
      };
    }

    fail(
      `Multiple '${stack}' services changed and automatic selection is ambiguous.`,
      changedOnly.map((candidate) => `${candidate.relativeDir} (score ${candidate.score})`),
    );
  }

  const [best, second] = ranked;
  if (best.score > second.score) {
    return {
      candidate: best,
      reason: "best-candidate",
    };
  }

  fail(
    `Multiple '${stack}' services were detected and selection is ambiguous. Set service-path explicitly in the generated workflow.`,
    ranked.map((candidate) => `${candidate.relativeDir} (score ${candidate.score})`),
  );
}

function writeOutputs(result) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  const lines = [];
  for (const [key, value] of Object.entries(result)) {
    lines.push(`${key}=${escapeForLog(value)}`);
  }

  fs.appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const stack = normalizeStack(args.stack || process.env.STACK);
  if (!STACK_ALIASES.has(stack) && !["nodejs", "nestjs", "react", "nextjs", "react-native", "expo"].includes(stack)) {
    fail(`Unsupported stack '${stack}'.`);
  }

  const repositoryRoot = path.resolve(args.root || process.cwd());
  const changedFiles = detectChangedFiles(repositoryRoot);
  const overridePath = normalizeRelativePath(args["service-path"] || process.env.INPUT_SERVICE_PATH || "");
  const overrideName = String(args["service-name"] || process.env.INPUT_SERVICE_NAME || "").trim();
  const eventName = process.env.GITHUB_EVENT_NAME || "workflow_dispatch";

  const packageCandidates = walkForPackageCandidates(repositoryRoot)
    .map((relativeDir) => inspectCandidate(repositoryRoot, relativeDir))
    .filter((candidate) => candidateMatchesStack(candidate, stack));

  const selection = selectCandidate(
    packageCandidates,
    changedFiles,
    stack,
    overridePath === "." && !process.env.INPUT_SERVICE_PATH ? "" : overridePath,
  );
  const commands = inferCommands(selection.candidate, stack);
  const shouldRun = shouldRunForCandidate(selection.candidate, changedFiles, eventName);

  const result = {
    "should-run": shouldRun ? "true" : "false",
    reason: selection.reason,
    "service-path": selection.candidate.relativeDir,
    "service-name": serviceNameFromPackage(selection.candidate, overrideName),
    "package-manager": commands.packageManager,
    "install-command": commands.installCommand,
    "lint-command": commands.lintCommand,
    "format-command": commands.formatCommand,
    "typecheck-command": commands.typecheckCommand,
    "unit-test-command": commands.unitTestCommand,
    "integration-test-command": commands.integrationTestCommand,
    "component-test-command": commands.componentTestCommand,
    "contract-test-command": commands.contractTestCommand,
    "e2e-test-command": commands.e2eTestCommand,
    "build-command": commands.buildCommand,
    "build-output-path": commands.buildOutputPath,
    "coverage-summary-path": commands.coverageSummaryPath,
    "run-playwright": commands.runPlaywright ? "true" : "false",
    "playwright-command": commands.playwrightCommand,
    "playwright-tests-directory": commands.playwrightTestsDirectory,
    "run-k6": commands.runK6 ? "true" : "false",
    "k6-script-path": commands.k6ScriptPath,
    "candidate-paths": JSON.stringify(packageCandidates.map((candidate) => candidate.relativeDir)),
    "changed-files": JSON.stringify(changedFiles),
  };

  console.log(JSON.stringify(result, null, 2));
  writeOutputs(result);
}

main();
