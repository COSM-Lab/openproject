import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PSDBlockConfig, PSDBlockNode } from '../../project-structure-dashboard.models';
import { ApiV3Service } from 'core-app/core/apiv3/api-v3.service';
import { QueryResource } from 'core-app/features/hal/resources/query-resource';
import { map } from 'rxjs/operators';
import { ApiV3ListFilter } from 'core-app/core/apiv3/paths/apiv3-list-resource.interface';

@Component({
  selector: 'op-psd-block-tree',
  templateUrl: './block-tree.component.html',
  styleUrls: ['./block-tree.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class BlockTreeComponent implements OnChanges, OnInit {
  @Input() node!:PSDBlockNode;
  @Input() config:Record<string, PSDBlockConfig> = {};
  @Input() readonly = false;
  @Input() projectId = '';
  @Input() projectIdentifier = '';

  @Output() nodeChange = new EventEmitter<PSDBlockNode>();
  @Output() configChange = new EventEmitter<{ id:string; config:PSDBlockConfig }>();
  @Output() addChild = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  form:FormGroup;
  availableQueries:QueryResource[] = [];
  loadingQueries = false;

  constructor(
    private readonly fb:FormBuilder,
    private readonly cdRef:ChangeDetectorRef,
    private readonly apiV3:ApiV3Service,
  ) {
    this.form = this.fb.group({
      title: [''],
      query_id: [''],
      x: [''],
      y: [''],
      width: [''],
      height: [''],
    });
  }

  ngOnInit():void {
    this.updateForm();
    if (this.projectId) {
      this.loadQueries();
    }
    this.form.valueChanges.subscribe((values) => {
      if (this.readonly) return;

      this.node.title = values.title;
      this.node.x = values.x ? Number(values.x) : this.node.x;
      this.node.y = values.y ? Number(values.y) : this.node.y;
      this.node.width = values.width ? Number(values.width) : this.node.width;
      this.node.height = values.height ? Number(values.height) : this.node.height;
      this.nodeChange.emit(this.node);

      const cfg:PSDBlockConfig = {
        ...(this.config[this.node.id] || {}),
        query_id: values.query_id ? Number(values.query_id) : undefined,
      };
      this.configChange.emit({ id: this.node.id, config: cfg });
    });
  }

  loadQueries():void {
    // Use project ID (number) for filtering, not identifier (string)
    const projectIdNum = this.projectId ? Number(this.projectId) : null;
    if (!projectIdNum || isNaN(projectIdNum)) {
      return;
    }
    this.loadingQueries = true;
    const filters:ApiV3ListFilter[] = [
      ['project', '=', [String(projectIdNum)]],
    ];
    this.apiV3.queries.list({ filters }).pipe(
      map((collection) => collection._embedded?.elements || []),
    ).subscribe({
      next: (queries) => {
        this.availableQueries = queries;
        this.loadingQueries = false;
        this.cdRef.markForCheck();
      },
      error: () => {
        this.loadingQueries = false;
        this.cdRef.markForCheck();
      },
    });
  }

  ngOnChanges(changes:SimpleChanges):void {
    if (changes['node'] || changes['config']) {
      this.updateForm();
      this.cdRef.markForCheck();
    }
    if (changes['projectId'] && this.projectId && !changes['projectId'].firstChange) {
      // Reload queries when project ID changes
      this.loadQueries();
    }
  }

  private updateForm():void {
    if (!this.node) return;
    this.form.patchValue({
      title: this.node.title,
      query_id: this.config[this.node.id]?.query_id || '',
      x: this.node.x || '',
      y: this.node.y || '',
      width: this.node.width || '',
      height: this.node.height || '',
    }, { emitEvent: false });
  }

  onAddChild():void {
    this.addChild.emit(this.node.id);
  }

  onRemove():void {
    this.remove.emit(this.node.id);
  }

  onQueryIdChange(value:any):void {
    const cfg:PSDBlockConfig = {
      ...(this.config[this.node.id] || {}),
      query_id: value ? Number(value) : undefined,
    };
    this.configChange.emit({ id: this.node.id, config: cfg });
  }
}
