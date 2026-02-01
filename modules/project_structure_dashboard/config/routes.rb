# frozen_string_literal: true

Rails.application.routes.draw do
  constraints(Constraints::ProjectIdentifier) do
    scope "projects/:project_id", as: "project" do
      scope module: "project_structure_dashboard" do
        get "structure-dashboard(/*state)", to: "dashboards#page", as: :structure_dashboard_page

        resources :dashboards, controller: "dashboards", as: :structure_dashboards do
          post :aggregate, on: :member
        end
      end
    end
  end
end
