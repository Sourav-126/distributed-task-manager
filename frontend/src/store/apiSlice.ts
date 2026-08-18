import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Setup baseQuery with dynamic headers
const baseQuery = fetchBaseQuery({
  baseUrl: '', // relative to site origin for proxy compatibility
  prepareHeaders: (headers) => {
    // Read access token from localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  },
});

export interface TaskType {
  id: string;
  title: string;
  description: string;
  priority: number;
  difficulty: number;
  assigned_to: number;
  deadline?: string;
  status: string;
  creator_id: number;
  created_at: string;
}

export interface UserType {
  id: number;
  email: string;
  username?: string;
  role: string;
  team_id?: number;
}

export interface CommentType {
  id: number;
  task_id: string;
  user_id: number;
  content: string;
  parent_id?: number | null;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  created_at: string;
  user?: UserType;
  replies?: CommentType[];
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Profile', 'Tasks', 'Comments', 'Notifications', 'Members', 'Onboarding'],
  endpoints: (builder) => ({
    // Auth
    signin: builder.mutation({
      query: (body) => ({
        url: '/api/signin',
        method: 'POST',
        body,
      }),
    }),
    signup: builder.mutation({
      query: (body) => ({
        url: '/api/signup',
        method: 'POST',
        body,
      }),
    }),
    
    // Profile
    getProfile: builder.query<UserType, void>({
      query: () => '/api/profile',
      providesTags: ['Profile'],
    }),
    
    // Tasks
    getTasksTeam: builder.query<TaskType[], void>({
      query: () => '/api/tasks/team',
      providesTags: ['Tasks'],
    }),
    getTasksMe: builder.query<TaskType[], void>({
      query: () => '/api/tasks/me',
      providesTags: ['Tasks'],
    }),
    createTask: builder.mutation<TaskType, Partial<TaskType>>({
      query: (body) => ({
        url: '/api/tasks/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tasks'],
    }),
    updateTask: builder.mutation<TaskType, { id: string } & Partial<TaskType>>({
      query: ({ id, ...body }) => ({
        url: `/api/tasks/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Tasks'],
    }),
    deleteTask: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tasks'],
    }),
    
    // Members
    getOrgMembers: builder.query<UserType[], void>({
      query: () => '/api/orgs/members',
      providesTags: ['Members'],
    }),
    
    // Comments
    getComments: builder.query<{ comments: CommentType[] }, string>({
      query: (taskId) => `/api/tasks/${taskId}/comments`,
      providesTags: (result, error, taskId) => [{ type: 'Comments', id: taskId }],
    }),
    createComment: builder.mutation<CommentType, { taskId: string; content: string; parent_id?: number | null; file_url?: string; file_name?: string; file_type?: string }>({
      query: ({ taskId, ...body }) => ({
        url: `/api/tasks/${taskId}/comments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Comments', id: taskId }],
    }),
    
    // Notifications
    getNotifications: builder.query<any, void>({
      query: () => '/api/notifications',
      providesTags: ['Notifications'],
    }),
    markAllNotificationsAsRead: builder.mutation<any, void>({
      query: () => ({
        url: '/api/notifications/read',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
    markNotificationAsRead: builder.mutation<any, number>({
      query: (id) => ({
        url: `/api/notifications/read`,
        method: 'POST',
        body: { id },
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Onboarding
    getOnboardingStatus: builder.query<{
      current_step: string;
      is_complete: boolean;
      desk_selection_id?: number;
      should_set_desk: boolean;
      desk_id_to_assign?: number;
      desk_map_id_to_assign?: number;
      name?: string;
      outfit_template_id?: number;
    }, void>({
      query: () => '/api/onboarding/status',
      providesTags: ['Onboarding'],
    }),
    updateOnboardingStep: builder.mutation<any, { step: string; data?: any }>({
      query: (body) => ({
        url: '/api/onboarding/step',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Onboarding'],
    }),
    completeOnboarding: builder.mutation<any, void>({
      query: () => ({
        url: '/api/onboarding/complete',
        method: 'POST',
      }),
      invalidatesTags: ['Onboarding'],
    }),

    // Cloudinary
    getCloudinarySignature: builder.mutation<any, void>({
      query: () => ({
        url: '/api/cloudinary/signature',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useSigninMutation,
  useSignupMutation,
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useGetTasksTeamQuery,
  useGetTasksMeQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useGetOrgMembersQuery,
  useGetCommentsQuery,
  useLazyGetCommentsQuery,
  useCreateCommentMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
  useGetOnboardingStatusQuery,
  useLazyGetOnboardingStatusQuery,
  useUpdateOnboardingStepMutation,
  useCompleteOnboardingMutation,
  useGetCloudinarySignatureMutation,
} = apiSlice;
