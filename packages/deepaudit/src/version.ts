import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let cached: string | null = null;

/**
 * Read the version string from the deepaudit package's package.json. Walks
 * up from this module's location looking for the nearest package.json
 * whose `name` is `"deepaudit"`.
 *
 * Works the same way in dev (tsx running source — package.json is at
 * `packages/deepaudit/`) and in production (bundled dist — package.json
 * sits next to `dist/` inside the published `deepaudit` package).
 *
 * Used by:
 *   - cli.ts to populate `commander.version()`.
 *   - init.ts to pin the scaffolded `dependencies.deepaudit` to whatever
 *     this CLI was published as, so a fresh `pnpm install` in the
 *     scaffolded `.deepaudit/` actually resolves to a real version on npm.
 */
export function getDeepauditVersion(): string {
  if (cached !== null) return cached;
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "deepaudit" && typeof pkg.version === "string") {
          cached = pkg.version;
          return pkg.version;
        }
      } catch {
        // unreadable / non-JSON — keep walking
      }
    }
    dir = path.dirname(dir);
  }
  throw new Error(
    "Could not locate the deepaudit package.json (no ancestor with name === 'deepaudit' found)",
  );
}
