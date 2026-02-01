export interface PSDDashboard {
  id?:number;
  name:string;
  project_id:number;
  structure_data:PSDStructureData;
  block_configurations:Record<string, PSDBlockConfig>;
}

export interface PSDStructureData {
  root:PSDBlockNode;
}

export interface PSDBlockNode {
  id:string;
  title:string;
  children:PSDBlockNode[];
  x?:number;
  y?:number;
  width?:number;
  height?:number;
}

export interface PSDBlockConfig {
  query_id?:number;
  filters?:Record<string, unknown>;
  params?:Record<string, unknown>;
}

export interface PSDAggregationResult {
  dashboard_id:number;
  project_id:number;
  blocks:Record<string, PSDBlockCounts>;
}

export interface PSDBlockCounts {
  completed:number;
  in_progress:number;
  pending:number;
  other:number;
  total:number;
  drill_down_url:string;
  block_id:string;
}
