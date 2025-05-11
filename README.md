# illustrator-mcp

An implementation of MCP server for Adobe Illustrator.
It enables text, image, and path manipulation and information retrieval.
This tool only works on macOS.

## Usage

Add the following to your MCP client configuration file.

```json
{
  "mcpServers": {
    "illustrator": {
      "command": "node",
      "args": [
        "~/Documents/web/illustrator-mcp/build/index.js"
      ]
    }
  }
}
```

## Development

```bash
yarn
yarn test
```
