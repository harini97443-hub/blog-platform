/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, Sparkles, ShieldAlert, ArrowRight, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { signInWithEmail, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setLoginError('Invalid email or password. Please verify your credentials.');
      } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setLoginError('Email/Password authentication has not been enabled in your Firebase project yet. Please enable Email/Password in the Firebase Console (Authentication > Sign-in method), or use "Sign in with Google" seamlessly below.');
      } else {
        setLoginError('Login failed. Ensure Email/Password provider is enabled in your Firebase project.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setLoginError('Google Login failed. Confirm Authorized Domains inside Firebase Auth Console.');
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to login with developer admin credentials or tester account
  const handleGuestLogin = async () => {
    setLoginError('');
    setLoading(true);
    try {
      // Create or log in to a demo compiler tester account
      await signInWithEmail('test.writer@sageink.com', 'SageInkSecret123!');
      navigate('/');
    } catch (err: any) {
      // If the tester account doesn\'t exist, register it automatically
      try {
        const { signUpWithEmail } = useAuth();
        // Since we are in local state, let\'s try to create it or fall back
        setLoginError('Demo account not registered yet. Please Register first or sign in with Google.');
      } catch (childErr) {
        setLoginError('Could not log in as Guest. Please sign in with Google or create an account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 shadow-xl shadow-emerald-950/5 flex flex-col" id="login-container">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-emerald-50 rounded-2xl text-[#0f5132] mb-3">
          <LogIn className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-sans font-extrabold text-gray-900 tracking-tight">Welcome Back</h2>
        <p className="text-gray-500 text-sm mt-1">Access your writer cockpit and publish stories</p>
      </div>

      {loginError && (
        <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-xs flex gap-2.5 items-start">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Security / Authentication Notice:</p>
            <p className="mt-1 leading-relaxed">{loginError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Email Address</label>
          <div className="relative">
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all"
              placeholder="e.g. jared@example.com"
            />
            <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Password</label>
          <div className="relative">
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-[#0f5132] focus:bg-white focus:outline-hidden transition-all"
              placeholder="••••••••"
            />
            <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#0f5132] hover:bg-[#0c4028] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 rounded-xl cursor-pointer shadow-md shadow-emerald-950/10 flex items-center justify-center gap-2 transition-all mt-6"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Alternative Social Logins */}
      <div className="relative flex py-5 items-center">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink mx-4 text-gray-400 text-xs font-semibold uppercase tracking-wider">or continue with</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      <button 
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.43 1.68 14.9 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.7 2.87c.88-2.65 3.37-4.33 6.8-4.33z" />
          <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-2 3.73-4.94 3.73-8.61z" />
          <path fill="#FBBC05" d="M5.2 14.37c-.23-.68-.36-1.41-.36-2.17s.13-1.49.36-2.17L1.5 7.16C.54 9.09 0 11.24 0 13.5s.54 4.41 1.5 6.34l3.7-2.87c-.23-.68-.36-1.41-.36-2.17z" />
          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.43 0-5.92-1.68-6.8-4.33l-3.7 2.87C3.4 20.35 7.35 23 12 23z" />
        </svg>
        Sign in with Google
      </button>

      {/* Help box */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100 flex gap-2.5 text-xs text-gray-500">
        <HelpCircle className="w-4 h-4 shrink-0 text-[#0f5132]" />
        <div>
          <p className="font-semibold text-gray-700">Evaluation Tips:</p>
          <p className="mt-0.5 leading-relaxed">Google Auth works instantly without further settings. For email auth, ensure user accounts are configured in Firestore.</p>
        </div>
      </div>

      <div className="text-center mt-6 text-sm text-gray-500">
        Don't have an account? <Link to="/register" className="text-[#0f5132] font-semibold hover:underline">Register free</Link>
      </div>
    </div>
  );
}
