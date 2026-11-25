import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
let htmlCount = 0;
for (const directory of ["apps/web/pages", "apps/web/templates"]) {
  for (const name of await readdir(directory, { recursive: true })) {
    if (!name.endsWith(".html")) continue;
    const html = await readFile(path.join(directory, name), "utf8");
    if (
      !html.trim() ||
      /_next\/|self\.__next|__NEXT_DATA__|\son[a-z]+\s*=|<script(?![^>]*src=)/i.test(
        html,
      )
    )
      throw new Error(`Invalid plain HTML template: ${name}`);
    htmlCount++;
  }
}
for (const directory of ["apps/web/server", "apps/web/public"]) {
  for (const file of await readdir(directory)) {
    if (!file.endsWith(".js")) continue;
    const result = spawnSync(
      process.execPath,
      ["--check", path.join(directory, file)],
      { encoding: "utf8" },
    );
    if (result.status !== 0)
      throw new Error(result.stderr || `Invalid JavaScript: ${file}`);
  }
}
const pkg = JSON.parse(await readFile("apps/web/package.json", "utf8"));
if (["next", "react", "react-dom"].some((name) => pkg.dependencies?.[name]))
  throw new Error("Frontend framework dependency remains");
console.log(
  `Validated ${htmlCount} HTML files and server/browser JavaScript, including the local homepage scene bundle.`,
);
