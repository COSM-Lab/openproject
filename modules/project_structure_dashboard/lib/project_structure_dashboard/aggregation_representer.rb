# frozen_string_literal: true

module ProjectStructureDashboard
  AggregationResult = Struct.new(:dashboard_id, :project_id, :blocks, keyword_init: true)

  class AggregationRepresenter < ::API::Decorators::Single
    self_link do
      api_v3_paths.aggregate_project_project_structure_dashboard(represented.project_id, represented.dashboard_id)
    end

    property :dashboard_id
    property :project_id
    property :blocks
  end
end
