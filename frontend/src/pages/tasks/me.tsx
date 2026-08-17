import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Card from '@/components/common/Card';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: number;
  difficulty: number;
  status: string;
  assigned_to?: number;
  deadline?: string;
}

export default function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch (err) {
        console.error("Failed to fetch my tasks client-side", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const getPriorityBadge = (prio: number) => {
    switch (prio) {
      case 2:
        return <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">High</span>;
      case 1:
        return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Medium</span>;
      default:
        return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase">Done</span>;
      case 'in_progress':
        return <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase">In Progress</span>;
      default:
        return <span className="bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase">Todo</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-semibold text-app-text-muted">Loading tasks...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>My Tasks - MetaOffice Spatial Workspace</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Assigned Tasks</h1>
          <p className="text-app-text-muted mt-1">Review and manage your assigned tasks.</p>
        </div>

        {tasks.length === 0 ? (
          <Card className="p-8 text-center text-app-text-muted font-medium">
            You have no tasks assigned to you right now. Great job!
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <Card key={task.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {getPriorityBadge(task.priority)}
                    {getStatusBadge(task.status)}
                  </div>
                  <h3 className="font-bold text-lg text-app-text">{task.title}</h3>
                  <p className="text-sm text-app-text-muted">{task.description}</p>
                </div>

                <div className="pt-2 border-t border-app-border flex items-center justify-between text-xs text-app-text-muted font-semibold mt-4">
                  <span>Difficulty: {task.difficulty}/5</span>
                  {task.deadline && <span>Deadline: {task.deadline}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
