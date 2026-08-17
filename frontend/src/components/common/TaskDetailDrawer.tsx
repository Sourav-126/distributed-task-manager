import React, { useState, useEffect, useRef } from 'react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { toast } from '@/utils/toast';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { Task, OrgMember, UserProfile } from '@/types';
import {
  useLazyGetCommentsQuery,
  useCreateCommentMutation,
  useUpdateTaskMutation,
} from '@/store/apiSlice';

interface CommentUser {
  id: number;
  email: string;
}

interface DBTaskComment {
  id: number;
  task_id: string;
  user_id: number;
  user?: CommentUser;
  parent_id?: number;
  content: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  replies?: DBTaskComment[];
  created_at: string;
}

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  token: string;
  user: UserProfile;
  members: OrgMember[];
  onTaskUpdated: () => void;
  onTaskDeleted?: () => void;
}

export default function TaskDetailDrawer({
  isOpen,
  onClose,
  task,
  token,
  user,
  members,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailDrawerProps) {
  if (!isOpen || !task) return null;

  const canManage =
    user?.role === 'manager' ||
    user?.role === 'team_lead' ||
    user?.role === 'org_admin' ||
    user?.role === 'super_admin';

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get exact user name/email prefix for comments
  const getAuthorEmail = (userId: number, userObj?: CommentUser) => {
    const email = userObj?.email || (userId === user.id ? user.email : members.find((m) => m.id === userId)?.email);
    const username = (userObj as any)?.username || (userId === user.id ? (user as any).username : members.find((m) => m.id === userId)?.username);
    if (username) return `@${username}`;
    if (email) return email.split('@')[0];
    return `User #${userId}`;
  };

  // Helper to highlight @mentions in plain text comment content
  const renderHighlightedContent = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[a-z0-9_]{3,30})/gi);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={idx}
            className="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 mx-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Helper to format Cloudinary URL to force attachment download
  const getPdfDownloadUrl = (url: string) => {
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/fl_attachment/');
    }
    return url;
  };

  // Helper to download files programmatically (bypasses cross-origin restrictions on download attribute)
  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const localUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(localUrl);
    } catch (err) {
      // Fallback if blocked
      window.open(url, '_blank');
    }
  };

  // Editable Form State
  const [editTitle, setEditTitle] = useState<string>(task.title);
  const [editDescription, setEditDescription] = useState<string>(task.description);
  const [editPriority, setEditPriority] = useState<number>(task.priority);
  const [editDifficulty, setEditDifficulty] = useState<number>(task.difficulty);
  const [editStatus, setEditStatus] = useState<string>(task.status || 'pending');
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>(
    task.assignees && task.assignees.length > 0
      ? task.assignees
      : task.assigned_to
      ? [task.assigned_to]
      : []
  );
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState<boolean>(false);
  const [editDeadline, setEditDeadline] = useState<string>(task.deadline || getTodayString());
  const [saving, setSaving] = useState<boolean>(false);

  // Dirty state — true when any field differs from the last-saved task snapshot
  const [savedSnapshot, setSavedSnapshot] = useState({
    title: task.title,
    description: task.description,
    priority: task.priority,
    difficulty: task.difficulty,
    status: task.status || 'pending',
    assignees: (task.assignees && task.assignees.length > 0
      ? task.assignees
      : task.assigned_to ? [task.assigned_to] : []).join(','),
    deadline: task.deadline || getTodayString(),
  });

  const isDirty =
    editTitle !== savedSnapshot.title ||
    editDescription !== savedSnapshot.description ||
    editPriority !== savedSnapshot.priority ||
    editDifficulty !== savedSnapshot.difficulty ||
    editStatus !== savedSnapshot.status ||
    selectedAssignees.join(',') !== savedSnapshot.assignees ||
    editDeadline !== savedSnapshot.deadline;

  // Comments & Threaded Reply State
  const [comments, setComments] = useState<DBTaskComment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<{ id: number; author: string } | null>(null);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  // Resizable split pane state (% for right comments column)
  const [commentsWidthPercent, setCommentsWidthPercent] = useState<number>(40);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [getCommentsQuery] = useLazyGetCommentsQuery();
  const [createCommentMutation] = useCreateCommentMutation();
  const [updateTaskMutation] = useUpdateTaskMutation();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX;
      const newRightWidth = rect.right - mouseX;
      let newPercent = (newRightWidth / rect.width) * 100;
      if (newPercent < 25) newPercent = 25;
      if (newPercent > 70) newPercent = 70;
      setCommentsWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const toggleReplies = (commentId: number) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const fetchComments = async () => {
    if (!token || !task) return;
    setLoadingComments(true);
    try {
      const data = await getCommentsQuery(task.id).unwrap();
      setComments(data.comments || []);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setEditDifficulty(task.difficulty);
    setEditStatus(task.status || 'pending');
    setSelectedAssignees(
      task.assignees && task.assignees.length > 0
        ? task.assignees
        : task.assigned_to
        ? [task.assigned_to]
        : []
    );
    setEditDeadline(task.deadline || getTodayString());
    setReplyingTo(null);
    // Reset saved snapshot when task changes
    setSavedSnapshot({
      title: task.title,
      description: task.description,
      priority: task.priority,
      difficulty: task.difficulty,
      status: task.status || 'pending',
      assignees: (task.assignees && task.assignees.length > 0
        ? task.assignees
        : task.assigned_to ? [task.assigned_to] : []).join(','),
      deadline: task.deadline || getTodayString(),
    });

    fetchComments();
  }, [task]);

  const handleToggleAssignee = (memberId: number) => {
    setSelectedAssignees((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSaveTask = async () => {
    if (!editTitle.trim() || editTitle.length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }

    setSaving(true);
    try {
      const primaryAssignee = selectedAssignees.length > 0 ? selectedAssignees[0] : undefined;

      const res = await fetch(`/api/tasks/${task.id}`, {
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
          assigned_to: primaryAssignee,
          deadline: editDeadline || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Task updated successfully!');
        // Update snapshot so dirty resets to false
        setSavedSnapshot({
          title: editTitle.trim(),
          description: editDescription.trim(),
          priority: editPriority,
          difficulty: editDifficulty,
          status: editStatus,
          assignees: selectedAssignees.join(','),
          deadline: editDeadline,
        });
        onTaskUpdated();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update task');
      }
    } catch (err) {
      toast.error('Error updating task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success('Task deleted');
        onClose();
        if (onTaskDeleted) onTaskDeleted();
        onTaskUpdated();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete task');
      }
    } catch (err) {
      toast.error('Error deleting task');
    }
  };

  // File attachment state
  const [rawFileToUpload, setRawFileToUpload] = useState<File | null>(null);
  const [attachedFilePreview, setAttachedFilePreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const commentInputRef = React.useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when comments list updates
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null); // null = not in mention mode
  const [mentionAnchorPos, setMentionAnchorPos] = useState<number>(0); // index of '@' in text
  const [mentionHighlight, setMentionHighlight] = useState<number>(0); // keyboard-selected index

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit');
      return;
    }

    const fileType = file.type.startsWith('image/')
      ? 'image'
      : file.type === 'application/pdf'
      ? 'pdf'
      : 'document';

    setRawFileToUpload(file);

    // Instant local preview for 0ms UX feedback
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFilePreview({
        url: reader.result as string,
        name: file.name,
        type: fileType,
      });
    };
    reader.readAsDataURL(file);
  };

  // ── @mention helpers ─────────────────────────────────────────────────────
  // Returns username handle for a member (username field when available, else email prefix)
  const getMemberHandle = (m: OrgMember) =>
    m.username || m.email.split('@')[0];

  // Filtered members matching the current mention query, limited to same team
  const mentionMatches = mentionQuery !== null
    ? members.filter((m) => {
        const queryMatch =
          getMemberHandle(m).toLowerCase().startsWith(mentionQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(mentionQuery.toLowerCase());
        if (!queryMatch) return false;

        // restrict to team members only (if current user belongs to a team)
        const currentUserTeamId = (user as any).team_id;
        if (currentUserTeamId && m.team_id) {
          return m.team_id === currentUserTeamId;
        }
        return true;
      }).slice(0, 8)
    : [];

  // Helper to serialize DOM nodes of ContentEditable div to plain text for the backend
  const serializeContentEditable = (el: HTMLDivElement): string => {
    let text = '';
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.nodeValue;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (element.tagName === 'SPAN' && element.getAttribute('data-mention')) {
          text += `@${element.getAttribute('data-mention')}`;
        } else if (element.tagName === 'BR') {
          text += '\n';
        } else {
          text += element.innerText;
        }
      }
    });
    return text;
  };

  // Handle changes to contenteditable div — detect @ trigger around cursor
  const handleEditableInput = () => {
    const el = commentInputRef.current;
    if (!el) return;

    // Keep track of plain text for validation/send disabled state
    const plainText = serializeContentEditable(el);
    setNewCommentText(plainText);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.nodeValue || '';
        const offset = range.startOffset;
        const textBeforeCursor = text.slice(0, offset);

        const atMatch = textBeforeCursor.match(/@([a-z0-9_]*)$/i);
        if (atMatch) {
          setMentionQuery(atMatch[1]); // query after @
          setMentionAnchorPos(offset - atMatch[0].length);
          setMentionHighlight(0);
        } else {
          setMentionQuery(null);
        }
      } else {
        setMentionQuery(null);
      }
    }
  };

  // Insert the selected @handle into the contenteditable div as a styled atomic span
  const insertMention = (member: OrgMember) => {
    const handle = getMemberHandle(member);
    const selection = window.getSelection();
    const el = commentInputRef.current;
    if (!selection || selection.rangeCount === 0 || !el) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    const offset = range.startOffset;

    const queryLen = (mentionQuery?.length ?? 0) + 1; // query characters + '@'

    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.nodeValue || '';
      // Strip out the typed @query text
      textNode.nodeValue = text.slice(0, offset - queryLen) + text.slice(offset);
      // Move cursor/range start to correct position
      range.setStart(textNode, offset - queryLen);
      range.setEnd(textNode, offset - queryLen);
    }

    // Create the styled mention badge element
    const span = document.createElement('span');
    span.contentEditable = 'false';
    // Style as a beautiful blue rounded tag
    span.className = 'text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 mx-0.5 select-all inline-flex items-center align-baseline cursor-default';
    span.setAttribute('data-mention', handle);
    span.innerText = `@${handle}`;

    range.insertNode(span);

    // Append a non-breaking space after the badge so user can type normally
    const spaceNode = document.createTextNode('\u00A0');
    range.setStartAfter(span);
    range.setEndAfter(span);
    range.insertNode(spaceNode);

    // Place caret after the space
    range.setStartAfter(spaceNode);
    range.setEndAfter(spaceNode);
    selection.removeAllRanges();
    selection.addRange(range);

    // Clear mention state and update text
    setMentionQuery(null);
    setNewCommentText(serializeContentEditable(el));
  };

  // Handle keyboard navigation within the mention dropdown and Enter to submit comment
  const handleEditableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Dropdown key navigation
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlight((h) => Math.min(h + 1, mentionMatches.length - 1));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlight((h) => Math.max(h - 1, 0));
        return;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionMatches[mentionHighlight]);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    // Standard chat send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const el = commentInputRef.current;
      if (el) {
        const plainText = serializeContentEditable(el);
        if (plainText.trim() || rawFileToUpload || attachedFilePreview) {
          handleAddComment(new Event('submit') as any);
        }
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const el = commentInputRef.current;
    if (!el) return;

    const plainText = serializeContentEditable(el);
    if (!plainText.trim() && !rawFileToUpload && !attachedFilePreview) return;

    setIsSubmittingComment(true);

    try {
      let mediaPayload: { url: string; name: string; type: string } | null = null;

      // Fire Cloudinary upload API ON CLICKING SEND
      if (rawFileToUpload) {
        try {
          mediaPayload = await uploadToCloudinary(rawFileToUpload, token);
        } catch (uploadErr) {
          console.warn('Cloudinary upload error:', uploadErr);
        }
      }

      if (!mediaPayload && attachedFilePreview) {
        mediaPayload = attachedFilePreview;
      }

      const payload: Record<string, any> = {
        content: plainText.trim(),
      };

      if (replyingTo) {
        payload.parent_id = replyingTo.id;
      }
      if (mediaPayload) {
        payload.file_url = mediaPayload.url;
        payload.file_name = mediaPayload.name;
        payload.file_type = mediaPayload.type;
      }

      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (replyingTo) {
          setExpandedReplies((prev) => ({ ...prev, [replyingTo.id]: true }));
        }
        // Clear contenteditable DOM element
        if (commentInputRef.current) {
          commentInputRef.current.innerHTML = '';
        }
        setNewCommentText('');
        setRawFileToUpload(null);
        setAttachedFilePreview(null);
        setReplyingTo(null);
        fetchComments();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to post comment');
      }
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const primaryAssigneeId = selectedAssignees.length > 0 ? selectedAssignees[0] : undefined;
  const assignedMember = members.find((m) => m.id === primaryAssigneeId);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6">
        <div className="w-screen max-w-6xl bg-white shadow-2xl flex flex-col border-l border-app-border">
          
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                TASK-{task.id.slice(0, 8)}
              </span>
              <span
                className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded ${
                  editPriority === 2
                    ? 'bg-danger text-white'
                    : editPriority === 1
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {editPriority === 2 ? 'High Priority' : editPriority === 1 ? 'Medium Priority' : 'Low Priority'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold p-1 rounded-lg hover:bg-gray-200 transition-all"
                title="Close Drawer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Drawer Body - ClickUp 2 Column Layout with Resizable Split Pane */}
          <div ref={containerRef} className="flex-1 flex overflow-hidden">
            
            {/* Left Panel: Main Task Details Form */}
            <div style={{ width: `${100 - commentsWidthPercent}%` }} className="p-6 overflow-y-auto space-y-6 border-r border-app-border">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1.5">
                  Task Title
                </label>
                {canManage ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-lg font-extrabold text-app-text p-2.5 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <h2 className="text-xl font-extrabold text-app-text">{task.title}</h2>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1.5">
                  Description
                </label>
                {canManage ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={5}
                    className="w-full text-sm text-app-text p-3 border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                  />
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-app-text leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1.5">
                    Status
                  </label>
                  {canManage ? (
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full p-2.5 text-sm font-semibold border border-app-border rounded-xl bg-white text-app-text"
                    >
                      <option value="pending">📋 To Do</option>
                      <option value="in_progress">⚡ In Progress</option>
                      <option value="in_review">🔍 In Review</option>
                      <option value="done">✅ Done</option>
                    </select>
                  ) : (
                    <span className="text-xs font-bold uppercase px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800">
                      {editStatus}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1.5">
                    Assignees
                  </label>
                  
                  {/* Assigned Members Pills Box */}
                  <div
                    onClick={() => canManage && setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                    className={`flex flex-wrap items-center gap-1.5 p-2.5 bg-white border border-app-border rounded-xl min-h-[42px] ${
                      canManage ? 'cursor-pointer hover:border-primary/50' : ''
                    }`}
                  >
                    {selectedAssignees.length > 0 ? (
                      selectedAssignees.map((id) => {
                        const m = members.find((mem) => mem.id === id);
                        return (
                          <span
                            key={id}
                            className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 flex items-center space-x-1"
                          >
                            <span>👤</span>
                            <span>{m ? m.email.split('@')[0] : `User #${id}`}</span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs font-semibold text-gray-400">⚠️ Click to assign team members</span>
                    )}

                    {canManage && (
                      <button
                        type="button"
                        className="ml-auto text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-all"
                      >
                        {isAssigneeDropdownOpen ? '▲ Close' : '➕ Assign'}
                      </button>
                    )}
                  </div>

                  {/* Popover Dropdown Menu when clicked */}
                  {canManage && isAssigneeDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-app-border rounded-xl shadow-xl p-2 space-y-1 max-h-48 overflow-y-auto animate-fadeIn">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 border-b border-gray-100 mb-1">
                        Select Team Members
                      </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1.5">
                    Difficulty Rating
                  </label>
                  {canManage ? (
                    <select
                      value={editDifficulty}
                      onChange={(e) => setEditDifficulty(Number(e.target.value))}
                      className="w-full p-2.5 text-sm font-semibold border border-app-border rounded-xl bg-white text-app-text"
                    >
                      <option value="1">1 / 5 (Very Easy)</option>
                      <option value="2">2 / 5 (Easy)</option>
                      <option value="3">3 / 5 (Medium)</option>
                      <option value="4">4 / 5 (Hard)</option>
                      <option value="5">5 / 5 (Very Hard)</option>
                    </select>
                  ) : (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800">
                      {editDifficulty}/5
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-app-text-muted mb-1.5">
                    Deadline
                  </label>
                  {canManage ? (
                    <Input
                      type="date"
                      min={getTodayString()}
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                    />
                  ) : (
                    <div className="text-xs font-medium text-app-text p-2 rounded-lg bg-gray-50 border">
                      {editDeadline || 'No deadline'}
                    </div>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="pt-4 border-t border-app-border">
                  <button
                    onClick={handleSaveTask}
                    disabled={saving || !isDirty}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 border ${
                      isDirty
                        ? 'bg-primary text-white border-primary shadow-sm hover:opacity-90 cursor-pointer'
                        : 'bg-primary/10 text-primary/40 border-primary/20 cursor-not-allowed'
                    }`}
                  >
                    <span>{saving ? '⏳' : '💾'}</span>
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}

              {canManage && (user.role === 'org_admin' || user.role === 'super_admin' || user.role === 'manager') && (
                <div className="pt-3 border-t border-app-border flex justify-start">
                  <Button
                    variant="outline"
                    onClick={handleDeleteTask}
                    className="text-danger border-danger/30 hover:bg-danger/10 text-xs font-bold py-2"
                  >
                    🗑️ Delete Task
                  </Button>
                </div>
              )}
            </div>

            {/* Interactive Draggable Resizer Bar */}
            <div
              onMouseDown={handleMouseDown}
              className={`w-2 hover:w-2.5 bg-gray-200 hover:bg-primary cursor-col-resize transition-all duration-150 relative group flex items-center justify-center shrink-0 ${
                isResizing ? 'bg-primary w-2.5' : ''
              }`}
              title="Drag horizontally to resize discussion panel"
            >
              <div className="h-10 w-1 bg-gray-400 group-hover:bg-white rounded-full" />
            </div>

            {/* Right Panel: Task Discussion Comments & Media Chat */}
            <div style={{ width: `${commentsWidthPercent}%` }} className="bg-gray-50/50 flex flex-col h-full shrink-0">
              <div className="p-4 border-b border-app-border flex items-center justify-between bg-white">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-app-text flex items-center space-x-1.5">
                  <span>💬</span>
                  <span>Task Discussion</span>
                </h3>
                <button
                  onClick={fetchComments}
                  className="text-xs text-primary font-semibold hover:underline"
                  title="Refresh comments"
                >
                  {loadingComments ? '⏳' : '🔄 Refresh'}
                </button>
              </div>

              {/* Comments Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {comments.length === 0 && (
                  <div className="text-center text-xs text-app-text-muted py-8 italic">
                    No comments yet. Be the first to post!
                  </div>
                )}

                {comments.map((c) => {
                  const authorEmail = getAuthorEmail(c.user_id, c.user);
                  const authorName = authorEmail;
                  const isMe = c.user_id === user.id;
                  const hasReplies = c.replies && c.replies.length > 0;
                  const repliesCount = c.replies ? c.replies.length : 0;
                  const isExpanded = expandedReplies[c.id] || false;

                  return (
                    <div key={c.id} className="space-y-2">
                      {/* Top Level Comment Card */}
                      <div
                        className={`p-3.5 rounded-xl text-xs space-y-2 border transition-all ${
                          isMe
                            ? 'bg-primary/5 border-primary/20 text-app-text'
                            : 'bg-white border-app-border shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[11px]">
                          <span className={isMe ? 'text-primary' : 'text-gray-800'}>
                            {authorName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {formatTime(c.created_at)}
                          </span>
                        </div>

                         {c.content && <p className="text-gray-800 leading-relaxed font-normal text-xs">{renderHighlightedContent(c.content)}</p>}

                        {/* Media / File Attachment Display */}
                        {c.file_url && (() => {
                          return (
                            <div className="mt-2">
                              {c.file_type === 'image' ? (
                                <a href={c.file_url} target="_blank" rel="noreferrer" className="block max-w-full">
                                  <img
                                    src={c.file_url}
                                    alt={c.file_name || 'Attachment'}
                                    className="max-h-52 rounded-xl object-cover border border-app-border hover:opacity-95 transition-opacity"
                                  />
                                </a>
                              ) : c.file_type === 'pdf' ? (
                                <button
                                  type="button"
                                  onClick={() => downloadFile(c.file_url, c.file_name || 'document.pdf')}
                                  className="flex w-full items-center text-left gap-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl p-3 transition-all group cursor-pointer"
                                >
                                  <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center text-white text-sm font-black shrink-0">
                                    PDF
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">{c.file_name || 'Document.pdf'}</p>
                                    <p className="text-[10px] text-gray-500">Click to download PDF</p>
                                  </div>
                                  <span className="text-[10px] font-bold text-red-600 bg-white border border-red-200 px-2 py-1 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-all shrink-0">
                                    Download 📥
                                  </span>
                                </button>
                              ) : (
                                <a
                                  href={c.file_url}
                                  download={c.file_name || 'file'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 p-2.5 rounded-xl text-indigo-700 font-bold text-xs transition-all"
                                >
                                  <span>📄</span>
                                  <span className="truncate max-w-[180px]">{c.file_name || 'Attached File'}</span>
                                  <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded">📥 Download</span>
                                </a>
                              )}
                            </div>
                          );
                        })()}

                        <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between">
                          <div>
                            {hasReplies && (
                              <button
                                onClick={() => toggleReplies(c.id)}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-100 transition-all flex items-center space-x-1"
                              >
                                <span>💬</span>
                                <span>
                                  {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}
                                </span>
                                <span>{isExpanded ? '▲' : '▼'}</span>
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setReplyingTo({ id: c.id, author: authorName.split('@')[0] });
                            }}
                            className="text-[11px] font-bold text-primary hover:underline flex items-center space-x-1"
                          >
                            <span>↩️</span>
                            <span>Reply</span>
                          </button>
                        </div>
                      </div>

                      {/* Nested Threaded Replies (Collapsible) */}
                      {hasReplies && isExpanded && (
                        <div className="ml-5 pl-3 border-l-2 border-indigo-300 space-y-2 animate-fadeIn">
                          {c.replies!.map((reply) => {
                            const replyAuthor = getAuthorEmail(reply.user_id, reply.user);
                            const replyIsMe = reply.user_id === user.id;

                            return (
                              <div
                                key={reply.id}
                                className={`p-3 rounded-xl text-xs space-y-1.5 border ${
                                  replyIsMe
                                    ? 'bg-primary/10 border-primary/20'
                                    : 'bg-white border-app-border shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold text-[11px]">
                                  <span className={replyIsMe ? 'text-primary' : 'text-gray-700'}>
                                    {replyAuthor}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-normal">
                                    {formatTime(reply.created_at)}
                                  </span>
                                </div>

                                {reply.content && <p className="text-gray-800 leading-relaxed font-normal">{renderHighlightedContent(reply.content)}</p>}

                                {reply.file_url && (() => {
                                  return (
                                    <div className="mt-1">
                                      {reply.file_type === 'image' ? (
                                        <img
                                          src={reply.file_url}
                                          alt={reply.file_name || 'Attachment'}
                                          className="max-h-40 rounded-lg object-cover border border-app-border"
                                        />
                                      ) : reply.file_type === 'pdf' ? (
                                        <button
                                          type="button"
                                          onClick={() => downloadFile(reply.file_url, reply.file_name || 'document.pdf')}
                                          className="flex w-full items-center text-left gap-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg p-2.5 transition-all group cursor-pointer"
                                        >
                                          <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-md text-white text-[10px] font-black shrink-0">
                                            PDF
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-gray-800 truncate">{reply.file_name || 'Document.pdf'}</p>
                                            <p className="text-[10px] text-gray-500">Click to download</p>
                                          </div>
                                          <span className="text-[10px] font-bold text-red-600 bg-white border border-red-200 px-1.5 py-0.5 rounded group-hover:bg-red-500 group-hover:text-white transition-all shrink-0">
                                            📥
                                          </span>
                                        </button>
                                      ) : (
                                        <a
                                          href={reply.file_url}
                                          download={reply.file_name || 'file'}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 p-1.5 rounded-lg border border-indigo-100"
                                        >
                                          <span>📄</span>
                                          <span className="truncate max-w-[140px]">{reply.file_name}</span>
                                        </a>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Input */}
              <div className="p-3.5 border-t border-app-border bg-white space-y-2">
                {replyingTo && (
                  <div className="flex items-center justify-between bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-lg font-semibold">
                    <span>Replying to @{replyingTo.author}</span>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-500 hover:text-gray-800 font-bold text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Attached File Preview Chip */}
                {attachedFilePreview && (
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs px-3 py-1.5 rounded-xl font-medium">
                    <div className="flex items-center space-x-2 truncate">
                      <span>{attachedFilePreview.type === 'image' ? '🖼️' : '📄'}</span>
                      <span className="truncate max-w-[200px]">{attachedFilePreview.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFilePreview(null);
                        setRawFileToUpload(null);
                      }}
                      className="text-gray-400 hover:text-danger font-bold text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <form onSubmit={handleAddComment} className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-gray-500 hover:text-primary hover:bg-primary/10 border border-app-border rounded-xl transition-all shrink-0"
                    title="Attach Image, PDF, or Document"
                  >
                    📎
                  </button>

                  {/* Comment input with @mention dropdown */}
                  <div className="relative flex-1">
                    <div
                      ref={commentInputRef}
                      contentEditable={true}
                      onInput={handleEditableInput}
                      onKeyDown={handleEditableKeyDown}
                      data-placeholder={replyingTo ? `Reply to @${replyingTo.author}...` : 'Write a comment... type @ to mention'}
                      className="w-full p-2.5 text-xs border border-app-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-white min-h-[38px] max-h-24 overflow-y-auto"
                      style={{
                        outline: 'none',
                        wordBreak: 'break-word',
                      }}
                    />

                    {/* @mention floating dropdown */}
                    {mentionQuery !== null && mentionMatches.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-1.5 w-64 bg-white border border-app-border rounded-xl shadow-lg overflow-hidden z-50 animate-fadeIn">
                        {/* Header */}
                        <div className="px-3 py-1.5 bg-gray-50 border-b border-app-border flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Tag a teammate
                          </span>
                          <span className="text-[10px] text-gray-400">↑↓ navigate · ↵ select</span>
                        </div>

                        {mentionMatches.map((member, idx) => {
                          const handle = getMemberHandle(member);
                          const initials = handle.slice(0, 2).toUpperCase();
                          const isHighlighted = idx === mentionHighlight;
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault(); // prevent input blur before click
                                insertMention(member);
                              }}
                              onMouseEnter={() => setMentionHighlight(idx)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                                isHighlighted
                                  ? 'bg-primary/10'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              {/* Avatar */}
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isHighlighted ? 'bg-primary text-white' : 'bg-primary/15 text-primary'
                              }`}>
                                {initials}
                              </div>
                              {/* Info */}
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${isHighlighted ? 'text-primary' : 'text-gray-800'}`}>
                                  @{handle}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">{member.email}</p>
                              </div>
                              {/* Role badge */}
                              <span className="ml-auto text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                                {member.role}
                              </span>
                            </button>
                          );
                        })}

                        {/* No results */}
                        {mentionMatches.length === 0 && mentionQuery !== '' && (
                          <div className="px-3 py-2.5 text-xs text-gray-400 text-center">
                            No teammates found for @{mentionQuery}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={(!newCommentText.trim() && !attachedFilePreview) || isSubmittingComment}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs shrink-0"
                  >
                    {isSubmittingComment ? 'Sending...' : replyingTo ? 'Reply' : 'Send'}
                  </button>
                </form>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
