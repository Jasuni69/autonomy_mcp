# MCP Tools vs. REST API Gap Audit

Audit of all fabric-core MCP tools against the official Microsoft Fabric, Power BI, and Microsoft Graph REST API documentation. Each section documents what the MCP tool exposes, what the API supports, and the practical gap.

---

## 1. Workspace Management (`tools/workspace.py`)

### 1.1 `list_workspaces`

**MCP exposes:** No parameters (returns all workspaces).

**API supports:**
- `roles` query param -- filter by role (Admin, Member, Contributor, Viewer)
- `continuationToken` -- pagination (handled automatically by `use_pagination=True` in the client)
- `preferWorkspaceSpecificEndpoints` -- returns per-workspace API endpoint URLs for private link access

**Response fields dropped:**
- `type` (Personal / Workspace / AdminWorkspace) -- not shown in markdown output
- `description` -- not shown
- `domainId` -- not shown
- `apiEndpoint` -- not available at all

**GAP:**
- **Missing `roles` filter parameter** -- users cannot filter workspaces by their role
- **Missing `preferWorkspaceSpecificEndpoints` parameter** -- blocks private-link scenarios
- **Response drops** `type`, `description`, `domainId` fields from the markdown table

### 1.2 `create_workspace`

**MCP exposes:** `display_name`, `capacity_id`, `description`, `domain_id` -- matches API body exactly.

**GAP:** None for create. Parameters match 1:1.

### 1.3 Missing Workspace Operations (21 API operations, only 3 exposed)

The Fabric Core Workspaces API has **21 operations**. The MCP only exposes 3. Missing:

| API Operation | Priority | Notes |
|---|---|---|
| **Update Workspace** (PATCH) | HIGH | Rename/update description of existing workspace |
| **Delete Workspace** (DELETE) | HIGH | Delete workspace and all items under it |
| **Get Workspace** (GET by ID) | MEDIUM | Get single workspace details |
| **Assign To Capacity** (POST) | HIGH | Move workspace to a different capacity |
| **Unassign From Capacity** (POST) | MEDIUM | Remove capacity assignment |
| **Assign To Domain** (POST) | MEDIUM | Assign workspace to domain |
| **Unassign From Domain** (POST) | LOW | Remove domain assignment |
| **List Workspace Role Assignments** (GET) | MEDIUM | Overlaps partially with `get_permissions` in items.py |
| **Add Workspace Role Assignment** (POST) | MEDIUM | Overlaps with `set_permissions` |
| **Update Workspace Role Assignment** (PATCH) | MEDIUM | Change existing role (not possible today) |
| **Delete Workspace Role Assignment** (DELETE) | MEDIUM | Remove role assignment (not possible today) |
| **Provision/Deprovision Identity** | LOW | Workspace managed identity |
| **Git Outbound Policy / Network Policies** | LOW | Advanced networking features |

---

## 2. Lakehouse Management (`tools/lakehouse.py`)

### 2.1 `list_lakehouses`

**MCP exposes:** `workspace` parameter.

**API supports:** Standard pagination, returns full Lakehouse object with `properties` (oneLakeFilesPath, oneLakeTablesPath, sqlEndpointProperties).

**GAP:**
- **Response drops `properties` block** -- oneLakeFilesPath, oneLakeTablesPath, sqlEndpointProperties are not surfaced. Users can't see OneLake paths or SQL endpoint status without calling `get_sql_endpoint` separately.

### 2.2 `create_lakehouse`

**MCP exposes:** `name`, `workspace`, `description`, `enable_schemas`, `folder_id`.

**API supports:** Same fields + `definition` (LakehouseDefinition with shortcuts, data-access-roles, alm settings).

**GAP:**
- **Missing `definition` parameter** -- cannot create lakehouse with pre-configured shortcuts, data access roles, or ALM settings via the definition payload

### 2.3 Missing Lakehouse Operations

| API Operation | Priority | Notes |
|---|---|---|
| **Update Lakehouse** (PATCH) | HIGH | Rename or update description |
| **Delete Lakehouse** (DELETE) | HIGH | Delete lakehouse and SQL endpoint |
| **Get Lakehouse** (GET by ID with properties) | MEDIUM | Get full properties including SQL endpoint status |
| **Load to Tables** (POST .../tables/{tableName}/load) | HIGH | Load CSV/Parquet from Files section into delta table. Server-side, no download needed. Much better than current `load_data_from_url` which downloads to local temp file. |
| **Table Maintenance via API** (POST .../jobs/instances?jobType=TableMaintenance) | MEDIUM | Server-side V-Order, bin-compaction, vacuum with Z-order. Alternative to current client-side delta-rs approach. Supports `schemaName` parameter which client-side approach doesn't. |
| **SQL Analytics Endpoint Metadata Sync** | MEDIUM | Trigger SQL endpoint metadata refresh programmatically |

---

## 3. Warehouse Management (`tools/warehouse.py`)

### 3.1 `list_warehouses` / `create_warehouse`

**MCP exposes:** Standard CRUD params.

**GAP:**
- **Missing Update Warehouse** (PATCH) -- rename/update description
- **Missing Delete Warehouse** (DELETE) -- delete warehouse
- **Missing Get Warehouse** (GET by ID) -- get full warehouse properties including connectionString

---

## 4. Table & Delta Operations (`tools/table.py`)

### 4.1 `list_tables`

**MCP exposes:** `workspace`, `lakehouse`.

**API supports:** `maxResults` pagination param.

**GAP:** Pagination params not exposed to user (handled automatically by client, so this is fine).

### 4.2 `table_preview` / `table_schema`

**GAP:** These work via SQL endpoint or delta-rs. No major API gaps here.

### 4.3 `optimize_delta` / `vacuum_delta`

**MCP approach:** Client-side using `deltalake` Python library directly against OneLake storage.

**API alternative:** Server-side Table Maintenance Job API (`POST .../jobs/instances?jobType=TableMaintenance`) supports:
- `vOrder` parameter (V-Order compaction) -- **NOT available** in client-side approach
- `zOrderBy` combined with vOrder in single operation
- `schemaName` parameter for schema-enabled lakehouses -- **NOT available** in client-side approach
- `vacuumSettings.retentionPeriod` as duration string

**GAP:**
- **No V-Order support** -- client-side delta-rs library has no V-Order capability
- **No schema-aware operations** -- can't specify schema for schema-enabled lakehouses
- **Should offer both approaches** -- client-side for quick operations, server-side API for V-Order/production use

---

## 5. SQL Operations (`tools/sql.py`)

### 5.1 `sql_query`

**MCP exposes:** `query`, `workspace`, `lakehouse`, `warehouse`, `type`, `max_rows`.

**GAP:**
- No `timeout` parameter for long-running queries
- Results returned as list of dicts -- no option for raw CSV/table format for large results

### 5.2 `sql_export`

**MCP exposes:** `query`, `target_path`, `type`, `export_lakehouse`, `file_format` (csv/parquet), `overwrite`.

**GAP:** Reasonably complete for its purpose. Minor: no `delta` format option for export.

### 5.3 `sql_explain`

**GAP:** None significant. Returns SHOWPLAN_XML as expected.

### 5.4 `get_sql_endpoint`

**GAP:** None significant. Returns server, database, connectionString.

---

## 6. Semantic Models & DAX (`tools/semantic_model.py`)

### 6.1 `list_semantic_models`

**MCP exposes:** `workspace`.

**GAP:**
- **Response drops** `workspaceId`, `type`, `properties` from response. Only shows id, displayName, folderId, description.

### 6.2 `get_semantic_model`

**MCP exposes:** `workspace`, `model_id`.

**GAP:** Returns raw dict as string. No structured formatting.

### 6.3 `get_model_schema`

**MCP approach:** Calls `getDefinition` LRO, parses model.bim TMSL.

**GAP:**
- **Drops several TMSL properties** during parsing:
  - Column `summarizeBy`, `sortByColumn`, `displayFolder`, `lineageTag`
  - Table `partitions` (data sources, query expressions)
  - Measure `displayFolder`, `lineageTag`
  - Relationship `isActive`, `type` (SingleColumn, etc.), `securityFilteringBehavior`
  - Model-level `cultures`, `perspectives`, `roles`, `annotations`
- Only extracts `crossFilteringBehavior` from relationships, misses `isActive` and `type`

### 6.4 `create_measure` / `update_measure` / `delete_measure`

**MCP approach:** Get entire model definition -> modify in-memory -> push entire definition back.

**GAP:**
- **Heavy approach** -- downloads and re-uploads entire model.bim for a single measure change. Works but is slow and risky for large models.
- **Missing `displayFolder`** parameter on create/update -- measures can't be organized into folders
- **Missing `lineageTag`** -- relevant for ALM/deployment pipelines
- **Missing `annotations`** -- can't set custom metadata
- **No `set_semantic_model` context command** -- unlike workspace/lakehouse/table, there's no way to set a default semantic model in session context

### 6.5 `analyze_dax_query`

**MCP exposes:** `dax_query`, `workspace`, `model`, `include_execution_plan`.

**GAP:**
- `include_execution_plan` flag is misleading -- it doesn't actually get a real execution plan. It just wraps the basic timing info in a dict with a "note" saying "use DAX Studio". The API itself (executeQueries) doesn't support execution plans; that requires XMLA endpoint.

### 6.6 Missing Semantic Model Operations

| API Operation | Priority | Notes |
|---|---|---|
| **Create Semantic Model** (POST) | MEDIUM | Create from TMSL definition |
| **Update Semantic Model** (PATCH) | MEDIUM | Rename/update description without touching definition |
| **Delete Semantic Model** (DELETE) | MEDIUM | Remove semantic model |
| **Clone Semantic Model** | LOW | Not a direct API, but can be done via create + definition |

---

## 7. Power BI Tools (`tools/powerbi.py`)

### 7.1 `dax_query`

**MCP exposes:** `dataset`, `query`, `workspace`.

**API supports:** `queries` array (multiple queries per request), `serializerSettings`, `impersonatedUserName`.

**GAP:**
- **Missing `impersonatedUserName`** -- cannot execute DAX as another user (important for RLS testing)
- **Single query only** -- API supports array of queries, MCP only sends one

### 7.2 `semantic_model_refresh`

**MCP exposes:** `workspace`, `model`, `refresh_type` (Full/Automatic/DataOnly/Calculate/ClearValues).

**API supports (Enhanced Refresh):** `type`, `commitMode`, `maxParallelism`, `retryCount`, `objects` (specific tables/partitions), `applyRefreshPolicy`.

**GAP:**
- **Missing `objects` parameter** -- cannot refresh specific tables or partitions, only full model
- **Missing `commitMode`** -- transactional vs. partial batch refresh
- **Missing `maxParallelism`** -- performance tuning
- **Missing `retryCount`** -- retry on transient failures
- **Missing `applyRefreshPolicy`** -- incremental refresh policy control
- **No refresh status polling** -- submits refresh but can't check if it succeeded/failed. API returns 202 with request ID for polling.

### 7.3 `report_export`

**MCP exposes:** `workspace`, `report`, `format` (pdf/pptx/png).

**API supports (ExportTo):** Full export configuration including:
- `pages` -- export specific pages
- `bookmarkState` or `bookmarkName` per page
- `reportLevelFilters` -- apply filters during export
- `powerBIReportConfiguration` -- including `locale`, `defaultBookmark`
- `paginatedReportConfiguration` -- for paginated reports with parameters
- `format` supports: PDF, PPTX, PNG, DOCX, XLSX, CSV, XML, MHTML, IMAGE

**GAP:**
- **Missing `pages` parameter** -- can't export specific pages
- **Missing bookmark/filter parameters** -- can't export with filters applied
- **Missing format options** -- only pdf/pptx/png; missing DOCX, XLSX, CSV, XML, MHTML, IMAGE
- **Missing export status polling** -- export is async (LRO), but the tool uses Fabric API endpoint, not the standard Power BI ExportTo flow which requires polling + download
- **No download of exported file** -- even if export succeeds, the file content is not returned or saved

### 7.4 `report_params_list`

**GAP:** Calls a non-standard Fabric endpoint. Power BI REST API uses `GET /groups/{groupId}/datasets/{datasetId}/parameters` for dataset parameters, not report parameters.

---

## 8. Reports (`tools/report.py`)

### 8.1 `list_reports` / `get_report`

**MCP exposes:** Basic list and get by ID.

**GAP:**
- **Response drops key fields** from list: `datasetId`, `datasetWorkspaceId`, `reportType`
- **Missing operations:**
  - **Delete Report** (DELETE)
  - **Update Report** (PATCH) -- rename/update description
  - **Get Report Definition** (getDefinition) -- get PBIR/PBIP content
  - **Clone Report** -- duplicate to same or different workspace

---

## 9. Notebooks (`tools/notebook.py`)

### 9.1 `list_notebooks` / `create_notebook` / `get_notebook_content`

**GAP:** Reasonably complete for basic operations.

### 9.2 `update_notebook_cell`

**MCP approach:** Downloads entire notebook, modifies one cell, re-uploads entire notebook.

**GAP:**
- **Can only update one cell per call** -- each call requires full download + upload cycle
- **No cell insert/delete** -- can only replace existing cells or append (if index >= len)
- **No bulk cell operations** -- inefficient for multi-cell edits

### 9.3 `run_notebook_job` / `get_run_status` / `cancel_notebook_job`

**GAP:** Reasonably complete. Job parameters and configuration are supported.

### 9.4 `install_requirements` / `install_wheel`

**GAP:** **BROKEN** -- uses non-existent `/spark/installRequirements` and `/spark/installWheel` endpoints. Fabric manages libraries through the Environments API:
- `POST /workspaces/{workspaceId}/environments/{environmentId}/staging/libraries`
- Missing Environment CRUD tools entirely

### 9.5 `cluster_info`

**GAP:** Uses `/spark/settings` endpoint which may not exist in current API. Spark settings are managed through Environments or workspace settings.

### 9.6 Missing Notebook Operations

| API Operation | Priority | Notes |
|---|---|---|
| **Delete Notebook** (DELETE) | MEDIUM | Remove a notebook |
| **Update Notebook metadata** (PATCH) | LOW | Rename without re-uploading definition |

---

## 10. Pipelines & Scheduling (`tools/pipeline.py`)

### 10.1 `pipeline_run`

**MCP exposes:** `workspace`, `pipeline`, `parameters`.

**GAP:** Reasonably complete.

### 10.2 `pipeline_status` / `pipeline_logs`

**GAP:** `pipeline_logs` without `run_id` lists all instances but has no pagination/filtering.

### 10.3 `create_data_pipeline` / `get_pipeline_definition`

**GAP:** Reasonably complete.

### 10.4 `dataflow_refresh`

**MCP approach:** Posts to `/dataflows/{id}/refreshes`.

**GAP:**
- **No status polling** -- fires and forgets
- Dataflow item type resolution may fail for "Dataflow" vs "DataflowGen2"

### 10.5 `schedule_list` / `schedule_set`

**GAP:**
- **No schedule update** (PUT) -- can only create, not modify existing schedules
- **No schedule delete** (DELETE) -- can't remove schedules
- Schedule format not validated before submission

### 10.6 Missing Pipeline Operations

| API Operation | Priority | Notes |
|---|---|---|
| **Delete Pipeline** (DELETE) | MEDIUM | Remove pipeline |
| **Update Pipeline** (PATCH) | MEDIUM | Rename/update description |
| **Update Pipeline Definition** (POST .../updateDefinition) | MEDIUM | Modify activities |

---

## 11. OneLake Storage (`tools/onelake.py`)

### 11.1 `onelake_ls` / `onelake_read` / `onelake_write` / `onelake_rm`

**GAP:**
- `onelake_read` has no size limit or streaming -- will fail or OOM on large files
- `onelake_write` only supports text or base64 content as string parameter -- impractical for large files
- No file copy/move operations
- No `onelake_mkdir` tool
- `onelake_ls` doesn't support `recursive=True` option

### 11.2 `onelake_create_shortcut`

**MCP exposes:** OneLake-to-OneLake shortcuts only.

**API supports:** Multiple shortcut target types:
- `oneLake` (implemented)
- `adlsGen2` -- Azure Data Lake Storage Gen2
- `amazonS3` -- Amazon S3
- `s3Compatible` -- S3-compatible storage
- `googleCloudStorage` -- Google Cloud Storage
- `dataverse` -- Dataverse

**GAP:**
- **Only OneLake shortcuts supported** -- missing ADLS Gen2, S3, GCS, Dataverse, S3-compatible targets
- These are commonly needed for cross-cloud data access

### 11.3 `onelake_list_shortcuts` / `onelake_delete_shortcut`

**GAP:** None significant for their scope.

---

## 12. Data Loading (`tools/load_data.py`)

### 12.1 `load_data_from_url`

**MCP approach:** Downloads file to local temp, reads with PyArrow, writes to OneLake via delta-rs.

**GAP:**
- **Should use server-side Load to Tables API** instead -- `POST /workspaces/{workspaceId}/lakehouses/{lakehouseId}/tables/{tableName}/load`. This is vastly more efficient:
  - No local download needed
  - Supports loading from Files section of lakehouse directly
  - Supports `mode` (overwrite/append)
  - Supports CSV format options (header, delimiter)
  - Server-side execution, no data transfer through MCP server
- Current approach downloads entire file through the agent, which fails for large files
- **Missing append mode** -- always overwrites
- **Missing CSV parsing options** -- delimiter, header, encoding

---

## 13. Items & Permissions (`tools/items.py`)

### 13.1 `list_items`

**MCP exposes:** `workspace`, `type`, `search`, `top`, `skip`.

**GAP:**
- **`search` parameter may not work** -- Fabric items API doesn't have a native `search` query param. The code passes it as a regular param but Fabric API may ignore it.
- **Response drops** `description`, `folderId` from items

### 13.2 `resolve_item`

**GAP:** None significant.

### 13.3 `get_permissions` / `set_permissions`

**MCP approach:** Workspace-level role assignments only.

**API supports:**
- Workspace role assignments (implemented)
- **Update role assignment** (PATCH) -- not implemented
- **Delete role assignment** (DELETE) -- not implemented
- Item-level permissions (limited support in API)

**GAP:**
- **No update role assignment** -- can add but can't change existing roles
- **No delete role assignment** -- can add but can't remove roles
- `get_permissions` takes `item_id` parameter but ignores it (always returns workspace-level roles)

---

## 14. Microsoft Graph (`tools/graph.py`)

### 14.1 `graph_user`

**MCP exposes:** `email` (or "me").

**API supports:** `$select`, `$expand` query parameters, access to user properties (manager, directReports, memberOf, etc.).

**GAP:**
- **No `$select` / `$expand`** -- returns whatever Graph gives by default, can't request specific fields or expand relationships

### 14.2 `graph_mail`

**MCP exposes:** `to` (single recipient), `subject`, `body`.

**API supports:** Full message object including:
- `toRecipients` -- array of recipients
- `ccRecipients` -- CC recipients
- `bccRecipients` -- BCC recipients
- `attachments` -- file attachments (base64 encoded)
- `replyTo` -- reply-to address
- `importance` -- Low/Normal/High
- `bodyPreview`
- `from` -- send from different mailbox
- `saveToSentItems` -- bool (MCP hardcodes to true)

**GAP:**
- **Single recipient only** -- can't CC, BCC, or send to multiple people
- **No attachments** -- can't attach files to emails
- **No importance flag** -- can't set email priority
- **No CC/BCC** -- significant limitation for business use

### 14.3 `graph_teams_message`

**MCP exposes:** `team_id`, `channel_id`, `text`, `content_type`.

**API supports:** Full message object including:
- `attachments` -- cards, file references, inline images
- `mentions` -- @mention users in messages
- `hostedContents` -- inline images
- `importance` -- urgency

**GAP:**
- **No mentions** -- can't @mention people
- **No attachments/cards** -- can't send Adaptive Cards or file references
- **No reply to thread** -- can't reply to existing message threads

### 14.4 `graph_drive`

**MCP exposes:** `drive_id`, `path`.

**API supports:** Full Drive API including:
- File download
- File upload
- Search
- Sharing/permissions
- Copy/move
- Delta queries
- Thumbnails

**GAP:**
- **Read-only directory listing** -- can't download, upload, search, share, copy, or move files
- **No search** within drives
- **No file download** -- can only list, not read file contents

### 14.5 Missing Graph Operations

| Feature | Priority | Notes |
|---|---|---|
| **Read email / list messages** | MEDIUM | Can send but can't read inbox |
| **List Teams / channels** | HIGH | Must know team_id and channel_id upfront; no discovery |
| **Read Teams messages** | MEDIUM | Can post but can't read history |
| **Calendar operations** | LOW | Not currently in scope |
| **Planner tasks** | LOW | Not currently in scope |

---

## 15. Helper Client Issues (`helpers/clients/`)

### 15.1 `fabric_client.py`

- **GET requests inject `maxResults` param** even when not needed (line 95) -- may confuse some API endpoints
- **LRO timeout is 300s (5 min)** -- some operations (large semantic model getDefinition) may need longer
- **No retry logic** -- all HTTP calls are fire-once; transient 429/503 errors cause immediate failure
- **`resolve_item_id` has a sync call bug** (line 683) -- calls `self._make_request` without `await`, meaning UUID validation against the API never actually executes

### 15.2 `sql_client.py`

- **Token not refreshed** -- SQLAlchemy engine caches the token at creation time. Azure tokens expire after ~1 hour. Long sessions will get authentication failures.
- **No connection pooling configuration** -- default SQLAlchemy pool settings may cause connection exhaustion

### 15.3 `onelake_client.py`

- **No retry/backoff** on OneLake ADLS operations
- **No file size validation** before read -- will attempt to read arbitrarily large files into memory

---

## Summary of Highest-Priority Gaps

### Missing CRUD Operations (11 items)

| Category | Missing Operation |
|---|---|
| Workspace | Update, Delete, Assign to Capacity |
| Lakehouse | Update, Delete, Get (with properties) |
| Warehouse | Update, Delete |
| Semantic Model | Create, Delete |
| Report | Delete |

### Missing High-Value Features (9 items)

| Tool | Missing Feature |
|---|---|
| Lakehouse | **Load to Tables API** (server-side CSV/Parquet load) |
| Semantic Model Refresh | **Selective refresh** (specific tables/partitions) |
| Semantic Model Refresh | **Refresh status polling** |
| Report Export | **Page selection, bookmarks, filters** |
| Report Export | **Export file download** |
| Graph Mail | **CC/BCC, multiple recipients, attachments** |
| Graph Teams | **List teams/channels** (discovery) |
| OneLake Shortcuts | **External targets** (ADLS Gen2, S3, GCS) |
| Workspace | **Roles filter** on list_workspaces |

### Broken/Non-functional Tools (3 items)

| Tool | Issue |
|---|---|
| `install_requirements` | Calls non-existent `/spark/installRequirements` endpoint |
| `install_wheel` | Calls non-existent `/spark/installWheel` endpoint |
| `cluster_info` | Calls potentially non-existent `/spark/settings` endpoint |

### Infrastructure Issues (4 items)

| Component | Issue |
|---|---|
| `fabric_client.py` | No retry logic for transient errors (429, 503) |
| `fabric_client.py` | Bug in `resolve_item_id` -- missing `await` on line 683 |
| `sql_client.py` | Token expires after ~1 hour, engine caches token at creation |
| `onelake_client.py` | No file size limits or streaming for large files |

---

## Sources

- [Fabric Core Workspaces Operations](https://learn.microsoft.com/en-us/rest/api/fabric/core/workspaces)
- [List Workspaces API](https://learn.microsoft.com/en-us/rest/api/fabric/core/workspaces/list-workspaces)
- [Create Workspace API](https://learn.microsoft.com/en-us/rest/api/fabric/core/workspaces/create-workspace)
- [Create Lakehouse API](https://learn.microsoft.com/en-us/rest/api/fabric/lakehouse/items/create-lakehouse)
- [Lakehouse Management API](https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-api)
- [Warehouse REST API](https://learn.microsoft.com/en-us/rest/api/fabric/warehouse/items/list-warehouses)
- [Semantic Model REST API](https://learn.microsoft.com/en-us/rest/api/fabric/semanticmodel/items/update-semantic-model-definition)
- [Power BI Export API](https://learn.microsoft.com/en-us/power-bi/developer/embedded/export-to)
- [Microsoft Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0)
- [Fabric REST API Documentation](https://learn.microsoft.com/en-us/rest/api/fabric/articles/)
