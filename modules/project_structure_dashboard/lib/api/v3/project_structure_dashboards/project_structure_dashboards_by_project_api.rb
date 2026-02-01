# frozen_string_literal: true

require_dependency "api/open_project_api"

module API
  module V3
    module ProjectStructureDashboards
      class ProjectStructureDashboardsByProjectAPI < ::API::OpenProjectAPI
        helpers do
          def dashboards_scope
            ProjectStructureDashboard::Dashboard.where(project: @project)
          end

          def find_dashboard!
            dashboards_scope.find(params[:dashboard_id])
          end

          def authorize_view!
            authorize(:view_project_structure_dashboard, project: @project)
          end

          def authorize_manage!
            authorize(:manage_project_structure_dashboard, project: @project)
          end

          def validate_payload!(payload)
            %w[name structure_data block_configurations].each do |key|
              raise ::API::Errors::InvalidRequestBody, "#{key} is required" unless payload.key?(key)
            end

            unless payload["structure_data"].is_a?(Hash)
              raise ::API::Errors::InvalidRequestBody, "structure_data must be an object"
            end

            unless payload["block_configurations"].is_a?(Hash)
              raise ::API::Errors::InvalidRequestBody, "block_configurations must be an object"
            end
          end
        end

        resources :project_structure_dashboards do
          before { authorize_view! }

          get do
            dashboards = dashboards_scope
            ProjectStructureDashboard::ProjectStructureDashboardCollectionRepresenter
              .new(dashboards,
                   dashboards.count,
                   self_link: api_v3_paths.project_project_structure_dashboards(@project.id),
                   current_user:)
          end

          params do
            requires :dashboard, type: Hash
          end
          post do
            authorize_manage!
            attrs = declared_params[:dashboard]
            validate_payload!(attrs)

            dashboard = dashboards_scope.new(attrs)
            if dashboard.save
              status 201
              ProjectStructureDashboard::ProjectStructureDashboardRepresenter.new(dashboard, current_user:)
            else
              raise ::API::Errors::Validation.new(dashboard)
            end
          end

          route_param :dashboard_id do
            before { @dashboard = find_dashboard! }

            get do
              ProjectStructureDashboard::ProjectStructureDashboardRepresenter.new(@dashboard, current_user:)
            end

            params do
              requires :dashboard, type: Hash
            end
            patch do
              authorize_manage!
              attrs = declared_params[:dashboard]
              validate_payload!(attrs)

              if @dashboard.update(attrs)
                ProjectStructureDashboard::ProjectStructureDashboardRepresenter.new(@dashboard, current_user:)
              else
                raise ::API::Errors::Validation.new(@dashboard)
              end
            end

            delete do
              authorize_manage!
              @dashboard.destroy!
              status 204
            end

            post :aggregate do
              authorize_view!
              service = ProjectStructureDashboard::StatusAggregationService.new(project: @project, current_user:)
              result = service.call(block_configurations: @dashboard.block_configurations)

              if result.success?
                payload = ProjectStructureDashboard::AggregationResult.new(
                  dashboard_id: @dashboard.id,
                  project_id: @project.id,
                  blocks: result.result
                )
                ProjectStructureDashboard::AggregationRepresenter.new(payload, current_user:)
              else
                raise ::API::Errors::InternalError.new(result.errors.join(", "))
              end
            end
          end
        end
      end
    end
  end
end
