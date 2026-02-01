import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PSDBlockConfig, PSDBlockNode } from '../../project-structure-dashboard.models';

@Component({
  selector: 'op-psd-block-tree',
  templateUrl: './block-tree.component.html',
  styleUrls: ['./block-tree.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class BlockTreeComponent {
  @Input() node!:PSDBlockNode;
  @Input() config:Record<string, PSDBlockConfig> = {};
  @Input() readonly = false;

  @Output() nodeChange = new EventEmitter<PSDBlockNode>();
  @Output() configChange = new EventEmitter<{ id:string; config:PSDBlockConfig }>();
  @Output() addChild = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  form:FormGroup;

  constructor(private readonly fb:FormBuilder) {
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
    this.form.patchValue({
      title: this.node.title,
      query_id: this.config[this.node.id]?.query_id || '',
      x: this.node.x,
      y: this.node.y,
      width: this.node.width,
      height: this.node.height,
    });

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
