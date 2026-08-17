export type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'done';

export type TaskPriority = 0 | 1 | 2; // 0 = Low, 1 = Medium, 2 = High
export type TaskDifficulty = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: number;
  difficulty: number;
  status: string;
  assigned_to?: number;
  assignees?: number[];
  deadline?: string;
  created_by?: number;
  org_id?: number;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority: number;
  difficulty: number;
  assigned_to?: number;
  deadline?: string;
  status?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: number;
  difficulty?: number;
  assigned_to?: number;
  deadline?: string;
  status?: string;
}
