import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Terminal } from 'lucide-react';
import { API_BASE_URL } from '../../config';

const LoginScreen = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // SSO Centralisé via API Scouting
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || "IDENTIFIANTS INCORRECTS.");
      }
    } catch (err) {
      setError("ERREUR DE CONNEXION AU TERMINAL SSO.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#131313] text-white p-6 relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#3cffd0 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {/* Decorative Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#3cffd0]/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] bg-[#2d2d2d] border border-white/10 rounded-[4px] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative z-10"
      >
        {/* Terminal Corner Marker */}
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#3cffd0]/20 rounded-tr-[4px]" />
        
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-[#131313] border border-[#3cffd0]/30 flex items-center justify-center mb-8 shadow-2xl">
            <Terminal className="text-[#3cffd0]" size={32} />
          </div>
          <h1 className="verge-label-mono text-3xl font-black uppercase tracking-tighter mb-2">
            THE ANALYST <span className="text-[#3cffd0]">HUB</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-white/10" />
            <p className="verge-label-mono text-[9px] text-[#949494] font-black uppercase tracking-[0.3em] opacity-50">
              OptaVision Access Terminal
            </p>
            <div className="h-px w-8 bg-white/10" />
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-500/10 border border-red-500/30 text-red-500 px-5 py-4 rounded-[1px] mb-8 verge-label-mono text-[9px] font-black uppercase tracking-widest text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="verge-label-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#949494]">Utilisateur</label>
              <User size={12} className="text-white/20" />
            </div>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ENTER CREDENTIALS..."
              className="w-full bg-[#131313] border border-white/5 rounded-[1px] px-5 py-4 text-white verge-label-mono text-[11px] font-black placeholder:text-white/10 focus:outline-none focus:border-[#3cffd0]/50 transition-all uppercase tracking-widest"
              required 
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="verge-label-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#949494]">Mot de Passe</label>
              <Lock size={12} className="text-white/20" />
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#131313] border border-white/5 rounded-[1px] px-5 py-4 text-white verge-label-mono text-[11px] font-black placeholder:text-white/10 focus:outline-none focus:border-[#3cffd0]/50 transition-all tracking-widest"
              required 
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full group relative flex items-center justify-center py-5 bg-[#3cffd0] hover:bg-[#3cffd0]/90 disabled:bg-[#131313] disabled:text-[#444] transition-all duration-300 rounded-[2px] shadow-[0_20px_40px_rgba(60,255,208,0.2)] active:scale-[0.98]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
            ) : (
              <span className="verge-label-mono text-[12px] font-black uppercase tracking-[0.4em] text-black">
                SE CONNECTER
              </span>
            )}
          </button>
        </form>
        
        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="verge-label-mono text-[8px] text-[#949494] font-black uppercase tracking-[0.2em] opacity-30">
            © 2026 The Analyst Hub // OptaVision Systems
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
