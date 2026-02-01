# Project Structure Dashboard (plugin skeleton)

Early skeleton for the Project Structure Dashboard feature.

Current contents:

- Rails engine wired into OpenProject plugin system.
- Permissions scaffold (`view_project_structure_dashboard`, `manage_project_structure_dashboard`), menu entry on project menu.
- Model `ProjectStructureDashboard::Dashboard` with JSONB payloads for layout/config.
- CRUD controller and project-scoped routes under `projects/:project_id/structure_dashboards` (+ `POST /aggregate`) with permission checks.
- API V3 endpoints under `/api/v3/projects/:id/project_structure_dashboards` (CRUD + aggregate) with HAL representers and path helpers.
- Status aggregation service executes saved queries or V3 filter payloads, groups counts into Completed/In Progress/Pending/Other, and returns drill-down URLs to work packages.
- Angular lazy module `project_structure_dashboard` (under `/projects/:id/structure-dashboard`) with simple tree editor/viewer, block query bindings, aggregate trigger, and drill-down links.
- Initial migration creating `project_structure_dashboards` table and unique index per project/name.
