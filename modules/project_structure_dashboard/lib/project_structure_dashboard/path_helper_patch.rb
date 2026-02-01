# frozen_string_literal: true

module ProjectStructureDashboard
  module PathHelperPatch
    def project_project_structure_dashboards(project_id)
      "#{root}/projects/#{project_id}/project_structure_dashboards"
    end

    def project_project_structure_dashboard(project_id, id)
      "#{project_project_structure_dashboards(project_id)}/#{id}"
    end

    def aggregate_project_project_structure_dashboard(project_id, id)
      "#{project_project_structure_dashboard(project_id, id)}/aggregate"
    end
  end
end
