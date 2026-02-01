# frozen_string_literal: true

#-- copyright
# OpenProject is an open source project management software.
# Copyright (C) the OpenProject GmbH
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2013 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See COPYRIGHT and LICENSE files for more details.
#++

module ProjectStructureDashboard
  class Engine < ::Rails::Engine
    engine_name :project_structure_dashboard

    include OpenProject::Plugins::ActsAsOpEngine

    initializer "project_structure_dashboard.register_permissions" do
      Rails.application.reloader.to_prepare do
        OpenProject::AccessControl.map do |ac_map|
          ac_map.project_module :project_structure_dashboard do |map|
            map.permission :view_project_structure_dashboard,
                           { "project_structure_dashboard/dashboards": %i[index show aggregate page] },
                           require: :member,
                           permissible_on: :project,
                           grant_to_admin: true

            map.permission :manage_project_structure_dashboard,
                           { "project_structure_dashboard/dashboards": %i[create update destroy] },
                           require: :member,
                           permissible_on: :project,
                           grant_to_admin: true
          end
        end
      end
    end

    initializer "project_structure_dashboard.menu" do
      ::Redmine::MenuManager.map(:project_menu) do |menu|
        menu.push(
          :project_structure_dashboard,
          { controller: "/project_structure_dashboard/dashboards", action: "page" },
          caption: I18n.t("project_structure_dashboard.label_menu", default: "Structure dashboard"),
          icon: "table",
          if: lambda { |project|
            user = User.current
            return false unless user.logged?
            return false unless project.module_enabled?(:project_structure_dashboard)
            
            # Check if user has access - either as member or admin
            user.admin? || user.allowed_in_project?(:view_project_structure_dashboard, project)
          }
        )
      end
    end

    # Load locale files
    initializer "project_structure_dashboard.i18n" do |app|
      app.config.i18n.load_path += Dir[config.root.join("config", "locales", "*.{rb,yml}").to_s]
    end

    # Apply path helper patch - must be in to_prepare to work with code reloading
    config.to_prepare do
      require_relative "path_helper_patch"
      # Apply patch to singleton class
      API::V3::Utilities::PathHelper::ApiV3Path.singleton_class.include(ProjectStructureDashboard::PathHelperPatch)
    end

    # Ignore API directory from Zeitwerk autoloading - we load it explicitly
    config.autoload_paths -= [File.join(root, "lib/api")]
    config.eager_load_paths -= [File.join(root, "lib/api")]

    config.to_prepare do
      require_relative "project_structure_dashboard_representer"
      require_relative "project_structure_dashboard_collection_representer"
      require_relative "aggregation_representer"
      # Load API file - it will be available when ProjectsAPI tries to mount it
      require_dependency "api/open_project_api"
      require_dependency Rails.root.join("modules/project_structure_dashboard/lib/api/v3/project_structure_dashboards/project_structure_dashboards_by_project_api").to_s
    end
  end
end
