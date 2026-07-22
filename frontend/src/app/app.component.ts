import { Component } from '@angular/core';

import { TaskPageComponent } from './features/tasks/pages/task-page/task-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TaskPageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
