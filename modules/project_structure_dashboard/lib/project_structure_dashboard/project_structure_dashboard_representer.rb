# frozen_string_literal: true

module ProjectStructureDashboard
  class ProjectStructureDashboardRepresenter < ::API::Decorators::Single
    self_link title_getter: ->(*) { represented.name }

    property :id
    property :name
    property :project_id
    property :structure_data
    property :block_configurations
    property :created_at
    property :updated_at

    link :aggregate do
      {
        href: api_v3_paths.aggregate_project_project_structure_dashboard(represented.project_id, represented.id),
        title: "Aggregate block statuses"
      }
    end

    def _type
      "ProjectStructureDashboard"
    end

    def self_v3_path(_path, _id_attribute)
      api_v3_paths.project_project_structure_dashboard(represented.project_id, represented.id)
    end
  end
end
