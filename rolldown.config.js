import { defineConfig } from "rolldown";

const entries = {
  index: "src/index.ts",
  pack: "src/pack/index.ts",
  "pr-status": "src/pr-status/index.ts",
  "pr-comment": "src/pr-comment/index.ts",
  "select-mode": "src/select-mode/index.ts",
  version: "src/version/index.ts",
  publish: "src/publish/index.ts",
};

// Each entry is bundled on its own so that every file in dist/ is
// self-contained (including the subscription check) instead of importing
// shared chunks.
export default defineConfig(
  Object.entries(entries).map(([name, input], i) => ({
    input: { [name]: input },
    output: {
      dir: "dist",
      format: "esm",
      cleanDir: i === 0,
      minify: true,
      comments: false,
      entryFileNames: "[name].js",
    },
    platform: "node",
  })),
);
