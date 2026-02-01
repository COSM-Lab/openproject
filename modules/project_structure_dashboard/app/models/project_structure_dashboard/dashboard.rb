# frozen_string_literal: true

module ProjectStructureDashboard
  class Dashboard < ApplicationRecord
    self.table_name = "project_structure_dashboards"

    belongs_to :project

    validates :name, presence: true
    validates :structure_data, presence: true
    # block_configurations can be empty Hash {}, so we only validate it's a Hash, not presence
    validate :validate_block_configs
    validate :validate_structure_schema

    # Ensure JSONB fields are always Hash with string keys
    before_validation :normalize_jsonb_fields
    # Ensure block_configurations is set even if it's the default value
    after_initialize :ensure_block_configurations_default

    private

    def ensure_block_configurations_default
      # Set default empty Hash if nil (for new records)
      self.block_configurations = {} if new_record? && block_configurations.nil?
    end

    def normalize_jsonb_fields
      # Ensure block_configurations is always a Hash
      self.block_configurations = {} if block_configurations.nil?
      # Normalize to string keys if it's a Hash
      self.block_configurations = block_configurations.deep_stringify_keys if block_configurations.is_a?(Hash)

      # Normalize structure_data to string keys
      if structure_data.is_a?(Hash)
        self.structure_data = structure_data.deep_stringify_keys
      end
    end

    def validate_structure_schema
      unless structure_data.is_a?(Hash)
        errors.add(:structure_data, "must be an object")
        return
      end

      unless structure_data["root"].is_a?(Hash)
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
      # block_configurations must be a Hash (can be empty {})
      return errors.add(:block_configurations, "must be an object") unless block_configurations.is_a?(Hash)

      # If empty, validation passes (empty Hash is valid)
      return if block_configurations.empty?

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
