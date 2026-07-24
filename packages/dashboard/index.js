import { fileURLToPath } from "node:url";

export const assetsRoot = fileURLToPath(new URL("./dist/", import.meta.url));
