import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { TaskService } from '../../../../core/services/task.service';
import { TaskFormComponent } from '../../components/task-form/task-form.component';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { CreateTaskRequest, Task } from '../../models/task.model';

@Component({
  selector: 'app-task-page',
  standalone: true,
  imports: [TaskFormComponent, TaskListComponent],
  templateUrl: './task-page.component.html',
  styleUrl: './task-page.component.scss'
})
export class TaskPageComponent implements OnInit {
  @ViewChild(TaskFormComponent) private taskForm?: TaskFormComponent;

  private readonly taskService = inject(TaskService);
  private readonly destroyRef = inject(DestroyRef);

  tasks: readonly Task[] = [];
  isLoading = false;
  isSubmitting = false;
  deletingTaskIds: ReadonlySet<number> = new Set<number>();
  loadError: string | null = null;
  submitError: string | null = null;
  deleteError: string | null = null;

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.loadError = null;

    this.taskService.getTasks()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (tasks) => {
          this.tasks = this.sortTasks(tasks);
        },
        error: () => {
          this.loadError = 'Não foi possível carregar as tarefas. Tente novamente.';
        }
      });
  }

  createTask(payload: CreateTaskRequest): void {
    if (this.isSubmitting) {
      return;
    }

    this.submitError = null;

    if (this.hasDuplicateTitle(payload.title)) {
      this.submitError = 'Já existe uma tarefa com esse título.';

      return;
    }

    this.isSubmitting = true;

    this.taskService.createTask(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (task) => {
          this.tasks = this.sortTasks([...this.tasks, task]);
          this.taskForm?.reset();
        },
        error: (error: unknown) => {
          this.submitError = this.getSubmitError(error);
        }
      });
  }

  deleteTask(id: number): void {
    if (this.deletingTaskIds.has(id)) {
      return;
    }

    this.deletingTaskIds = new Set([...this.deletingTaskIds, id]);
    this.deleteError = null;

    this.taskService.deleteTask(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          const deletingTaskIds = new Set(this.deletingTaskIds);
          deletingTaskIds.delete(id);
          this.deletingTaskIds = deletingTaskIds;
        })
      )
      .subscribe({
        next: () => {
          this.tasks = this.tasks.filter((task) => task.id !== id);
        },
        error: () => {
          this.deleteError = 'Não foi possível remover a tarefa.';
        }
      });
  }

  private hasDuplicateTitle(title: string): boolean {
    const normalizedTitle = this.normalizeTitle(title);

    return this.tasks.some((task) => this.normalizeTitle(task.title) === normalizedTitle);
  }

  private normalizeTitle(title: string): string {
    return title.trim().toLowerCase();
  }

  private sortTasks(tasks: readonly Task[]): Task[] {
    return [...tasks].sort((first, second) => first.id - second.id);
  }

  private getSubmitError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse) || error.status !== 422) {
      return 'Não foi possível adicionar a tarefa. Tente novamente.';
    }

    const response = error.error;
    if (!this.isRecord(response) || !this.isRecord(response['errors'])) {
      return 'Revise os dados informados e tente novamente.';
    }

    const titleErrors = response['errors']['title'];
    if (Array.isArray(titleErrors) && typeof titleErrors[0] === 'string') {
      return titleErrors[0];
    }

    return 'Revise os dados informados e tente novamente.';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
