# frozen_string_literal: true

require "timeout"

module ProjectStructureDashboard
  class StatusAggregationService
    Result = Struct.new(:success?, :result, :errors)

    def initialize(project:, current_user:)
      @project = project
      @current_user = current_user
    end

    def call(block_configurations:)
      validate_block_configurations!(block_configurations)

      blocks = aggregate_blocks(block_configurations)

      Result.new(true, blocks, [])
    rescue StandardError => e
      Result.new(false, {}, [e.message])
    end

    private

    attr_reader :project, :current_user

    # Build and execute a query for a single block and return grouped counts and drill-down url.
    def aggregate_block(block_id, config)
      query = build_query(config)
      counts_by_status = run_with_timeout(block_id) do
        results = Query::Results.new(query)
        results.work_packages.group(:status_id).count
      end

      statuses = Status.where(id: counts_by_status.keys).index_by(&:id)
      totals = initial_totals

      counts_by_status.each do |status_id, count|
        status = statuses[status_id]
        bucket = bucket_for_status(status)
        totals[bucket] += count
      end

      totals.merge(
        total: counts_by_status.values.sum,
        drill_down_url: drill_down_url(config, query),
        block_id:
      )
    end

    def build_query(config)
      if config["query_id"]
        source = Query.visible(current_user).find(config["query_id"])
        raise ActiveRecord::RecordNotFound, "Query not in project" if source.project_id != project.id

        source
      else
        temp_query = Query.new(name: "Structure Dashboard", project:, user: current_user)
        apply_filters(temp_query, config["filters"] || config["params"] || {})
        temp_query
      end
    end

    def aggregate_blocks(block_configurations)
      block_configurations.to_a.map do |block_id, config|
        [block_id, aggregate_block(block_id, config)]
      end.to_h
    end

    def apply_filters(query, params)
      update_service = ::API::V3::UpdateQueryFromV3ParamsService.new(query, current_user)
      result = update_service.call(params, valid_subset: true)
      return if result.success?

      raise StandardError, result.errors.full_messages.join(", ")
    end

    def bucket_for_status(status)
      return :other unless status

      ratio = status.default_done_ratio.to_i
      return :completed if status.is_closed? || ratio >= 100
      return :in_progress if ratio.positive?

      :pending
    end

    def drill_down_url(config, query)
      if config["query_id"]
        Rails.application.routes.url_helpers.project_work_packages_path(project, query_id: config["query_id"])
      else
        props = query_props_from_config(config)
        Rails.application.routes.url_helpers.project_work_packages_path(project, query_props: props)
      end
    end

    def query_props_from_config(config)
      raw = config["filters"] || config["params"] || {}
      raw.to_json
    end

    def initial_totals
      {
        completed: 0,
        in_progress: 0,
        pending: 0,
        other: 0
      }
    end

    def run_with_timeout(block_id, seconds: 10)
      Timeout.timeout(seconds) { yield }
    rescue Timeout::Error
      raise StandardError, "Aggregation timed out for block #{block_id}"
    end

    def validate_block_configurations!(block_configurations)
      raise ArgumentError, "block_configurations must be an object" unless block_configurations.is_a?(Hash)

      block_configurations.each do |block_id, config|
        raise ArgumentError, "Block #{block_id} configuration must be an object" unless config.is_a?(Hash)
        next if config["query_id"].present? || config["filters"].is_a?(Hash) || config["params"].is_a?(Hash)

        raise ArgumentError, "Block #{block_id} must define query_id or filters"
      end
    end
  end
end
