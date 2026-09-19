import { fail } from "./io.mjs";

export function ident(value, field) {
  const s = String(value || "").trim();
  if (!/^[a-z][a-z0-9]{0,31}$/.test(s)) {
    throw fail(
      "validation_error",
      `${field} 必须是小写字母开头、仅含小写字母和数字，最长 32 位`,
      { field }
    );
  }
  return s;
}

export function pascal(value) {
  return String(value)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function safeTitle(value, field, fallback) {
  const s = String(value ?? fallback ?? "").trim();
  if (!s) {
    throw fail("validation_error", `缺少 ${field}`, { field });
  }
  if (/[`$]/.test(s) || s.length > 40) {
    throw fail("validation_error", `${field} 过长或含非法字符`, { field });
  }
  return s;
}

export function parseFields(raw) {
  if (!raw || raw === true) return [];
  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [name, type = "text"] = item.split(":").map((s) => s.trim());
      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        throw fail("validation_error", `非法字段名: ${name}`, { field: "fields" });
      }
      const t = (type || "text").toLowerCase();
      if (!["text", "int", "integer", "uuid", "timestamptz"].includes(t)) {
        throw fail("validation_error", `不支持的字段类型: ${type}`, { field: "fields" });
      }
      return { name, type: t === "integer" ? "int" : t };
    });
}

export function sqlType(field) {
  if (field.type === "int") return "INTEGER";
  if (field.type === "timestamptz") return "TIMESTAMPTZ";
  if (field.type === "uuid" || field.name.endsWith("_id")) {
    return 'UUID REFERENCES public.profiles(id) ON DELETE SET NULL';
  }
  return "TEXT";
}

export function moduleNames({ domain, resource, title, dirTitle }) {
  const d = ident(domain, "domain");
  const r = ident(resource, "resource");
  const pascalDomain = pascal(d);
  const pascalResource = pascal(r);
  return {
    domain: d,
    resource: r,
    table: `${d}_${r}`,
    title: safeTitle(title, "title", pascalResource),
    dirTitle: safeTitle(dirTitle, "dirTitle", d.toUpperCase()),
    pascalDomain,
    pascalResource,
    routeName: `${pascalDomain}${pascalResource}`,
    dirRouteName: pascalDomain,
    permPrefix: `module_${d}:${r}`,
    componentPath: `module_${d}/${r}/index`,
    apiExport: `${pascalResource}API`,
    typePrefix: pascalResource,
    migrationStem: `${d}_${r}`,
  };
}
