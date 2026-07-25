# twitter-api-safe-mcp

MCP (Model Context Protocol) server for safe Twitter/X web API requests. It runs the full [twitter-api-safe-relay](../server/README.md) server (HTTP API + dashboard) and serves MCP over stdio in a single process.

## Usage

Run directly:

```sh
pnpx twitter-api-safe-mcp [settings-file]
```

When run in a terminal without a settings file, it interactively prompts for the browser at startup. When launched by an MCP client, a settings file is required. The settings file format is the same as [twitter-api-safe-relay](../server/README.md).

MCP client configuration:

```json
{
	"mcpServers": {
		"twitter-api-safe": {
			"command": "pnpx",
			"args": ["twitter-api-safe-mcp", "./settings.json"]
		}
	}
}
```

Or with Claude Code:

```sh
claude mcp add twitter-api-safe -- pnpx twitter-api-safe-mcp ./settings.json
```

## Tools

- `list_profiles` — list the available browser profile names.
- `twitter_api_request` — send a request through a logged-in browser profile. Takes `method`, `path` (relative to `https://x.com/i/api`), `params`, `body`, and an optional `profile`.

## License

MIT
