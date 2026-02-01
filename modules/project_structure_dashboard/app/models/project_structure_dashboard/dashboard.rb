# frozen_string_literal: true

module ProjectStructureDashboard
  class Dashboard < ApplicationRecord
    self.table_name = "project_structure_dashboards"

    belongs_to :project

    validates :name, presence: true
    validates :structure_data, presence: true
    validates :block_configurations, presence: true
    validate :validate_structure_schema
    validate :validate_block_configs

    private

    def validate_structure_schema
      unless structure_data.is_a?(Hash) && structure_data["root"].is_a?(Hash)
        errors.add(:structure_data, "must include root object")
        return
      end

      validate_node(structure_data["root"])
    end

    def validate_node(node)
      %w[id title].each do |key|
        errors.add(:structure_data, "node missing #{key}") if node[key].blank?
      end

      Array(node["children"]).each { |child| validate_node(child) }
    end

    def validate_block_configs
      return errors.add(:block_configurations, "must be an object") unless block_configurations.is_a?(Hash)

      block_configurations.each do |block_id, cfg|
        unless cfg.is_a?(Hash)
          errors.add(:block_configurations, "block #{block_id} config must be an object")
          next
        end

        next if cfg["query_id"].present? || cfg["filters"].is_a?(Hash) || cfg["params"].is_a?(Hash)

        errors.add(:block_configurations, "block #{block_id} must specify query_id or filters")
      end
    end
  end
end
