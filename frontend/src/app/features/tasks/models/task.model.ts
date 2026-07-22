export interface Task {
  id: number;
  title: string;
  completed: boolean;
}

export interface CreateTaskRequest {
  title: string;
}
