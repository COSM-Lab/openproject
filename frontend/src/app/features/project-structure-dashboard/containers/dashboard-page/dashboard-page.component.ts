import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
export class DashboardPageComponent {
  projectId = '';
  dashboards$ = new BehaviorSubject<PSDDashboard[]>([]);
  selectedDashboard$ = new BehaviorSubject<PSDDashboard|null>(null);
  loading$ = new BehaviorSubject<boolean>(false);
  counts$ = new BehaviorSubject<Record<string, PSDBlockCounts>>({});

  constructor(private readonly api:ProjectStructureDashboardApiService, private readonly route:ActivatedRoute, private readonly currentProject:CurrentProjectService) {}

  ngOnInit():void {
    this.projectId = this.currentProject.identifier || '';
    this.loadDashboards();
  }

  loadDashboards():void {
    this.loading$.next(true);
    this.api.list(this.projectId).pipe(tap((items) => {
      this.dashboards$.next(items);
      this.selectedDashboard$.next(items[0] || null);
    })).subscribe({
      next: () => this.loading$.next(false), error: () => this.loading$.next(false),
    });
  }

  selectDashboard(id:number):void {
    const dashboard = this.dashboards$.value.find((d) => d.id === id) || null;
    this.selectedDashboard$.next(dashboard);
    this.counts$.next({});
  }

  addDashboard():void {
    const payload:Partial<PSDDashboard> = {
      name: 'New structure',
      project_id: Number(this.projectId),
      structure_data: { root: this.blankNode('root') } as PSDStructureData,
      block_configurations: {},
    };
    this.api.create(this.projectId, payload).subscribe((dash) => {
      this.dashboards$.next([...this.dashboards$.value, dash]);
      this.selectedDashboard$.next(dash);
    });
  }

  saveDashboard():void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard || !dashboard.id) return;

    this.api.update(this.projectId, dashboard.id, dashboard).subscribe((updated) => {
      this.selectedDashboard$.next(updated);
      this.dashboards$.next(this.dashboards$.value.map((d) => (d.id === updated.id ? updated : d)));
    });
  }

  aggregate():void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard?.id) return;
    this.api.aggregate(this.projectId, dashboard.id).subscribe((blocks) => {
      this.counts$.next(blocks);
    });
  }

  onNodeChange(node:PSDBlockNode):void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard) return;
    // already updated through reference
    this.selectedDashboard$.next({ ...dashboard });
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
    if (!dashboard) return;
    const newNode = this.blankNode(`node-${Date.now()}`);
    this.insertChild(dashboard.structure_data.root, parentId, newNode);
    this.selectedDashboard$.next({ ...dashboard });
  }

  onRemove(id:string):void {
    const dashboard = this.selectedDashboard$.value;
    if (!dashboard) return;
    if (dashboard.structure_data.root.id === id) return;
    this.removeNode(dashboard.structure_data.root, id);
    delete dashboard.block_configurations[id];
    this.selectedDashboard$.next({ ...dashboard });
  }

  insertChild(node:PSDBlockNode, targetId:string, child:PSDBlockNode):boolean {
    if (node.id === targetId) {
      node.children = [...(node.children || []), child];
      return true;
    }
    for (const c of node.children || []) {
      if (this.insertChild(c, targetId, child)) return true;
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
    if (!dashboard) return;
    const node = this.findNode(dashboard.structure_data.root, event.id);
    if (!node) return;
    if (typeof event.x === 'number') node.x = event.x;
    if (typeof event.y === 'number') node.y = event.y;
    if (typeof event.width === 'number') node.width = event.width;
    if (typeof event.height === 'number') node.height = event.height;
    this.selectedDashboard$.next({ ...dashboard });
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
