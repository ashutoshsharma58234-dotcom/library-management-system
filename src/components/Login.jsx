import React, { useState } from 'react';
import { Lock, Mail, Shield, GraduationCap, ArrowRight, Check, AlertCircle, UserPlus, KeyRound, Phone, School, IdCard, Sparkles } from 'lucide-react';
import { db } from '../services/db';

export default function Login({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'register'
  const [showDirectLogin, setShowDirectLogin] = useState(false);
  const [roleTab, setRoleTab] = useState('student'); // 'student' | 'admin' | 'faculty'

  // Sign in states
  const [studentInput, setStudentInput] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@mitsgwalior.in');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [facultyEmail, setFacultyEmail] = useState('rajeev.singh@mitsgwalior.in');

  // Registration states (New Student Register through College Email)
  const [regData, setRegData] = useState({
    name: '',
    enrollment: '',
    email: '',
    department: 'Information Technology',
    semester: '1st Sem',
    batch: '2025-2029',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Departments list for registration
  const departments = [
    'Information Technology',
    'Computer Science & Engineering',
    'Artificial Intelligence & Data Science',
    'Electronics & Communication Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering'
  ];

  // Quick institute Google accounts
  const googleAccounts = [
    {
      name: 'Dr. R. K. Singh',
      email: 'admin@mitsgwalior.in',
      role: 'ADMIN',
      desc: 'Central Library Superuser / Administrator (gwalior.in)',
      avatar: '/assets/Dr.Rajeev kumar singh.jpeg'
    },
    {
      name: 'Dr. Rajeev Kumar Singh',
      email: 'rajeev.singh@mitsgwalior.in',
      role: 'FACULTY',
      desc: 'Faculty • Head of IT Department (gwalior.in)',
      avatar: '/assets/Dr.Rajeev kumar singh.jpeg'
    },
    {
      name: 'Prof. Rajesh Verma',
      email: 'r.verma@mitsgwalior.in',
      role: 'FACULTY',
      desc: 'Faculty • Information Technology Department (gwalior.in)',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
    },
    {
      name: 'Ankush Sharma',
      email: 'ankush.it25@mitsgwl.ac.in',
      role: 'STUDENT',
      desc: 'Enrollment: 0901IT251014 • IT (2025-2029) (.ac.in)',
      avatar: '/assets/ankush photo.jpeg'
    },
    {
      name: 'Deepesh Kushwah',
      email: 'deepesh.it25@mitsgwl.ac.in',
      role: 'STUDENT',
      desc: 'Enrollment: 0901IT251028 • IT (2025-2029) (.ac.in)',
      avatar: '/assets/deepesh photo.jpeg'
    },
    {
      name: 'Priya Patel',
      email: 'priya.ec23@mitsgwl.ac.in',
      role: 'STUDENT',
      desc: 'Enrollment: 0901EC231042 • ECE (.ac.in)',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
    },
    {
      name: 'Alex Rivera',
      email: 'alex.cs24@mitsgwl.ac.in',
      role: 'STUDENT',
      desc: 'Enrollment: 0901CS241005 • CSE (.ac.in)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    }
  ];

  // Custom Google SSO email test
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleError, setCustomGoogleError] = useState('');

  // Handle Student Registration with College Email
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const email = regData.email.trim().toLowerCase();

    // 1. Strict institutional verification: Students MUST end in .ac.in
    if (!email.endsWith('.ac.in')) {
      setErrorMsg('Access Denied: Student registration requires an official college email ending in ".ac.in" (e.g. yourname@mitsgwl.ac.in). Other email domains are strictly blocked.');
      setLoading(false);
      return;
    }

    // 2. Validate passwords
    if (regData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (regData.password !== regData.confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      setLoading(false);
      return;
    }

    // 3. Register in Supabase / Database
    try {
      const newUserSession = await db.registerStudent({
        name: regData.name,
        enrollment: regData.enrollment,
        email: regData.email,
        department: regData.department,
        semester: regData.semester,
        batch: regData.batch,
        phone: regData.phone,
        password: regData.password
      });

      setSuccessMsg(`Registration successful! Digital Pass ${newUserSession.barcode} generated.`);
      setTimeout(() => {
        onLoginSuccess(newUserSession);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  // Handle Student Sign In
  const handleStudentSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const input = studentInput.trim().toLowerCase();

    // Strict domain check if user entered an email
    if (input.includes('@') && !input.endsWith('.ac.in')) {
      setErrorMsg('Access Denied: Student login requires a college email ending in ".ac.in" (e.g. student@mitsgwl.ac.in). Other email domains are not allowed.');
      setLoading(false);
      return;
    }

    try {
      const user = await db.loginStudent(studentInput, studentPassword);
      onLoginSuccess(user);
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  // Handle Admin Sign In
  const handleAdminSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const email = adminEmail.trim().toLowerCase();
    if (!email.endsWith('gwalior.in')) {
      setErrorMsg('Access Denied: Administrator login requires an authorized email ending in "gwalior.in" (e.g. admin@mitsgwalior.in).');
      setLoading(false);
      return;
    }

    try {
      const adminUser = await db.loginAdmin(adminEmail, adminPassword);
      onLoginSuccess(adminUser);
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  // Handle Faculty Sign In
  const handleFacultySignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const email = facultyEmail.trim().toLowerCase();
    if (!email.endsWith('gwalior.in')) {
      setErrorMsg('Access Denied: Faculty login requires an official institutional email ending in "gwalior.in" (e.g. professor@mitsgwalior.in). Other email domains are not allowed.');
      setLoading(false);
      return;
    }

    try {
      const user = await db.loginFaculty(facultyEmail);
      onLoginSuccess(user);
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  // Google SSO Selection
  const handleGoogleSelect = (acc) => {
    setLoading(true);
    setErrorMsg('');
    setShowGoogleModal(false);

    const email = (acc.email || '').toLowerCase().trim();
    const isStudent = email.endsWith('.ac.in');
    const isFacultyOrAdmin = email.endsWith('gwalior.in');

    // Strict validation
    if (!isStudent && !isFacultyOrAdmin) {
      setErrorMsg(`Access Denied: "${email}" is not authorized. Only students (.ac.in) and faculty/admin (gwalior.in) are permitted to log in.`);
      setLoading(false);
      return;
    }

    setTimeout(() => {
      let loggedUser = null;
      if (acc.role === 'ADMIN' || email === 'admin@mitsgwalior.in') {
        loggedUser = {
          name: acc.name || 'Admin',
          title: 'Superuser Access',
          email: acc.email,
          role: 'ADMIN',
          avatar: acc.avatar || 'A'
        };
      } else if (isStudent) {
        const students = db.getStudents();
        const s = students.find(st => st.email.toLowerCase() === acc.email.toLowerCase());
        loggedUser = {
          id: s?.id || 'STU-001',
          name: acc.name,
          enrollment: s?.enrollment || '0901IT251014',
          email: acc.email,
          department: s?.department || 'Information Technology',
          role: 'STUDENT',
          barcode: s?.barcode || 'STU-0901-IT014',
          avatar: acc.avatar
        };
      } else {
        loggedUser = {
          id: 'FAC-001',
          name: acc.name,
          email: acc.email,
          department: 'Information Technology',
          role: 'FACULTY',
          barcode: 'FAC-0901-IT01',
          avatar: acc.avatar
        };
      }
      db.setCurrentUser(loggedUser);
      onLoginSuccess(loggedUser);
    }, 300);
  };

  // Custom Google Email Submit in Modal
  const handleCustomGoogleSubmit = (e) => {
    e.preventDefault();
    setCustomGoogleError('');
    const email = customGoogleEmail.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      setCustomGoogleError('Please enter a valid Google email address.');
      return;
    }

    const isStudent = email.endsWith('.ac.in');
    const isFacultyOrAdmin = email.endsWith('gwalior.in');

    if (!isStudent && !isFacultyOrAdmin) {
      setCustomGoogleError(`Access Denied: "${email}" is not an authorized institutional email. Students must end in ".ac.in" and Faculty must end in "gwalior.in". Personal emails (@gmail.com, etc.) are strictly blocked.`);
      return;
    }

    handleGoogleSelect({
      name: email.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
      email: email,
      role: email === 'admin@mitsgwalior.in' ? 'ADMIN' : isFacultyOrAdmin ? 'FACULTY' : 'STUDENT',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
    });
  };

  return (
    <div className="min-h-screen bg-[#070b19] flex flex-col items-center justify-between p-4 sm:p-6 text-white selection:bg-blue-600">
      {/* Top Institute Badge / Logo */}
      <div className="pt-4 sm:pt-8 flex flex-col items-center text-center">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-blue-500/40 p-1 shadow-[0_0_40px_rgba(59,130,246,0.3)] bg-[#0c142c] overflow-hidden flex items-center justify-center transition-transform hover:scale-105 duration-300">
          <img
            src="/assets/logo.png"
            alt="MITS College Gwalior Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = '<span class="text-xs font-bold text-blue-400 text-center uppercase tracking-wider p-2">MITS GWALIOR<br/>LIBRARY</span>';
            }}
          />
        </div>
      </div>

      {/* Main Central Card */}
      <div className="w-full max-w-lg my-4">
        <div className="bg-[#0f172a]/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-slate-700">
          
          {/* Main Auth Mode Tabs: Sign In vs Student Register */}
          <div className="flex rounded-2xl bg-slate-900/90 p-1 mb-5 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                authMode === 'signin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
                authMode === 'register' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Student Register</span>
            </button>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-white tracking-tight mb-2">
            {authMode === 'signin' ? 'Sign in to your account' : 'Student Registration'}
          </h2>

          {/* Institutional email info banner with strict domain requirements */}
          <div className="text-center mb-5 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs">
            <div className="flex items-center justify-center gap-1.5 text-indigo-300 font-bold mb-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>Strict Institutional Access Only:</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono text-[11px]">
                Students: <strong>*.ac.in</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[11px]">
                Faculty: <strong>*gwalior.in</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px]">
                Admin: <strong>*gwalior.in</strong>
              </span>
            </div>
            <p className="text-[10px] text-rose-300/80 mt-1.5 font-medium">
              ⚠ Personal emails (@gmail.com, etc.) are strictly prohibited.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= MODE 1: STUDENT REGISTRATION ================= */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  placeholder="e.g. Abhishek Sharma"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Enrollment Number *</label>
                  <input
                    type="text"
                    value={regData.enrollment}
                    onChange={(e) => setRegData({ ...regData, enrollment: e.target.value.toUpperCase() })}
                    placeholder="e.g. 0901IT251055"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department *</label>
                  <select
                    value={regData.department}
                    onChange={(e) => setRegData({ ...regData, department: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  College Email Address * <span className="text-blue-400 font-normal">(@mitsgwl.ac.in)</span>
                </label>
                <input
                  type="email"
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  placeholder="yourname.it25@mitsgwl.ac.in"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Must be your official MITS student email ending in @mitsgwl.ac.in
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Semester</label>
                  <select
                    value={regData.semester}
                    onChange={(e) => setRegData({ ...regData, semester: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                  >
                    <option value="1st Sem">1st Semester</option>
                    <option value="2nd Sem">2nd Semester</option>
                    <option value="3rd Sem">3rd Semester</option>
                    <option value="4th Sem">4th Semester</option>
                    <option value="5th Sem">5th Semester</option>
                    <option value="6th Sem">6th Semester</option>
                    <option value="7th Sem">7th Semester</option>
                    <option value="8th Sem">8th Semester</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Batch</label>
                  <input
                    type="text"
                    value={regData.batch}
                    onChange={(e) => setRegData({ ...regData, batch: e.target.value })}
                    placeholder="2025-2029"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Create Password *</label>
                  <input
                    type="password"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    value={regData.confirmPassword}
                    onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-[0.99] mt-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Verifying College Email...' : 'Register & Enter Student Portal'}</span>
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setErrorMsg(''); }}
                  className="text-xs text-blue-400 hover:underline font-semibold"
                >
                  Sign In here
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 2: SIGN IN ================= */}
          {authMode === 'signin' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl border border-indigo-500/50 bg-[#141d38] hover:bg-[#1a2548] text-white font-semibold flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99]"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>

              {/* Direct Role Login Toggle */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowDirectLogin(!showDirectLogin)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4 transition"
                >
                  {showDirectLogin ? 'Hide Manual Login Form' : 'Direct Role / Admin Login Fallback'}
                </button>
              </div>

              {/* Direct Login Form */}
              {showDirectLogin && (
                <div className="pt-4 border-t border-slate-800 animate-fadeIn space-y-3.5">
                  <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-800 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setRoleTab('student')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        roleTab === 'student' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Student Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleTab('admin')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        roleTab === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Admin Portal
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleTab('faculty')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        roleTab === 'faculty' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Faculty
                    </button>
                  </div>

                  {/* Student Sign In Form */}
                  {roleTab === 'student' && (
                    <form onSubmit={handleStudentSignIn} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">College Email or Enrollment Number</label>
                        <input
                          type="text"
                          value={studentInput}
                          onChange={(e) => setStudentInput(e.target.value)}
                          placeholder="e.g. 0901IT251014 or student@mitsgwl.ac.in"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                        <input
                          type="password"
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Default demo: 0901IT251014 (Ankush) or 0901IT251028 (Deepesh)</p>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>{loading ? 'Verifying...' : 'Access Student Dashboard'}</span>
                      </button>
                    </form>
                  )}

                  {/* Admin Sign In Form */}
                  {roleTab === 'admin' && (
                    <form onSubmit={handleAdminSignIn} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Admin Email Address</label>
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@mitsgwalior.in"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Admin Password</label>
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Default admin: admin@mitsgwalior.in / admin123</p>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition"
                      >
                        <Shield className="w-4 h-4" />
                        <span>{loading ? 'Authenticating...' : 'Enter Admin Executive Dashboard'}</span>
                      </button>
                    </form>
                  )}

                  {/* Faculty Sign In Form */}
                  {roleTab === 'faculty' && (
                    <form onSubmit={handleFacultySignIn} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Faculty College Email</label>
                        <input
                          type="email"
                          value={facultyEmail}
                          onChange={(e) => setFacultyEmail(e.target.value)}
                          placeholder="rajeev.singh@mitsgwalior.in"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition"
                      >
                        <span>{loading ? 'Verifying...' : 'Access Faculty Dashboard'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Quick link to register */}
              <div className="text-center pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">New MITS Student? </span>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                  className="text-xs text-indigo-400 hover:underline font-bold"
                >
                  Register with your College Email →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Developed By Section (Matching Image 1) */}
      <div className="w-full max-w-lg pb-6">
        <div className="text-center mb-3">
          <span className="text-[11px] font-bold tracking-widest text-indigo-400 uppercase">
            Developed By
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1: Ankush */}
          <div className="bg-[#0f172a]/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/50 overflow-hidden shrink-0 bg-slate-800">
              <img
                src="/assets/ankush photo.jpeg"
                alt="Ankush Sharma"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">Ankush S...</h4>
              <p className="text-[10px] text-slate-400 truncate mb-1">IT, 2025-2029</p>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center text-[10px] transition cursor-pointer">in</span>
                <span className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center text-[10px] transition cursor-pointer">gh</span>
                <a href="mailto:ankush.it25@mitsgwl.ac.in" title="Email" className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center text-[10px] transition">✉</a>
              </div>
            </div>
          </div>

          {/* Card 2: Deepesh */}
          <div className="bg-[#0f172a]/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/50 overflow-hidden shrink-0 bg-slate-800">
              <img
                src="/assets/deepesh photo.jpeg"
                alt="Deepesh Kushwah"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">Deepesh ...</h4>
              <p className="text-[10px] text-slate-400 truncate mb-1">IT, 2025-2029</p>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center text-[10px] transition cursor-pointer">in</span>
                <span className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center text-[10px] transition cursor-pointer">gh</span>
                <a href="mailto:deepesh.it25@mitsgwl.ac.in" title="Email" className="w-5 h-5 rounded bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center text-[10px] transition">✉</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Account Selector Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111936] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="font-bold text-white text-base">Select Institute Google Account</h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Only verified institutional accounts ending in <span className="text-blue-400 font-mono font-bold">.ac.in</span> (Students) or <span className="text-emerald-400 font-mono font-bold">gwalior.in</span> (Faculty) are permitted:
            </p>

            {/* Custom Google Email Input to test any institutional or non-institutional email */}
            <form onSubmit={handleCustomGoogleSubmit} className="mb-4 p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300">
                Sign in with other Google email:
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => {
                    setCustomGoogleEmail(e.target.value);
                    setCustomGoogleError('');
                  }}
                  placeholder="name@mitsgwl.ac.in or prof@mitsgwalior.in"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 transition"
                >
                  Verify
                </button>
              </div>

              {customGoogleError && (
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-1.5 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
                  <span>{customGoogleError}</span>
                </div>
              )}
            </form>

            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Or select verified demo profile:
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {googleAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGoogleSelect(acc)}
                  className="w-full p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 flex items-center gap-3 text-left transition group"
                >
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white group-hover:text-indigo-400 transition truncate">
                        {acc.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        acc.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : acc.role === 'FACULTY' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {acc.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono truncate">{acc.email}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{acc.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-1 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
