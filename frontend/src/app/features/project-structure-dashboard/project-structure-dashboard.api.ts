import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  PSDAggregationResult,
  PSDBlockCounts,
  PSDBlockConfig,
  PSDDashboard,
  PSDStructureData,
} from './project-structure-dashboard.models';

@Injectable({ providedIn: 'root' })
export class ProjectStructureDashboardApiService {
  constructor(private readonly http:HttpClient) {}

  list(projectId:string):Observable<PSDDashboard[]> {
    return this.http.get<{ _embedded?:{ elements:PSDDashboard[] }; _links?:unknown }>(
      `/api/v3/projects/${projectId}/project_structure_dashboards`,
    ).pipe(
      map((res:any) => {
        // V3 representer returns array already; fallback for HAL collection.
        if (Array.isArray(res)) return res as PSDDashboard[];
        if (res?._embedded?.elements) return res._embedded.elements as PSDDashboard[];
        return [];
      }),
    );
  }

  show(projectId:string, dashboardId:number):Observable<PSDDashboard> {
    return this.http.get<PSDDashboard>(`/api/v3/projects/${projectId}/project_structure_dashboards/${dashboardId}`);
  }

  create(projectId:string, payload:Partial<PSDDashboard>):Observable<PSDDashboard> {
    return this.http.post<PSDDashboard>(
      `/api/v3/projects/${projectId}/project_structure_dashboards`,
      { dashboard: payload },
    );
  }

  update(projectId:string, dashboardId:number, payload:Partial<PSDDashboard>):Observable<PSDDashboard> {
    return this.http.patch<PSDDashboard>(
      `/api/v3/projects/${projectId}/project_structure_dashboards/${dashboardId}`,
      { dashboard: payload },
    );
  }

  destroy(projectId:string, dashboardId:number):Observable<void> {
    return this.http.delete<void>(
      `/api/v3/projects/${projectId}/project_structure_dashboards/${dashboardId}`,
    );
  }

  aggregate(projectId:string, dashboardId:number):Observable<Record<string, PSDBlockCounts>> {
    return this.http.post<PSDAggregationResult>(
      `/api/v3/projects/${projectId}/project_structure_dashboards/${dashboardId}/aggregate`,
      {},
    ).pipe(map((res) => res.blocks || {}));
  }
}
