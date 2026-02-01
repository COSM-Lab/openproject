# frozen_string_literal: true

# Load API file early so it's available when ProjectsAPI tries to mount it
Rails.application.config.after_initialize do
  require_dependency "api/open_project_api"
  require_dependency Rails.root.join("modules/project_structure_dashboard/lib/api/v3/project_structure_dashboards/project_structure_dashboards_by_project_api").to_s
end

Rails.application.config.to_prepare do
  require_dependency "api/open_project_api"
  require_dependency Rails.root.join("modules/project_structure_dashboard/lib/api/v3/project_structure_dashboards/project_structure_dashboards_by_project_api").to_s
end
