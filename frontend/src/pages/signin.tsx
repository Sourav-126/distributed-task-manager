import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { setCookie } from '@/utils/cookies';
import { toast } from '@/utils/toast';

const signinSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SigninFormData = z.infer<typeof signinSchema>;

export default function Signin() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
  });

  const onSubmit = async (data: SigninFormData): Promise<void> => {
    setLoading(true);

    try {
      const res = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Authentication failed');
      }

      localStorage.setItem('access_token', body.access_token);
      setCookie('access_token', body.access_token, 1);
      
      const profileRes = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${body.access_token}` }
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        localStorage.setItem('user_profile', JSON.stringify(profile));
        setCookie('user_profile', JSON.stringify(profile), 1);
      }

      toast.success('Successfully logged in!');
      router.push('/');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Login failed';
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
            Welcome back
          </h2>
          <p className="text-sm text-app-text-muted">
            Access your spatial office workspace
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

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 mt-2"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center text-sm text-app-text-muted pt-2">
          New to MetaOffice?{' '}
          <Link href="/signup" className="text-primary hover:text-primary-hover font-semibold transition-colors">
            Create an account
          </Link>
        </div>
      </Card>
    </div>
  );
}
