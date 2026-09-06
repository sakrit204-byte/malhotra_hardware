/**
 * Copy lint.
 *
 * Malhotra Enterprise interface copy must never contain a hyphen character.
 * Reviewers cannot be expected to catch every one by eye, so this walks the
 * TypeScript syntax tree of every component and reports hyphens that would
 * reach a customer.
 *
 * What is checked: text written between JSX tags, and string values passed to
 * attributes that carry human readable words.
 *
 * What is not checked: class names, routes, file paths, slugs, identifiers and
 * anything else that is machine addressing rather than language. Those are
 * allowed to contain hyphens because nobody reads them.
 *
 * Run with: npm run lint:copy
 */

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const HYPHENS = /[-‐‑]/;

/** Attributes whose string value is shown to or read out to a person. */
const COPY_ATTRIBUTES = new Set([
  "alt",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "caption",
  "confirmLabel",
  "cancelLabel",
  "description",
  "emptyMessage",
  "eyebrow",
  "headline",
  "heading",
  "hint",
  "label",
  "message",
  "placeholder",
  "subtitle",
  "summary",
  "title",
  "tooltip",
]);

/** Files whose exported strings are interface copy even though they are not JSX. */
const COPY_MODULES = [
  /src[\\/]lib[\\/]site\.ts$/,
  /src[\\/]content[\\/]/,
  // Seeded catalogue copy reaches customers exactly like component copy does.
  /prisma[\\/]seed[\\/]data[\\/]/,
  /prisma[\\/]seed[\\/]media[\\/]/,
];

type Finding = {
  file: string;
  line: number;
  column: number;
  text: string;
};

const root = process.cwd();

function collectFiles(): string[] {
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);

  return parsed.fileNames.filter(
    (file) => !file.includes("/generated/") && !file.includes("\\generated\\"),
  );
}

/**
 * A hyphen inside something that is plainly not prose. Keeps the lint focused on
 * language rather than on URLs a customer never reads.
 */
function isMachineText(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  if (/^https?:\/\//.test(trimmed)) return true;
  if (/^[\w./\\-]+$/.test(trimmed) && !/\s/.test(trimmed)) {
    // A single token with no spaces: a slug, a path or an identifier.
    return true;
  }
  return false;
}

function report(
  source: ts.SourceFile,
  node: ts.Node,
  value: string,
  findings: Finding[],
): void {
  if (!HYPHENS.test(value) || isMachineText(value)) return;

  const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));

  findings.push({
    file: relative(root, source.fileName),
    line: line + 1,
    column: character + 1,
    text: value.trim().replace(/\s+/g, " ").slice(0, 96),
  });
}

function scan(fileName: string): Finding[] {
  const findings: Finding[] = [];
  const source = ts.createSourceFile(
    fileName,
    readFileSync(fileName, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const isCopyModule = COPY_MODULES.some((pattern) => pattern.test(fileName));

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      report(source, node, node.text, findings);
    }

    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const attribute = node.name.text;
      const initializer = node.initializer;

      if (COPY_ATTRIBUTES.has(attribute) && initializer) {
        if (ts.isStringLiteral(initializer)) {
          report(source, initializer, initializer.text, findings);
        } else if (
          ts.isJsxExpression(initializer) &&
          initializer.expression &&
          ts.isStringLiteralLike(initializer.expression)
        ) {
          report(source, initializer.expression, initializer.expression.text, findings);
        }
      }
    }

    // Inside a copy module every string literal is language.
    if (isCopyModule && ts.isStringLiteralLike(node)) {
      report(source, node, node.text, findings);
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return findings;
}

function main(): void {
  const findings = collectFiles().flatMap(scan);

  if (findings.length === 0) {
    console.log("Copy lint passed. No hyphen characters in interface copy.");
    return;
  }

  console.error(
    `Copy lint failed. ${findings.length} hyphen ${
      findings.length === 1 ? "character" : "characters"
    } found in interface copy.\n`,
  );

  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line}:${finding.column}`);
    console.error(`    ${finding.text}\n`);
  }

  console.error("Rewrite the copy without hyphens. Use separate words or a comma.");
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
