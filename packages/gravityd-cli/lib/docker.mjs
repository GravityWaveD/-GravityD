import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import { fail } from "./io.mjs";

export function runCommand(command, args, { cwd, stdinFile, timeoutMs = 120_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: stdinFile ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (buf) => {
      stdout += buf.toString();
    });
    child.stderr.on("data", (buf) => {
      stderr += buf.toString();
    });
    if (stdinFile) {
      createReadStream(stdinFile).pipe(child.stdin);
    }
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: err.message });
    });
  });
}

export async function applySqlFile(root, file) {
  const composeDir = join(root, "insforge");
  if (!existsSync(join(composeDir, "docker-compose.yaml")) && !existsSync(join(composeDir, "docker-compose.yml"))) {
    throw fail("runtime_error", "找不到 insforge/docker-compose.yaml，请先 bash scripts/init.sh", {
      retryable: false,
      hint: "insforge/ 在 .gitignore，需要本地克隆后再 apply",
    });
  }
  const result = await runCommand(
    "docker",
    ["compose", "exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "insforge", "-v", "ON_ERROR_STOP=1"],
    { cwd: composeDir, stdinFile: file, timeoutMs: 180_000 }
  );
  if (result.code !== 0) {
    throw fail("runtime_error", `psql 失败 (exit ${result.code})`, {
      retryable: true,
      hint: (result.stderr || result.stdout).trim().slice(0, 800),
    });
  }
  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

export async function insforgeUp(root) {
  const script = join(root, "scripts", "insforge-up.sh");
  if (!existsSync(script)) {
    throw fail("runtime_error", "找不到 scripts/insforge-up.sh");
  }
  const result = await runCommand("bash", [script], { cwd: root, timeoutMs: 180_000 });
  if (result.code !== 0) {
    throw fail("runtime_error", `insforge-up 失败 (exit ${result.code})`, {
      retryable: true,
      hint: (result.stderr || result.stdout).trim().slice(0, 800),
    });
  }
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

export async function pingHttp(url, timeoutMs = 2500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual", signal: ctrl.signal });
    return { ok: res.status > 0, status: res.status };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "timeout" : err.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function pingTcp(host, port, timeoutMs = 1500) {
  const net = await import("node:net");
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, error: "timeout" });
    }, timeoutMs);
    socket.on("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve({ ok: true });
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });
  });
}
