import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Mail, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/helpers';

type ForgotPasswordStep = 'email' | 'verify' | 'reset' | 'success';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyCodeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const verifyForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = resetForm.watch('password');

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

  const handleEmailSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      // Call API to send reset email
      // await api.post('/auth/forgot-password', data);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Mock API call
      
      setEmail(data.email);
      setStep('verify');
      toast.success('Reset code sent to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (data: VerifyCodeFormData) => {
    setIsLoading(true);
    try {
      // Call API to verify code
      // await api.post('/auth/verify-reset-code', { email, code: data.code });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      
      setStep('reset');
      toast.success('Code verified successfully');
    } catch (error: any) {
      toast.error(error.message || 'Invalid or expired code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      // Call API to reset password
      // await api.post('/auth/reset-password', { email, password: data.password });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      
      setStep('success');
      toast.success('Password reset successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-5" noValidate>
            <Input
              label="Email Address"
              type="email"
              placeholder="coach@example.com"
              error={emailForm.formState.errors.email?.message}
              leftIcon={<Mail className="w-5 h-5" />}
              {...emailForm.register('email')}
              autoComplete="email"
              disabled={isLoading}
            />
            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              Send Reset Code
            </Button>
          </form>
        );

      case 'verify':
        return (
          <div className="space-y-5">
            <p className="text-body text-surface-600 dark:text-surface-400 text-center">
              We sent a 6-digit code to <strong className="text-surface-900 dark:text-surface-100">{email}</strong>
            </p>
            <form onSubmit={verifyForm.handleSubmit(handleVerifySubmit)} className="space-y-5" noValidate>
              <Input
                label="Verification Code"
                type="text"
                placeholder="000000"
                error={verifyForm.formState.errors.code?.message}
                leftIcon={<Lock className="w-5 h-5" />}
                {...verifyForm.register('code')}
                autoComplete="one-time-code"
                disabled={isLoading}
                maxLength={6}
              />
              <Button type="submit" className="w-full" size="lg" loading={isLoading}>
                Verify Code
              </Button>
            </form>
            <p className="text-center text-body-sm text-surface-500">
              Didn't receive the code?{' '}
              <button className="text-primary-800 hover:text-primary-700 font-medium" onClick={() => handleEmailSubmit({ email })}>
                Resend
              </button>
            </p>
          </div>
        );

      case 'reset':
        return (
          <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-5" noValidate>
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 12 characters"
              error={resetForm.formState.errors.password?.message}
              leftIcon={<Lock className="w-5 h-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-surface-400 hover:text-surface-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <AlertCircle className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </button>
              }
              {...resetForm.register('password')}
              autoComplete="new-password"
              disabled={isLoading}
            />

            {/* Password strength */}
            {password && (
              <div className="space-y-1.5">
                <div className="flex gap-1" role="progressbar" aria-valuenow={getPasswordStrength(password)} aria-valuemin={0} aria-valuemax={5}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-colors',
                        i < getPasswordStrength(password) ? strengthColors[i] : 'bg-surface-200 dark:bg-surface-700'
                      )}
                    />
                  ))}
                </div>
                <p className="text-caption text-surface-500">Password strength: {strengthLabels[getPasswordStrength(password)]}</p>
              </div>
            )}

            <Input
              label="Confirm New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your new password"
              error={resetForm.formState.errors.confirmPassword?.message}
              leftIcon={<Lock className="w-5 h-5" />}
              {...resetForm.register('confirmPassword')}
              autoComplete="new-password"
              disabled={isLoading}
            />

            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              Reset Password
            </Button>
          </form>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-heading-md font-bold text-surface-900 dark:text-surface-100">Password Reset Successful</h3>
              <p className="text-body text-surface-500 dark:text-surface-400 mt-2">
                Your password has been updated. You can now sign in with your new password.
              </p>
            </div>
            <Button className="w-full" size="lg" onClick={() => navigate('/login')}>
              Go to Sign In
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="mb-4" leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Sign In
        </Button>
        <h1 className="text-heading-lg font-bold text-surface-900 dark:text-surface-100">
          {step === 'email' ? 'Forgot Password?' : step === 'verify' ? 'Verify Code' : step === 'reset' ? 'Reset Password' : 'All Set!'}
        </h1>
        <p className="text-body text-surface-500 dark:text-surface-400 mt-2">
          {step === 'email' && 'Enter your email to receive a reset code'}
          {step === 'verify' && 'Enter the 6-digit code sent to your email'}
          {step === 'reset' && 'Create a new strong password'}
          {step === 'success' && ''}
        </p>
      </div>

      <div className="card p-6">
        {renderStep()}
      </div>

      {step !== 'success' && (
        <p className="text-center text-body-sm text-surface-500 dark:text-surface-400">
          Remember your password?{' '}
          <a href="/login" className="text-primary-800 hover:text-primary-700 font-medium">Sign in</a>
        </p>
      )}
    </div>
  );
}