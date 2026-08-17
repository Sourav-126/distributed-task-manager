import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getCookie } from '@/utils/cookies';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import CreateTaskModal from '@/components/common/CreateTaskModal';
import TaskDetailDrawer from '@/components/common/TaskDetailDrawer';
import { toast } from '@/utils/toast';
import { Task, OrgMember, UserProfile } from '@/types';

interface BoardProps {
  initialTasks: Task[];
  token: string;
  user: UserProfile;
  error?: string;
}

// ─────────────────────────────── Draggable Task Card ───────────────────────────────

interface TaskCardProps {
  task: Task;
  members: OrgMember[];
  onCardClick: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, members, onCardClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (prio: number) => {
    switch (prio) {
      case 2: return 'bg-danger text-white';
      case 1: return 'bg-amber-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const assignedMember = members.find((m) => m.id === Number(task.assigned_to));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!isDragging) {
          onCardClick(task);
        }
      }}
      className={`p-4 bg-white border rounded-xl transition-shadow select-none cursor-grab active:cursor-grabbing group ${
        isDragging
          ? 'shadow-xl border-primary ring-2 ring-primary/30 bg-white'
          : 'border-app-border shadow-sm hover:shadow-md hover:border-primary/50'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
            {task.priority === 2 ? 'High' : task.priority === 1 ? 'Medium' : 'Low'}
          </span>
          <span className="text-[11px] font-semibold text-app-text-muted group-hover:text-primary">
            ID: {task.id.slice(0, 8)} ↗
          </span>
        </div>
        <h4 className="font-bold text-sm text-app-text group-hover:text-primary transition-colors">{task.title}</h4>
        <p className="text-xs text-app-text-muted line-clamp-2 leading-relaxed">{task.description}</p>
        
        <div className="pt-2 border-t border-app-border/40 flex items-center justify-between text-[11px] text-app-text-muted font-medium">
          <span className="bg-gray-100 px-1.5 py-0.5 rounded font-semibold text-gray-700">Diff: {task.difficulty}/5</span>
          {assignedMember ? (
            <span className="truncate max-w-[130px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100" title={assignedMember.email}>
              👤 {assignedMember.email.split('@')[0]}
            </span>
          ) : (
            <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
              ⚠️ Unassigned
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────── Droppable Kanban Column ───────────────────────────────

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  members: OrgMember[];
  showAddButton?: boolean;
  onCardClick: (task: Task) => void;
  onOpenCreateModal?: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, tasks, members, showAddButton = false, onCardClick, onOpenCreateModal }) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col bg-gray-50/80 border border-app-border rounded-2xl w-full p-3.5 min-h-[220px]">
      <div className="flex items-center justify-between mb-3 px-1 shrink-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-extrabold text-xs text-app-text uppercase tracking-wider">{title}</h3>
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">
            {tasks.length}
          </span>
        </div>
      </div>
      
      <div ref={setNodeRef} className="flex-1 space-y-3 p-1">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} members={members} onCardClick={onCardClick} />
        ))}
        {tasks.length === 0 && (
          <div className="h-28 border-2 border-dashed border-app-border/60 rounded-xl flex items-center justify-center text-xs text-app-text-muted font-semibold">
            Drop tasks here
          </div>
        )}

        {showAddButton && onOpenCreateModal && (
          <div className="pt-1">
            <button
              onClick={onOpenCreateModal}
              className="w-full py-2 px-3 border border-dashed border-primary/40 hover:border-primary text-primary bg-primary/5 hover:bg-primary/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
            >
              <span>➕</span>
              <span>Add Task</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────── Board Page ───────────────────────────────

export default function TaskBoard() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);

  // Create task modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Selected task modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editPriority, setEditPriority] = useState<number>(0);
  const [editDifficulty, setEditDifficulty] = useState<number>(1);
  const [editStatus, setEditStatus] = useState<string>('pending');
  const [editAssignedTo, setEditAssignedTo] = useState<string>('');
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [savingTask, setSavingTask] = useState<boolean>(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_profile');
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (_) {}
      }
    }
  }, []);

  const canManage = user?.role === 'manager' || user?.role === 'team_lead' || user?.role === 'org_admin' || user?.role === 'super_admin';

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchTasks = async () => {
    if (!token) return;
    setLoadingTasks(true);
    try {
      // ALL roles see the full team board — employees see it read-only
      const res = await fetch('/api/tasks/team', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks in browser', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchMembers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/orgs/members', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch org members', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, [token]);

  // Sensitive pointer sensor configuration (distance = 3 for responsive dragging without stiffness)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-semibold text-app-text-muted">Loading task board...</div>
      </div>
    );
  }

  const handleCardClick = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setEditDifficulty(task.difficulty);
    setEditStatus(task.status || 'pending');
    setEditAssignedTo(task.assigned_to ? String(task.assigned_to) : '');
    setEditDeadline(task.deadline || getTodayString());
    setIsEditModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!selectedTask) return;
    if (!editTitle.trim() || editTitle.length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }

    setSavingTask(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          priority: Number(editPriority),
          difficulty: Number(editDifficulty),
          status: editStatus,
          assigned_to: editAssignedTo ? Number(editAssignedTo) : undefined,
          deadline: editDeadline || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Task details updated!');
        setIsEditModalOpen(false);
        fetchTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update task');
      }
    } catch (err) {
      toast.error('Error saving task changes');
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!confirm(`Are you sure you want to delete task "${selectedTask.title}"?`)) return;

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success('Task deleted');
        setIsEditModalOpen(false);
        fetchTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete task');
      }
    } catch (err) {
      toast.error('Error deleting task');
    }
  };

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    // Employees cannot drag tasks to update status
    if (!canManage) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    const taskToUpdate = tasks.find((t) => t.id === taskId);
    if (!taskToUpdate || taskToUpdate.status === newStatus) return;

    // Optimistically update local state
    const originalTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: taskToUpdate.title,
          description: taskToUpdate.description,
          priority: taskToUpdate.priority,
          difficulty: taskToUpdate.difficulty,
          assigned_to: taskToUpdate.assigned_to || undefined,
          deadline: taskToUpdate.deadline || undefined,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update task status in backend');
      }

      toast.success('Task status updated!');
    } catch (err) {
      // Revert state if api fails
      setTasks(originalTasks);
      toast.error('Could not save status change. Reverted.');
    }
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  const columns = {
    pending: tasks.filter((t) => t.status === 'pending' || t.status === ''),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    in_review: tasks.filter((t) => t.status === 'in_review'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  return (
    <>
      <Head>
        <title>Task Board - MetaOffice</title>
      </Head>

      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-app-border pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-app-text">Team Task Board</h1>
            <p className="text-sm text-app-text-muted">
              {canManage
                ? 'Click any card to edit details; drag & drop across columns to update status.'
                : '👀 View-only — you can open tasks to comment, tag teammates, and send media.'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={fetchTasks}
              disabled={loadingTasks}
              className="flex items-center space-x-1.5 font-semibold text-xs py-2"
            >
              <span>{loadingTasks ? '⏳' : '🔄'}</span>
              <span>{loadingTasks ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center space-x-1.5 font-bold shadow-sm text-xs py-2"
              >
                <span>➕</span>
                <span>Create Task</span>
              </Button>
            )}
          </div>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KanbanColumn id="pending" title="📋 To Do" tasks={columns.pending} members={members} showAddButton={canManage} onCardClick={handleCardClick} onOpenCreateModal={() => setIsCreateModalOpen(true)} />
            <KanbanColumn id="in_progress" title="⚡ In Progress" tasks={columns.in_progress} members={members} onCardClick={handleCardClick} onOpenCreateModal={() => setIsCreateModalOpen(true)} />
            <KanbanColumn id="in_review" title="🔍 In Review" tasks={columns.in_review} members={members} onCardClick={handleCardClick} onOpenCreateModal={() => setIsCreateModalOpen(true)} />
            <KanbanColumn id="done" title="✅ Done" tasks={columns.done} members={members} onCardClick={handleCardClick} onOpenCreateModal={() => setIsCreateModalOpen(true)} />
          </div>
        </DndContext>
      </div>

      {/* CLICKUP-STYLE TASK DETAIL DRAWER (WITH INTEGRATED COMMENTS CHAT) */}
      <TaskDetailDrawer
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={selectedTask}
        token={token}
        user={user}
        members={members}
        onTaskUpdated={fetchTasks}
      />

      {/* CREATE & ASSIGN TASK MODAL */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        token={token}
        members={members}
        onTaskCreated={fetchTasks}
      />
    </>
  );
}
