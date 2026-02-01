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
            dashboard = dashboards_scope.find_by(id: params[:dashboard_id])
            raise ActiveRecord::RecordNotFound, "Dashboard not found" unless dashboard

            dashboard
          end

          def authorize_view!
            authorize_in_project(:view_project_structure_dashboard, project: @project)
          end

          def authorize_manage!
            authorize_in_project(:manage_project_structure_dashboard, project: @project)
          end

          def normalize_params(params)
            # Convert camelCase keys to snake_case
            normalized = {}
            params.each do |key, value|
              snake_key = key.to_s.underscore.to_sym
              normalized[snake_key] = value
            end
            normalized
          end

          def validate_payload!(payload)
            # After normalize_params, all keys should be snake_case symbols
            raise ::API::Errors::InvalidRequestBody, "name is required" unless payload[:name] || payload["name"]
            raise ::API::Errors::InvalidRequestBody, "structure_data is required" unless payload[:structure_data] || payload["structure_data"]

            structure_data = payload[:structure_data] || payload["structure_data"]
            unless structure_data.is_a?(Hash)
              raise ::API::Errors::InvalidRequestBody, "structure_data must be an object"
            end

            # block_configurations is optional, but if provided must be a Hash
            block_config = payload[:block_configurations] || payload["block_configurations"]
            if block_config && !block_config.is_a?(Hash)
              raise ::API::Errors::InvalidRequestBody, "block_configurations must be an object"
            end
          end
        end

        resources :project_structure_dashboards do
          after_validation do
            authorize_view!
          end

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
            attrs = normalize_params(declared_params[:dashboard] || {})
            validate_payload!(attrs)

            attrs[:project_id] = @project.id
            attrs[:block_configurations] ||= {}
            attrs[:structure_data] = attrs[:structure_data].deep_stringify_keys if attrs[:structure_data].is_a?(Hash)
            attrs[:block_configurations] = attrs[:block_configurations].deep_stringify_keys if attrs[:block_configurations].is_a?(Hash)

            dashboard = dashboards_scope.new(attrs)
            dashboard.send(:attribute_will_change!, 'block_configurations') if dashboard.respond_to?(:attribute_will_change!)

            begin
              unless dashboard.valid?
                raise ::API::Errors::ErrorBase.create_and_merge_errors(dashboard.errors)
              end

              if dashboard.save
                status 201
                ProjectStructureDashboard::ProjectStructureDashboardRepresenter.new(dashboard, current_user:)
              else
                raise ::API::Errors::ErrorBase.create_and_merge_errors(dashboard.errors)
              end
            rescue ActiveRecord::RecordNotUnique => e
              if e.message.include?("index_project_structure_dashboards_on_project_id_and_name")
                dashboard.errors.add(:name, :taken, value: attrs[:name])
                raise ::API::Errors::ErrorBase.create_and_merge_errors(dashboard.errors)
              else
                raise
              end
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
              attrs = declared_params[:dashboard] || {}
              # Normalize camelCase to snake_case
              attrs = normalize_params(attrs)
              validate_payload!(attrs)

              attrs[:project_id] = @project.id
              attrs[:structure_data] = attrs[:structure_data].deep_stringify_keys if attrs[:structure_data].is_a?(Hash)
              attrs[:block_configurations] = attrs[:block_configurations].deep_stringify_keys if attrs[:block_configurations].is_a?(Hash)

              if @dashboard.update(attrs)
                ProjectStructureDashboard::ProjectStructureDashboardRepresenter.new(@dashboard, current_user:)
              else
                raise ::API::Errors::ErrorBase.create_and_merge_errors(@dashboard.errors)
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
