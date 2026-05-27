import { type DeepauditPlugin, defineConfig } from "deepaudit/config";
import { archiveExtractionUntrusted } from "./matchers/archive-extraction-untrusted.js";

const deepauditPlugin: DeepauditPlugin = {
  name: "deepaudit-internal",
  matchers: [archiveExtractionUntrusted],
};

export default defineConfig({
  projects: [
    { id: "deepaudit", root: ".." },
    // <deepaudit:projects-insert-above>
  ],
  plugins: [deepauditPlugin],
});
