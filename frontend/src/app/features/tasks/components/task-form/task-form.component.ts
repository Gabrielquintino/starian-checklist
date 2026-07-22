import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { CreateTaskRequest } from '../../models/task.model';

function trimmedRequired(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length > 0 ? null : { whitespace: true };
}

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.scss'
})
export class TaskFormComponent {
  @Input() isSubmitting = false;
  @Input() submissionError: string | null = null;
  @Output() readonly taskSubmitted = new EventEmitter<CreateTaskRequest>();

  readonly titleControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(255), trimmedRequired]
  });
  readonly taskForm = new FormGroup({ title: this.titleControl });

  submit(): void {
    if (this.titleControl.invalid || this.isSubmitting) {
      this.titleControl.markAsTouched();
      return;
    }

    this.taskSubmitted.emit({ title: this.titleControl.value.trim() });
  }

  reset(): void {
    this.titleControl.reset();
  }
}
