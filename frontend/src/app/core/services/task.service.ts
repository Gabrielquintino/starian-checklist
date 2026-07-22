import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateTaskRequest, Task } from '../../features/tasks/models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly tasksUrl = '/tarefas';

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.tasksUrl);
  }

  createTask(payload: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(this.tasksUrl, payload);
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.tasksUrl}/${id}`);
  }
}
