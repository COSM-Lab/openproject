import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UIRouterModule } from '@uirouter/angular';
import { DashboardPageComponent } from './containers/dashboard-page/dashboard-page.component';
import { BlockTreeComponent } from './components/block-tree/block-tree.component';
import { DiagramCanvasComponent } from './components/diagram-canvas/diagram-canvas.component';
import { OpSharedModule } from 'core-app/shared/shared.module';
import { Ng2StateDeclaration } from '@uirouter/angular';

export const PROJECT_STRUCTURE_DASHBOARD_STATES = [
  {
    name: 'project_structure_dashboard',
    url: '/structure-dashboard',
    parent: 'optional_project',
    component: DashboardPageComponent,
    data: {
      bodyClasses: 'project-structure-dashboard',
    },
  },
] as Ng2StateDeclaration[];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    OpSharedModule,
    DashboardPageComponent,
    BlockTreeComponent,
    DiagramCanvasComponent,
    UIRouterModule.forChild({ states: PROJECT_STRUCTURE_DASHBOARD_STATES } as any),
  ],
  declarations: [],
})
export class OpenprojectProjectStructureDashboardModule {}
