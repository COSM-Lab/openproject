# frozen_string_literal: true

module ProjectStructureDashboard
  class DashboardsController < ::ApplicationController
    layout "no_menu"

    before_action :require_login
    before_action :find_project

    authorize_with_permission :view_project_structure_dashboard, only: %i[index show aggregate page]
    authorize_with_permission :manage_project_structure_dashboard, only: %i[create update destroy]

    before_action :find_dashboard, only: %i[show update destroy aggregate]

    def aggregate
      service = ProjectStructureDashboard::StatusAggregationService.new(
        project: @project,
        current_user:
      )

      result = service.call(block_configurations: @dashboard.block_configurations)

      if result.success?
        render json: { dashboard_id: @dashboard.id, blocks: result.result }
      else
        render json: { errors: result.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def index
      dashboards = ProjectStructureDashboard::Dashboard.where(project: @project)

      render json: dashboards.as_json(only: %i[id name structure_data block_configurations project_id])
    end

    def show
      render json: @dashboard.as_json(only: %i[id name structure_data block_configurations project_id])
    end

    def create
      dashboard = ProjectStructureDashboard::Dashboard.new(dashboard_params.merge(project: @project))

      if dashboard.save
        render json: dashboard.as_json(only: %i[id name structure_data block_configurations project_id]), status: :created
      else
        render json: { errors: dashboard.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @dashboard.update(dashboard_params)
        render json: @dashboard.as_json(only: %i[id name structure_data block_configurations project_id])
      else
        render json: { errors: @dashboard.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @dashboard.destroy!
      head :no_content
    end

    def page
      render layout: "angular/angular", locals: { component: "op-psd-dashboard-page" }
    end

    private

    def dashboard_params
      params.require(:dashboard).permit(:name, structure_data: {}, block_configurations: {})
    end

    def find_project
      @project = Project.find(params[:project_id])
    end

    def find_dashboard
      @dashboard = ProjectStructureDashboard::Dashboard.find_by!(project: @project, id: params[:id])
    end
  end
end
