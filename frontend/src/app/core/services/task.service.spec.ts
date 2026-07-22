import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaskService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(TaskService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls GET /tarefas and preserves the returned list', () => {
    const tasks = [{ id: 1, title: 'Task', completed: false }];

    service.getTasks().subscribe((response) => expect(response).toEqual(tasks));

    const request = httpTesting.expectOne('/tarefas');
    expect(request.request.method).toBe('GET');
    request.flush(tasks);
  });

  it('calls POST /tarefas with the provided payload and preserves the created task', () => {
    const payload = { title: 'New task' };
    const createdTask = { id: 2, title: payload.title, completed: false };

    service.createTask(payload).subscribe((response) => expect(response).toEqual(createdTask));

    const request = httpTesting.expectOne('/tarefas');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(createdTask, { status: 201, statusText: 'Created' });
  });

  it('calls DELETE /tarefas/{id}', () => {
    let completed = false;

    service.deleteTask(7).subscribe(() => completed = true);

    const request = httpTesting.expectOne('/tarefas/7');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBeTrue();
  });

  it('propagates HTTP errors without producing a local fallback', () => {
    let receivedError: HttpErrorResponse | undefined;

    service.getTasks().subscribe({
      error: (error: HttpErrorResponse) => receivedError = error
    });

    const request = httpTesting.expectOne('/tarefas');
    request.flush({ message: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    expect(receivedError?.status).toBe(503);
    expect(receivedError?.error).toEqual({ message: 'Unavailable' });
  });
});
