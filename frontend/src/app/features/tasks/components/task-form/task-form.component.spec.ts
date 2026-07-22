import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskFormComponent } from './task-form.component';

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts invalid and exposes the required state to assistive technology after interaction', () => {
    const input = getInput();

    expect(component.taskForm.invalid).toBeTrue();
    expect(input.getAttribute('aria-invalid')).toBe('false');

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.titleControl.touched).toBeTrue();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('task-title-error');
  });

  it('enables submission and emits one normalized payload for a valid native form submit', () => {
    const emitSpy = spyOn(component.taskSubmitted, 'emit');
    component.titleControl.setValue('  Buy coffee  ');
    fixture.detectChanges();

    const submitButton = getSubmitButton();
    submitForm();

    expect(component.taskForm.valid).toBeTrue();
    expect(submitButton.disabled).toBeFalse();
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith({ title: 'Buy coffee' });
  });

  it('does not emit when the title contains only spaces', () => {
    const emitSpy = spyOn(component.taskSubmitted, 'emit');
    component.titleControl.setValue('   ');
    fixture.detectChanges();

    submitForm();

    expect(component.titleControl.invalid).toBeTrue();
    expect(component.titleControl.touched).toBeTrue();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('does not enable submission above the maximum title length', () => {
    component.titleControl.setValue('a'.repeat(256));
    fixture.detectChanges();

    expect(component.titleControl.hasError('maxlength')).toBeTrue();
    expect(getSubmitButton().disabled).toBeTrue();
  });

  it('prevents a second submission while isSubmitting is true', () => {
    const emitSpy = spyOn(component.taskSubmitted, 'emit');
    component.titleControl.setValue('Buy coffee');
    component.isSubmitting = true;
    fixture.detectChanges();

    submitForm();

    expect(getSubmitButton().disabled).toBeTrue();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('renders an external submission error without clearing the typed value', () => {
    component.titleControl.setValue('Buy coffee');
    component.submissionError = 'A task with this title already exists.';
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('#task-title-submission-error') as HTMLElement;

    expect(error.textContent).toContain('A task with this title already exists.');
    expect(component.titleControl.value).toBe('Buy coffee');
    expect(error.getAttribute('role')).toBe('alert');
  });

  function getInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#task-title') as HTMLInputElement;
  }

  function getSubmitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
});
