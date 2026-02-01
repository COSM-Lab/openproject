require "rails_helper"

RSpec.describe ProjectStructureDashboard::StatusAggregationService do
  let(:project) { create(:project) }
  let(:user) { create(:user, member_with_permissions: { project => %i[view_work_packages] }) }
  let(:status_open) { create(:status, default_done_ratio: 0) }
  let(:status_in_progress) { create(:status, default_done_ratio: 50) }
  let(:status_closed) { create(:status, is_closed: true, default_done_ratio: 100) }

  let(:service) { described_class.new(project:, current_user: user) }

  describe "#call" do
    it "aggregates counts per block and returns drilldown url" do
      wp1 = create(:work_package, project:, status: status_open)
      wp2 = create(:work_package, project:, status: status_in_progress)
      wp3 = create(:work_package, project:, status: status_closed)

      block_configurations = {
        "root" => {
          "filters" => {
            "f" => [
              { "n" => "id", "o" => "=", "v" => [wp1.id, wp2.id, wp3.id] }
            ]
          }
        }
      }

      result = service.call(block_configurations:)

      expect(result).to be_success
      counts = result.result["root"]
      expect(counts[:completed]).to eq(1)
      expect(counts[:in_progress]).to eq(1)
      expect(counts[:pending]).to eq(1)
      expect(counts[:total]).to eq(3)
      expect(counts[:drill_down_url]).to include("/work_packages?")
    end

    it "raises on invalid configuration" do
      block_configurations = { "root" => { "foo" => "bar" } }

      result = service.call(block_configurations:)

      expect(result).not_to be_success
      expect(result.errors.first).to match(/must define query_id or filters/)
    end
  end
end
