const BOOLEAN_FLAGS = new Set([
  "yes",
  "json",
  "dry-run",
  "dryRun",
  "apply",
  "force",
  "help",
  "version",
]);

const ALIAS = {
  y: "yes",
  h: "help",
  f: "force",
};

function camel(key) {
  return key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function isBooleanFlag(raw) {
  const name = raw.replace(/^--/, "");
  return BOOLEAN_FLAGS.has(name) || BOOLEAN_FLAGS.has(camel(name));
}

/**
 * Parse argv into { flags, positionals }.
 * `--foo bar`, `--foo=bar`, `--foo` (boolean), `-y` / `-h` / `-f`.
 */
export function parseArgv(argv) {
  const args = argv.slice(2);
  const flags = {};
  const positionals = [];

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === "--") {
      positionals.push(...args.slice(i + 1));
      break;
    }
    if (token.startsWith("--")) {
      const body = token.slice(2);
      const eq = body.indexOf("=");
      if (eq !== -1) {
        flags[camel(body.slice(0, eq))] = body.slice(eq + 1);
        continue;
      }
      const key = camel(body);
      if (isBooleanFlag(token) || isBooleanFlag(body)) {
        flags[key] = true;
        continue;
      }
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }
    if (token.startsWith("-") && token.length > 1 && !token.startsWith("--")) {
      for (const ch of token.slice(1)) {
        const mapped = ALIAS[ch] || ch;
        flags[camel(mapped)] = true;
      }
      continue;
    }
    positionals.push(token);
  }

  return { flags, positionals };
}

export function asInt(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) {
    const err = new Error(`${field} 必须是整数`);
    err.code = "validation_error";
    err.field = field;
    throw err;
  }
  return n;
}

export function wantJson(flags) {
  if (flags.format === "json" || flags.json === true) return true;
  if (flags.format === "text") return false;
  if (process.env.GRAVITYD_FORMAT === "json") return true;
  if (process.env.GRAVITYD_FORMAT === "text") return false;
  return !process.stdout.isTTY;
}
