import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { toast } from '@/utils/toast';

const signupSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  orgId: z.string().optional(),
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupPayload {
  email: string;
  password: string;
  org_id?: number;
}

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData): Promise<void> => {
    setLoading(true);

    try {
      const signupBody: SignupPayload = {
        email: data.email,
        password: data.password,
      };

      if (data.orgId && data.orgId.trim() !== '') {
        signupBody.org_id = parseInt(data.orgId.trim(), 10);
      }

      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupBody),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Signup failed');
      }

      toast.success('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/signin');
      }, 2000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Signup failed';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md px-4 py-8">
      <Card className="relative bg-app-surface border-app-border shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-primary items-center justify-center font-bold text-white text-xl shadow-lg mb-2">
            M
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-app-text">
            Create an account
          </h2>
          <p className="text-sm text-app-text-muted">
            Join a workspace and collaborate in real-time
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            id="email"
            type="email"
            placeholder="name@company.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Organization ID (Optional)"
            id="orgId"
            type="text"
            placeholder="Leave empty to register standalone"
            error={errors.orgId?.message}
            {...register('orgId')}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 mt-2"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm text-app-text-muted pt-2">
          Already have an account?{' '}
          <Link href="/signin" className="text-primary hover:text-primary-hover font-semibold transition-colors">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
