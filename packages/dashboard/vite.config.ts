import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiTarget = "http://127.0.0.1:3001";
const uiPort = 3000;

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		host: "127.0.0.1",
		port: uiPort,
		strictPort: true,
		proxy: {
			"/api": {
				changeOrigin: true,
				target: apiTarget,
			},
			"/i/api/graphql": {
				changeOrigin: true,
				target: apiTarget,
			},
			"/1.1": {
				changeOrigin: true,
				target: apiTarget,
			},
			"/2": {
				changeOrigin: true,
				target: apiTarget,
			},
		},
	},
	build: {
		emptyOutDir: true,
		outDir: "dist",
	},
});
