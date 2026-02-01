# frozen_string_literal: true

class CreateProjectStructureDashboards < ActiveRecord::Migration[8.0]
  def change
    create_table :project_structure_dashboards do |t|
      t.references :project, null: false, foreign_key: true, index: true
      t.string :name, null: false
      t.jsonb :structure_data, null: false, default: {}
      t.jsonb :block_configurations, null: false, default: {}

      t.timestamps null: false
    end

    add_index :project_structure_dashboards, %i[project_id name], unique: true
  end
end
