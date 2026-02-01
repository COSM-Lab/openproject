import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrentProjectService } from 'core-app/core/current-project/current-project.service';
import { BehaviorSubject, tap } from 'rxjs';
import {
  PSDBlockConfig,
  PSDBlockCounts,
  PSDBlockNode,
  PSDDashboard,
  PSDStructureData,
} from '../../project-structure-dashboard.models';
import { ProjectStructureDashboardApiService } from '../../project-structure-dashboard.api';
import { DiagramCanvasComponent } from  '../../components/diagram-canvas/diagram-canvas.component';
import { BlockTreeComponent } from 'core-app/features/project-structure-dashboard/components/block-tree/block-tree.component';

@Component({
  selector: 'op-psd-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, BlockTreeComponent, DiagramCanvasComponent],
})
export class DashboardPageComponent implements OnInit {
  projectId = '';
  projectIdentifier = '';
  dashboards$ = new BehaviorSubject<PSDDashboard[]>([]);
  selectedDashboard$ = new BehaviorSubject<PSDDashboard|null>(null);
  loading$ = new BehaviorSubject<boolean>(false);
  counts$ = new BehaviorSubject<Record<string, PSDBlockCounts>>({});

  constructor(
    private readonly api:ProjectStructureDashboardApiService,
    private readonly currentProject:CurrentProjectService,
    private readonly cdRef:ChangeDetectorRef,
  ) {}

  ngOnInit():void {
    // CurrentProjectService should already have detected project from meta tag
    this.projectIdentifier = this.currentProject.identifier || '';
    this.projectId = this.currentProject.id || '';
    if (this.projectIdentifier) {
      this.loadDashboards();
    } else {
      // Try to detect again after a short delay
      setTimeout(() => {
        this.currentProject.detect();
        this.projectIdentifier = this.currentProject.identifier || '';
        this.projectId = this.currentProject.id || '';
        if (this.projectIdentifier) {
          this.loadDashboards();
        }
      }, 200);
    }
  }

  loadDashboards():void {
    this.loading$.next(true);
    this.api.list(this.projectIdentifier).pipe(tap((items) => {
      // Normalize camelCase to snake_case for internal use
      const normalized = items.map((item) => this.normalizeDashboard(item));
      this.dashboards$.next(normalized);
      const first = normalized[0] || null;
      if (first && (!first.structure_data || !first.structure_data.root)) {
        first.structure_data = { root: this.blankNode('root') };
      }
      this.selectedDashboard$.next(first);
      this.cdRef.markForCheck();
    })).subscribe({
      next: () => this.loading$.next(false), error: () => this.loading$.next(false),
    });
  }

  private normalizeDashboard(dashboard:PSDDashboard):PSDDashboard {
    // Convert camelCase from API to snake_case for internal use
    const structureData = dashboard.structureData || dashboard.structure_data;
    const blockConfigurations = dashboard.blockConfigurations || dashboard.block_configurations || {};
    
    // Ensure structure_data always exists, even if empty
    let normalizedStructureData:PSDStructureData = structureData || { root: this.blankNode('root') };
    
    // Ensure root exists in structure_data
    if (!normalizedStructureData.root) {
      normalizedStructureData = { root: this.blankNode('root') };
    }
    
    const normalized:PSDDashboard = {
      ...dashboard,
      structure_data: normalizedStructureData,
      block_configurations: blockConfigurations,
    };
    
    return normalized;
  }

  selectDashboard(id:number):void {
    const dashboard = this.dashboards$.value.find((d) => d.id === id) || null;
    if (dashboard) {
      const normalized = this.normalizeDashboard(dashboard);
      if (!normalized.structure_data || !normalized.structure_data.root) {
        normalized.structure_data = { root: this.blankNode('root') };
      }
      this.selectedDashboard$.next(normalized);
    } else {
      this.selectedDashboard$.next(null);
    }
    this.counts$.next({});
    this.cdRef.markForCheck();
  }

  addDashboard():void {
    // Generate unique name by checking existing dashboards
    const existing = this.dashboards$.value;
    let name = 'New structure';
    let counter = 1;
    while (existing.some((d) => d.name === name)) {
      name = `New structure ${counter}`;
      counter += 1;
    }

    const payload:Partial<PSDDashboard> = {
      name,
      structure_data: { root: this.blankNode('root') } as PSDStructureData,
      block_configurations: {},
    };
    this.api.create(this.projectIdentifier, payload).subscribe({
      next: (dash) => {
        // Normalize the response
        const normalized = this.normalizeDashboard(dash);
        // Reload dashboards to get the full list
        this.loadDashboards();
        this.selectedDashboard$.next(normalized);
        this.cdRef.markForCheck();
      },
      error: (err) => {
        console.error('Failed to create dashboard:', err);
        // Reload dashboards anyway to ensure consistency
        this.loadDashboards();
      },
    });
  }

  saveDashboard():void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard || !dashboard.id || !dashboard.structure_data?.root) return;

    const payload:any = {
      name: dashboard.name,
      structure_data: dashboard.structure_data,
      block_configurations: dashboard.block_configurations || {},
    };

    this.api.update(this.projectIdentifier, dashboard.id, payload).subscribe({
      next: (updated) => {
        const normalized = this.normalizeDashboard(updated);
        this.selectedDashboard$.next(normalized);
        this.dashboards$.next(this.dashboards$.value.map((d) => (d.id === normalized.id ? normalized : d)));
        this.cdRef.markForCheck();
      },
      error: () => {},
    });
  }

  aggregate():void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard?.id) return;
    this.api.aggregate(this.projectIdentifier, dashboard.id).subscribe({
      next: (blocks) => {
        this.counts$.next(blocks);
        this.cdRef.markForCheck();
      },
      error: () => {},
    });
  }

  onNodeChange(node:PSDBlockNode):void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard || !dashboard.structure_data) return;
    // Create a new object to trigger change detection
    const updatedDashboard = {
      ...dashboard,
      structure_data: {
        ...dashboard.structure_data,
        root: JSON.parse(JSON.stringify(dashboard.structure_data.root)), // Deep clone
      },
    };
    this.selectedDashboard$.next(updatedDashboard);
    this.cdRef.markForCheck();
  }

  onConfigChange(event:{ id:string; config:PSDBlockConfig }):void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard) return;
    dashboard.block_configurations = {
      ...dashboard.block_configurations, [event.id]: event.config,
    };
    this.selectedDashboard$.next({ ...dashboard });
  }

  onAddChild(parentId:string):void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard || !dashboard.structure_data) return;
    
    const newNode = this.blankNode(`node-${Date.now()}`);
    const rootCopy = JSON.parse(JSON.stringify(dashboard.structure_data.root));
    const inserted = this.insertChild(rootCopy, parentId, newNode);
    
    if (inserted) {
      const updatedDashboard = {
        ...dashboard,
        structure_data: {
          ...dashboard.structure_data,
          root: rootCopy,
        },
      };
      this.selectedDashboard$.next(updatedDashboard);
      this.cdRef.markForCheck();
    }
  }

  onRemove(id:string):void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard || !dashboard.structure_data || dashboard.structure_data.root.id === id) return;
    
    const removed = this.removeNode(dashboard.structure_data.root, id);
    if (removed) {
      const updatedConfig = { ...dashboard.block_configurations };
      delete updatedConfig[id];
      const updatedDashboard = {
        ...dashboard,
        structure_data: {
          ...dashboard.structure_data,
          root: JSON.parse(JSON.stringify(dashboard.structure_data.root)),
        },
        block_configurations: updatedConfig,
      };
      this.selectedDashboard$.next(updatedDashboard);
      this.cdRef.markForCheck();
    }
  }

  insertChild(node:PSDBlockNode, targetId:string, child:PSDBlockNode):boolean {
    if (node.id === targetId) {
      if (!node.children) {
        node.children = [];
      }
      node.children = [...node.children, child];
      return true;
    }
    if (node.children && node.children.length > 0) {
      for (const c of node.children) {
        if (this.insertChild(c, targetId, child)) return true;
      }
    }
    return false;
  }

  removeNode(node:PSDBlockNode, targetId:string):boolean {
    node.children = (node.children || []).filter((c) => c.id !== targetId);
    for (const c of node.children) {
      if (this.removeNode(c, targetId)) return true;
    }
    return false;
  }

  blankNode(id:string):PSDBlockNode {
    return { id, title: 'New block', children: [], x: 20, y: 20, width: 200, height: 120 };
  }

  onPositionChange(event:{ id:string; x?:number; y?:number; width?:number; height?:number }):void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard || !dashboard.structure_data) return;
    const node = this.findNode(dashboard.structure_data.root, event.id);
    if (!node) return;
    if (typeof event.x === 'number') node.x = event.x;
    if (typeof event.y === 'number') node.y = event.y;
    if (typeof event.width === 'number') node.width = event.width;
    if (typeof event.height === 'number') node.height = event.height;
    // Create a new object to trigger change detection
    const updatedDashboard = {
      ...dashboard,
      structure_data: {
        ...dashboard.structure_data,
        root: JSON.parse(JSON.stringify(dashboard.structure_data.root)), // Deep clone
      },
    };
    this.selectedDashboard$.next(updatedDashboard);
    this.cdRef.markForCheck();
  }

  findNode(node:PSDBlockNode, targetId:string):PSDBlockNode|null {
    if (node.id === targetId) return node;
    for (const child of node.children || []) {
      const found = this.findNode(child, targetId);
      if (found) return found;
    }
    return null;
  }
}
