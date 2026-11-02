import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Scan,
  Globe,
  RotateCcw,
  History,
  Send,
  PlusCircle,
  Users,
  UserCheck,
  FileText,
  Code2,
  LogOut,
  Moon,
  Sun,
  Bell,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Download,
  Filter,
  Trash2,
  Edit,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { db } from '../services/db';
import BarcodeScannerModal from './BarcodeScannerModal';
import BookManageModal from './BookManageModal';
import StudentManageModal from './StudentManageModal';
import ReminderSettingsModal from './ReminderSettingsModal';
import ConfirmModal from './ConfirmModal';

export default function AdminDashboard({ user, onLogout, onSwitchRole, isDarkMode, onToggleTheme, notify }) {
  const [activeTab, setActiveTab] = useState('executive'); // 'executive' | 'catalog' | 'barcode' | 'requests' | 'return' | 'history' | 'reminders' | 'students' | 'faculty' | 'reports' | 'backend'
  
  // Data state
  const [metrics, setMetrics] = useState(db.getExecutiveMetrics());
  const [books, setBooks] = useState(db.getBooks());
  const [students, setStudents] = useState(db.getStudents());
  const [faculty, setFaculty] = useState(db.getFaculty());
  const [transactions, setTransactions] = useState(db.getTransactions());
  const [requests, setRequests] = useState(db.getRequests());
  const [emailLogs, setEmailLogs] = useState(db.getEmailLogs());
  const [settings, setSettings] = useState(db.getSettings());

  // Search & Filter states
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [historyMethodFilter, setHistoryMethodFilter] = useState('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');
  const [requestSubTab, setRequestSubTab] = useState('issue'); // 'issue' | 'return'
  const [selectedBookForHistory, setSelectedBookForHistory] = useState('ALL');

  // Modals state
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
  
  // Confirmation Modal
  const [confirmModalData, setConfirmModalData] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDanger: false,
    action: null
  });

  // Rejection modal
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Copy reserved for university inspection / stock depleted.');

  // Reload data
  const refreshAllData = () => {
    setMetrics(db.getExecutiveMetrics());
    setBooks(db.getBooks());
    setStudents(db.getStudents());
    setFaculty(db.getFaculty());
    setTransactions(db.getTransactions());
    setRequests(db.getRequests());
    setEmailLogs(db.getEmailLogs());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    refreshAllData();
    const unsub = db.subscribe(() => {
      refreshAllData();
    });
    return unsub;
  }, []);

  // Scheduler Trigger (Box 5)
  const handleTriggerScheduler = () => {
    const res = db.triggerAutomatedScheduler();
    notify(
      `Scheduler dispatched: ${res.remindersSent} reminders, ${res.finesApplied} fine notices, ${res.accountsSuspended} suspensions triggered.`,
      'success'
    );
    refreshAllData();
  };

  // Return book handler
  const handleReturnBook = (txId, bookName) => {
    setConfirmModalData({
      isOpen: true,
      title: 'Acknowledge Book Return',
      message: `Confirm physical receipt of "${bookName}". This will increase available library inventory by 1 copy and update borrower records.`,
      confirmText: 'Acknowledge Return',
      isDanger: false,
      action: () => {
        try {
          db.returnBook(txId, user?.name || 'Admin');
          notify(`"${bookName}" successfully restocked into inventory!`, 'success');
          refreshAllData();
        } catch (err) {
          notify(err.message, 'error');
        }
      }
    });
  };

  // Request approval
  const handleAcceptRequest = (requestId, bookName, studentName) => {
    try {
      db.acceptOnlineRequest(requestId, user?.name || 'Admin Superuser');
      notify(`Issue request for "${bookName}" APPROVED for ${studentName}.`, 'success');
      refreshAllData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Request rejection
  const handleConfirmRejectRequest = () => {
    if (!rejectingRequest) return;
    try {
      db.rejectOnlineRequest(rejectingRequest.id, rejectionReason);
      notify(`Request for "${rejectingRequest.bookName}" rejected.`, 'info');
      setRejectingRequest(null);
      refreshAllData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Return Request approval & physical desk confirmation
  const handleApproveReturnRequest = (requestId, bookName, studentName) => {
    try {
      db.approveReturnRequest(requestId, user?.name || 'Admin Superuser');
      notify(`Return request for "${bookName}" APPROVED. Student notified to submit physical book at library desk.`, 'success');
      refreshAllData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleConfirmDeskReturn = (transactionId, bookName, studentName) => {
    try {
      db.confirmPhysicalBookReturn(transactionId, user?.name || 'Admin Superuser');
      notify(`Physical book submission for "${bookName}" confirmed! Stock updated (+1) and return completed.`, 'success');
      refreshAllData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Delete book handler
  const handleDeleteBook = (book) => {
    setConfirmModalData({
      isOpen: true,
      title: 'Delete Book Record',
      message: `Are you sure you want to permanently delete "${book.name}" (Barcode: ${book.barcode})? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      isDanger: true,
      action: () => {
        try {
          db.deleteBook(book.id);
          notify(`"${book.name}" deleted from library collection.`, 'info');
          refreshAllData();
        } catch (err) {
          notify(err.message, 'error');
        }
      }
    });
  };

  // Filtered History
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch =
      tx.bookName.toLowerCase().includes(historySearch.toLowerCase()) ||
      tx.bookBarcode.toLowerCase().includes(historySearch.toLowerCase()) ||
      tx.userName.toLowerCase().includes(historySearch.toLowerCase()) ||
      tx.userEnrollment.toLowerCase().includes(historySearch.toLowerCase()) ||
      tx.id.toLowerCase().includes(historySearch.toLowerCase());

    const matchesStatus = historyStatusFilter === 'ALL' || tx.status === historyStatusFilter;
    const matchesMethod = historyMethodFilter === 'ALL' || tx.issueMethod === historyMethodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Filtered Books Catalog
  const filteredBooks = books.filter(b => {
    const matchesSearch =
      b.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      b.author.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      b.barcode.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      b.subject.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCat = catalogCategoryFilter === 'ALL' || b.category === catalogCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const issueRequestsList = requests.filter(r => r.type !== 'RETURN');
  const returnRequestsList = requests.filter(r => r.type === 'RETURN');
  const pendingIssueRequests = issueRequestsList.filter(r => r.status === 'PENDING');
  const pendingReturnRequests = returnRequestsList.filter(r => r.status === 'PENDING');
  const pendingRequestsList = requests.filter(r => r.status === 'PENDING');
  const currentlyIssuedList = transactions.filter(t => t.status === 'ISSUED' || t.status === 'OVERDUE');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070b19] text-slate-800 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* ---------------- SIDEBAR (Matching Image 2) ---------------- */}
      <aside className="w-full md:w-64 bg-[#11162b] text-slate-300 border-r border-slate-800/80 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-4 sm:p-5 flex items-center gap-3 border-b border-slate-800/80">
          <img
            src="/assets/logo.png"
            alt="MITS Gwalior LMS Logo"
            className="w-10 h-10 rounded-full border border-blue-500/30 object-contain shadow-md shadow-blue-500/20 shrink-0"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <h1 className="font-extrabold text-white text-base tracking-wider truncate">
              LIB-ENTERPRISE
            </h1>
            <p className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
              MITS GWALIOR LMS
            </p>
          </div>
        </div>

        {/* Switch System Mode Dropdown */}
        <div className="p-4 border-b border-slate-800/80">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Switch System Mode
          </label>
          <div className="relative">
            <select
              value="admin"
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'student') onSwitchRole('STUDENT');
                if (val === 'faculty') onSwitchRole('FACULTY');
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white outline-none appearance-none cursor-pointer hover:border-slate-600 pr-8 transition"
            >
              <option value="admin">System Administrator</option>
              <option value="student">Student Portal View</option>
              <option value="faculty">Faculty Portal View</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('executive')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeTab === 'executive'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Executive Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeTab === 'catalog'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Book Catalog</span>
          </button>

          <button
            onClick={() => setIsBarcodeModalOpen(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition group"
          >
            <Scan className="w-4 h-4 text-blue-400 group-hover:scale-110 transition shrink-0" />
            <span>Smart Barcode Issue</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
              activeTab === 'requests'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 shrink-0" />
              <span>Online Requests</span>
            </div>
            {pendingRequestsList.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {pendingRequestsList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('return')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
              activeTab === 'return'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Return Module</span>
            </div>
            {metrics.currentlyIssued > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                {metrics.currentlyIssued}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span>Book History</span>
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeTab === 'reminders'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>Automated Reminders</span>
          </button>

          <button
            onClick={() => {
              setSelectedBookForEdit(null);
              setIsBookModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition group"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition shrink-0" />
            <span>Manage Inventory</span>
          </button>

          <div className="pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3.5">
            Directories & Export
          </div>

          <button
            onClick={() => setIsStudentModalOpen(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Student Management</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Reports & Exports</span>
          </button>

          <button
            onClick={() => setActiveTab('backend')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeTab === 'backend'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Code2 className="w-4 h-4 shrink-0" />
            <span>&lt;/&gt; Backend Architecture</span>
          </button>
        </nav>

        {/* Sidebar Footer info */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-300">System v2.4 (React+Vite)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>MITS Gwalior Central Library</div>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT WRAPPER ---------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header (Matching Image 2) */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0d1326]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
              Admin Executive Dashboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Centralized Circulation, Smart Barcodes & Automated Reminder Operations
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setActiveTab('requests')}
                title="Notifications"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                <Bell className="w-4 h-4" />
                {(metrics.overdueCount > 0 || pendingRequestsList.length > 0) && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                    {metrics.overdueCount + pendingRequestsList.length}
                  </span>
                )}
              </button>
            </div>

            {/* Admin Profile Details */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                A
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  Hi, {user?.name || 'Admin'}
                </div>
                <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 leading-tight">
                  {user?.title || 'Superuser Access'}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ---------------- DASHBOARD MAIN PANELS ---------------- */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* TAB 1: EXECUTIVE DASHBOARD (THE 7 BOXES - MATCHING IMAGE 2) */}
          {activeTab === 'executive' && (
            <div className="space-y-6 animate-fadeIn">
              {/* TOP ROW: 4 HORIZONTAL INFORMATION BOXES (Box 1 to Box 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* BOX 1: STUDENTS */}
                <div
                  onClick={() => setIsStudentModalOpen(true)}
                  className="bg-white dark:bg-[#111936] border border-blue-500/30 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                        BOX 1: STUDENTS
                      </span>
                      <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-blue-500 transition">
                        {metrics.totalStudents}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <UserCheck className="w-3 h-3" />
                      <span>{metrics.activeStudents} Active</span>
                    </span>
                  </div>
                </div>

                {/* BOX 2: TOTAL BOOKS */}
                <div
                  onClick={() => setActiveTab('catalog')}
                  className="bg-white dark:bg-[#111936] border border-cyan-500/30 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-cyan-500 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                        BOX 2: TOTAL BOOKS
                      </span>
                      <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-cyan-500 transition">
                        {books.length}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                      <span>{metrics.availableBooks} Available Copies</span>
                    </span>
                  </div>
                </div>

                {/* BOX 3: BOOK ACTIVITY */}
                <div
                  onClick={() => setActiveTab('history')}
                  className="bg-white dark:bg-[#111936] border border-amber-500/30 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-amber-500 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                        BOX 3: BOOK ACTIVITY
                      </span>
                      <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-amber-500 transition">
                        {metrics.totalTransactions}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                      <History className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Total Transactions Logged
                    </span>
                  </div>
                </div>

                {/* BOX 4: CURRENTLY ISSUED */}
                <div
                  onClick={() => setActiveTab('return')}
                  className="bg-white dark:bg-[#111936] border border-rose-500/30 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-rose-500 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                        BOX 4: CURRENTLY ISSUED
                      </span>
                      <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-rose-500 transition">
                        {metrics.currentlyIssued}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-600/20 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5">
                    {metrics.overdueCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{metrics.overdueCount} Overdue Today</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500">
                        <span>All returns on schedule</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* MIDDLE ROW: BOX 5 & BOX 6 (Matching Image 2) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* BOX 5: AUTOMATED EMAIL & FINE DISPATCHER */}
                <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                    <div className="flex items-center gap-2.5">
                      <Send className="w-5 h-5 text-blue-500" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Box 5: Automated Email & Fine Dispatcher
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTriggerScheduler}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Trigger Scheduler</span>
                      </button>
                      <button
                        onClick={() => setIsReminderSettingsOpen(true)}
                        title="Reminder Configuration"
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                      >
                        <Filter className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="my-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <span>SMTP Status:</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                          {settings.smtpStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Automated triggers: 7-Day & 1-Day Prior Due Reminders
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Total Pending Fines</div>
                      <div className="text-lg font-extrabold text-rose-500 font-mono">
                        ₹{metrics.totalPendingFines.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Recent Logs Table (Matching Image 2) */}
                  <div>
                    <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2.5">
                      Recent Automated Background Dispatch Logs
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                            <th className="pb-2">Recipient</th>
                            <th className="pb-2">Subject / Action</th>
                            <th className="pb-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                          {emailLogs.slice(0, 4).map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                              <td className="py-2.5 font-mono text-slate-600 dark:text-slate-300">
                                {log.recipient}
                              </td>
                              <td className="py-2.5 text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                                {log.action}
                              </td>
                              <td className="py-2.5 text-right">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* BOX 6: SMART BOOK ISSUING HUB */}
                <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Box 6: Smart Book Issuing Hub
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 mb-5">
                      Issue library books securely using real-time physical barcode readers or approve online student reservation queues:
                    </p>

                    {/* Method 1 & Method 2 Cards (Matching Image 2) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Method 1 */}
                      <button
                        type="button"
                        onClick={() => setIsBarcodeModalOpen(true)}
                        className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition text-center group flex flex-col items-center justify-center cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                          <Scan className="w-7 h-7" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition">
                          Method 1
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Physical Barcode Camera Scanner
                        </span>
                      </button>

                      {/* Method 2 */}
                      <button
                        type="button"
                        onClick={() => setActiveTab('requests')}
                        className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition text-center group flex flex-col items-center justify-center cursor-pointer shadow-sm hover:shadow-md relative"
                      >
                        {pendingRequestsList.length > 0 && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-md animate-bounce">
                            {pendingRequestsList.length} Pending
                          </span>
                        )}
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                          <Globe className="w-7 h-7" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition">
                          Method 2
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Online Student Request Queue
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>Borrowing Limits: 4 books (Students), 8 books (Faculty)</span>
                    <span className="font-semibold text-emerald-500">Dual Sync Enabled</span>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: BOX 7: COMPLETE BOOK ISSUING & RETURNING HISTORY */}
              <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                  <div className="flex items-center gap-2.5">
                    <History className="w-5 h-5 text-amber-500" />
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Box 7: Complete Book Issuing and Returning History
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Search and filter historical transaction records across all library activities
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => db.exportToCSV('transactions')}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="my-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search by book name, barcode, student name, enrollment..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <select
                      value={historyStatusFilter}
                      onChange={(e) => setHistoryStatusFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ISSUED">Currently Issued</option>
                      <option value="OVERDUE">Overdue Notice</option>
                      <option value="RETURNED">Returned</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={historyMethodFilter}
                      onChange={(e) => setHistoryMethodFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                    >
                      <option value="ALL">All Issue Methods</option>
                      <option value="BARCODE">Barcode Scan</option>
                      <option value="ONLINE_REQUEST">Online Request</option>
                    </select>
                  </div>
                </div>

                {/* History Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                        <th className="pb-2.5">TX ID</th>
                        <th className="pb-2.5">Book Details</th>
                        <th className="pb-2.5">Borrower</th>
                        <th className="pb-2.5">Dates (Issue / Due)</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5">Method</th>
                        <th className="pb-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                            No library transactions match your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                            <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {tx.id}
                            </td>
                            <td className="py-3">
                              <div className="font-bold text-slate-900 dark:text-white">{tx.bookName}</div>
                              <div className="text-[11px] font-mono text-blue-500">{tx.bookBarcode}</div>
                            </td>
                            <td className="py-3">
                              <div className="font-semibold text-slate-900 dark:text-white">{tx.userName}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                {tx.userEnrollment} ({tx.userRole})
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="text-slate-700 dark:text-slate-300">Issued: {tx.issueDate}</div>
                              <div className={`text-[11px] font-mono ${tx.status === 'OVERDUE' ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                                Due: {tx.dueDate}
                              </div>
                            </td>
                            <td className="py-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  tx.status === 'OVERDUE'
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                    : tx.status === 'RETURNED'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                }`}
                              >
                                {tx.status} {tx.fineAmount > 0 && `(₹${tx.fineAmount})`}
                              </span>
                            </td>
                            <td className="py-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {tx.issueMethod === 'BARCODE' ? 'Barcode Scan' : 'Online Request'}
                            </td>
                            <td className="py-3 text-right">
                              {tx.status !== 'RETURNED' ? (
                                <button
                                  type="button"
                                  onClick={() => handleReturnBook(tx.id, tx.bookName)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition"
                                >
                                  Process Return
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  Returned ({tx.actualReturnDate})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOOK CATALOG & INVENTORY MANAGEMENT */}
          {activeTab === 'catalog' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Library Book Catalog</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Box 2 Inventory: Total {books.length} Titles ({metrics.totalBooks} Total Copies, {metrics.availableBooks} Available)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => db.exportToCSV('books')}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBookForEdit(null);
                      setIsBookModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add New Book</span>
                  </button>
                </div>
              </div>

              {/* Search & Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search by title, author, barcode (BK-MITS-...), subject..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#111936] border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <select
                    value={catalogCategoryFilter}
                    onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#111936] border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Science">Science & Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Arts">Arts & Literature</option>
                    <option value="Commerce">Commerce & Business</option>
                    <option value="Cooking">Culinary & Nutrition</option>
                  </select>
                </div>
              </div>

              {/* Books Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBooks.map(book => (
                  <div
                    key={book.id}
                    className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all flex gap-3.5 group"
                  >
                    <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      <img src={book.coverImage} alt={book.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                            {book.category}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {book.barcode}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={book.name}>
                          {book.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{book.author}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${book.availableQuantity > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {book.availableQuantity} / {book.totalQuantity}
                          </span>
                          <span className="text-slate-400 text-[10px]">copies</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookForHistory(book.id);
                              setActiveTab('history');
                            }}
                            title="View Complete Book History"
                            className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-600 hover:text-white text-[11px] font-bold flex items-center gap-1 transition"
                          >
                            <History className="w-3 h-3" />
                            <span>History</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookForEdit(book);
                              setIsBookModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition"
                            title="Edit Book"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBook(book)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition"
                            title="Delete Book"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ONLINE REQUESTS QUEUE (ISSUE REQUESTS & RETURN REQUESTS) */}
          {activeTab === 'requests' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Online Requests Queue</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review and approve online book issue requests and student return requests before physical desk collection.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-500 text-xs font-bold">
                    {pendingRequestsList.length} Total Pending Approval
                  </span>
                </div>
              </div>

              {/* Sub-tabs toggle: Issue Requests vs Return Requests */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setRequestSubTab('issue')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    requestSubTab === 'issue'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Online Book Issue Requests</span>
                  {pendingIssueRequests.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] text-white font-bold">
                      {pendingIssueRequests.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRequestSubTab('return')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    requestSubTab === 'return'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Student Book Return Requests</span>
                  {pendingReturnRequests.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-[10px] text-slate-950 font-bold">
                      {pendingReturnRequests.length}
                    </span>
                  )}
                </button>
              </div>

              {/* VIEW 1: ISSUE REQUESTS TABLE */}
              {requestSubTab === 'issue' && (
                <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                          <th className="pb-3">Request ID</th>
                          <th className="pb-3">Student Name</th>
                          <th className="pb-3">Enrollment / Email</th>
                          <th className="pb-3">Requested Book</th>
                          <th className="pb-3">Request Date</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {issueRequestsList.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                              No book issue requests submitted yet.
                            </td>
                          </tr>
                        ) : (
                          issueRequestsList.map(req => {
                            const book = books.find(b => b.id === req.bookId);
                            const isPending = req.status === 'PENDING';
                            const inStock = book && book.availableQuantity > 0;

                            return (
                              <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                                <td className="py-3.5 font-mono text-slate-500 dark:text-slate-400">
                                  {req.id}
                                </td>
                                <td className="py-3.5 font-bold text-slate-900 dark:text-white">
                                  {req.userName}
                                </td>
                                <td className="py-3.5">
                                  <div className="font-mono text-blue-500">{req.userEnrollment}</div>
                                  <div className="text-[11px] text-slate-400">{req.userEmail}</div>
                                </td>
                                <td className="py-3.5">
                                  <div className="font-bold text-slate-900 dark:text-white">{req.bookName}</div>
                                  <div className="text-[11px] font-mono text-slate-400">
                                    {req.bookBarcode} • Stock: {book?.availableQuantity ?? 0}
                                  </div>
                                </td>
                                <td className="py-3.5 text-slate-600 dark:text-slate-300">
                                  {req.requestDate}
                                </td>
                                <td className="py-3.5">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                      req.status === 'APPROVED'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : req.status === 'REJECTED'
                                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    {req.status}
                                  </span>
                                </td>
                                <td className="py-3.5 text-right">
                                  {isPending ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        disabled={!inStock}
                                        onClick={() => handleAcceptRequest(req.id, req.bookName, req.userName)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 transition ${
                                          inStock
                                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                                            : 'bg-slate-700 cursor-not-allowed opacity-50'
                                        }`}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Accept</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRejectingRequest(req);
                                        }}
                                        className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1 transition"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Reject</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">Processed</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2: BOOK RETURN REQUESTS TABLE */}
              {requestSubTab === 'return' && (
                <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 mb-4 text-xs text-indigo-900 dark:text-indigo-300">
                    <p className="font-bold flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Student Return Approval Workflow:</span>
                    </p>
                    <p className="text-[11px] mt-0.5 text-slate-600 dark:text-slate-300">
                      When a student wants to return a book, they submit an online return request. Review and accept it below. Once accepted, the student physically visits the circulation desk to hand in the book. After verifying the book, confirm the physical submission to complete the return and restock inventory (+1).
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                          <th className="pb-3">Return ID</th>
                          <th className="pb-3">Student Name</th>
                          <th className="pb-3">Enrollment / Email</th>
                          <th className="pb-3">Book Title & Barcode</th>
                          <th className="pb-3">Request Date</th>
                          <th className="pb-3">Student Remarks</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {returnRequestsList.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="py-8 text-center text-slate-400 text-xs">
                              No student return requests submitted yet.
                            </td>
                          </tr>
                        ) : (
                          returnRequestsList.map(req => {
                            const isPending = req.status === 'PENDING';
                            const isApproved = req.status === 'APPROVED';
                            const isCompleted = req.status === 'COMPLETED';

                            return (
                              <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                                <td className="py-3.5 font-mono text-slate-500 dark:text-slate-400">
                                  {req.id}
                                </td>
                                <td className="py-3.5 font-bold text-slate-900 dark:text-white">
                                  {req.userName}
                                </td>
                                <td className="py-3.5">
                                  <div className="font-mono text-blue-500">{req.userEnrollment}</div>
                                  <div className="text-[11px] text-slate-400">{req.userEmail}</div>
                                </td>
                                <td className="py-3.5">
                                  <div className="font-bold text-slate-900 dark:text-white">{req.bookName}</div>
                                  <div className="text-[11px] font-mono text-slate-400">{req.bookBarcode}</div>
                                </td>
                                <td className="py-3.5 text-slate-600 dark:text-slate-300">
                                  {req.requestDate}
                                </td>
                                <td className="py-3.5 text-slate-600 dark:text-slate-400 italic">
                                  "{req.remarks || 'Standard book return'}"
                                </td>
                                <td className="py-3.5">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                      isApproved
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : isCompleted
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                        : req.status === 'REJECTED'
                                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    {isApproved ? 'Approved • Visit Desk' : req.status}
                                  </span>
                                </td>
                                <td className="py-3.5 text-right">
                                  {isPending && (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleApproveReturnRequest(req.id, req.bookName, req.userName)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 flex items-center gap-1 transition"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Accept Return Request</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRejectingRequest(req)}
                                        className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}

                                  {isApproved && (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmDeskReturn(req.transactionId, req.bookName, req.userName)}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 flex items-center gap-1.5 ml-auto transition animate-pulse"
                                      title="Student has physically arrived at the desk with the book"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Confirm Physical Book Received</span>
                                    </button>
                                  )}

                                  {isCompleted && (
                                    <span className="text-[11px] text-emerald-500 font-semibold flex items-center justify-end gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Completed at Desk</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RETURN MODULE (BOX 4) */}
          {activeTab === 'return' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Active Issued Books & Return Desk</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Box 4: Total {currentlyIssuedList.length} Books Currently Checked Out ({metrics.overdueCount} Overdue)
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                        <th className="pb-3">Book Title</th>
                        <th className="pb-3">Barcode</th>
                        <th className="pb-3">Borrower Details</th>
                        <th className="pb-3">Issue Date</th>
                        <th className="pb-3">Due Date</th>
                        <th className="pb-3">Overdue Penalty</th>
                        <th className="pb-3 text-right">Return Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {currentlyIssuedList.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                            No books are currently issued. All library inventory is in stock!
                          </td>
                        </tr>
                      ) : (
                        currentlyIssuedList.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                            <td className="py-3.5 font-bold text-slate-900 dark:text-white">
                              {tx.bookName}
                            </td>
                            <td className="py-3.5 font-mono text-blue-500">
                              {tx.bookBarcode}
                            </td>
                            <td className="py-3.5">
                              <div className="font-semibold text-slate-900 dark:text-white">{tx.userName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{tx.userEnrollment}</div>
                            </td>
                            <td className="py-3.5 text-slate-600 dark:text-slate-300">
                              {tx.issueDate}
                            </td>
                            <td className="py-3.5">
                              <span className={`font-mono ${tx.status === 'OVERDUE' ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                {tx.dueDate}
                              </span>
                            </td>
                            <td className="py-3.5">
                              {tx.fineAmount > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  ₹{tx.fineAmount} Fine
                                </span>
                              ) : (
                                <span className="text-[11px] text-emerald-500">On Schedule</span>
                              )}
                            </td>
                            <td className="py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleReturnBook(tx.id, tx.bookName)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 ml-auto transition active:scale-95"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Acknowledge Return</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BOOK HISTORY (COMPLETE ISSUING & RETURNING LIFECYCLE) */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-6 h-6 text-blue-500" />
                    <span>Book History — Complete Issuing & Returning Records</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Track the complete circulation lifecycle of any book: total times issued, issue and return dates, and borrower student details.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => db.exportToCSV('transactions')}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export History CSV</span>
                  </button>
                </div>
              </div>

              {/* Book Selector Bar */}
              <div className="p-4 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span>Select Book to Inspect:</span>
                  </label>
                  <select
                    value={selectedBookForHistory}
                    onChange={(e) => setSelectedBookForHistory(e.target.value)}
                    className="w-full sm:max-w-xl px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">📚 All Books Overview & Master Circulation Ledger</option>
                    {books.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Barcode: {b.barcode} • {b.author})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedBookForHistory !== 'ALL' && (
                  <button
                    onClick={() => setSelectedBookForHistory('ALL')}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap"
                  >
                    ← All Books Overview
                  </button>
                )}
              </div>

              {/* CASE 1: SPECIFIC BOOK HISTORY VIEW */}
              {selectedBookForHistory !== 'ALL' && (() => {
                const bookHistory = db.getBookHistory(selectedBookForHistory);
                const book = bookHistory.book;
                const bookTxs = bookHistory.transactions || [];

                return (
                  <div className="space-y-6">
                    {/* Book Profile & Metrics Card */}
                    <div className="p-6 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-0.5 shrink-0 shadow-md flex items-center justify-center overflow-hidden">
                            {book?.coverImage ? (
                              <img src={book.coverImage} alt={book?.name} className="w-full h-full object-cover rounded-[10px]" />
                            ) : (
                              <BookOpen className="w-8 h-8 text-white/80" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
                                Barcode: {book?.barcode}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {book?.subject || 'Engineering'}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                Shelf: {book?.shelf || 'Central Rack'}
                              </span>
                            </div>
                            <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                              {book?.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              By <span className="font-semibold text-slate-700 dark:text-slate-200">{book?.author}</span> • ISBN: {book?.isbn || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Inventory Status badge */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inventory Status</span>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {book?.availableQuantity} Available / {book?.totalQuantity} Total Copies
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4 History KPI Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                            {bookHistory.totalIssues}
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                            Total Times Issued
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Lifetime circulation count
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                            {bookHistory.activeLoans}
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                            Currently On Loan
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Active student checkouts
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {bookHistory.totalReturns}
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                            Returned Copies
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Completed circulation returns
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                            {bookHistory.pendingReturnRequests}
                          </div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                            Pending Desk Returns
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Awaiting student desk visit
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Book Specific Issues & Returns Ledger Table */}
                    <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            Complete Issuing & Returning History for "{book?.name}"
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Detailed record of every student borrower, issue dates, due dates, return dates, and receipt status
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {bookTxs.length} Total Records
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                              <th className="pb-3">Student / Borrower Details</th>
                              <th className="pb-3">Issue Date</th>
                              <th className="pb-3">Due Date</th>
                              <th className="pb-3">Return Date & Lifecycle</th>
                              <th className="pb-3">Issue Method</th>
                              <th className="pb-3">Fine / Penalty</th>
                              <th className="pb-3 text-right">Circulation Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {bookTxs.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="py-10 text-center text-slate-400">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <History className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                    <span className="font-semibold text-sm">No circulation history for this book yet</span>
                                    <span className="text-xs text-slate-400">All copies are in stock in the central library.</span>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              bookTxs.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                                  <td className="py-3.5">
                                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                                      {tx.userName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                      {tx.userEnrollment} • {tx.userRole}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                      {tx.userEmail}
                                    </div>
                                  </td>
                                  <td className="py-3.5">
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{tx.issueDate}</div>
                                    <div className="text-[10px] text-slate-400">Issued by: {tx.issuedBy || 'Librarian'}</div>
                                  </td>
                                  <td className="py-3.5 font-mono">
                                    <span className={tx.status === 'OVERDUE' ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                                      {tx.dueDate}
                                    </span>
                                  </td>
                                  <td className="py-3.5">
                                    {tx.actualReturnDate ? (
                                      <div>
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          Returned: {tx.actualReturnDate}
                                        </span>
                                      </div>
                                    ) : tx.returnStatus === 'APPROVED_VISIT_DESK' ? (
                                      <div>
                                        <span className="font-semibold text-amber-500 flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5" />
                                          Visit Desk Approved
                                        </span>
                                        <span className="text-[10px] text-slate-400">Student visiting desk</span>
                                      </div>
                                    ) : tx.returnStatus === 'PENDING_ADMIN_REVIEW' ? (
                                      <div>
                                        <span className="font-semibold text-blue-500 flex items-center gap-1">
                                          <RotateCcw className="w-3.5 h-3.5" />
                                          Return Requested
                                        </span>
                                        <span className="text-[10px] text-slate-400">Awaiting admin review</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-xs">Active Loan (Not Returned)</span>
                                    )}
                                  </td>
                                  <td className="py-3.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                      {tx.issueMethod}
                                    </span>
                                  </td>
                                  <td className="py-3.5">
                                    {tx.fineAmount > 0 ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                        ₹{tx.fineAmount} {tx.finePaid ? '(Paid)' : '(Unpaid)'}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400">₹0 (No Fine)</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 text-right">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                        tx.status === 'RETURNED'
                                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                          : tx.status === 'OVERDUE'
                                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                          : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                      }`}
                                    >
                                      {tx.status === 'RETURNED' && <CheckCircle2 className="w-3 h-3" />}
                                      {tx.status === 'OVERDUE' && <AlertTriangle className="w-3 h-3" />}
                                      {tx.status === 'ISSUED' && <Clock className="w-3 h-3" />}
                                      <span>{tx.status}</span>
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* CASE 2: ALL BOOKS SUMMARY & GLOBAL CIRCULATION LEDGER */}
              {selectedBookForHistory === 'ALL' && (
                <div className="space-y-6">
                  {/* Global Circulation Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {books.length}
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        Cataloged Book Titles
                      </div>
                      <div className="text-[11px] text-slate-400">Total unique books</div>
                    </div>

                    <div className="p-4 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                        {transactions.length}
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        Total Issues Recorded
                      </div>
                      <div className="text-[11px] text-slate-400">All historical loans</div>
                    </div>

                    <div className="p-4 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-2xl font-black text-amber-500 font-mono">
                        {metrics.currentlyIssued}
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        Active Loans Out
                      </div>
                      <div className="text-[11px] text-slate-400">Currently with borrowers</div>
                    </div>

                    <div className="p-4 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-2xl font-black text-emerald-500 font-mono">
                        {transactions.filter(t => t.status === 'RETURNED').length}
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        Completed Returns
                      </div>
                      <div className="text-[11px] text-slate-400">Returned to circulation</div>
                    </div>
                  </div>

                  {/* SECTION 1: BOOKS CIRCULATION FREQUENCY & METRICS TABLE */}
                  <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-500" />
                          <span>Books Circulation Frequency & Total Issues History</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Select any book below to view its complete historical records, dates, and student borrower details.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                            <th className="pb-3">Book Title & Author</th>
                            <th className="pb-3">Barcode</th>
                            <th className="pb-3">Stock / Available</th>
                            <th className="pb-3 text-center">Total Times Issued</th>
                            <th className="pb-3 text-center">Currently Issued</th>
                            <th className="pb-3 text-center">Total Returns</th>
                            <th className="pb-3 text-right">Book History Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {db.getAllBooksHistorySummary().map(bookItem => (
                            <tr key={bookItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                              <td className="py-3.5">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {bookItem.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {bookItem.author} • {bookItem.subject}
                                </div>
                              </td>
                              <td className="py-3.5 font-mono text-blue-500 font-semibold">
                                {bookItem.barcode}
                              </td>
                              <td className="py-3.5">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {bookItem.availableQuantity} / {bookItem.totalQuantity}
                                </span>
                              </td>
                              <td className="py-3.5 text-center">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                                  {bookItem.totalIssuedCount} times
                                </span>
                              </td>
                              <td className="py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  bookItem.activeLoansCount > 0
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'text-slate-400'
                                }`}>
                                  {bookItem.activeLoansCount} active
                                </span>
                              </td>
                              <td className="py-3.5 text-center">
                                <span className="text-slate-700 dark:text-slate-300 font-mono">
                                  {bookItem.returnedCount}
                                </span>
                              </td>
                              <td className="py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedBookForHistory(bookItem.id)}
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 ml-auto transition shadow-sm active:scale-95"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span>View Book History</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SECTION 2: MASTER ISSUING & RETURNING CHRONOLOGICAL LOGS */}
                  <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <History className="w-4 h-4 text-amber-500" />
                          <span>Global Issuing & Returning Ledger</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Real-time chronological log of all past and current book transactions across students and faculty
                        </p>
                      </div>
                    </div>

                    {/* Filter and Search */}
                    <div className="my-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search by book name, barcode, student name, enrollment..."
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <select
                          value={historyStatusFilter}
                          onChange={(e) => setHistoryStatusFilter(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="ISSUED">Currently Issued</option>
                          <option value="OVERDUE">Overdue Notice</option>
                          <option value="RETURNED">Returned</option>
                        </select>
                      </div>
                      <div>
                        <select
                          value={historyMethodFilter}
                          onChange={(e) => setHistoryMethodFilter(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                        >
                          <option value="ALL">All Issue Methods</option>
                          <option value="BARCODE">Barcode Scan</option>
                          <option value="ONLINE_REQUEST">Online Request</option>
                        </select>
                      </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                            <th className="pb-2.5">TX ID</th>
                            <th className="pb-2.5">Book Details</th>
                            <th className="pb-2.5">Borrower Details</th>
                            <th className="pb-2.5">Issue Date</th>
                            <th className="pb-2.5">Due Date</th>
                            <th className="pb-2.5">Return Date / Status</th>
                            <th className="pb-2.5 text-right">Inspect Book</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {filteredTransactions.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                                No transaction records match your search criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredTransactions.map(tx => (
                              <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                                <td className="py-3 font-mono text-slate-500 text-[11px] font-bold">
                                  {tx.id}
                                </td>
                                <td className="py-3">
                                  <div className="font-bold text-slate-900 dark:text-white">{tx.bookName}</div>
                                  <div className="text-[11px] font-mono text-blue-500">{tx.bookBarcode}</div>
                                </td>
                                <td className="py-3">
                                  <div className="font-semibold text-slate-900 dark:text-white">{tx.userName}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">{tx.userEnrollment} • {tx.userRole}</div>
                                </td>
                                <td className="py-3 text-slate-700 dark:text-slate-300">
                                  {tx.issueDate}
                                </td>
                                <td className="py-3 font-mono">
                                  <span className={tx.status === 'OVERDUE' ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                                    {tx.dueDate}
                                  </span>
                                </td>
                                <td className="py-3">
                                  {tx.actualReturnDate ? (
                                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      {tx.actualReturnDate}
                                    </span>
                                  ) : tx.returnStatus === 'APPROVED_VISIT_DESK' ? (
                                    <span className="text-amber-500 font-semibold flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      Desk Visit Approved
                                    </span>
                                  ) : tx.returnStatus === 'PENDING_ADMIN_REVIEW' ? (
                                    <span className="text-blue-500 font-semibold flex items-center gap-1">
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      Return Requested
                                    </span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      tx.status === 'OVERDUE'
                                        ? 'bg-rose-500/20 text-rose-400'
                                        : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                      {tx.status}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBookForHistory(tx.bookId);
                                    }}
                                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 transition"
                                  >
                                    <History className="w-3 h-3 text-blue-500" />
                                    <span>History</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: AUTOMATED REMINDERS */}
          {activeTab === 'reminders' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Send className="w-6 h-6 text-blue-500" />
                    <span>Automated Email Reminders & Fine Scheduler</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automated background email dispatches for 7-Day prior reminders, 1-Day final warnings, and overdue fine notices.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTriggerScheduler}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Dispatcher Now</span>
                  </button>
                  <button
                    onClick={() => setIsReminderSettingsOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Configure Rules</span>
                  </button>
                </div>
              </div>

              {/* Status and Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">SMTP Service Gateway</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">{settings.smtpStatus}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Host: {settings.smtpHost}:{settings.smtpPort}</div>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dispatch Logs</div>
                  <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{emailLogs.length}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Automated student notices</div>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pending Fines</div>
                  <div className="mt-2 text-2xl font-black text-rose-500 font-mono">₹{metrics.totalPendingFines.toFixed(2)}</div>
                  <div className="text-[11px] text-slate-400 mt-1">From {metrics.overdueCount} overdue loans</div>
                </div>
              </div>

              {/* Full Dispatch Logs Table */}
              <div className="bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden">
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-3">All Automated Notification Logs</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                        <th className="pb-2.5">Timestamp</th>
                        <th className="pb-2.5">Recipient</th>
                        <th className="pb-2.5">Student / Borrower</th>
                        <th className="pb-2.5">Book Title</th>
                        <th className="pb-2.5">Action / Subject</th>
                        <th className="pb-2.5 text-right">Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {emailLogs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">No automated reminder emails logged yet.</td>
                        </tr>
                      ) : (
                        emailLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                            <td className="py-3 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                            <td className="py-3 font-mono text-slate-700 dark:text-slate-300">{log.recipient}</td>
                            <td className="py-3 font-semibold text-slate-900 dark:text-white">{log.studentName}</td>
                            <td className="py-3 text-slate-800 dark:text-slate-200">{log.bookName}</td>
                            <td className="py-3 text-slate-600 dark:text-slate-300">{log.action}</td>
                            <td className="py-3 text-right">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REPORTS & EXPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Library Reports & Analytical Exports</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Generate and download CSV reports for inventory, circulation metrics, student accounts, and revenue collected.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Full Transaction Ledger</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Export all past and present book issues, returns, barcode numbers, borrower records, and due dates.
                  </p>
                  <button
                    onClick={() => db.exportToCSV('transactions')}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Transactions CSV</span>
                  </button>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Books & Inventory Catalog</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Export complete library collection with author names, subjects, barcodes, ISBN, total stock, and available copies.
                  </p>
                  <button
                    onClick={() => db.exportToCSV('books')}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Books CSV</span>
                  </button>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Student Registration Report</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Export student list with enrollment numbers, departments, active borrowing count, and outstanding penalties.
                  </p>
                  <button
                    onClick={() => db.exportToCSV('students')}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Students CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BACKEND ARCHITECTURE & STATUS */}
          {activeTab === 'backend' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#111936] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Supabase Cloud Backend & Database Architecture</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Production PostgreSQL • Supabase Auth • Realtime Subscriptions • Storage Buckets</p>
                  </div>
                </div>

                {/* Cloud Project Connection Badge */}
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-bold text-white text-sm">Supabase Backend Connected (Live)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">ap-south-1 (Mumbai)</span>
                    </div>
                    <p className="text-slate-400 font-mono text-[11px]">
                      Project ID: <span className="text-indigo-300 font-bold">hdfgzqnhwljcnddbtllw</span> • Name: <span className="text-white">mits-library-management</span>
                    </p>
                    <p className="text-slate-400 font-mono text-[11px]">
                      API Gateway: <span className="text-blue-400">https://hdfgzqnhwljcnddbtllw.supabase.co</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      db.syncFromSupabase();
                      notify('Synchronized with live Supabase PostgreSQL tables!', 'success');
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sync Live Tables</span>
                  </button>
                </div>

                {/* 9 PostgreSQL Tables Grid */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    9 Connected PostgreSQL Tables (with Row-Level Security Enabled)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400">public.profiles</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">RLS ON • {students.length + faculty.length + 1} rows</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400">public.books</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">RLS ON • {books.length} titles</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400">public.book_issues</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">RLS ON • {transactions.length} rows</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400">public.book_issue_requests</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">RLS ON • {requests.length} rows</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400">public.penalties</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">RLS ON • Active</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400">public.email_reminders</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">RLS ON • {emailLogs.length} logs</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400">public.library_settings</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">Singleton Row</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400">public.book_transaction_history</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">RLS ON • Audit Trail</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400">public.admin_audit_logs</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">RLS ON • Sec Log</span>
                    </div>
                  </div>
                </div>

                {/* Storage Buckets & Database Functions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                      <span>Supabase Storage Buckets</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-400 font-mono">
                      <li>• <strong className="text-white">book-covers</strong>: Public Read, Admin Write</li>
                      <li>• <strong className="text-white">profile-images</strong>: Public Read, Auth Write</li>
                      <li>• <strong className="text-white">book-pdfs</strong>: Authenticated Read, Admin Write</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                      <span>PostgreSQL RPC Stored Procedures</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-400 font-mono">
                      <li>• <strong className="text-white">issue_book()</strong>: Atomic Concurrency Lock</li>
                      <li>• <strong className="text-white">return_book()</strong>: Stock Restock & Fine Calc</li>
                      <li>• <strong className="text-white">approve_issue_request()</strong>: Queue Review</li>
                      <li>• <strong className="text-white">process_email_reminders()</strong>: Automated Cron</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ---------------- MODALS ---------------- */}
      {/* 1. Barcode Scanner Modal (Method 1) */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onSuccess={(msg) => {
          notify(msg, 'success');
          refreshAllData();
        }}
      />

      {/* 2. Add / Edit Book Modal (Box 2) */}
      <BookManageModal
        isOpen={isBookModalOpen}
        book={selectedBookForEdit}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={(msg) => {
          notify(msg, 'success');
          refreshAllData();
        }}
      />

      {/* 3. Student Management Modal (Box 1) */}
      <StudentManageModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onRefresh={refreshAllData}
        onNotify={notify}
      />

      {/* 4. Reminder Settings Modal (Box 5) */}
      <ReminderSettingsModal
        isOpen={isReminderSettingsOpen}
        onClose={() => setIsReminderSettingsOpen(false)}
        onRefresh={refreshAllData}
        onNotify={notify}
      />

      {/* 5. Generic Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        confirmText={confirmModalData.confirmText}
        isDanger={confirmModalData.isDanger}
        onConfirm={() => {
          confirmModalData.action?.();
          setConfirmModalData(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModalData(prev => ({ ...prev, isOpen: false }))}
      />

      {/* 6. Online Request Rejection Reason Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111936] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Reject Book Request</h4>
                <p className="text-xs text-slate-400">Provide rejection explanation</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Rejecting request for <strong className="text-white">{rejectingRequest.bookName}</strong> submitted by {rejectingRequest.userName}:
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Rejection *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="2"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectRequest}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
