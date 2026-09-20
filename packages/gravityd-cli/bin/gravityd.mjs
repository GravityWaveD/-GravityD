#!/usr/bin/env node
import { parseArgv } from "../lib/args.mjs";
import { createIo, EXIT, fail } from "../lib/io.mjs";
import {
  cmdCurrent,
  cmdHelp,
  cmdInit,
  cmdLink,
  cmdMigrateApply,
  cmdModuleAdd,
  cmdSchema,
  cmdStatus,
  cmdUnlink,
  cmdUp,
  cmdVersion,
} from "../commands/index.mjs";

async function main() {
  const { flags, positionals } = parseArgv(process.argv);
  const command = positionals[0] || (flags.help ? "help" : flags.version ? "version" : "help");
  const io = createIo(flags, methodName(command, positionals[1]));

  try {
    if (flags.help && command !== "help") {
      process.exitCode = cmdHelp(io, methodName(command, positionals[1]));
      return;
    }

    let code = EXIT.OK;
    switch (command) {
      case "help":
        code = cmdHelp(io, positionals[1]);
        break;
      case "version":
        code = cmdVersion(io);
        break;
      case "schema":
        code = cmdSchema(io, positionals[1]);
        break;
      case "link":
        code = cmdLink(io, flags, process.cwd());
        break;
      case "init":
        code = cmdInit(io, flags, process.cwd());
        break;
      case "unlink":
        code = cmdUnlink(io, process.cwd());
        break;
      case "current":
        code = cmdCurrent(io, process.cwd());
        break;
      case "status":
      case "doctor":
        code = await cmdStatus(io, process.cwd());
        break;
      case "up":
        code = await cmdUp(io, process.cwd());
        break;
      case "module": {
        if (positionals[1] !== "add") {
          throw fail("validation_error", "用法: gravityd module add --domain <d> --resource <r> --title <t>", {
            hint: "gravityd schema module.add",
          });
        }
        code = await cmdModuleAdd(io, flags, process.cwd());
        break;
      }
      case "migrate": {
        if (positionals[1] !== "apply") {
          throw fail("validation_error", "用法: gravityd migrate apply --file <sql>", {
            hint: "gravityd schema migrate.apply",
          });
        }
        code = await cmdMigrateApply(io, flags, process.cwd(), positionals[2]);
        break;
      }
      default:
        throw fail("validation_error", `未知命令: ${command}`, { hint: "gravityd --help" });
    }
    process.exitCode = code;
  } catch (err) {
    process.exitCode = io.writeFail(err);
  }
}

function methodName(command, sub) {
  if (command === "module") return sub ? `module.${sub}` : "module.add";
  if (command === "migrate") return sub ? `migrate.${sub}` : "migrate.apply";
  return command;
}

main();
