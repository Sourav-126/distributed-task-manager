import React, { useState } from 'react';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { toast } from '@/utils/toast';
import { OrgMember } from '@/types';
import { useCreateTaskMutation } from '@/store/apiSlice';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  members: OrgMember[];
  onTaskCreated?: () => void;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  token,
  members,
  onTaskCreated,
}: CreateTaskModalProps) {
  const [createTask] = useCreateTaskMutation();
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const minDateStr = getTodayString();

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<number>(1);
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState<boolean>(false);
  const [deadline, setDeadline] = useState<string>(minDateStr);
  const [loading, setLoading] = useState<boolean>(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority(0);
    setDifficulty(1);
    setSelectedAssignees([]);
    setDeadline(minDateStr);
  };

  const handleToggleAssignee = (memberId: number) => {
    setSelectedAssignees((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleCreate = async () => {
    if (!title.trim() || title.length < 3) {
      toast.error('Task title must be at least 3 characters');
      return;
    }
    if (!description.trim() || description.length < 5) {
      toast.error('Description must be at least 5 characters');
      return;
    }
    if (deadline && deadline < minDateStr) {
      toast.error('Deadline cannot be in the past');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim(),
        priority: Number(priority),
        difficulty: Number(difficulty),
      };

      if (selectedAssignees.length > 0) {
        payload.assigned_to = selectedAssignees[0];
      }
      if (deadline) {
        payload.deadline = deadline;
      }

      await createTask(payload).unwrap();
      toast.success('Task created and assigned successfully!');
      resetForm();
      onClose();
      if (onTaskCreated) {
        onTaskCreated();
      }
    } catch (err) {
      toast.error('An error occurred while creating the task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create & Assign New Task"
      footer={
        <div className="flex items-center justify-end space-x-2 w-full">
          <Button variant="white" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating Task...' : '➕ Create Task'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
            Task Title *
          </label>
          <Input
            type="text"
            placeholder="e.g. Implement user authentication endpoint"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
            Task Description *
          </label>
          <textarea
            placeholder="Detailed description of task goals, acceptance criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2.5 text-sm border border-app-border rounded-lg bg-white text-app-text focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full p-2.5 text-sm border border-app-border rounded-lg bg-white text-app-text font-medium"
            >
              <option value="0">Low Priority</option>
              <option value="1">Medium Priority</option>
              <option value="2">High Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
              Difficulty Level
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-full p-2.5 text-sm border border-app-border rounded-lg bg-white text-app-text font-medium"
            >
              <option value="1">1 (Very Easy)</option>
              <option value="2">2 (Easy)</option>
              <option value="3">3 (Medium)</option>
              <option value="4">4 (Hard)</option>
              <option value="5">5 (Very Hard)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
              Assignees
            </label>
            <div
              onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
              className="flex flex-wrap items-center gap-1.5 p-2 bg-white border border-app-border rounded-xl min-h-[42px] cursor-pointer hover:border-primary/50"
            >
              {selectedAssignees.length > 0 ? (
                selectedAssignees.map((id) => {
                  const m = members.find((mem) => mem.id === id);
                  return (
                    <span
                      key={id}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center space-x-1"
                    >
                      <span>👤</span>
                      <span>{m ? m.email.split('@')[0] : `User #${id}`}</span>
                    </span>
                  );
                })
              ) : (
                <span className="text-xs font-semibold text-gray-400">Select team members</span>
              )}

              <button
                type="button"
                className="ml-auto text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-lg transition-all"
              >
                {isAssigneeDropdownOpen ? '▲ Close' : '➕ Select'}
              </button>
            </div>

            {isAssigneeDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-app-border rounded-xl shadow-xl p-2 space-y-1 max-h-48 overflow-y-auto animate-fadeIn">
                {members.map((m) => {
                  const isChecked = selectedAssignees.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        isChecked ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 text-app-text'
                      }`}
                    >
                      <span className="truncate">{m.email} ({m.role})</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAssignee(m.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1">
              Deadline Date
            </label>
            <Input
              type="date"
              min={minDateStr}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
