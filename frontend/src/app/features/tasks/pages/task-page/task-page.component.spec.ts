import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';

import { TaskService } from '../../../../core/services/task.service';
import { TaskFormComponent } from '../../components/task-form/task-form.component';
import { TaskPageComponent } from './task-page.component';

describe('TaskPageComponent', () => {
  let fixture: ComponentFixture<TaskPageComponent>;
  let component: TaskPageComponent;
  let taskService: jasmine.SpyObj<TaskService>;

  beforeEach(async () => {
    taskService = jasmine.createSpyObj<TaskService>('TaskService', [
      'getTasks',
      'createTask',
      'deleteTask'
    ]);
    taskService.getTasks.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [TaskPageComponent],
      providers: [{ provide: TaskService, useValue: taskService }]
    }).compileComponents();
  });

  it('shows loading while the initial request is pending, then loads sorted tasks', () => {
    const tasks$ = new Subject<{ id: number; title: string; completed: boolean }[]>();
    taskService.getTasks.and.returnValue(tasks$);

    createPage();

    expect(component.isLoading).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Carregando tarefas');

    tasks$.next([
      { id: 2, title: 'Second', completed: false },
      { id: 1, title: 'First', completed: true }
    ]);
    tasks$.complete();

    expect(component.tasks.map((task) => task.id)).toEqual([1, 2]);
    expect(component.tasks[0].completed).toBeTrue();
    expect(component.isLoading).toBeFalse();
    expect(component.loadError).toBeNull();
  });

  it('shows a load error without creating fictitious tasks and retries the service', () => {
    taskService.getTasks.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 500 })),
      of([{ id: 1, title: 'Recovered', completed: false }])
    );

    createPage();

    expect(component.tasks).toEqual([]);
    expect(component.loadError).toBe('Não foi possível carregar as tarefas. Tente novamente.');
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');

    component.loadTasks();

    expect(taskService.getTasks).toHaveBeenCalledTimes(2);
    expect(component.tasks).toEqual([{ id: 1, title: 'Recovered', completed: false }]);
    expect(component.loadError).toBeNull();
  });

  it('receives the form output, calls the service, adds the returned task and resets the form', () => {
    const createdTask = { id: 3, title: 'Buy coffee', completed: false };
    taskService.createTask.and.returnValue(of(createdTask));
    const taskForm = createPage();
    taskForm.titleControl.setValue('  Buy coffee  ');

    taskForm.taskSubmitted.emit({ title: 'Buy coffee' });

    expect(taskService.createTask).toHaveBeenCalledOnceWith({ title: 'Buy coffee' });
    expect(component.tasks).toEqual([createdTask]);
    expect(component.isSubmitting).toBeFalse();
    expect(taskForm.titleControl.value).toBe('');
  });

  it('does not call the service for an exact local duplicate', () => {
    const taskForm = createPageWithExistingTask();

    taskForm.titleControl.setValue('Buy coffee');
    taskForm.taskSubmitted.emit({ title: 'Buy coffee' });

    expect(taskService.createTask).not.toHaveBeenCalled();
    expect(component.submitError).toBe('Já existe uma tarefa com esse título.');
    expect(component.isSubmitting).toBeFalse();
    expect(taskForm.titleControl.value).toBe('Buy coffee');
  });

  it('does not call the service for a local duplicate surrounded by spaces', () => {
    const taskForm = createPageWithExistingTask();

    taskForm.titleControl.setValue('  Buy coffee  ');
    taskForm.taskSubmitted.emit({ title: 'Buy coffee' });

    expect(taskService.createTask).not.toHaveBeenCalled();
    expect(component.submitError).toBe('Já existe uma tarefa com esse título.');
    expect(taskForm.titleControl.value).toBe('  Buy coffee  ');
  });

  it('does not call the service for a local duplicate with different casing', () => {
    const taskForm = createPageWithExistingTask();

    taskForm.titleControl.setValue('BUY COFFEE');
    taskForm.taskSubmitted.emit({ title: 'BUY COFFEE' });

    expect(taskService.createTask).not.toHaveBeenCalled();
    expect(component.submitError).toBe('Já existe uma tarefa com esse título.');
    expect(taskForm.titleControl.value).toBe('BUY COFFEE');
  });

  it('keeps the form value and does not add a task when creation fails', () => {
    taskService.createTask.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const taskForm = createPage();
    taskForm.titleControl.setValue('Buy coffee');

    taskForm.taskSubmitted.emit({ title: 'Buy coffee' });

    expect(taskService.createTask).toHaveBeenCalledOnceWith({ title: 'Buy coffee' });
    expect(component.tasks).toEqual([]);
    expect(component.isSubmitting).toBeFalse();
    expect(taskForm.titleControl.value).toBe('Buy coffee');
    expect(component.submitError).toBe('Não foi possível adicionar a tarefa. Tente novamente.');
  });

  it('shows the duplicate message returned by the backend and keeps the form value', () => {
    taskService.createTask.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 422,
      error: { errors: { title: ['Já existe uma tarefa com esse título.'] } }
    })));
    const taskForm = createPage();
    taskForm.titleControl.setValue('Buy coffee');

    taskForm.taskSubmitted.emit({ title: 'Buy coffee' });

    expect(component.tasks).toEqual([]);
    expect(component.isSubmitting).toBeFalse();
    expect(taskForm.titleControl.value).toBe('Buy coffee');
    expect(component.submitError).toBe('Já existe uma tarefa com esse título.');
  });

  it('removes a task only after a successful delete response', () => {
    const deletion$ = new Subject<void>();
    taskService.deleteTask.and.returnValue(deletion$);
    createPage();
    component.tasks = [
      { id: 1, title: 'First', completed: false },
      { id: 2, title: 'Second', completed: false }
    ];

    component.deleteTask(1);

    expect(taskService.deleteTask).toHaveBeenCalledOnceWith(1);
    expect(component.deletingTaskIds.has(1)).toBeTrue();
    expect(component.deletingTaskIds.has(2)).toBeFalse();
    expect(component.tasks).toHaveSize(2);

    deletion$.next();
    deletion$.complete();

    expect(component.tasks).toEqual([{ id: 2, title: 'Second', completed: false }]);
    expect(component.deletingTaskIds.has(1)).toBeFalse();
  });

  it('keeps the task when deletion fails and clears only its pending state', () => {
    taskService.deleteTask.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    createPage();
    component.tasks = [{ id: 1, title: 'First', completed: false }];

    component.deleteTask(1);

    expect(component.tasks).toEqual([{ id: 1, title: 'First', completed: false }]);
    expect(component.deleteError).toBe('Não foi possível remover a tarefa.');
    expect(component.deletingTaskIds.has(1)).toBeFalse();
  });

  it('keeps operation error states independent', () => {
    taskService.createTask.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    taskService.deleteTask.and.returnValue(of(void 0));
    const taskForm = createPage();
    component.tasks = [{ id: 1, title: 'First', completed: false }];

    taskForm.taskSubmitted.emit({ title: 'New task' });
    component.deleteTask(1);

    expect(component.submitError).toBe('Não foi possível adicionar a tarefa. Tente novamente.');
    expect(component.deleteError).toBeNull();
  });

  function createPage(): TaskFormComponent {
    fixture = TestBed.createComponent(TaskPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    return fixture.debugElement.query(By.directive(TaskFormComponent)).componentInstance as TaskFormComponent;
  }

  function createPageWithExistingTask(): TaskFormComponent {
    const taskForm = createPage();
    component.tasks = [{ id: 1, title: 'Buy coffee', completed: false }];

    return taskForm;
  }
});
