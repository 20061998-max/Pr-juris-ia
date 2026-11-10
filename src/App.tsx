import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ChatScreen } from './components/ChatScreen';
import { AdminScreen } from './components/AdminScreen';
import { JurisUser } from './types';
import { testFirestoreConnection } from './firebase';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'chat' | 'admin'>('login');
  const [currentUser, setCurrentUser] = useState<JurisUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [firebaseReady, setFirebaseReady] = useState<boolean>(false);

  // Initialize and verify Firestore on boot
  useEffect(() => {
    testFirestoreConnection()
      .then(() => setFirebaseReady(true))
      .catch(() => setFirebaseReady(false));
  }, []);

  // Restore session from localStorage if present
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('jurisai_user');
      const savedAdmin = localStorage.getItem('jurisai_is_admin');
      if (savedUser) {
        const parsed: JurisUser = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setIsAdmin(savedAdmin === 'true' || parsed.role === 'admin');
        setCurrentScreen('chat');
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleLoginSuccess = (user: JurisUser, adminRole: boolean) => {
    setCurrentUser(user);
    setIsAdmin(adminRole || user.role === 'admin');
    try {
      localStorage.setItem('jurisai_user', JSON.stringify(user));
      localStorage.setItem('jurisai_is_admin', (adminRole || user.role === 'admin') ? 'true' : 'false');
    } catch {
      // Ignore localStorage quotas
    }

    // Admins land on Admin screen first, regular users go straight to chat terminal
    if (adminRole || user.role === 'admin') {
      setCurrentScreen('admin');
    } else {
      setCurrentScreen('chat');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setCurrentScreen('login');
    try {
      localStorage.removeItem('jurisai_user');
      localStorage.removeItem('jurisai_is_admin');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-800 flex items-center justify-center p-3 sm:p-5 selection:bg-[#dfb76c] selection:text-[#122232]">
      {currentScreen === 'login' && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentScreen === 'chat' && currentUser && (
        <ChatScreen
          currentUser={currentUser}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onNavigateToAdmin={() => setCurrentScreen('admin')}
        />
      )}

      {currentScreen === 'admin' && (
        <AdminScreen
          onBackToChat={() => {
            if (!currentUser) {
              setCurrentUser({
                id: 'usr-admin-1',
                name: 'Administrador JurisAI Pro',
                cpf: '124.806.709-61',
                email: 'admin@jurisai.pro',
                role: 'admin',
                status: 'active',
                licenseType: 'enterprise',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                daysLeft: 9999,
              });
            }
            setCurrentScreen('chat');
          }}
          onLogout={handleLogout}
        />
      )}
      {/* Firebase Status Badge */}
      <div className="fixed bottom-2 right-2 text-[10px] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5 text-slate-500 z-50">
        <span className={`w-2 h-2 rounded-full ${firebaseReady ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
        <span>Firebase: <strong className="text-slate-700">jurisai-pro-8eff3</strong></span>
      </div>
    </div>
  );
}
