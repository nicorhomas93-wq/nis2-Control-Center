/**
 * Entfernt Tailwind-Responsive-Präfixe — behält Desktop-Varianten (höchster Breakpoint).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "src");
const BREAKPOINTS = ["sm", "md", "lg", "xl", "2xl"];
const BP_INDEX = Object.fromEntries(BREAKPOINTS.map((b, i) => [b, i + 1]));

function familyOf(cls) {
  if (cls === "flex-col" || cls === "flex-row") return "flex-dir";
  if (cls.startsWith("grid-cols-")) return "grid-cols";
  if (cls.startsWith("col-span-")) return "col-span";
  if (cls.startsWith("text-")) return "text-size";
  if (["hidden", "block", "inline", "inline-flex", "flex"].includes(cls)) return "display";
  if (cls === "w-full" || cls === "w-auto") return "width";
  if (cls.startsWith("items-")) return "items";
  if (cls.startsWith("justify-")) return "justify";
  if (/^p[xytblr]?-/.test(cls)) return cls.split("-")[0];
  if (cls.startsWith("max-w-")) return "max-w";
  if (cls.startsWith("gap-")) return "gap";
  return cls;
}

function stripResponsive(classString) {
  const tokens = classString.split(/\s+/).filter(Boolean);
  const responsive = [];
  const base = [];

  for (const t of tokens) {
    const m = t.match(/^(sm|md|lg|xl|2xl):(.+)$/);
    if (m) responsive.push({ bp: m[1], cls: m[2] });
    else base.push(t);
  }

  const chosen = new Map();
  for (const r of responsive) {
    const fam = familyOf(r.cls);
    const idx = BP_INDEX[r.bp];
    const prev = chosen.get(fam);
    if (!prev || idx >= prev.idx) chosen.set(fam, { cls: r.cls, idx });
  }

  const chosenFamilies = new Set(chosen.keys());
  const result = base.filter((b) => !chosenFamilies.has(familyOf(b)));
  for (const { cls } of chosen.values()) result.push(cls);
  return [...new Set(result)].join(" ");
}

function processStringLiterals(content) {
  return content.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match) => {
    const inner = match.slice(1, -1);
    if (!/\b(sm|md|lg|xl|2xl):/.test(inner)) return match;
    const merged = stripResponsive(inner);
    const quote = match[0];
    return `${quote}${merged}${quote}`;
  });
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, files);
    else if (entry.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const before = fs.readFileSync(file, "utf8");
  if (!/\b(sm|md|lg|xl|2xl):/.test(before)) continue;
  const after = processStringLiterals(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log(path.relative(process.cwd(), file));
    changed++;
  }
}
console.log(`Updated ${changed} files.`);
