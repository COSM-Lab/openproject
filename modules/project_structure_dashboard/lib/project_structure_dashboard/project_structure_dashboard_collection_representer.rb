# frozen_string_literal: true

module ProjectStructureDashboard
  class ProjectStructureDashboardCollectionRepresenter < ::API::Decorators::Collection
    element_decorator ProjectStructureDashboardRepresenter
  end
end
