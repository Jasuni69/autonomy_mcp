# Fabric & Power BI Toolkit for Claude

Auto-configures MCP servers for [Claude Code](https://claude.ai/claude-code) to work with Microsoft Fabric and Power BI.

## What You Get

- **fabric-core** — 138+ MCP tools for Microsoft Fabric (workspaces, lakehouses, SQL, DAX, notebooks, pipelines, OneLake, Microsoft Graph, Git, CI/CD, environments, connections, admin, Spark jobs)
- **powerbi-modeling** — Live semantic model editing in Power BI Desktop (measures, columns, translations, relationships)
- **powerbi-translation-audit** — Validates translation coverage with PASS/FAIL verdicts
- **CLAUDE.md knowledge base** — Comprehensive agent instructions so Claude knows how to use all tools correctly

## Prerequisites

| Requirement | How to Install |
|-------------|---------------|
| **Python 3.12+** | [python.org](https://www.python.org/downloads/) |
| **uv** (Python package manager) | [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) |
| **Azure CLI** | [Install Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) or `winget install -e --id Microsoft.AzureCLI` |
| **ODBC Driver 18** (optional, for SQL) | [Download](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) |
| **Power BI Modeling MCP** (optional) | Install from VS Code Marketplace: `analysis-services.powerbi-modeling-mcp` |

## Getting Started

### 1. Install prerequisites

Make sure Python 3.12+, uv, and Azure CLI are installed (see table above).

### 2. Log in to Azure

```bash
az login
```

This is required. The MCP tools use your Azure credentials to access Fabric and Power BI APIs. Without this, all tools will fail with authentication errors.

### 3. Open a workspace in VS Code

Open any folder — the extension activates automatically when it detects `.pbip`, `.Dataset`, or `.SemanticModel` files.

### 4. Run Full Setup

Open the Command Palette (`Ctrl+Shift+P`) and run:

```
Fabric & Power BI: Full Setup
```

This will:
- Verify all prerequisites
- Check your Azure authentication
- Install the fabric-core MCP server
- Set up the translation audit server
- Detect Power BI Modeling MCP if installed
- Generate `.mcp.json` for Claude Code
- Copy the `CLAUDE.md` knowledge base to your workspace

### 5. Restart Claude Code

After setup, restart Claude Code to load the new MCP servers. You're ready to go.

## Commands

| Command | Description |
|---------|-------------|
| `Fabric & Power BI: Full Setup` | Run the complete setup process |
| `Fabric & Power BI: Check Prerequisites` | Verify all prerequisites are installed |
| `Fabric & Power BI: Regenerate .mcp.json` | Rebuild MCP config without re-running full setup |

## Usage with Claude Code

Once set up, Claude Code can:

- **Query your data** — "What are the top 10 customers by revenue?"
- **Build pipelines** — "Create an ETL notebook that loads CSV into a lakehouse"
- **Manage semantic models** — "Add a YTD revenue measure to the Sales table"
- **Translate reports** — "Translate the Power BI report to Swedish"
- **Explore OneLake** — "What files are in the lakehouse?"
- **Send notifications** — "Post the results to the Teams channel"

## Troubleshooting

### MCP tools fail with authentication errors
Run `az login` and then re-run `Fabric & Power BI: Full Setup`.

### Tools can't find my workspace/lakehouse
Claude needs to set the active workspace and lakehouse before querying. Tell it which workspace to use, or include the workspace name in your request.

### SQL queries return no results for new tables
New delta tables take 5-10 minutes to appear in the SQL endpoint. Wait and try again.

### Power BI Modeling MCP not detected
Install it from the VS Code Marketplace: search for `powerbi-modeling-mcp` by Microsoft.

## License

MIT
