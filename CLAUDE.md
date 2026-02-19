# Fabric & Power BI Toolkit — Agent Instructions

This workspace has 3 MCP servers configured:
1. **fabric-core** — 138+ tools for Microsoft Fabric management (workspaces, lakehouses, SQL, DAX, notebooks, pipelines, OneLake, Graph, Git, CI/CD, environments, connections, admin, item definitions, Spark jobs, raw API)
2. **powerbi-modeling** — Microsoft's Power BI Modeling MCP for live semantic model editing in Power BI Desktop
3. **powerbi-translation-audit** — Translation validation tools (scan for untranslated content, PASS/FAIL verdict)

To re-run setup: Command Palette > **Fabric & Power BI: Full Setup**

---

## fabric-core: Context Flow

- Always `set_workspace` before other operations
- Always `set_lakehouse` or `set_warehouse` before SQL/table operations
- Use `list_tables` or `SELECT TOP 1 *` to discover schema before writing queries

## fabric-core: SQL Rules

- Always pass `type` ("lakehouse" or "warehouse") to sql_query, sql_explain, sql_export
- Fabric SQL endpoints are read-only — no INSERT/UPDATE/DELETE/DDL
- New delta tables take 5-10 min to appear in SQL endpoint
- Use T-SQL dialect with FORMAT() for readable numbers
- NEVER guess table names, schemas, or column names. When querying a lakehouse for the first time:
  1. Run `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES` to discover what exists
  2. Run `SELECT TOP 1 * FROM <schema>.<table>` on relevant tables to get actual column names
  3. Then write the real query using the discovered names
  Column conventions vary wildly (PascalCase, snake_case, etc). Always discover, never assume.

## fabric-core: Data Questions

- Translate natural language to SQL automatically — don't ask, just query
- When querying unfamiliar data, silently discover tables and columns first, then write the query. Don't show the discovery steps to the user unless they ask.
- Format results as markdown tables
- Default to TOP 20 for ranked queries
- Suggest follow-up analyses when relevant

## fabric-core: Semantic Models & DAX

- Add descriptions when creating measures
- Use format strings (e.g., "#,0.00", "0.0%") on measures
- When gold tables are created, suggest relevant DAX measures

## fabric-core: OneLake

- `onelake_ls` browses Files path by default — use `path: "Tables"` for delta tables
- Shortcuts reference data without copying — prefer over duplication

## fabric-core: Notebooks

- Use `create_pyspark_notebook` with templates (basic, etl, analytics, ml)
- `run_notebook_job` + `get_run_status` to execute and poll
- `update_notebook_cell` caches the original notebook before writing — use `restore_notebook` to undo if needed
- If a notebook read fails during update, the operation aborts to prevent data loss

## fabric-core: Naming Conventions

- Bronze: `{source}_{entity}_raw`
- Silver: `{entity}_clean`
- Gold: `fact_{entity}`, `dim_{entity}`
- Measures: `Total {Metric}`, `{Metric} YTD`, `{Metric} Growth %`

---

## powerbi-modeling: Usage

Use ToolSearch for `powerbi-modeling` to discover available tools.
Common operations: translate semantic model captions, manage cultures, edit model metadata, create/edit measures, batch operations.
This server talks to a **running Power BI Desktop instance** — the report must be open in Desktop.

---

## Translation Workflow

When user says "translate" or "translate using the playbook":

Read and follow `TRANSLATION_PLAYBOOK.md` from Phase 0 through Phase 10:
- **Phases 0-9**: Use MCP tools (ToolSearch for `powerbi-modeling` tools) to translate the semantic model
- **Phase 10**: Edit report JSON files on disk (visual titles, nativeQueryRef displayName injection, text boxes)
- For Phase 10 step 10.3, use `pbip_translate_display_names.py` with `translation_map_sv-SE.json` as the base dictionary
- After all phases: use the `powerbi-translation-audit` MCP tools to verify zero English remains
- Call `validate_translation_coverage` with the report's pages_dir for a PASS/FAIL verdict
- If FAIL, call `scan_english_remaining` for details on what to fix

### Translation Key Files

| File | When to use |
|------|-------------|
| `TRANSLATION_PLAYBOOK.md` | The full translation process — read this first |
| `pbip_translate_display_names.py` | Phase 10.3 — bulk nativeQueryRef → displayName |
| `pbip_fix_visual_titles.py` | Phase 10.4 — fix auto-generated visual titles + slicer headers |
| `translation_map_sv-SE.json` | Swedish translation dictionary — start from this, add project-specific terms |

### Translation Rules

- Always scan ALL pages, not just a few. Targeted scans miss 80%+ of English.
- Never change `nativeQueryRef` values. Add `displayName` next to them instead.
- Never translate conditional formatting selectors (`scopeId.Comparison.Right.Literal.Value`).
- Run `pbip_fix_visual_titles.py` AFTER `pbip_translate_display_names.py` — the title script uses displayName values from projections.
- After editing .pbip JSON, user must close and reopen Power BI Desktop to see changes.
- Run `validate_translation_coverage` before declaring done. No "trust me it's translated" — get a PASS verdict.

### Scripting Repetitive Edits

When you find translatable content that requires repetitive manual edits across many files:
1. Write a project-specific script in the project's own folder
2. Follow the pattern: scan → build map → dry-run → execute
3. Always include `--dry-run` mode
4. Goal: never do more than 5 manual edits of the same type. If there are more, script it.

---

## Complete Tool Reference (fabric-core)

**138 tools** across 24 categories.

### Quick Reference

| Category | Tools | Description |
|----------|-------|-------------|
| Workspace | 5 | List, create, update, delete, set active workspace |
| Lakehouse | 7 | List, create, update, delete, set active, table maintenance, load table |
| Warehouse | 5 | List, create, update, delete, set active warehouse |
| Tables & Delta | 9 | Schema, preview, history, optimize, vacuum |
| SQL | 4 | Query, explain, export, endpoint resolution |
| Semantic Models & DAX | 9 | Models, measures CRUD, DAX analysis |
| Power BI | 4 | DAX queries, model refresh, report export |
| Reports | 2 | List and get report details |
| Notebooks | 18 | Create, execute, code generation, validation, restore |
| Pipelines & Scheduling | 8 | Run, monitor, create pipelines; manage schedules |
| OneLake | 7 | File I/O, directory listing, shortcuts |
| Data Loading | 1 | Load CSV/Parquet from URL into delta tables |
| Items & Permissions | 4 | Resolve items, workspace role assignments |
| Microsoft Graph | 10 | Users, mail, Teams messaging/discovery, OneDrive |
| Git Integration | 9 | Connect, commit, pull, status, credentials |
| Deployment Pipelines | 10 | CRUD, deploy stages, assign workspaces (CI/CD) |
| Capacities | 1 | List available Fabric/Power BI capacities |
| Raw API | 1 | Universal escape hatch — call any Microsoft API |
| Environments | 7 | CRUD, publish, cancel publish (Spark/Python library management) |
| Connections | 6 | CRUD, list supported types (data source connections) |
| Admin | 1 | Tenant settings (requires Fabric Admin role) |
| Item Definitions | 3 | Export/import/update any Fabric item definition (Base64) |
| Spark Job Definitions | 7 | CRUD, get/update definition for production Spark jobs |
| Context | 1 | Clear session context |

### 1. Workspace Management

`list_workspaces()` — List all accessible workspaces.

`create_workspace(display_name, capacity_id?, description?, domain_id?)` — Create workspace.

`update_workspace(workspace, display_name?, description?)` — Rename or update workspace description.

`delete_workspace(workspace)` — Delete workspace and all items. Irreversible.

`set_workspace(workspace)` — Set active workspace. Required before most operations.

### 2. Lakehouse Management

`list_lakehouses(workspace?)` — List lakehouses.

`create_lakehouse(name, workspace?, description?, enable_schemas=True, folder_id?)` — Create lakehouse. Schemas enabled by default.

`update_lakehouse(lakehouse, display_name?, description?, workspace?)` — Rename or update lakehouse description.

`delete_lakehouse(lakehouse, workspace?)` — Delete lakehouse and SQL endpoint. Irreversible.

`set_lakehouse(lakehouse)` — Set active lakehouse for table/SQL ops.

`lakehouse_table_maintenance(table_name, lakehouse?, workspace?, schema_name?, v_order=True, z_order_by?, vacuum_retention?)` — Native Fabric table maintenance job (optimize + vacuum). Uses Jobs API instead of notebooks. vacuum_retention format: "7.00:00:00" for 7 days.

`lakehouse_load_table(table_name, relative_path, path_type="File", mode="Overwrite", file_format="Csv", header=True, delimiter=",", recursive=False, lakehouse?, workspace?)` — Load data from OneLake Files into a delta table via Fabric API. Source must exist in lakehouse Files section. Supports CSV and Parquet. LRO.

### 3. Warehouse Management

`list_warehouses(workspace?)` — List warehouses.

`create_warehouse(name, workspace?, description?, folder_id?)` — Create warehouse.

`update_warehouse(warehouse, display_name?, description?, workspace?)` — Rename or update warehouse description.

`delete_warehouse(warehouse, workspace?)` — Delete warehouse. Irreversible.

`set_warehouse(warehouse)` — Set active warehouse for SQL ops.

### 4. Table & Delta Operations

`list_tables(workspace?, lakehouse?)` — List delta tables.

`set_table(table_name)` — Set active table.

`table_preview(table?, lakehouse?, workspace?, limit=50)` — Preview rows via SQL endpoint.

`table_schema(table?, lakehouse?, workspace?)` — Get column types and metadata.

`get_lakehouse_table_schema(table_name, workspace?, lakehouse?)` — Same as table_schema.

`get_all_lakehouse_schemas(lakehouse?, workspace?)` — All table schemas in one call.

`describe_history(table?, lakehouse?, workspace?, limit=20)` — Delta transaction log history.

`optimize_delta(table?, lakehouse?, workspace?, zorder_by?)` — Compact small files, optional Z-order.

`vacuum_delta(table?, lakehouse?, workspace?, retain_hours=168)` — Remove old unreferenced files.

### 5. SQL Operations

`sql_query(query, workspace?, lakehouse?, type, max_rows=100)` — Execute T-SQL. type="lakehouse"|"warehouse" required.

`sql_explain(query, type, workspace?, lakehouse?)` — Get execution plan (SHOWPLAN XML).

`sql_export(query, target_path, type, workspace?, lakehouse?, export_lakehouse?, file_format="csv", overwrite=True)` — Export results to OneLake.

`get_sql_endpoint(workspace?, lakehouse?, type)` — Get connection details (server, database, connectionString).

### 6. Semantic Models & DAX

`list_semantic_models(workspace?)` — List models.

`get_semantic_model(workspace?, model_id?)` — Get model details.

`get_model_schema(workspace?, model?)` — Full TMSL schema (tables, columns, measures, relationships). Only user-created models.

`list_measures(workspace?, model?)` — List DAX measures.

`get_measure(measure_name, workspace?, model?)` — Get measure definition.

`create_measure(measure_name, dax_expression, table_name, workspace?, model?, format_string?, description?, is_hidden?)` — Create measure. User-created models only.

`update_measure(measure_name, workspace?, model?, dax_expression?, format_string?, description?, is_hidden?, new_name?)` — Update measure.

`delete_measure(measure_name, workspace?, model?)` — Delete measure.

`analyze_dax_query(dax_query, workspace?, model?, include_execution_plan=True)` — Analyze DAX performance.

### 7. Power BI

`dax_query(dataset, query, workspace?)` — Execute DAX via Power BI REST API.

`semantic_model_refresh(workspace?, model?, refresh_type="Full", objects?, commit_mode?, max_parallelism?, retry_count?, apply_refresh_policy?)` — Enhanced refresh. Supports selective table refresh (objects="Sales,Products"), transactional/partial commit, parallelism tuning.

`report_export(workspace?, report?, format="pdf")` — Export report (pdf, pptx, png).

`report_params_list(workspace?, report?)` — List report parameters.

### 8. Reports

`list_reports(workspace?)` — List reports.

`get_report(workspace?, report_id?)` — Get report details.

### 9. Notebooks

**Basic:** `list_notebooks`, `create_notebook`, `get_notebook_content`, `update_notebook_cell`, `restore_notebook`

**Templates:** `create_pyspark_notebook(workspace, notebook_name, template_type)` — Templates: basic|etl|analytics|ml. `create_fabric_notebook(workspace, notebook_name, template_type)` — Templates: fabric_integration|streaming.

**Code gen:** `generate_pyspark_code(operation, source_table, columns?, filter_condition?)` — Operations: read_table, write_table, transform, join, aggregate, schema_inference, data_quality, performance_optimization. `generate_fabric_code(operation, lakehouse_name?, table_name?, target_table?)` — Operations: read_lakehouse, write_lakehouse, merge_delta, performance_monitor.

**Validation:** `validate_pyspark_code(code)`, `validate_fabric_code(code)`, `analyze_notebook_performance(workspace, notebook_id)` — Score 0-100 with recommendations.

**Execution:** `run_notebook_job(workspace, notebook, parameters?, configuration?)` → returns job_id. `get_run_status(workspace, notebook, job_id)` → status. `cancel_notebook_job(workspace, notebook, job_id)`.

**Spark env:** `cluster_info(workspace)`, `install_requirements(workspace, requirements_txt)` ⚠️ known bug, `install_wheel(workspace, wheel_url)` ⚠️ known bug.

### 10. Pipelines & Scheduling

`create_data_pipeline(pipeline_name, pipeline_definition, workspace?, description?)` — Create Data Factory pipeline.

`get_pipeline_definition(pipeline, workspace?)` — Get pipeline with decoded activities (LRO).

`pipeline_run(workspace, pipeline, parameters?)` — Trigger execution.

`pipeline_status(workspace, pipeline, run_id)` — Get run status.

`pipeline_logs(workspace, pipeline, run_id?)` — Execution history.

`dataflow_refresh(workspace, dataflow)` — Trigger Dataflow Gen2 refresh.

`schedule_list(workspace, item, job_type?)` — List refresh schedules.

`schedule_set(workspace, item, job_type, schedule)` — Create/update schedule (Cron format).

### 11. OneLake Storage

`onelake_ls(lakehouse, path="Files", workspace?)` — List files/folders.

`onelake_read(lakehouse, path, workspace?)` — Read file contents.

`onelake_write(lakehouse, path, content, workspace?, overwrite=True, encoding="utf-8", is_base64=False)` — Write file.

`onelake_rm(lakehouse, path, workspace?, recursive=False)` — Delete file/dir.

`onelake_create_shortcut(lakehouse, shortcut_name, shortcut_path, target_workspace, target_lakehouse, target_path, workspace?)` — Create shortcut.

`onelake_list_shortcuts(lakehouse, workspace?)` — List shortcuts.

`onelake_delete_shortcut(lakehouse, shortcut_path, shortcut_name, workspace?)` — Delete shortcut.

### 12. Data Loading

`load_data_from_url(url, destination_table, workspace?, lakehouse?, warehouse?)` — Load CSV/Parquet from URL into delta table.

### 13. Items & Permissions

`resolve_item(workspace, name_or_id, type?)` — Resolve item to UUID.

`list_items(workspace, type?, search?, top=100, skip=0)` — List workspace items.

`get_permissions(workspace, item_id?)` — Get workspace role assignments.

`set_permissions(workspace, principal_id, principal_type, role)` — Add role assignment. Roles: Admin|Member|Contributor|Viewer.

### 14. Microsoft Graph

`graph_user(email)` — User lookup. Use "me" for current user.

`graph_mail(to, subject, body, cc?, bcc?, importance?)` — Send email. Supports multiple recipients (comma-separated), CC/BCC, importance (Low/Normal/High).

`list_teams()` — List all Teams the current user belongs to. Returns team IDs for messaging.

`list_channels(team_id)` — List all channels in a team. Returns channel IDs for messaging.

`graph_teams_message(team_id, channel_id, text, content_type?)` — Post to Teams channel.

`graph_teams_message_alias(alias, text, content_type?)` — Post using saved alias.

`save_teams_channel_alias(alias, team_id, channel_id)` — Save alias.

`list_teams_channel_aliases()` — List aliases.

`delete_teams_channel_alias(alias)` — Delete alias.

`graph_drive(drive_id, path?)` — Browse OneDrive/SharePoint files.

### 15. Git Integration (CI/CD)

`git_connect(workspace?, git_provider_type, repository_name, branch_name, directory_name, organization_name?, project_name?, owner_name?, connection_id?)` — Connect workspace to Git repo (Azure DevOps or GitHub).

`git_disconnect(workspace?)` — Disconnect workspace from Git.

`git_get_connection(workspace?)` — Get Git connection details for workspace.

`git_get_status(workspace?)` — Get sync status: workspace head, remote commit hash, pending changes with conflict detection. LRO.

`git_commit_to_git(workspace?, mode="All", comment?, workspace_head?, items?)` — Commit workspace changes to Git. mode="All" or "Selective" (pass comma-separated objectIds). LRO.

`git_update_from_git(remote_commit_hash, workspace?, workspace_head?, conflict_resolution_policy?, allow_override_items=True)` — Pull Git changes into workspace. Conflict resolution: "PreferRemote" or "PreferWorkspace". LRO.

`git_initialize_connection(workspace?, initialization_strategy?)` — Initialize Git connection after connect. Strategy: "PreferWorkspace" or "PreferRemote". LRO.

`git_get_my_credentials(workspace?)` — Get current user's Git credentials config.

`git_update_my_credentials(source, workspace?, connection_id?)` — Update Git credentials. Source: "Automatic", "ConfiguredConnection", or "None".

### 16. Deployment Pipelines (CI/CD)

`list_deployment_pipelines()` — List all deployment pipelines accessible to the user.

`create_deployment_pipeline(display_name, description?)` — Create a new deployment pipeline.

`get_deployment_pipeline(pipeline_id)` — Get pipeline metadata.

`update_deployment_pipeline(pipeline_id, display_name?, description?)` — Update pipeline properties.

`delete_deployment_pipeline(pipeline_id)` — Delete a deployment pipeline.

`list_deployment_pipeline_stages(pipeline_id)` — List stages (typically Dev, Test, Production).

`list_deployment_pipeline_stage_items(pipeline_id, stage_id)` — List items in a stage.

`deploy_stage_content(pipeline_id, source_stage_id, target_stage_id, items?, note?)` — Deploy from one stage to another. Pass comma-separated objectIds for selective deploy. LRO.

`assign_workspace_to_stage(pipeline_id, stage_id, workspace)` — Assign workspace to a pipeline stage.

`unassign_workspace_from_stage(pipeline_id, stage_id)` — Unassign workspace from a stage.

### 17. Capacities

`list_capacities()` — List all Fabric/Power BI capacities accessible to the user. Returns IDs, names, SKUs, regions.

### 18. Raw API (Escape Hatch)

`raw_api_call(endpoint, method="GET", audience="fabric", body?, lro=False)` — Call any Microsoft API directly. Audiences: "fabric", "powerbi", "graph", "storage", "azure". Uses same retry and error handling as all tools. Set lro=True for long-running operations (202 + polling). Use when no dedicated tool exists.

### 19. Environments

`list_environments(workspace?)` — List all environments in workspace.

`create_environment(display_name, workspace?, description?)` — Create environment.

`get_environment(environment_id, workspace?)` — Get environment details.

`update_environment(environment_id, display_name?, description?, workspace?)` — Update environment.

`delete_environment(environment_id, workspace?)` — Delete environment.

`publish_environment(environment_id, workspace?)` — Publish staged environment config (libraries, Spark settings). LRO — can take several minutes.

`cancel_publish_environment(environment_id, workspace?)` — Cancel in-progress publish.

### 20. Connections

`list_connections()` — List all connections accessible to user.

`create_connection(display_name, connectivity_type, connection_details, credential_details, privacy_level?)` — Create connection. connectivity_type: ShareableCloud|OnPremisesGateway|VirtualNetworkGateway|OnPremisesGatewayPersonal. connection_details and credential_details are JSON strings.

`get_connection(connection_id)` — Get connection details.

`update_connection(connection_id, connectivity_type?, connection_details?, credential_details?, display_name?, privacy_level?)` — Update connection properties. JSON string params where applicable.

`delete_connection(connection_id)` — Delete connection.

`list_supported_connection_types(gateway_id?)` — List supported connection type definitions. Optional gateway filter.

### 21. Admin

`list_tenant_settings()` — List all Fabric tenant settings. Requires Fabric Admin role. Returns feature toggles, capacity delegation, export settings, etc.

### 22. Item Definitions (Generic Import/Export)

`export_item_definition(item_id, workspace?, format?)` — Export any Fabric item's definition (Notebook, SemanticModel, DataPipeline, etc.). Returns Base64-encoded parts. LRO.

`import_item(display_name, item_type, workspace?, description?, definition?, folder_id?)` — Create a new Fabric item with optional definition. item_type: Lakehouse, Notebook, SemanticModel, Report, DataPipeline, SparkJobDefinition, Environment, Warehouse, etc. definition is a JSON string with parts array.

`update_item_definition(item_id, definition, workspace?)` — Replace an item's definition. Full replacement only — no partial updates. definition is a JSON string. LRO.

### 23. Spark Job Definitions

`list_spark_job_definitions(workspace?)` — List all Spark Job Definitions in workspace.

`create_spark_job_definition(display_name, workspace?, description?, definition?, folder_id?)` — Create Spark Job Definition. Optional definition JSON with format "SparkJobDefinitionV1" or "SparkJobDefinitionV2".

`get_spark_job_definition(spark_job_definition_id, workspace?)` — Get Spark Job Definition metadata.

`update_spark_job_definition(spark_job_definition_id, display_name?, description?, workspace?)` — Update name/description.

`delete_spark_job_definition(spark_job_definition_id, workspace?)` — Delete Spark Job Definition.

`get_spark_job_definition_definition(spark_job_definition_id, workspace?, format?)` — Get content definition (Base64 parts). LRO. Format: "SparkJobDefinitionV1" or "SparkJobDefinitionV2".

`update_spark_job_definition_definition(spark_job_definition_id, definition, workspace?)` — Update content definition. definition is a JSON string. LRO.

### 24. Context Management

`clear_context()` — Clear all session context.

---

## CI/CD Workflow Guide

### Connecting a Workspace to Git

1. `set_workspace("My Dev Workspace")`
2. `git_connect(git_provider_type="AzureDevOps", organization_name="MyOrg", project_name="MyProject", repository_name="fabric-repo", branch_name="main", directory_name="dev")`
3. `git_initialize_connection(initialization_strategy="PreferWorkspace")` — first sync
4. `git_get_status()` — check what changed

### Committing Changes

1. `git_get_status()` — get workspaceHead and see changes
2. `git_commit_to_git(workspace_head="<sha>", comment="Added new measures")`

### Pulling from Git

1. `git_get_status()` — get remoteCommitHash
2. `git_update_from_git(remote_commit_hash="<sha>", conflict_resolution_policy="PreferRemote", allow_override_items=True)`

### Deploying Across Environments

1. `list_deployment_pipelines()` — find pipeline ID
2. `list_deployment_pipeline_stages(pipeline_id)` — get stage IDs
3. `deploy_stage_content(pipeline_id, source_stage_id="<dev>", target_stage_id="<test>", note="Sprint 42 release")`

---

## Known Limitations

| Tool | Issue |
|------|-------|
| `install_requirements` / `install_wheel` | Non-functional — returns guidance to use Environments API or Fabric portal instead. |
| `create_measure` / `update_measure` / `delete_measure` / `get_model_schema` | Only works with user-created semantic models. Auto-generated lakehouse default models don't support `getDefinition`. |
| `set_permissions` | Workspace-level only. Fabric REST API doesn't support item-level permissions. |
| Lakehouse SQL | Read-only. No INSERT/UPDATE/DELETE/DDL. New delta tables take 5-10 min to appear. |

---

## API Reference — For Bridging Gaps

When the MCP tools don't cover a use case, make raw REST calls. All APIs authenticate via Azure CLI / DefaultAzureCredential.

### Authentication Scopes

| API | Base URL | Token Scope |
|-----|----------|-------------|
| Fabric REST | `https://api.fabric.microsoft.com/v1` | `https://api.fabric.microsoft.com/.default` |
| Power BI | `https://api.powerbi.com/v1.0/myorg` | `https://analysis.windows.net/powerbi/api/.default` |
| Microsoft Graph | `https://graph.microsoft.com/v1.0` | `https://graph.microsoft.com/.default` |
| OneLake ADLS Gen2 | `https://onelake.dfs.fabric.microsoft.com` | `https://storage.azure.com/.default` |
| SQL Endpoints | TDS/ODBC | `https://database.windows.net/.default` |

### Fabric REST API Endpoints

```
GET  /workspaces                                          — List workspaces
POST /workspaces                                          — Create workspace
GET  /workspaces/{id}/items                               — List items
GET  /workspaces/{id}/lakehouses                          — List lakehouses
POST /workspaces/{id}/lakehouses                          — Create lakehouse
GET  /workspaces/{id}/lakehouses/{id}/tables              — List tables
GET  /workspaces/{id}/warehouses                          — List warehouses
POST /workspaces/{id}/notebooks/{id}/getDefinition        — Get notebook (LRO)
POST /workspaces/{id}/semanticModels/{id}/getDefinition   — Get model def (LRO)
POST /workspaces/{id}/semanticModels/{id}/updateDefinition — Update model (LRO)
POST /workspaces/{id}/items/{id}/jobs/instances?jobType=X — Run job
GET  /workspaces/{id}/items/{id}/jobs/instances/{instId}  — Job status
```

### Power BI REST API Endpoints

```
POST /groups/{groupId}/datasets/{id}/executeQueries       — DAX query
     Body: {"queries": [{"query": "EVALUATE ..."}], "serializerSettings": {"includeNulls": true}}
POST /groups/{groupId}/datasets/{id}/refreshes            — Trigger refresh
GET  /groups/{groupId}/reports                            — List reports
POST /groups/{groupId}/reports/{id}/ExportTo              — Export report
```

### Microsoft Graph Endpoints

```
GET  /me                                                  — Current user
GET  /users/{email}                                       — User lookup
POST /me/sendMail                                         — Send email
POST /teams/{teamId}/channels/{channelId}/messages        — Teams message
GET  /me/drive/root/children                              — OneDrive files
```

### OneLake ADLS Gen2

```
Path format: /{workspaceName}/{lakehouseName}.Lakehouse/Files/{path}
             /{workspaceName}/{lakehouseName}.Lakehouse/Tables/{tableName}

GET    /?resource=filesystem&recursive=false               — List files
GET    /{path}                                             — Read file
PUT    /{path}                                             — Write file
DELETE /{path}                                             — Delete file
```

### Long-Running Operations (LRO) Pattern

Many Fabric APIs (getDefinition, updateDefinition, createItem) return 202 + Location header:
1. POST returns 202, headers include `Location` URL and `Retry-After` seconds
2. Poll GET on the Location URL until `status` is "Succeeded" or "Failed"
3. Result is in the response body of the final poll

### Python Code Patterns for Raw API Calls

**Get an Azure token:**
```python
from azure.identity import DefaultAzureCredential
cred = DefaultAzureCredential()
token = cred.get_token("https://api.fabric.microsoft.com/.default").token
headers = {"Authorization": f"Bearer {token}"}
```

**Make a Fabric API call:**
```python
import requests
resp = requests.get("https://api.fabric.microsoft.com/v1/workspaces", headers=headers)
workspaces = resp.json()["value"]
```

**Handle LRO:**
```python
import time
resp = requests.post(url, headers=headers, json=body)
if resp.status_code == 202:
    location = resp.headers["Location"]
    retry_after = int(resp.headers.get("Retry-After", 5))
    while True:
        time.sleep(retry_after)
        poll = requests.get(location, headers=headers)
        status = poll.json().get("status")
        if status in ("Succeeded", "Failed"):
            break
```

**Execute DAX via Power BI API:**
```python
token = cred.get_token("https://analysis.windows.net/powerbi/api/.default").token
resp = requests.post(
    f"https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/datasets/{dataset_id}/executeQueries",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"queries": [{"query": dax}], "serializerSettings": {"includeNulls": True}}
)
```

**SQL via ODBC:**
```python
import pyodbc
token = cred.get_token("https://database.windows.net/.default").token
conn = pyodbc.connect(
    f"Driver={{ODBC Driver 18 for SQL Server}};"
    f"Server={endpoint}.datawarehouse.fabric.microsoft.com;"
    f"Database={database};"
    f"Encrypt=Yes;TrustServerCertificate=No",
    attrs_before={1256: token}  # SQL_COPT_SS_ACCESS_TOKEN
)
```
