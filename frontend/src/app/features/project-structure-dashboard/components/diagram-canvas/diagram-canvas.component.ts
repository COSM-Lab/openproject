import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PSDBlockCounts, PSDBlockNode } from '../../project-structure-dashboard.models';

interface BlockView extends PSDBlockNode {
  depth:number;
}

@Component({
  selector: 'op-psd-diagram-canvas',
  templateUrl: './diagram-canvas.component.html',
  styleUrls: ['./diagram-canvas.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class DiagramCanvasComponent {
  @Input() root!:PSDBlockNode;
  @Input() counts:Record<string, PSDBlockCounts> = {};
  @Input() readonly = false;
  @Output() positionChange = new EventEmitter<{ id:string; x:number; y:number; width:number; height:number }>();

  draggingId:string | null = null;
  resizingId:string | null = null;
  dragOffset = { x: 0, y: 0 };

  get blocks():BlockView[] {
    const list:BlockView[] = [];
    this.walk(this.root, 0, list);
    return list;
  }

  walk(node:PSDBlockNode, depth:number, acc:BlockView[]):void {
    acc.push({ ...node, depth });
    (node.children || []).forEach((child) => this.walk(child, depth + 1, acc));
  }

  onMouseDown(event:MouseEvent, block:BlockView):void {
    if (this.readonly) return;
    this.draggingId = block.id;
    this.dragOffset = { x: event.offsetX, y: event.offsetY };
    event.preventDefault();
  }

  onResizeDown(event:MouseEvent, block:BlockView):void {
    if (this.readonly) return;
    this.resizingId = block.id;
    event.stopPropagation();
    event.preventDefault();
  }

  onMouseMove(event:MouseEvent):void {
    if (!this.draggingId && !this.resizingId) return;
    event.preventDefault();
    const canvas = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (this.draggingId) {
      const x = event.clientX - canvas.left - this.dragOffset.x;
      const y = event.clientY - canvas.top - this.dragOffset.y;
      this.positionChange.emit({
        id: this.draggingId,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: undefined as unknown as number,
        height: undefined as unknown as number,
      });
    }
    if (this.resizingId) {
      const block = this.blocks.find((b) => b.id === this.resizingId);
      if (!block) return;
      const width = Math.max(120, event.clientX - canvas.left - (block.x ?? 0));
      const height = Math.max(80, event.clientY - canvas.top - (block.y ?? 0));
      this.positionChange.emit({
        id: this.resizingId,
        x: block.x ?? 0,
        y: block.y ?? 0,
        width,
        height,
      });
    }
  }

  onMouseUp():void {
    this.draggingId = null;
    this.resizingId = null;
  }
}
