# frozen_string_literal: true

Rails.application.config.to_prepare do
  require_dependency "api/open_project_api"
  require_dependency Rails.root.join("modules/project_structure_dashboard/lib/api/v3/project_structure_dashboards/project_structure_dashboards_by_project_api").to_s
end
