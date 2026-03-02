# Fabric & Power BI Toolkit for Claude

Auto-configures MCP servers for [Claude Code](https://claude.ai/claude-code) to work with Microsoft Fabric and Power BI.

## What You Get

- **fabric-core** — 138+ MCP tools for Microsoft Fabric (workspaces, lakehouses, SQL, DAX, notebooks, pipelines, OneLake, Microsoft Graph, Git, CI/CD, environments, connections, admin, Spark jobs)
- **powerbi-modeling** — Live semantic model editing in Power BI Desktop (measures, columns, translations, relationships)
- **powerbi-translation-audit** — Validates translation coverage with PASS/FAIL verdicts
- **CLAUDE.md knowledge base** — Comprehensive agent instructions so Claude knows how to use all tools correctly
- **Interactive setup CLI** — Terminal-based setup with menus, spinners, progress, and project-scoped installs

## What's New in v2.1

- **Interactive CLI** — "Full Setup" now opens a terminal with an interactive menu instead of running silently
- **Project-scoped installs** — Choose "Project (mcp/)" to install everything into a self-contained `mcp/` folder in your workspace. No global pollution.
- **Company config sync** — Pull company-specific CLAUDE.md, agents, and skills from a GitHub repo
- **Main menu** — Run individual tasks (prereqs, smoke test, company sync) without re-running full setup
- **Global or Project** — Choose where servers and config land. Project = portable, self-contained. Global = shared across workspaces.

## Prerequisites

| Requirement | How to Install |
|-------------|---------------|
| **Python 3.12+** | [python.org](https://www.python.org/downloads/) |
| **uv** (Python package manager) | [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) |
| **Azure CLI** | [Install Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) or `winget install -e --id Microsoft.AzureCLI` |
| **ODBC Driver 18** (optional, for SQL) | [Download](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) |
| **.NET 9.x+ Runtime** (for Power BI Modeling) | [dotnet.microsoft.com](https://dotnet.microsoft.com/en-us/download/dotnet/9.0) or `winget install -e --id Microsoft.DotNet.Runtime.9` |
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

This opens an interactive terminal where you can:

1. **Select MCP servers** — choose which servers to install (Fabric Core, Power BI Modeling, Translation Audit)
2. **Choose install scope** — Project (`mcp/` folder) or Global (`~/.fabric-mcp/`)
3. **Configure company KB** — use bundled defaults or sync from a company GitHub repo
4. **Check prerequisites** — verify Python, uv, Azure CLI, .NET, ODBC
5. **Install servers** — with progress spinners and real-time output
6. **Validate** — smoke tests verify each server can start
7. **See summary** — shows exactly where everything was installed

After setup, the CLI returns to a main menu where you can run individual tasks.

### 5. Restart Claude Code

After setup, restart Claude Code to load the new MCP servers. You're ready to go.

## Install Scopes

### Project (mcp/)

Everything installs into a `mcp/` folder in your workspace:

```
your-project/
└── mcp/
    ├── .claude/
    │   ├── agents/          ← agent instruction files
    │   └── skills/          ← skill documentation
    ├── .servers/
    │   ├── fabric-core/     ← Python MCP server + venv
    │   └── translation-audit/
    ├── .mcp.json            ← config pointing to local servers
    └── CLAUDE.md            ← knowledge base
```

Benefits: self-contained, portable, won't affect other projects if something breaks.

### Global (~/.fabric-mcp/)

Servers install to `~/.fabric-mcp/`, config goes to `~/.claude/settings.json`. Shared across all workspaces.

## Company Config Sync

Teams can maintain company-specific CLAUDE.md, agents, and skills in a shared GitHub repo:

```
github.com/org/fabric-configs/
├── companies/
│   ├── acme/
│   │   ├── CLAUDE.md
│   │   ├── agents/
│   │   └── skills/
│   └── contoso/
│       ├── CLAUDE.md
│       └── agents/
```

From the CLI main menu, select "Company Config" — the CLI clones the repo, lists all companies, and lets you pick one. Selected company files replace the bundled defaults in your `mcp/` folder. Run it again anytime to pull latest changes.

## Commands

| Command | Description |
|---------|-------------|
| `Fabric & Power BI: Full Setup` | Opens interactive setup CLI in terminal |
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

### Prerequisites not detected after installing
VS Code snapshots your system PATH when it launches. If you install tools (uv, az, dotnet, etc.) while VS Code is already open, it won't see them. **Close all VS Code windows and reopen** to pick up the new PATH. The extension also checks common install locations as a fallback, but a full restart is the most reliable fix.

### Setup CLI doesn't open / terminal is blank
The CLI requires Node.js. The extension tries VS Code's built-in runtime first, but if that fails, install Node.js 18+ from [nodejs.org](https://nodejs.org/).

### Power BI Modeling MCP not detected
Install it from the VS Code Marketplace: search for `powerbi-modeling-mcp` by Microsoft. Also requires .NET 9.x+ runtime.

### Company config sync fails
Make sure `git` is on your PATH and you have access to the company repo. The CLI clones with `--depth 1` so it's fast.

## License

MIT
