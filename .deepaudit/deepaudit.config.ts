import { defineConfig } from "deepaudit/config";

export default defineConfig({
  projects: [
    { id: "deepaudit", root: ".." },
    // <deepaudit:projects-insert-above>
  ],
});
