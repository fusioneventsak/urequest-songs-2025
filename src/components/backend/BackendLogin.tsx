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
    localStorage.removeItem('backendAuth');
    localStorage.removeItem('backendUser');
    localStorage.removeItem('backendUserId');
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
          // ✅ Create profile for new user
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              full_name: fullName,
              avatar_url: null,
              role: 'viewer',
              is_active: true,
              last_login_at: new Date().toISOString()
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Don't throw - profile creation failure shouldn't block login
          }

          // ✅ Auto-login user after signup (no email confirmation needed)
          localStorage.setItem('backendAuth', 'true');
          localStorage.setItem('backendUser', email);
          localStorage.setItem('backendUserId', data.user.id);
          setError('');
          setEmail('');
          setPassword('');
          setFullName('');
          setIsSignUp(false);
          // Trigger login callback
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
          // Check if user has admin role
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role, is_active')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            setError('Could not verify user permissions. Please contact an administrator.');
            await supabase.auth.signOut();
            return;
          }

          if (!profileData?.is_active) {
            setError('Your account has been deactivated. Please contact an administrator.');
            await supabase.auth.signOut();
            return;
          }

          // Update last login
          await supabase.rpc('update_last_login', { user_id: data.user.id });

          // Set auth state and trigger callback
          localStorage.setItem('backendAuth', 'true');
          localStorage.setItem('backendUser', email);
          localStorage.setItem('backendUserId', data.user.id);
          onLogin();
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAuth = () => {
    localStorage.removeItem('backendAuth');
    localStorage.removeItem('backendUser');
    localStorage.removeItem('backendUserId');
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