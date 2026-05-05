import React from 'react';
import { motion } from 'motion/react';
import { signInWithGoogle } from '../lib/firebase';

interface LoginModalProps {
  onSuccess: () => void;
}

export default function LoginModal({ onSuccess }: LoginModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-white flex items-center justify-center rounded-2xl mb-6 shadow-md border border-zinc-100 overflow-hidden">
            <img src="/logo.png" alt="CAI Manager Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-zinc-900 mb-2">Welcome to CAI Manager</h2>
          <p className="text-zinc-500 mb-8 max-w-xs">Sign in to manage your score sheets, track learner progress, and generate insights.</p>
          
          {error && (
            <div className="w-full bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full relative flex items-center justify-center gap-3 bg-white border border-zinc-200 text-zinc-800 px-4 py-3 rounded-xl font-medium hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  <path d="M1 1h22v22H1z" fill="none"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>
        <div className="bg-zinc-50 p-4 text-center border-t border-zinc-100">
          <p className="text-xs text-zinc-400">By signing in, you agree to our Terms of Service.</p>
        </div>
      </motion.div>
    </div>
  );
}
