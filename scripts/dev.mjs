import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const devDir = path.join(projectRoot, ".next", "dev");
const lockPath = path.join(devDir, "lock");
const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const DEV_PORT = 3000;

function sleep(ms) {
  execSync(process.platform === "win32" ? `ping -n ${Math.ceil(ms / 500) + 1} 127.0.0.1 > nul` : `sleep ${ms / 1000}`, {
    stdio: "ignore",
  });
}

function killProcess(pid) {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return;

  if (process.platform === "win32") {
    try {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
    } catch {
      // Already exited.
    }
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Already exited.
  }
}

function getPidsOnPort(port) {
  const pids = new Set();

  if (process.platform === "win32") {
    try {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      for (const line of output.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const pid = Number(line.trim().split(/\s+/).pop());
        if (pid > 0) pids.add(pid);
      }
    } catch {
      // No listeners on this port.
    }
    return [...pids];
  }

  try {
    const output = execSync(`lsof -ti tcp:${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const line of output.split(/\r?\n/)) {
      const pid = Number(line.trim());
      if (pid > 0) pids.add(pid);
    }
  } catch {
    // No listeners on this port.
  }

  return [...pids];
}

function stopExistingDevServer() {
  const killed = new Set();

  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      const pid = Number(lock?.pid);
      if (Number.isInteger(pid) && pid > 0) {
        killProcess(pid);
        killed.add(pid);
      }
    } catch {
      // Ignore malformed lock files.
    }
  }

  for (const pid of getPidsOnPort(DEV_PORT)) {
    if (!killed.has(pid)) {
      killProcess(pid);
      killed.add(pid);
    }
  }

  if (killed.size > 0) {
    sleep(600);
  }
}

function cleanDevCache() {
  if (!fs.existsSync(devDir)) return;

  try {
    fs.rmSync(devDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    // Retry once after a short pause when Windows still holds file handles.
    sleep(400);
    fs.rmSync(devDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 });
  }
}

stopExistingDevServer();
cleanDevCache();

const extraArgs = process.argv.slice(2);
const useWebpack = !extraArgs.includes("--turbopack");
const filteredArgs = extraArgs.filter((arg) => arg !== "--turbopack");
const hasPortArg = filteredArgs.some((arg) => arg === "-p" || arg === "--port" || arg.startsWith("--port="));
const devArgs = [
  "dev",
  ...(useWebpack ? ["--webpack"] : []),
  ...(hasPortArg ? [] : ["--port", String(DEV_PORT)]),
  ...filteredArgs,
];

const child = spawn(process.execPath, [nextCli, ...devArgs], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_PATH: path.join(projectRoot, "node_modules"),
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
