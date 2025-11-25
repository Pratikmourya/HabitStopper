import React, { useState, useEffect } from 'react';
import { Check, X, ChevronLeft, ChevronRight, LogOut, Shield } from 'lucide-react';

/**
 * CONFIGURATION
 * Set IS_DEMO_MODE to false to connect to your Node.js backend
 */
const IS_DEMO_MODE = true;

const API_URL = 'http://localhost:5000/api';

const api = {
  login: async () => {
    if (IS_DEMO_MODE) {
      const mockUser = { _id: 'demo-user-123', name: 'Demo User', email: 'demo@habitstopper.com' };
      localStorage.setItem('hs_user', JSON.stringify(mockUser));
      return mockUser;
    }
    window.open('http://localhost:5000/auth/google', '_self');
  },
  logout: async () => {
    if (IS_DEMO_MODE) localStorage.removeItem('hs_user');
    else await fetch(`${API_URL}/auth/logout`);
  },
  getLogs: async (token) => {
    if (IS_DEMO_MODE) return JSON.parse(localStorage.getItem('hs_logs') || '[]');
    const res = await fetch(`${API_URL}/logs`, { headers: { Authorization: `Bearer ${token}` } });
    return res.json();
  },
  addLog: async (token, status, dateStr) => {
    if (IS_DEMO_MODE) {
      const logs = JSON.parse(localStorage.getItem('hs_logs') || '[]');
      const filtered = logs.filter(l => l.date !== dateStr);
      const newLog = { date: dateStr, status };
      const updated = [...filtered, newLog];
      localStorage.setItem('hs_logs', JSON.stringify(updated));
      return newLog;
    }
    const res = await fetch(`${API_URL}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: dateStr, status })
    });
    return res.json();
  }
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const formatDate = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const Header = ({ user, onLogout }) => (
  <header className="flex justify-between items-center p-6 max-w-2xl mx-auto w-full">
    <div className="flex items-center gap-2 text-emerald-600">
      <Shield size={28} strokeWidth={2.5} />
      <span className="font-bold text-xl tracking-tight text-slate-800">HabitStopper</span>
    </div>
    {user && (
      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-slate-500 text-sm">Hello, {user.name.split(' ')[0]}</span>
        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
      </div>
    )}
  </header>
);

const Calendar = ({ logs, currentDate, onMonthChange }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d);
      const log = logs.find(l => l.date === dateStr);
      let statusClass = "bg-slate-100 text-slate-400";
      if (log) {
        if (log.status === 'success') statusClass = "bg-emerald-400 text-white shadow-sm";
        if (log.status === 'failed') statusClass = "bg-slate-300 text-slate-500";
      }
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      const borderClass = isToday ? "ring-2 ring-emerald-200 ring-offset-1" : "";
      days.push(
        <div key={d} className="flex items-center justify-center p-1">
          <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all ${statusClass} ${borderClass}`}>
            {d}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 w-full max-w-md mx-auto mt-8">
      <div className="flex justify-between items-center mb-6 px-2">
        <button onClick={() => onMonthChange(-1)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><ChevronLeft size={20} /></button>
        <h3 className="text-lg font-medium text-slate-700">{monthNames[month]} {year}</h3>
        <button onClick={() => onMonthChange(1)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><ChevronRight size={20} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-xs font-bold text-slate-300 uppercase">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const stored = localStorage.getItem('hs_user');
    if (stored) {
      setUser(JSON.parse(stored));
      setLogs(JSON.parse(localStorage.getItem('hs_logs') || '[]'));
    }
  }, []);

  const handleLogin = async () => {
    const loggedInUser = await api.login();
    setUser(loggedInUser);
    setLogs(JSON.parse(localStorage.getItem('hs_logs') || '[]'));
  };

  const handleLogout = () => { api.logout(); setUser(null); setLogs([]); };

  const handleLogToday = async (status) => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const newLog = { date: todayStr, status };
    setLogs(prev => [...prev.filter(l => l.date !== todayStr), newLog]);
    await api.addLog('dummy-token', status, todayStr);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-800 selection:bg-emerald-100">
      <Header user={user} onLogout={handleLogout} />
      <main className="p-6 flex flex-col items-center">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-fade-in">
            <div className="bg-emerald-100 p-4 rounded-full mb-6 text-emerald-600"><Shield size={48} /></div>
            <h1 className="text-4xl font-light text-slate-800 mb-4">Break the cycle.</h1>
            <button onClick={handleLogin} className="mt-8 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all">Sign in with Google</button>
          </div>
        ) : (
          <div className="w-full max-w-2xl animate-fade-in">
            <div className="text-center py-10">
              <h2 className="text-3xl font-light mb-8 text-slate-700">Did you withstand the urge today?</h2>
              <div className="flex gap-4 justify-center">
                <button onClick={() => handleLogToday('success')} className="bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-lg flex items-center gap-2"><Check /> Yes, I'm clean</button>
                <button onClick={() => handleLogToday('failed')} className="bg-white text-slate-400 border px-8 py-4 rounded-2xl hover:bg-slate-50 flex items-center gap-2"><X /> I slipped up</button>
              </div>
            </div>
            <Calendar logs={logs} currentDate={currentDate} onMonthChange={(d) => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + d)))} />
          </div>
        )}
      </main>
      {IS_DEMO_MODE && <div className="fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs">DEMO MODE</div>}
    </div>
  );
};
export default App;
