# Microsoft Fabric REST API Surface Audit

**Date:** 2026-02-19
**Scope:** Complete Microsoft Fabric REST API vs. fabric-core MCP toolkit coverage
**Sources:** [Microsoft Fabric REST API Docs](https://learn.microsoft.com/en-us/rest/api/fabric/articles/), [Fabric REST API Specs (GitHub)](https://github.com/microsoft/fabric-rest-api-specs), [API Structure](https://learn.microsoft.com/en-us/rest/api/fabric/articles/api-structure)

---

## Executive Summary

The Microsoft Fabric REST API exposes **3 service tiers** (Core, Admin, Workload) across **~50 distinct API categories**. Our fabric-core MCP toolkit currently covers **~15 of those categories**, giving us roughly **30% coverage** of the total API surface area.

**What we cover well:** Workspaces, Lakehouses, Warehouses, Notebooks, Pipelines, SQL queries, Semantic Models, OneLake file I/O, and Microsoft Graph integration.

**What we completely miss:** Git integration, Deployment Pipelines (CI/CD), the entire Admin API tier, Environments (Spark library management), all Real-Time Intelligence APIs (Eventhouse, Eventstream, KQL), Data Science (ML Models/Experiments), Connections management, Domains, Capacity management, Mirrored Databases, and many newer item types (GraphQL, CopyJob, Reflex/Activator, etc.).

The biggest gap for a data engineering/BI workflow is the lack of **Git integration** and **Deployment Pipelines** -- these are the backbone of Fabric CI/CD.

---

## Complete API Surface: Covered vs. Missing

### Legend
- COVERED = fabric-core MCP has tools for this
- PARTIAL = some operations exist but key ones missing
- MISSING = no coverage at all

### Core APIs (cross-workload platform operations)

| # | API Category | Status | Operations | Notes |
|---|-------------|--------|------------|-------|
| 1 | **Workspaces** | COVERED | List, Create, Get, Update, Delete, Role Assignments, Assign to Capacity/Domain, Provision Identity, Network Policies | MCP has list/create/set. Missing: delete, role mgmt, capacity assign, domain assign, identity provisioning, network policies |
| 2 | **Items (Generic)** | PARTIAL | Create, Get, Delete, Update, List, Get/Update Definition, Move, Bulk Move, List Connections | MCP has resolve_item and list_items. Missing: create/update/delete via generic API, get/update definitions, move items |
| 3 | **Capacities** | MISSING | List Capacities | - |
| 4 | **Connections** | MISSING | Create, Get, Update, Delete, Role Assignments CRUD, List Supported Types | - |
| 5 | **Deployment Pipelines** | MISSING | Create, Get, Update, Delete, Deploy Stage Content, List Stages/Items/Operations, Role Assignments, Assign/Unassign Workspace | - |
| 6 | **Domains** | MISSING | Get Domain, List Domains | - |
| 7 | **External Data Shares Provider** | MISSING | Create, Get, Delete, Revoke, List | - |
| 8 | **Git** | MISSING | Connect, Disconnect, Get Connection, Get Status, Commit To Git, Update From Git, Initialize Connection, Get/Update My Git Credentials | - |
| 9 | **Job Scheduler** | PARTIAL | Cancel Job, Run On Demand, Create/Get/Update/Delete Schedule, List Job Instances/Schedules | MCP has schedule_list/schedule_set and run_notebook_job. Missing: generic job scheduler for all item types |
| 10 | **Long Running Operations** | MISSING | Get Operation Result, Get Operation State | - |
| 11 | **Managed Private Endpoints** | MISSING | Create, Get, Delete, List | - |
| 12 | **OneLake Data Access Security** | MISSING | Create/Update Data Access Roles, Get/Delete Role, List Roles | - |
| 13 | **OneLake Shortcuts** | COVERED | Create, Get, Delete, List, Bulk Create, Reset Cache | MCP has create/list/delete. Missing: bulk create, reset cache |

### Admin APIs (tenant-level administration)

| # | API Category | Status | Operations | Notes |
|---|-------------|--------|------------|-------|
| 14 | **Admin > Domains** | MISSING | Create, Get, Update, Delete, Assign/Unassign Workspaces, Role Assignments, Sync to Subdomains | 18+ operations |
| 15 | **Admin > Items** | MISSING | Get Item, List Items, List Item Access Details | - |
| 16 | **Admin > Labels** | MISSING | Bulk Set Labels, Bulk Remove Labels (sensitivity/MIP labels) | - |
| 17 | **Admin > Tenants** | MISSING | List Tenant Settings, Update Tenant Setting, Capacity/Domain/Workspace Settings Overrides | 8 operations |
| 18 | **Admin > Users** | MISSING | List Access Entities | - |
| 19 | **Admin > Workspaces** | MISSING | Get Workspace, List Workspaces, List Access Details, Restore Workspace, List Git Connections, List Network Policies | - |
| 20 | **Admin > External Data Shares** | MISSING | List External Data Shares, Revoke External Data Share | - |

### Workload APIs (item-type-specific operations)

| # | API Category | Status | Operations | Notes |
|---|-------------|--------|------------|-------|
| 21 | **Lakehouse** | COVERED | CRUD + Definition, List Tables, Load Table, Background Jobs (Table Maintenance, Materialized Views) | MCP covers most. Missing: Load Table API, background jobs (table maintenance, materialized lake views) |
| 22 | **Warehouse** | COVERED | CRUD, Get Connection String | MCP covers. Missing: Get Connection String |
| 23 | **Notebook** | COVERED | CRUD + Definition | MCP covers extensively |
| 24 | **SemanticModel** | COVERED | CRUD + Definition, Bind Connection | MCP covers via Power BI APIs. Missing: Bind Semantic Model Connection, Create/Update Definition |
| 25 | **Report** | PARTIAL | CRUD + Definition | MCP has list/get. Missing: create, update, delete, get/update definition |
| 26 | **DataPipeline** | PARTIAL | CRUD + Definition | MCP can create and get definition. Missing: formal CRUD via workload API |
| 27 | **Eventhouse** | MISSING | CRUD + Definition | - |
| 28 | **Eventstream** | MISSING | CRUD + Definition + Topology (sources, destinations, connections, pause/resume) | 18+ operations total |
| 29 | **KQL Database** | MISSING | CRUD + Definition | - |
| 30 | **KQL Queryset** | MISSING | CRUD + Definition | - |
| 31 | **KQL Dashboard** | MISSING | CRUD + Definition | - |
| 32 | **Environment** | MISSING | CRUD + Definition, Publish, Cancel Publish | The proper way to manage Spark libraries |
| 33 | **Spark Job Definition** | MISSING | CRUD + Definition | - |
| 34 | **ML Model** | MISSING | CRUD (no definition support) | - |
| 35 | **ML Experiment** | MISSING | CRUD (no definition support) | - |
| 36 | **GraphQL API** | MISSING | CRUD + Definition | - |
| 37 | **CopyJob** | MISSING | CRUD + Definition | - |
| 38 | **Mirrored Database** | MISSING | CRUD + Definition + Mirroring (Start, Stop, Get Status, Get Tables Status) | 11 operations total |
| 39 | **Reflex (Activator)** | MISSING | CRUD + Definition | - |
| 40 | **Dashboard** | MISSING | List Dashboards (read-only) | - |
| 41 | **Dataflow** | MISSING | CRUD + Definition | - |
| 42 | **Paginated Report** | MISSING | Update, List (limited) | - |
| 43 | **SQL Endpoint** | MISSING | List only (read-only, auto-generated) | - |
| 44 | **SQL Database** | MISSING | CRUD | Newer item type |
| 45 | **Mirrored Warehouse** | MISSING | List only | - |
| 46 | **Mirrored Azure Databricks Catalog** | MISSING | CRUD | - |
| 47 | **Cosmos DB Database** | MISSING | CRUD | - |
| 48 | **Snowflake Database** | MISSING | CRUD | - |
| 49 | **Digital Twin Builder / Flow** | MISSING | CRUD + Definition | - |
| 50 | **Ontology (Fabric IQ)** | MISSING | CRUD + Definition | - |
| 51 | **Data Build Tool (dbt) Job** | MISSING | CRUD + Definition | - |
| 52 | **Mounted Data Factory** | MISSING | CRUD + Definition | - |
| 53 | **Apache Airflow Job** | MISSING | CRUD | Newer item type |
| 54 | **Variable Library** | MISSING | CRUD | Newer item type |
| 55 | **User Data Function** | MISSING | CRUD | Newer item type |

---

## Detailed Analysis of Missing API Surfaces

### PRIORITY: HIGH

These are directly useful for everyday data engineering and BI work.

---

#### 1. Git Integration
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/git/*`
- **What it does:** Connect Fabric workspaces to Git repos (Azure DevOps, GitHub). Commit workspace changes, pull updates from Git, check sync status.
- **Key operations:**
  - `Connect` / `Disconnect` workspace to/from Git
  - `Get Connection` / `Get Status`
  - `Commit To Git`
  - `Update From Git`
  - `Initialize Connection`
  - `Get/Update My Git Credentials`
- **Priority:** **HIGH**
- **Why:** This is the foundation of Fabric CI/CD. Without it, you cannot automate source control workflows. Every team doing proper DevOps in Fabric needs this.

---

#### 2. Deployment Pipelines (CI/CD)
- **Base endpoint:** `POST /v1/deploymentPipelines/*`
- **What it does:** Manage Fabric deployment pipelines for promoting content across Dev/Test/Prod stages.
- **Key operations:**
  - Create/Get/Update/Delete deployment pipeline
  - `Deploy Stage Content` (the actual deploy action)
  - List stages, stage items, operations
  - Assign/Unassign workspace to stage
  - Role assignments
- **Priority:** **HIGH**
- **Why:** Pairs with Git. Together they form the Fabric CI/CD backbone. Automating deployments across environments is essential for production workflows.

---

#### 3. Connections
- **Base endpoint:** `POST /v1/connections/*`
- **What it does:** Manage data connections (cloud, on-premises, virtual network gateways). Required for connecting semantic models and pipelines to data sources.
- **Key operations:**
  - Create/Get/Update/Delete connection
  - Role assignments CRUD
  - List connections and supported types
- **Priority:** **HIGH**
- **Why:** Connections are the plumbing that links Fabric items to external data sources. Without this, you cannot programmatically set up or audit data connectivity.

---

#### 4. Environment (Spark Library Management)
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/environments/*`
- **What it does:** Manage Spark compute environments -- custom libraries, Python/R packages, Spark properties. This is the correct way to manage libraries (replaces broken install_requirements/install_wheel).
- **Key operations:**
  - Create/Get/Update/Delete environment
  - Get/Update Environment Definition (library specs, Spark config)
  - Publish Environment (applies changes to Spark pool)
  - Cancel Publish
- **Priority:** **HIGH**
- **Why:** Our current `install_requirements` and `install_wheel` tools are broken. Environment API is the official replacement. Critical for any team managing custom Python packages in Spark.

---

#### 5. Admin > Tenant Settings
- **Base endpoint:** `GET /v1/admin/tenantsettings`
- **What it does:** Read and update tenant-level configuration settings that control what users can do in Fabric.
- **Key operations:**
  - List Tenant Settings
  - Update Tenant Setting
  - List/Update capacity/domain/workspace overrides
- **Priority:** **HIGH**
- **Why:** Governance. Knowing which tenant settings are enabled/disabled is critical for security reviews and compliance audits.

---

#### 6. Capacities
- **Base endpoint:** `GET /v1/capacities`
- **What it does:** List available Fabric/Power BI capacities (F-SKU, P-SKU) the user can access.
- **Key operations:**
  - List Capacities
- **Priority:** **HIGH**
- **Why:** Needed before you can assign workspaces to capacity. Also needed for cost management and capacity planning.

---

#### 7. Lakehouse Background Jobs (Table Maintenance)
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/lakehouses/{lakehouseId}/backgroundJobs/*`
- **What it does:** Run table maintenance (OPTIMIZE, VACUUM) and manage materialized lake views as background jobs through the official API.
- **Key operations:**
  - Run On Demand Table Maintenance
  - Run On Demand Refresh Materialized Lake Views
  - Create/Update/Delete Materialized Lake Views Schedule
- **Priority:** **HIGH**
- **Why:** Our current optimize_delta/vacuum_delta tools use Spark. The background jobs API is the official, lighter-weight path. Materialized lake views are a key performance feature.

---

### PRIORITY: MEDIUM

Useful for broader workflows but not daily essentials.

---

#### 8. Mirrored Database
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/mirroredDatabases/*`
- **What it does:** Manage Fabric database mirroring -- replicate external databases (SQL Server, Azure SQL, Cosmos DB, Snowflake) into Fabric in near real-time.
- **Key operations:**
  - CRUD + Definition
  - Start/Stop Mirroring
  - Get Mirroring Status
  - Get Tables Mirroring Status
- **Priority:** **MEDIUM**
- **Why:** Mirroring is a major Fabric feature for data integration. Useful for teams bringing external data into Fabric without ETL pipelines.

---

#### 9. Eventstream + Eventhouse + KQL Database
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/eventstreams/*` (and eventhouses, kqlDatabases)
- **What it does:** Real-Time Intelligence stack. Eventstreams ingest streaming data, Eventhouses store it, KQL databases query it.
- **Key operations:**
  - CRUD + Definition for all three
  - Eventstream Topology: get/pause/resume sources and destinations
- **Priority:** **MEDIUM**
- **Why:** Important for teams doing real-time analytics, IoT, log analysis. Not needed for traditional batch BI but growing in importance.

---

#### 10. OneLake Data Access Security
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/items/{itemId}/dataAccessSecurity/*`
- **What it does:** Manage fine-grained data access roles on OneLake data (row-level, column-level, folder-level security).
- **Key operations:**
  - Create/Update Data Access Roles (single and batch)
  - Get/Delete/List Data Access Roles
- **Priority:** **MEDIUM**
- **Why:** Important for data governance. Enables programmatic management of who can access which folders/tables in a lakehouse.

---

#### 11. Admin > Domains (Full Management)
- **Base endpoint:** `POST /v1/admin/domains/*`
- **What it does:** Full domain lifecycle management at the tenant level -- create domains, assign workspaces to domains, manage domain role assignments.
- **Key operations:**
  - Create/Update/Delete domain
  - Assign/Unassign workspaces (by ID, capacity, or principal)
  - Role assignments
  - Sync to subdomains
- **Priority:** **MEDIUM**
- **Why:** Needed for organizations with strict data mesh / domain-driven governance.

---

#### 12. Admin > Workspaces
- **Base endpoint:** `GET /v1/admin/workspaces`
- **What it does:** Tenant-wide workspace visibility. Unlike the Core workspace API (which only shows what the user can access), Admin shows all workspaces.
- **Key operations:**
  - List all workspaces (tenant-wide)
  - Get workspace details
  - List access details (who has access to what)
  - Restore deleted workspace
  - List Git connections
  - List network policies
- **Priority:** **MEDIUM**
- **Why:** Essential for tenant administrators doing audits, compliance checks, or recovering deleted workspaces.

---

#### 13. GraphQL API
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/graphQLApis/*`
- **What it does:** Manage GraphQL API items in Fabric -- create API endpoints that expose Fabric data through GraphQL.
- **Key operations:** CRUD + Definition
- **Priority:** **MEDIUM**
- **Why:** Growing in importance for teams building apps on top of Fabric data. GraphQL is the modern API layer.

---

#### 14. Spark Job Definition
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/sparkJobDefinitions/*`
- **What it does:** Manage standalone Spark jobs (not notebooks) -- batch Spark processing with custom JARs/Python files.
- **Key operations:** CRUD + Definition
- **Priority:** **MEDIUM**
- **Why:** Useful for production Spark workloads that should not run in notebooks. More disciplined than notebook execution.

---

#### 15. CopyJob
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/copyJobs/*`
- **What it does:** Manage data copy jobs -- a simplified way to copy data between sources in Fabric.
- **Key operations:** CRUD + Definition
- **Priority:** **MEDIUM**
- **Why:** Simpler alternative to full pipelines for basic data movement tasks.

---

#### 16. External Data Shares
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/items/{itemId}/externalDataShares/*`
- **What it does:** Share OneLake data externally with other Fabric tenants via in-place data sharing (no data copy).
- **Key operations:**
  - Create, Get, Delete, Revoke, List
- **Priority:** **MEDIUM**
- **Why:** Cross-tenant data sharing is important for B2B scenarios and data mesh architectures.

---

#### 17. Admin > Labels (Sensitivity Labels)
- **Base endpoint:** `POST /v1/admin/items/*`
- **What it does:** Apply or remove Microsoft Information Protection (MIP) sensitivity labels to Fabric items in bulk.
- **Key operations:**
  - Bulk Set Labels
  - Bulk Remove Labels
- **Priority:** **MEDIUM**
- **Why:** Compliance/governance requirement for many enterprises. Automates what would otherwise be manual label assignment.

---

#### 18. Long Running Operations
- **Base endpoint:** `GET /v1/operations/{operationId}/*`
- **What it does:** Poll and get results of long-running operations (LRO) -- many Fabric APIs return 202 and require polling.
- **Key operations:**
  - Get Operation State
  - Get Operation Result
- **Priority:** **MEDIUM**
- **Why:** Many APIs use LRO pattern. Having dedicated tools makes polling more ergonomic.

---

#### 19. Report (Full CRUD)
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/reports/*`
- **What it does:** Full report lifecycle -- create, update, delete reports and manage their definitions (PBIR format).
- **Key operations:** CRUD + Definition
- **Priority:** **MEDIUM**
- **Why:** We currently only have list/get. Full CRUD would allow programmatic report management and report migration.

---

#### 20. Dataflow
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/dataflows/*`
- **What it does:** Manage Dataflow items (Power Query-based data transformations).
- **Key operations:** CRUD + Definition
- **Priority:** **MEDIUM**
- **Why:** Dataflows are used for Power Query ETL in Fabric. Creating and managing them programmatically is useful for templated deployments.

---

### PRIORITY: LOW

Niche or specialized -- add only when specific use cases demand it.

---

#### 21. ML Model
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/mlModels/*`
- **What it does:** Manage ML model registry items in Fabric.
- **Key operations:** CRUD (no definition)
- **Priority:** **LOW**
- **Why:** Data science teams use this, but model management is usually done through MLflow APIs directly, not the Fabric REST API.

---

#### 22. ML Experiment
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/mlExperiments/*`
- **What it does:** Manage ML experiment tracking items.
- **Key operations:** CRUD (no definition)
- **Priority:** **LOW**
- **Why:** Same as ML Model -- typically managed via MLflow, not REST API.

---

#### 23. KQL Queryset
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/kqlQuerysets/*`
- **What it does:** Manage saved KQL query collections.
- **Key operations:** CRUD + Definition
- **Priority:** **LOW**
- **Why:** Only relevant if using Real-Time Intelligence / KQL heavily.

---

#### 24. KQL Dashboard
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/kqlDashboards/*`
- **What it does:** Manage KQL-based dashboards (Real-Time dashboards).
- **Key operations:** CRUD + Definition
- **Priority:** **LOW**
- **Why:** Niche -- only for real-time dashboard scenarios.

---

#### 25. Dashboard (Power BI Classic)
- **Base endpoint:** `GET /v1/workspaces/{workspaceId}/dashboards`
- **What it does:** List Power BI classic dashboards (legacy, mostly replaced by reports).
- **Key operations:** List only
- **Priority:** **LOW**
- **Why:** Legacy item type. Dashboards are being superseded by reports.

---

#### 26. Paginated Report
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/paginatedReports/*`
- **What it does:** Manage paginated (RDL) reports.
- **Key operations:** Update, List
- **Priority:** **LOW**
- **Why:** Niche. Used for formal/printable reports (invoices, financial statements).

---

#### 27. SQL Database
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/sqlDatabases/*`
- **What it does:** Manage SQL Database items (new Fabric-native SQL DB, not Warehouse or Lakehouse SQL endpoint).
- **Key operations:** CRUD
- **Priority:** **LOW**
- **Why:** Very new item type. Still maturing in the Fabric ecosystem.

---

#### 28. Managed Private Endpoints
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/managedPrivateEndpoints/*`
- **What it does:** Create private endpoints for secure connectivity between Fabric and Azure PaaS services.
- **Key operations:** Create, Get, Delete, List
- **Priority:** **LOW**
- **Why:** Network security infrastructure. Important for enterprise deployments but not daily data engineering.

---

#### 29. Reflex (Activator)
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/reflexes/*`
- **What it does:** Manage Reflex/Activator items -- event-driven automation triggers based on data conditions.
- **Key operations:** CRUD + Definition
- **Priority:** **LOW**
- **Why:** Event-driven alerting. Niche use case.

---

#### 30. Mirrored Warehouse / Mirrored Databricks Catalog / Cosmos DB / Snowflake Database
- **What they do:** Manage various mirroring/external database connection item types.
- **Priority:** **LOW**
- **Why:** Each is a specific integration point. Add when a customer actually uses that connector.

---

#### 31. Digital Twin Builder / Flow
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/digitalTwinBuilders/*`
- **What it does:** Manage IoT digital twin modeling and data flow items.
- **Priority:** **LOW**
- **Why:** Very specialized IoT use case.

---

#### 32. Ontology (Fabric IQ)
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/ontologies/*`
- **What it does:** Manage Fabric IQ ontology items (AI-powered data understanding).
- **Priority:** **LOW**
- **Why:** New AI feature. Still early.

---

#### 33. Data Build Tool (dbt) Job
- **Base endpoint:** `POST /v1/workspaces/{workspaceId}/dataBuildToolJobs/*`
- **What it does:** Manage dbt job items in Fabric.
- **Priority:** **LOW**
- **Why:** dbt users have their own CLI. The Fabric REST API is secondary.

---

#### 34. Mounted Data Factory / Apache Airflow Job / Variable Library / User Data Function
- **What they do:** Various newer item types for orchestration, functions, and variables.
- **Priority:** **LOW**
- **Why:** Newer/niche. Add on demand.

---

#### 35. Admin > Users
- **Base endpoint:** `GET /v1/admin/users/{userId}/access`
- **What it does:** List all Fabric/Power BI items a specific user can access.
- **Key operations:** List Access Entities
- **Priority:** **LOW**
- **Why:** Useful for audits but very admin-specific.

---

#### 36. SQL Endpoint / Datamart / Mirrored Warehouse
- **What they do:** Read-only/auto-generated item types. Only support List operations.
- **Priority:** **LOW**
- **Why:** These are system-generated items, not user-managed.

---

## Prioritized Implementation Roadmap

### Phase 1: CI/CD Foundation (HIGH priority)
| Tool | Category | Effort | Impact |
|------|----------|--------|--------|
| Git Connect/Disconnect | Core > Git | Medium | Enables source control |
| Git Commit / Update From Git | Core > Git | Medium | Enables CI/CD workflows |
| Git Get Status | Core > Git | Low | Shows sync state |
| Deployment Pipeline CRUD | Core > Deployment Pipelines | Medium | Enables staging |
| Deploy Stage Content | Core > Deployment Pipelines | Medium | The actual deploy operation |
| List Capacities | Core > Capacities | Low | Required for workspace setup |

### Phase 2: Data Engineering Essentials (HIGH priority)
| Tool | Category | Effort | Impact |
|------|----------|--------|--------|
| Environment CRUD + Publish | Workload > Environment | Medium | Fixes broken library management |
| Connections CRUD | Core > Connections | Medium | Data source plumbing |
| Lakehouse Table Maintenance Jobs | Workload > Lakehouse | Low | Official OPTIMIZE/VACUUM |
| Lakehouse Load Table | Workload > Lakehouse | Low | Official data loading |
| Tenant Settings (read) | Admin > Tenants | Low | Governance visibility |

### Phase 3: Governance & Security (MEDIUM priority)
| Tool | Category | Effort | Impact |
|------|----------|--------|--------|
| OneLake Data Access Security | Core | Medium | Fine-grained access control |
| Admin Domains (full) | Admin > Domains | Medium | Domain governance |
| Admin Workspaces | Admin > Workspaces | Low | Tenant-wide visibility |
| Admin Labels | Admin > Labels | Low | Sensitivity label automation |
| External Data Shares | Core | Low | Cross-tenant sharing |
| LRO Operations | Core | Low | Better async handling |

### Phase 4: Real-Time Intelligence (MEDIUM priority)
| Tool | Category | Effort | Impact |
|------|----------|--------|--------|
| Eventhouse CRUD | Workload | Low | RTI foundation |
| Eventstream CRUD + Topology | Workload | Medium | Streaming ingestion |
| KQL Database CRUD | Workload | Low | KQL storage |
| Mirrored Database + Mirroring | Workload | Medium | Database replication |

### Phase 5: Extended Item Types (MEDIUM-LOW priority)
| Tool | Category | Effort | Impact |
|------|----------|--------|--------|
| GraphQL API CRUD | Workload | Low | API layer |
| Spark Job Definition CRUD | Workload | Low | Production Spark jobs |
| CopyJob CRUD | Workload | Low | Simple data movement |
| Report full CRUD + Definition | Workload | Low | Report automation |
| Dataflow CRUD + Definition | Workload | Low | Power Query ETL |

### Phase 6: Specialized & Niche (LOW priority)
| Tool | Category | Effort | Impact |
|------|----------|--------|--------|
| ML Model / Experiment | Workload | Low | Data science |
| KQL Queryset / Dashboard | Workload | Low | RTI queries/viz |
| Reflex (Activator) | Workload | Low | Event alerting |
| Paginated Report | Workload | Low | Formal reports |
| SQL Database | Workload | Low | New item type |
| Managed Private Endpoints | Core | Low | Network security |
| Digital Twin / Ontology / dbt | Workload | Low | Specialized |

---

## Coverage Summary by Numbers

| Metric | Count |
|--------|-------|
| Total API categories identified | ~55 |
| Categories with COVERED status | 7 |
| Categories with PARTIAL status | 4 |
| Categories with MISSING status | ~44 |
| Estimated coverage (by category) | ~20% |
| Estimated coverage (by operation count, weighted) | ~30% |
| HIGH priority gaps | 7 categories |
| MEDIUM priority gaps | 12 categories |
| LOW priority gaps | ~25 categories |

### Coverage by Fabric Experience

| Experience | Coverage |
|-----------|----------|
| Data Engineering (Lakehouse, Notebook, Spark) | **Good** -- core workflows covered |
| Data Warehouse | **Good** -- SQL, CRUD covered |
| Power BI (Reports, Semantic Models) | **Partial** -- read + DAX covered, CRUD gaps |
| Data Factory (Pipelines) | **Partial** -- run/monitor covered, CRUD partial |
| Real-Time Intelligence | **None** -- zero coverage |
| Data Science | **None** -- zero coverage |
| CI/CD (Git, Deployment) | **None** -- zero coverage |
| Administration | **None** -- zero coverage |
| Governance (Domains, Labels, Security) | **None** -- zero coverage |
| Connections & Networking | **None** -- zero coverage |

---

## Fabric CLI (`fab`) Analysis

**Date:** 2026-02-19
**Source:** [Fabric CLI Docs](https://microsoft.github.io/fabric-cli/) | [GitHub](https://github.com/microsoft/fabric-cli) | [GA Announcement](https://blog.fabric.microsoft.com/en-US/blog/fabric-cli-is-now-generally-available-explore-and-automate-microsoft-fabric-from-your-terminal/)

### What Is It?

Microsoft's official CLI for Fabric (`pip install ms-fabric-cli`). GA, MIT licensed, Python 3.10+. Provides file-system-like commands (`ls`, `cd`, `mkdir`, `cp`, `mv`, `rm`) for navigating Fabric workspaces and items. Cross-platform. Supports user, service principal, and managed identity auth.

### Two CLIs — Don't Confuse Them

| CLI | Install | Scope |
|-----|---------|-------|
| `az fabric` (Azure CLI extension) | `az extension add --name microsoft-fabric` | **Only capacity management** (create/delete/scale F-SKUs). Not useful for us. |
| `fab` (Fabric CLI) | `pip install ms-fabric-cli` | Full Fabric workspace/item management. The interesting one. |

### Fabric CLI Commands vs. Our MCP Toolkit

| fab Command | What It Does | We Have It? | Notes |
|-------------|-------------|-------------|-------|
| `ls` / `cd` / `pwd` | Navigate workspaces and items | Yes | list_workspaces, list_items |
| `mkdir` / `create` | Create items | Yes | create_lakehouse, create_notebook, etc. |
| `rm` / `del` | Delete items | Yes (v1.5.0) | delete_workspace, delete_lakehouse, etc. |
| `get` / `set` | Read/write item properties | Partial | We have set_workspace context, but not generic property get/set |
| `cp` / `copy` | **Copy items between workspaces** | **NO** | Big gap — getDefinition → createItem pattern |
| `mv` / `move` | **Move items between workspaces** | **NO** | Big gap — uses Items Move API |
| `import` / `export` | **Import/export item definitions** | **NO** | Big gap — generalizes getDefinition/updateDefinition for all types |
| `table load` | Load data into lakehouse table | Yes | load_data_from_url (but fab supports more formats) |
| `table optimize` | Optimize delta tables | Yes | optimize_delta |
| `table schema` | Get table schema | Yes | table_schema |
| `table vacuum` | Vacuum delta tables | Yes | vacuum_delta |
| `jobs start` | Start async job | Yes | run_notebook_job, pipeline_run |
| `jobs run` | Run sync (wait for completion) | Partial | We start + poll, but not in one call |
| `jobs run-list` | List job instances | Yes | pipeline_logs, get_run_status |
| `jobs run-status` | Get job status | Yes | get_run_status, pipeline_status |
| `jobs run-cancel` | Cancel running job | Yes | cancel_notebook_job |
| `jobs run-sch` | **Create schedules (cron/daily/weekly)** | Yes | schedule_set |
| `acl` | **Granular ACL management** | Partial | We only have workspace-level role assignments |
| `ln` / `mklink` | Create shortcuts | Yes | onelake_create_shortcut |
| `assign` / `unassign` | Assign permissions | Partial | set_permissions (workspace-level only) |
| `open` | Open item in browser | No | Not useful for MCP (no browser) |
| **`api`** | **Raw authenticated REST call to ANY audience** | **NO** | Killer feature — universal escape hatch |
| `auth` | Login/logout (user, SP, managed identity) | N/A | We use DefaultAzureCredential |
| `config` | CLI settings | N/A | Not applicable to MCP |
| `desc` | Describe resource details | Partial | resolve_item, get_semantic_model |
| `label` | Manage item labels | No | Sensitivity/MIP labels |
| `exists` | Check if resource exists | No | Could be useful but trivial to implement |

### What We Should Steal From the Fabric CLI

Three patterns from `fab` that fill real gaps in our toolkit:

#### 1. `fab api` → `raw_api_call` Escape Hatch Tool

The most impactful single tool we can add. `fab api` lets you call ANY Microsoft API with automatic token management:

```
fab api /v1/workspaces -X get -A fabric
fab api /v1.0/myorg/groups/{id}/datasets -X get -A powerbi
fab api /v1.0/me -X get -A graph (hypothetical)
```

It supports 4 audiences with automatic token scoping:

| Audience | Service | Token Scope |
|----------|---------|-------------|
| `fabric` | Fabric REST API | `https://api.fabric.microsoft.com/.default` |
| `powerbi` | Power BI REST API | `https://analysis.windows.net/powerbi/api/.default` |
| `graph` | Microsoft Graph | `https://graph.microsoft.com/.default` |
| `storage` | OneLake ADLS Gen2 | `https://storage.azure.com/.default` |

**Our version:** A single MCP tool `raw_api_call(endpoint, method, audience, body)` that immediately covers every gap in this audit without building 200+ individual tools. Claude already knows the API endpoints from CLAUDE.md.

#### 2. `fab import` / `fab export` → Item Definition Import/Export

Fab wraps the `getDefinition` / `updateDefinition` / `createItem` LRO pattern for ALL item types — not just notebooks and semantic models like we do. This enables:

- **Export any item** (pipeline, report, notebook, semantic model, environment, etc.) as a portable definition
- **Import/recreate items** in different workspaces
- **Template-based provisioning** — export a gold workspace, import into new projects

We already have the LRO infrastructure in `fabric_client.py`. Generalizing it to support all item types is medium effort.

#### 3. `fab cp` / `fab mv` → Cross-Workspace Item Operations

These enable moving and copying items between workspaces. Under the hood:

- **`cp`** = `getDefinition` from source → `createItem` with definition in target workspace
- **`mv`** = Uses the Fabric Items Move API (`POST /v1/workspaces/{id}/items/{id}/move`)

Neither operation exists in our toolkit today. Both are high value for workspace organization and migration scenarios.

### Integration Decision: Don't Depend on Fab, Implement the APIs

**Fab is CLI-only** — it cannot be imported as a Python library. We'd have to shell out via `subprocess`, which is:
- Fragile (requires `ms-fabric-cli` installed separately)
- Ugly for an MCP server (parsing CLI stdout)
- Adds a pip dependency users might not have

**Better approach:** Implement the same REST API patterns directly in our Python code. We already have `FabricApiClient` with auth, retry, LRO support. Fab just gives us the roadmap of what to build.
