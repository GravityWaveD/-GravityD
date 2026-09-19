import { EXIT, SCHEMA_VERSION } from "./constants.mjs";
import { wantJson } from "./args.mjs";

export { EXIT };

const EXIT_BY_CODE = {
  not_linked: EXIT.AUTH,
  auth_error: EXIT.AUTH,
  validation_error: EXIT.VALIDATION,
  not_gravityd: EXIT.VALIDATION,
  already_exists: EXIT.VALIDATION,
  forbidden_migration: EXIT.VALIDATION,
  conflict: EXIT.VALIDATION,
};

export function errorShape(error) {
  return {
    code: error.code || "runtime_error",
    message: error.message || String(error),
    ...(error.field ? { field: error.field } : {}),
    retryable: Boolean(error.retryable),
    ...(error.hint ? { hint: error.hint } : {}),
  };
}

export function envelopeOk(data, meta = {}) {
  return {
    ok: true,
    data,
    meta: { schema_version: SCHEMA_VERSION, ...meta },
  };
}

export function envelopeFail(error, meta = {}) {
  return {
    ok: false,
    error: errorShape(error),
    meta: { schema_version: SCHEMA_VERSION, ...meta },
  };
}

export function exitFor(error) {
  if (typeof error.exit === "number") return error.exit;
  return EXIT_BY_CODE[error.code] ?? EXIT.RUNTIME;
}

export function createIo(flags, command) {
  const json = wantJson(flags);
  const metaBase = { command };

  function writeOk(data, human) {
    const body = envelopeOk(data, metaBase);
    if (json) {
      process.stdout.write(`${JSON.stringify(body)}\n`);
    } else {
      process.stdout.write(`${human || JSON.stringify(data, null, 2)}\n`);
    }
    return EXIT.OK;
  }

  function writeFail(error) {
    const body = envelopeFail(error, metaBase);
    if (json) {
      process.stdout.write(`${JSON.stringify(body)}\n`);
    } else {
      process.stderr.write(`${error.message}\n`);
      if (error.hint) process.stderr.write(`${error.hint}\n`);
    }
    return exitFor(error);
  }

  return {
    json,
    yes: Boolean(flags.yes),
    dryRun: Boolean(flags.dryRun),
    force: Boolean(flags.force),
    flags,
    writeOk,
    writeFail,
  };
}

export function fail(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

export function printHumanLines(lines) {
  return lines.filter((line) => line !== null && line !== undefined && line !== "").join("\n");
}
