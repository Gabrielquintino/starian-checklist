import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss'
})
export class TaskListComponent {
  @Input({ required: true }) tasks: readonly Task[] = [];
  @Input() deletingTaskIds: ReadonlySet<number> = new Set<number>();
  @Input() deleteError: string | null = null;
  @Output() readonly taskDeleted = new EventEmitter<number>();
}
