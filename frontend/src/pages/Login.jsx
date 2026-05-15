import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import AnimatedShowcase from '../components/AnimatedShowcase';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { login, register, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    let success;
    if (mode === 'register') {
      success = await register(email, password, name);
    } else {
      success = await login(email, password);
    }
    if (success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative z-10">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-display font-bold mb-3">Notes.app</h1>
          <p className="text-gray-500 mb-10 font-medium text-lg">Your workspace for brilliant ideas.</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-100 font-medium mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'register' && (
              <div>
                <label className="block font-semibold mb-2 text-sm text-gray-700">Display Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block font-semibold mb-2 text-sm text-gray-700">Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-sm text-gray-700">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-blue w-full text-lg mt-8 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (mode === 'register' ? 'Creating account...' : 'Signing In...') : (mode === 'register' ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-100 text-center text-sm text-gray-400 font-medium">
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button onClick={() => setMode('register')} className="text-gray-700 font-semibold hover:underline">
                  Register
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-gray-700 font-semibold hover:underline">
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Animated Showcase */}
      <div className="hidden lg:block lg:w-1/2 border-l border-gray-200">
        <AnimatedShowcase />
      </div>
    </div>
  );
};

export default Login;
