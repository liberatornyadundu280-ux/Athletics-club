import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, authApi } from '@/services/api';
import { initializeFirebase, signInWithGoogle } from '@/services/firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Input';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { cn } from '@/utils/helpers';

// ==================== VALIDATION SCHEMAS ====================
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string(),
  role: z.enum(['athlete', 'coach']),
  terms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const roleOptions: SelectOption[] = [
  { value: 'athlete', label: 'Athlete - I train and compete' },
  { value: 'coach', label: 'Coach - I train athletes' },
];

export function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'athlete',
      terms: false,
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      toast.success('Account created successfully! Welcome to STMS.');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      if (error.message?.includes('Firebase Client SDK')) {
        toast.error('Please use Google sign-in or contact support for email/password registration');
      } else {
        toast.error(error.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    try {
      initializeFirebase();
      await signInWithGoogle();
      toast.success('Welcome to STMS!');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message || 'Google sign-up failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-danger-500', 'bg-danger-500', 'bg-gold-500', 'bg-green-500', 'bg-green-500'];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">Create your account</h1>
        <p className="text-body text-surface-500 dark:text-surface-400 mt-2">
          Join STMS and start managing your training
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Full Name"
          type="text"
          placeholder="John Smith"
          error={errors.name?.message}
          leftIcon={<User className="w-5 h-5" />}
          {...register('name')}
          autoComplete="name"
          disabled={isLoading}
        />

        <Input
          label="Email"
          type="email"
          placeholder="coach@example.com"
          error={errors.email?.message}
          leftIcon={<Mail className="w-5 h-5" />}
          {...register('email')}
          autoComplete="email"
          disabled={isLoading}
        />

        <div className="space-y-2">
          <label className="label">Role</label>
          <Select
            options={roleOptions}
            placeholder="Select your role"
            error={errors.role?.message}
            {...register('role')}
            disabled={isLoading}
          />
        </div>

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Min 12 characters"
          error={errors.password?.message}
          leftIcon={<Lock className="w-5 h-5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-surface-400 hover:text-surface-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
          {...register('password')}
          autoComplete="new-password"
          disabled={isLoading}
        />

        {/* Password strength indicator */}
        {password && (
          <div className="space-y-1.5">
            <div className="flex gap-1" role="progressbar" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={5}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i < strength ? strengthColors[i] : 'bg-surface-200 dark:bg-surface-700'
                  )}
                />
              ))}
            </div>
            <p className="text-caption text-surface-500">Password strength: {strengthLabels[strength]}</p>
          </div>
        )}

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message}
          leftIcon={<Lock className="w-5 h-5" />}
          {...register('confirmPassword')}
          autoComplete="new-password"
          disabled={isLoading}
        />

        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('terms')}
              className="w-4 h-4 mt-0.5 rounded border-surface-300 text-primary-800 focus:ring-2 focus:ring-primary-500"
            />
            <div className="text-body-sm text-surface-600 dark:text-surface-400">
              I agree to the <a href="#" className="text-primary-800 hover:text-primary-700 underline">Terms of Service</a> and <a href="#" className="text-primary-800 hover:text-primary-700 underline">Privacy Policy</a>
            </div>
          </label>
          {errors.terms && (
            <p className="form-error">{errors.terms.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Create Account
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-surface-200 dark:border-surface-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white dark:bg-surface-950 px-2 text-surface-500">Or continue with</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full gap-3"
        onClick={handleGoogleRegister}
        loading={googleLoading}
        disabled={isLoading}
        leftIcon={
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        }
      >
        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue with Google'}
      </Button>

      <p className="text-center text-body-sm text-surface-500 dark:text-surface-400">
        Already have an account?{' '}
        <a href="/login" className="text-primary-800 hover:text-primary-700 font-medium">Sign in</a>
      </p>

      <p className="text-center text-caption text-surface-500 dark:text-surface-400">
        By creating an account, you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>
      </p>
    </div>
  );
}