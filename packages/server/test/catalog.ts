import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { readCatalog } from "../src/catalog.ts";

describe("catalog", () => {
	it("serves requests.ndjson, one request object per line", async () => {
		const app = await createApp([]);
		const res = await app.request("/requests.ndjson");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("application/x-ndjson");
		const lines = (await res.text()).split("\n").filter((line) => line.trim() !== "");
		expect(lines).toEqual(await readCatalog());
		expect(lines.length).toBeGreaterThan(50);
		for (const line of lines) {
			const request = JSON.parse(line) as { method: string; path: string; headers?: Record<string, unknown> };
			expect(["GET", "POST"]).toContain(request.method);
			expect(request.path).toMatch(/^\/(graphql|1\.1|2)\//);
			expect(Object.keys(request.headers ?? {}).filter((h) => h !== "content-type")).toEqual([]);
		}
	});
});
