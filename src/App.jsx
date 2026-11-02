import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import Toast from './components/Toast';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => db.getCurrentUser());
  const [isDarkMode, setIsDarkMode] = useState(() => db.getTheme() === 'dark');
  const [toasts, setToasts] = useState([]);

  // Synchronize theme with <html> class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Enforce institutional domain policy on active session
  useEffect(() => {
    if (currentUser) {
      const email = (currentUser.email || '').toLowerCase().trim();
      const isStudent = email.endsWith('.ac.in');
      const isFacultyOrAdmin = email.endsWith('gwalior.in');
      if (!isStudent && !isFacultyOrAdmin) {
        db.logout();
        setCurrentUser(null);
        addToast('Access Denied: Only accounts ending in .ac.in (Students) or gwalior.in (Faculty/Admin) are authorized.', 'error', 'Security Policy');
      }
    }
  }, [currentUser]);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    db.setTheme(nextMode ? 'dark' : 'light');
  };

  const addToast = (message, type = 'info', title = '') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    addToast(`Welcome back, ${user.name}!`, 'success', 'Authentication Successful');
  };

  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
    addToast('You have been logged out of MITS Library System.', 'info');
  };

  // Quick switch role (e.g. from Admin to Student or Faculty to test synchronization)
  const handleSwitchRole = (newRole) => {
    if (newRole === 'ADMIN') {
      const adminUser = {
        name: 'Admin',
        title: 'Superuser Access',
        email: 'admin@mitsgwalior.in',
        role: 'ADMIN',
        avatar: 'A'
      };
      db.setCurrentUser(adminUser);
      setCurrentUser(adminUser);
      addToast('Switched to Admin Executive view.', 'info');
    } else if (newRole === 'STUDENT') {
      const studentUser = {
        id: 'STU-001',
        name: 'Ankush Sharma',
        enrollment: '0901IT251014',
        email: 'ankush.it25@mitsgwl.ac.in',
        department: 'Information Technology',
        role: 'STUDENT',
        barcode: 'STU-0901-IT014',
        avatar: '/assets/ankush photo.jpeg'
      };
      db.setCurrentUser(studentUser);
      setCurrentUser(studentUser);
      addToast('Switched to Student Portal view (Ankush Sharma).', 'info');
    } else if (newRole === 'FACULTY') {
      const facultyUser = {
        id: 'FAC-001',
        name: 'Dr. Rajeev Kumar Singh',
        email: 'rajeev.singh@mitsgwalior.in',
        department: 'Information Technology',
        role: 'FACULTY',
        barcode: 'FAC-0901-IT01',
        avatar: '/assets/Dr.Rajeev kumar singh.jpeg'
      };
      db.setCurrentUser(facultyUser);
      setCurrentUser(facultyUser);
      addToast('Switched to Faculty Portal view (Dr. Rajeev Kumar Singh).', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b19] dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Main views based on auth state */}
      {!currentUser ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : currentUser.role === 'ADMIN' ? (
        <AdminDashboard
          user={currentUser}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          notify={addToast}
        />
      ) : (
        <StudentDashboard
          user={currentUser}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          notify={addToast}
        />
      )}
    </div>
  );
}
