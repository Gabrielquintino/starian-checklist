import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskListComponent } from './task-list.component';

describe('TaskListComponent', () => {
  let fixture: ComponentFixture<TaskListComponent>;
  let component: TaskListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
  });

  it('renders the empty state when there are no tasks', () => {
    component.tasks = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma tarefa encontrada.');
    expect(fixture.nativeElement.querySelector('.task-list')).toBeNull();
  });

  it('renders tasks and emits the selected task id', () => {
    const emitSpy = spyOn(component.taskDeleted, 'emit');
    component.tasks = [
      { id: 1, title: 'Buy coffee', completed: false },
      { id: 2, title: 'Buy bread', completed: true }
    ];
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.remove-button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();

    expect(fixture.nativeElement.textContent).toContain('Buy coffee');
    expect(fixture.nativeElement.textContent).toContain('Buy bread');
    expect(buttons[1].getAttribute('aria-label')).toBe('Remover tarefa Buy bread');
    expect(emitSpy).toHaveBeenCalledOnceWith(2);
  });

  it('disables only the task currently being removed', () => {
    component.tasks = [
      { id: 1, title: 'Buy coffee', completed: false },
      { id: 2, title: 'Buy bread', completed: false }
    ];
    component.deletingTaskIds = new Set([2]);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.remove-button') as NodeListOf<HTMLButtonElement>;

    expect(buttons[0].disabled).toBeFalse();
    expect(buttons[1].disabled).toBeTrue();
    expect(buttons[1].textContent).toContain('Removendo');
  });
});
