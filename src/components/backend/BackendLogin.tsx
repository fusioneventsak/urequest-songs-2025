import React, { useState, useEffect } from 'react';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface BackendLoginProps {
  onLogin: () => void;
}

export function BackendLogin({ onLogin }: BackendLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');

  // Clear any stale auth state on mount
  useEffect(() => {
    // Clear Supabase session on mount to ensure clean login
    supabase.auth.signOut();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up new user
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'viewer' // New users start as viewers
            },
            emailRedirectTo: undefined // ✅ No email confirmation required
          }
        });

        if (signUpError) throw signUpError;

        if (data?.user) {
          console.log('✅ [Signup] User created and authenticated successfully:', data.user.email);
          
          // ✅ Auto-login user after signup (no email confirmation needed)
          setError('Account created successfully! Logging you in...');
          setEmail('');
          setPassword('');
          setFullName('');
          setIsSignUp(false);
          
          // Navigate to dashboard URL before triggering callback
          console.log('🔄 [Signup] Navigating to dashboard URL...');
          window.history.pushState({}, '', '/dashboard');
          
          // Trigger login callback - Supabase session is now active
          onLogin();
        }
      } else {
        // Sign in existing user
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        if (data?.user) {
          console.log('✅ [Login] User authenticated successfully:', data.user.email);
          
          // Navigate to dashboard URL before triggering callback
          console.log('🔄 [Login] Navigating to dashboard URL...');
          window.history.pushState({}, '', '/dashboard');
          
          // Trigger callback - Supabase session is now active
          onLogin();
        }
      }
    } catch (error) {
      console.error('❌ [AUTH] Authentication error:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('❌ [AUTH] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // Check for specific error types
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
          console.error('🚨 [AUTH] NETWORK ERROR detected');
          console.error('🔍 [AUTH] Possible causes:');
          console.error('  - Network connectivity issues');
          console.error('  - Supabase server unreachable');
          console.error('  - CORS configuration problems');
          console.error('  - Firewall blocking requests');
          setError('Network connection error. Please check your internet connection and try again.');
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link.');
        } else if (error.message.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a moment and try again.');
        } else {
          setError(`Authentication failed: ${error.message}`);
        }
      } else {
        console.error('❌ [AUTH] Unknown error type:', typeof error, error);
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAuth = async () => {
    await supabase.auth.signOut();
    setError('');
    setEmail('');
    setPassword('');
    setFullName('');
  };

  return (
    <div className="min-h-screen bg-darker-purple flex items-center justify-center p-4">
      <div className="glass-effect rounded-lg shadow-xl p-8 max-w-md w-full border border-neon-purple/20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white neon-text mb-2">
            Band Request Hub
          </h1>
          <p className="text-gray-300">
            Please log in to access the backend
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className={`p-3 rounded text-sm flex items-start ${
              error.includes('created') || error.includes('check your email')
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Enter your full name"
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="neon-button w-full flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isSignUp ? 'Creating account...' : 'Logging in...'}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                {isSignUp ? 'Create Account' : 'Log In'}
              </>
            )}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="flex-1 px-4 py-2 text-sm text-gray-400 hover:text-neon-pink transition-colors"
            >
              {isSignUp ? 'Back to login' : 'Create new account'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearAuth}
            className="w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear login data
          </button>
        </form>
      </div>
    </div>
  );
}