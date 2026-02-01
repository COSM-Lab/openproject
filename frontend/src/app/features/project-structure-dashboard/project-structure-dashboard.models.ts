export interface PSDDashboard {
  id?:number;
  name:string;
  projectId?:number; // camelCase from API
  project_id?:number; // snake_case fallback
  structureData?:PSDStructureData; // camelCase from API
  structure_data?:PSDStructureData; // snake_case fallback
  blockConfigurations?:Record<string, PSDBlockConfig>; // camelCase from API
  block_configurations?:Record<string, PSDBlockConfig>; // snake_case fallback
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
