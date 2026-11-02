import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  LogOut,
  Moon,
  Sun,
  User,
  Barcode,
  Sparkles,
  ChevronRight,
  Filter,
  X,
  Shield,
  Layers,
  ArrowRight,
  Printer,
  Copy,
  Check,
  History,
  Trash2,
  Calendar,
  BookMarked,
  Info,
  MapPin,
  RotateCcw
} from 'lucide-react';
import { db } from '../services/db';

export default function StudentDashboard({ user, onLogout, onSwitchRole, isDarkMode, onToggleTheme, notify }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'issued' | 'requests' | 'card'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [issuedSubTab, setIssuedSubTab] = useState('active'); // 'active' | 'history'
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  // Real-time data from db
  const [books, setBooks] = useState(db.getBooks());
  const [transactions, setTransactions] = useState(db.getTransactions());
  const [requests, setRequests] = useState(db.getRequests());

  // Book detail modal for issue request
  const [selectedBook, setSelectedBook] = useState(null);
  const [requestRemarks, setRequestRemarks] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  // Return request modal
  const [returnModalTx, setReturnModalTx] = useState(null);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const refreshData = () => {
    setBooks(db.getBooks());
    setTransactions(db.getTransactions());
    setRequests(db.getRequests());
  };

  useEffect(() => {
    refreshData();
    const unsub = db.subscribe(() => {
      refreshData();
    });
    return unsub;
  }, []);

  // Multi-attribute matching for logged in student/faculty
  const isMatchUser = (itemUserId, itemEnrollment, itemEmail) => {
    if (!user) return false;
    const uid = String(user.id || '').toLowerCase();
    const uenr = String(user.enrollment || '').toLowerCase();
    const uemail = String(user.email || '').toLowerCase();

    const iid = String(itemUserId || '').toLowerCase();
    const ienr = String(itemEnrollment || '').toLowerCase();
    const iemail = String(itemEmail || '').toLowerCase();

    if (uid && (iid === uid || ienr === uid)) return true;
    if (uenr && (ienr === uenr || iid === uenr)) return true;
    if (uemail && (iemail === uemail || iid === uemail)) return true;
    return false;
  };

  // User's active issued books
  const myIssuedBooks = transactions.filter(t =>
    isMatchUser(t.userId, t.userEnrollment, t.userEmail) && (t.status === 'ISSUED' || t.status === 'OVERDUE')
  );

  // User's past returns
  const myReturnedBooks = transactions.filter(t =>
    isMatchUser(t.userId, t.userEnrollment, t.userEmail) && t.status === 'RETURNED'
  );

  // User's online requests
  const myRequests = requests.filter(r =>
    isMatchUser(r.userId, r.userEnrollment, r.userEmail)
  );

  // Pending and approved request counts
  const pendingRequests = myRequests.filter(r => r.status === 'PENDING');
  const approvedRequests = myRequests.filter(r => r.status === 'APPROVED');

  // Filter books in catalog
  const filteredBooks = books.filter(b => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.barcode && b.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || (b.category && b.category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  // Subject categories with counts
  const subjectCategories = [
    { name: 'All Subjects', code: 'ALL', count: books.length },
    { name: 'Science', code: 'Science', count: books.filter(b => b.category === 'Science').length },
    { name: 'Design', code: 'Design', count: books.filter(b => b.category === 'Design').length },
    { name: 'Arts', code: 'Arts', count: books.filter(b => b.category === 'Arts').length },
    { name: 'Commerce', code: 'Commerce', count: books.filter(b => b.category === 'Commerce').length },
    { name: 'Cooking', code: 'Cooking', count: books.filter(b => b.category === 'Cooking').length }
  ];

  const handleOpenBookModal = (book) => {
    setSelectedBook(book);
    setRequestRemarks('');
  };

  const handleOpenReturnModal = (tx) => {
    setReturnModalTx(tx);
    setReturnRemarks('');
  };

  const handleSendIssueRequest = (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    setSubmittingReq(true);

    try {
      db.submitBookRequest({
        userId: user.id || user.enrollment || 'STU-001',
        bookId: selectedBook.id,
        remarks: requestRemarks || 'Needed for university semester coursework.'
      });
      notify(`Online request for "${selectedBook.name}" submitted to Librarian queue!`, 'success');
      setSelectedBook(null);
      refreshData();
      setActiveTab('requests'); // Switch to requests tab to view status
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleSubmitReturnRequest = (e) => {
    e.preventDefault();
    if (!returnModalTx) return;
    setSubmittingReturn(true);

    try {
      db.submitReturnRequest({
        transactionId: returnModalTx.id,
        userId: user?.id || user?.enrollment || 'STU-001',
        remarks: returnRemarks || 'Completed reading textbook.'
      });
      notify(`Book return request for "${returnModalTx.bookName}" submitted! Admin will review and approve.`, 'success');
      setReturnModalTx(null);
      refreshData();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleCancelRequest = (requestId, bookName) => {
    if (!window.confirm(`Are you sure you want to cancel the request for "${bookName}"?`)) return;
    try {
      db.cancelBookRequest(requestId, user?.id);
      notify(`Request for "${bookName}" has been cancelled.`, 'info');
      refreshData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleCopyBarcode = () => {
    const code = user?.barcode || `STU-${user?.enrollment || '0901IT251014'}`;
    navigator.clipboard?.writeText(code);
    setCopiedBarcode(true);
    notify('Barcode number copied to clipboard!', 'success');
    setTimeout(() => setCopiedBarcode(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#070e1e] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ---------------- TOP NAVBAR ---------------- */}
      <header className="sticky top-0 z-30 bg-[#0d162d]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('catalog')}>
            <img
              src="/assets/logo.png"
              alt="MITS Gwalior LMS Logo"
              className="w-9 h-9 rounded-full border border-blue-500/30 object-contain shadow-md shadow-blue-600/20 shrink-0"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                MITS LIBRARY
              </span>
              <span className="text-[10px] text-blue-400 font-bold block -mt-1 uppercase tracking-wider">
                {user?.role === 'FACULTY' ? 'Faculty Portal' : 'Student Portal'}
              </span>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Library Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab('issued')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'issued'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>My Issued Books</span>
              {myIssuedBooks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-[10px] font-bold text-white">
                  {myIssuedBooks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'requests'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>My Requests</span>
              {myRequests.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  approvedRequests.length > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-blue-400 border border-blue-500/30'
                }`}>
                  {myRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('card')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'card'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Digital Card</span>
            </button>
          </nav>
        </div>

        {/* Search bar in header (when catalog is active) */}
        <div className="hidden lg:block w-72 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeTab !== 'catalog') setActiveTab('catalog');
            }}
            placeholder="Search books, authors, subjects..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-blue-500"
          />
        </div>

        {/* Right user profile + actions */}
        <div className="flex items-center gap-3">
          {/* Switch to Admin Quick Access */}
          <button
            onClick={() => onSwitchRole('ADMIN')}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-blue-400 border border-slate-700 transition"
          >
            Switch to Admin Panel
          </button>

          {/* Theme */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Profile pill */}
          <div
            onClick={() => setActiveTab('card')}
            className="flex items-center gap-2 pl-2 border-l border-slate-800 cursor-pointer group"
            title="View Digital Library Card"
          >
            <div className="w-8 h-8 rounded-full border border-blue-500/50 overflow-hidden bg-slate-800 group-hover:border-blue-400 transition">
              <img
                src={user?.avatar || '/assets/ankush photo.jpeg'}
                alt={user?.name || 'User'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
                }}
              />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-white truncate max-w-[120px] group-hover:text-blue-400 transition">
                {user?.name || 'Ankush Sharma'}
              </div>
              <div className="text-[10px] text-blue-400 font-mono">
                {user?.enrollment || '0901IT251014'}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Logout"
            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ---------------- MOBILE NAVIGATION BAR ---------------- */}
      <div className="md:hidden bg-[#0a1124] border-b border-slate-800 px-3 py-2 flex items-center justify-between text-xs font-semibold overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-3 py-1.5 rounded-lg shrink-0 transition flex items-center gap-1.5 ${
            activeTab === 'catalog' ? 'bg-blue-600 text-white' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('issued')}
          className={`px-3 py-1.5 rounded-lg shrink-0 transition flex items-center gap-1.5 ${
            activeTab === 'issued' ? 'bg-blue-600 text-white' : 'text-slate-400'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>Issued ({myIssuedBooks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-3 py-1.5 rounded-lg shrink-0 transition flex items-center gap-1.5 ${
            activeTab === 'requests' ? 'bg-blue-600 text-white' : 'text-slate-400'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Requests ({myRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('card')}
          className={`px-3 py-1.5 rounded-lg shrink-0 transition flex items-center gap-1.5 ${
            activeTab === 'card' ? 'bg-blue-600 text-white' : 'text-slate-400'
          }`}
        >
          <Barcode className="w-3.5 h-3.5" />
          <span>Card</span>
        </button>
      </div>

      {/* ---------------- MAIN BODY ---------------- */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">

        {/* ============================================================== */}
        {/* TAB 1: LIBRARY CATALOG                                          */}
        {/* ============================================================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* MOBILE SEARCH BAR */}
            <div className="lg:hidden relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books, authors, subjects..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
              />
            </div>

            {/* QUICK STATUS REMINDER BANNER */}
            {myIssuedBooks.length > 0 && (
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      You have {myIssuedBooks.length} active book {myIssuedBooks.length === 1 ? 'loan' : 'loans'} in your account
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Track return due dates, penalties, and renewal status in My Issued Books.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('issued')}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shrink-0 transition"
                >
                  View Loans →
                </button>
              </div>
            )}

            {/* SUBJECTS FILTER CHIPS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Subjects Section</span>
                </h3>
                <span className="text-xs text-slate-400">Select domain to filter</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {subjectCategories.map(cat => {
                  const isSelected = selectedCategory === cat.code;
                  return (
                    <button
                      key={cat.code}
                      onClick={() => setSelectedCategory(cat.code)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-lg shadow-amber-400/20 scale-[1.02]'
                          : 'bg-[#0f172a] border-slate-800 hover:border-slate-700 text-white'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{cat.name}</div>
                      <div className={`text-xs mt-1 font-mono ${isSelected ? 'text-slate-900 font-extrabold' : 'text-slate-400'}`}>
                        {cat.count} Titles
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AVAILABLE BOOKS GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Available Library Titles</h3>
                  <p className="text-xs text-slate-400">
                    Click any book to view details, verify shelf rack location, and request issue online
                  </p>
                </div>
                <span className="text-xs font-mono text-blue-400">
                  Showing {filteredBooks.length} Books
                </span>
              </div>

              {filteredBooks.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-slate-800">
                  <Search className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white">No books found matching your query</h4>
                  <p className="text-xs text-slate-400 mt-1">Try searching by title, author, subject, or reset the domain filter.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 transition"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredBooks.map(book => {
                    const inStock = book.availableQuantity > 0;
                    const hasActiveLoan = myIssuedBooks.some(t => t.bookId === book.id);
                    const hasPendingReq = myRequests.some(r => r.bookId === book.id && r.status === 'PENDING');

                    return (
                      <div
                        key={book.id}
                        onClick={() => handleOpenBookModal(book)}
                        className="bg-[#0f172a] border border-slate-800 hover:border-blue-500 rounded-2xl p-3 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                      >
                        <div>
                          <div className="w-full aspect-[2/3] rounded-xl overflow-hidden mb-2.5 bg-slate-800 relative">
                            <img
                              src={book.coverImage}
                              alt={book.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold shadow ${
                              inStock ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            }`}>
                              {inStock ? `${book.availableQuantity} in stock` : 'Out of stock'}
                            </span>

                            {hasActiveLoan && (
                              <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white shadow">
                                Borrowed
                              </span>
                            )}
                            {hasPendingReq && (
                              <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-slate-950 shadow">
                                Requested
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-white truncate" title={book.name}>
                            {book.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">{book.author}</p>
                          <div className="text-[10px] text-blue-400 font-mono mt-0.5">{book.subject}</div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="font-mono text-slate-400">{book.barcode}</span>
                          <span className="text-blue-400 font-bold group-hover:translate-x-0.5 transition">
                            View →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MY ISSUED BOOKS                                          */}
        {/* ============================================================== */}
        {activeTab === 'issued' && (
          <div className="space-y-6">
            {/* Header with stats */}
            <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-blue-400" />
                  <span>My Issued Books & Loan Records</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  View your currently borrowed textbooks, due dates, renewal windows, and return history.
                </p>
              </div>

              {/* Sub-tab switcher */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setIssuedSubTab('active')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    issuedSubTab === 'active' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active Loans ({myIssuedBooks.length})
                </button>
                <button
                  onClick={() => setIssuedSubTab('history')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    issuedSubTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Return History ({myReturnedBooks.length})
                </button>
              </div>
            </div>

            {/* ACTIVE LOANS VIEW */}
            {issuedSubTab === 'active' && (
              <div>
                {myIssuedBooks.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-slate-800 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">No Books Currently Issued</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                        You have zero active book loans. You can borrow up to {user?.maxLimit || 4} textbooks simultaneously from the MITS Central Library.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('catalog')}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition inline-flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Browse Library Catalog & Request Books</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myIssuedBooks.map(tx => {
                      const book = books.find(b => b.id === tx.bookId);
                      const isOverdue = tx.status === 'OVERDUE';

                      return (
                        <div
                          key={tx.id}
                          className={`p-5 rounded-3xl border transition flex flex-col justify-between ${
                            isOverdue
                              ? 'bg-rose-950/20 border-rose-800/60'
                              : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex gap-4">
                            <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-800">
                              <img
                                src={book?.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80'}
                                alt={tx.bookName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block mb-1.5 ${
                                isOverdue
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {isOverdue ? 'Overdue' : 'Active Loan'}
                              </span>
                              <h4 className="text-sm font-bold text-white leading-tight line-clamp-2" title={tx.bookName}>
                                {tx.bookName}
                              </h4>
                              <p className="text-xs text-slate-400 mt-1 truncate">{book?.author || 'Central Library Title'}</p>
                              <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                                <Barcode className="w-3 h-3 text-blue-400" />
                                <span>{tx.bookBarcode}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Issued On:</span>
                              <span className="font-semibold text-white">{tx.issueDate}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Return Due Date:</span>
                              <span className={`font-mono font-bold ${isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
                                {tx.dueDate}
                              </span>
                            </div>

                            {isOverdue && (
                              <div className="p-2 rounded-xl bg-rose-900/30 border border-rose-800/50 flex items-center justify-between text-xs text-rose-300">
                                <span>Accrued Fine:</span>
                                <span className="font-bold font-mono">₹{tx.fineAmount || 190}</span>
                              </div>
                            )}

                            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>Return at Central Library Circulation Desk (Rack {book?.shelf || '1st Floor'})</span>
                            </div>

                            {/* Return Request Status or Action */}
                            <div className="pt-2 border-t border-slate-800">
                              {tx.returnStatus === 'PENDING_ADMIN_REVIEW' ? (
                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                                  <div className="font-bold flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Return Request Pending Admin Review</span>
                                  </div>
                                  <p className="text-[10px] text-slate-300 leading-snug">
                                    Submitted {tx.returnRequestDate}. Awaiting Librarian review. Once approved, you will physically visit the desk to submit the book.
                                  </p>
                                </div>
                              ) : tx.returnStatus === 'APPROVED_VISIT_DESK' ? (
                                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs space-y-1">
                                  <div className="font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Return Request Approved!</span>
                                  </div>
                                  <p className="text-[11px] text-emerald-100 font-medium leading-snug">
                                    Please physically visit the Central Library Circulation Desk (1st Floor) and hand over this physical book copy.
                                  </p>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReturnModal(tx)}
                                  className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Submit Book Return Request</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* RETURN HISTORY VIEW */}
            {issuedSubTab === 'history' && (
              <div>
                {myReturnedBooks.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-slate-800">
                    <History className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-white">No Past Return History</h3>
                    <p className="text-xs text-slate-400 mt-1">Returned books and clearance receipts will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myReturnedBooks.map(tx => (
                      <div
                        key={tx.id}
                        className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{tx.bookName}</h4>
                            <p className="text-slate-400 font-mono text-[11px]">{tx.bookBarcode}</p>
                            <p className="text-slate-400 text-[11px] mt-0.5">
                              Issued: {tx.issueDate} • Returned: {tx.actualReturnDate || 'Returned'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                            Returned • No Dues
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MY REQUESTS                                              */}
        {/* ============================================================== */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-400" />
                  <span>My Online Book Issue Requests</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Track the real-time status of books you requested online. Once approved, pick up your copy at the circulation desk.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('catalog')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Request New Book</span>
              </button>
            </div>

            {/* Workflow steps banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <div>
                  <div className="font-bold text-white">Online Request</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Submit request from library catalog.</div>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <div>
                  <div className="font-bold text-white">Librarian Approval</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Librarian verifies rack stock and reserves book.</div>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <div>
                  <div className="font-bold text-white">Desk Pickup</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Scan your Digital Pass & collect book.</div>
                </div>
              </div>
            </div>

            {myRequests.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-slate-800 space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                  <Send className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">No Online Requests Submitted</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    You haven't requested any books online yet. Browse the central catalog to request titles directly to your account.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition inline-flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Browse Catalog & Request Books</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map(req => {
                  const book = books.find(b => b.id === req.bookId);
                  const isReturn = req.type === 'RETURN';
                  const isPending = req.status === 'PENDING';
                  const isApproved = req.status === 'APPROVED';
                  const isRejected = req.status === 'REJECTED';
                  const isCompleted = req.status === 'COMPLETED';

                  return (
                    <div
                      key={req.id}
                      className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-800">
                          <img
                            src={book?.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80'}
                            alt={req.bookName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : isCompleted
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : isRejected
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {req.status}
                            </span>
                            {isReturn ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                                Book Return Request
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                                Issue Request
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 font-mono">ID: {req.id}</span>
                          </div>

                          <h4 className="text-sm font-bold text-white">{req.bookName}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Author: {book?.author || 'MITS Library'}</p>
                          <p className="text-[11px] text-blue-400 font-mono mt-0.5">
                            Barcode: {req.bookBarcode} • Shelf: {book?.shelf || 'Central Reading Room'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">Requested on: {req.requestDate}</p>

                          {req.remarks && (
                            <p className="text-[11px] text-slate-300 italic mt-1 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800">
                              Remarks: "{req.remarks}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-2 shrink-0 w-full md:w-auto">
                        {isApproved && (
                          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
                            <div className="font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>{isReturn ? 'Return Approved • Visit Library Desk!' : 'Ready for Physical Pickup!'}</span>
                            </div>
                            <p className="text-[11px] text-emerald-200/90 mt-1 max-w-xs">
                              {isReturn
                                ? 'Please physically visit the Central Library Circulation Desk (1st Floor) and hand over the book copy.'
                                : 'Present your Digital Card at the Circulation Desk to collect your book.'}
                            </p>
                          </div>
                        )}

                        {isPending && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{isReturn ? 'Awaiting Librarian Return Review' : 'Under review by Librarian'}</span>
                            </span>
                            {!isReturn && (
                              <button
                                onClick={() => handleCancelRequest(req.id, req.bookName)}
                                className="px-3 py-1.5 rounded-xl border border-rose-500/40 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold transition flex items-center gap-1"
                                title="Cancel Request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                            )}
                          </div>
                        )}

                        {isCompleted && (
                          <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-300 text-xs">
                            <span className="font-bold">Book Received & Verified at Desk</span>
                          </div>
                        )}

                        {isRejected && (
                          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                            <span className="font-bold">Request Rejected:</span>
                            <p className="text-[11px] mt-0.5 text-rose-200/80">
                              {req.rejectionReason || req.remarks || 'Stock reserved or verification required at counter.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: DIGITAL LIBRARY CARD                                     */}
        {/* ============================================================== */}
        {activeTab === 'card' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <Barcode className="w-5 h-5 text-blue-400" />
                <span>MITS Digital Library Identity Pass</span>
              </h2>
              <p className="text-xs text-slate-400">
                Official digital borrower credential for Madhav Institute of Technology & Science, Gwalior
              </p>
            </div>

            {/* High-Fidelity Digital Pass Card */}
            <div className="relative rounded-3xl bg-gradient-to-br from-[#0c142c] via-[#101c3d] to-[#0a0f24] border-2 border-blue-500/40 p-6 sm:p-8 shadow-2xl shadow-blue-900/30 overflow-hidden">
              {/* Background watermark emblem */}
              <div className="absolute -right-8 -bottom-8 w-60 h-60 opacity-5 pointer-events-none">
                <img src="/assets/logo.png" alt="Emblem Watermark" className="w-full h-full object-contain" />
              </div>

              {/* Pass Header */}
              <div className="flex items-center justify-between pb-4 border-b border-blue-500/30">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/logo.png"
                    alt="MITS Logo"
                    className="w-12 h-12 object-contain rounded-full border border-blue-400/50 shadow-md"
                  />
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wider uppercase">
                      MADHAV INSTITUTE OF TECH & SCIENCE
                    </h3>
                    <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">
                      CENTRAL LIBRARY • OFFICIAL DIGITAL PASS
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>ACTIVE</span>
                  </span>
                </div>
              </div>

              {/* Pass Body: User details & Photo */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 my-6">
                <div className="w-24 h-28 rounded-2xl overflow-hidden border-2 border-blue-400/60 shadow-lg bg-slate-800 shrink-0">
                  <img
                    src={user?.avatar || '/assets/ankush photo.jpeg'}
                    alt={user?.name || 'Student'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
                    }}
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="text-lg font-extrabold text-white">
                    {user?.name || 'Ankush Sharma'}
                  </div>
                  <div className="text-xs font-mono text-blue-300 font-semibold">
                    Enrollment: {user?.enrollment || '0901IT251014'}
                  </div>
                  <div className="text-xs text-slate-300">
                    Department: {user?.department || 'Information Technology'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Category: <span className="font-semibold text-white">{user?.role === 'FACULTY' ? 'Faculty Member' : 'Undergraduate Student'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Institute Email: <span className="text-blue-400 font-mono">{user?.email || 'student@mitsgwl.ac.in'}</span>
                  </div>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="p-4 rounded-2xl bg-white text-slate-900 text-center font-mono shadow-inner">
                {/* Visual SVG Barcode bars */}
                <div className="h-12 flex items-center justify-center gap-1 overflow-hidden tracking-widest font-bold select-none">
                  <span className="w-1 h-12 bg-black inline-block"></span>
                  <span className="w-0.5 h-12 bg-black inline-block"></span>
                  <span className="w-2 h-12 bg-black inline-block"></span>
                  <span className="w-1 h-12 bg-black inline-block"></span>
                  <span className="w-0.5 h-12 bg-black inline-block"></span>
                  <span className="w-1.5 h-12 bg-black inline-block"></span>
                  <span className="w-0.5 h-12 bg-black inline-block"></span>
                  <span className="w-2 h-12 bg-black inline-block"></span>
                  <span className="w-1 h-12 bg-black inline-block"></span>
                  <span className="w-0.5 h-12 bg-black inline-block"></span>
                  <span className="w-2 h-12 bg-black inline-block"></span>
                  <span className="w-1 h-12 bg-black inline-block"></span>
                  <span className="w-1.5 h-12 bg-black inline-block"></span>
                  <span className="w-0.5 h-12 bg-black inline-block"></span>
                  <span className="w-2 h-12 bg-black inline-block"></span>
                  <span className="w-1 h-12 bg-black inline-block"></span>
                  <span className="w-0.5 h-12 bg-black inline-block"></span>
                  <span className="w-1.5 h-12 bg-black inline-block"></span>
                  <span className="w-2 h-12 bg-black inline-block"></span>
                  <span className="w-0.5 h-12 bg-black inline-block"></span>
                  <span className="w-1 h-12 bg-black inline-block"></span>
                  <span className="w-2 h-12 bg-black inline-block"></span>
                  <span className="w-0.5 h-12 bg-black inline-block"></span>
                  <span className="w-1 h-12 bg-black inline-block"></span>
                </div>
                <div className="text-xs font-bold tracking-widest mt-1 text-slate-900">
                  {user?.barcode || `STU-${user?.enrollment || '0901IT251014'}`}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-blue-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                <button
                  onClick={handleCopyBarcode}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center gap-2 border border-slate-700 transition"
                >
                  {copiedBarcode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedBarcode ? 'Copied Barcode!' : 'Copy Barcode ID'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Digital Pass</span>
                </button>
              </div>
            </div>

            {/* Library Regulations & Card Guidelines */}
            <div className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                <Info className="w-4 h-4 text-blue-400" />
                <span>MITS Library Borrowing Regulations</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li>Present this digital barcode pass at the circulation desk for instantaneous book checkouts.</li>
                <li>Students can borrow up to <strong className="text-white">4 books</strong> simultaneously for a standard duration of <strong className="text-white">14 days</strong>.</li>
                <li>Faculty members can borrow up to <strong className="text-white">8 books</strong> for <strong className="text-white">30 days</strong>.</li>
                <li>Overdue books incur a fine of <strong className="text-amber-400">₹5 per day</strong> after the due date.</li>
                <li>Email reminders are automatically sent 7 days and 1 day prior to the return due date.</li>
              </ul>
            </div>
          </div>
        )}

      </main>

      {/* ---------------- BOOK DETAIL / ONLINE REQUEST MODAL ---------------- */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  {selectedBook.category}
                </span>
                <span className="text-xs font-mono text-slate-400">{selectedBook.barcode}</span>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-4 my-4">
              <img
                src={selectedBook.coverImage}
                alt={selectedBook.name}
                className="w-24 h-36 rounded-xl object-cover border border-slate-700 shrink-0 shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white leading-tight">{selectedBook.name}</h3>
                <p className="text-xs text-slate-400 mt-1">By {selectedBook.author}</p>
                <p className="text-xs text-slate-300 mt-2 font-mono flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>{selectedBook.shelf || 'Central Reading Room'}</span>
                </p>
                <div className="mt-2 text-xs">
                  <span className={`font-bold ${selectedBook.availableQuantity > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedBook.availableQuantity > 0 ? `${selectedBook.availableQuantity} Copies Available` : 'Out of Stock'}
                  </span>
                  <span className="text-slate-400"> (Total {selectedBook.totalQuantity})</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {selectedBook.description || 'Reference textbook available in central reading section for student and faculty borrowing.'}
            </p>

            {/* Online Issue Request Form */}
            <form onSubmit={handleSendIssueRequest} className="space-y-3 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Purpose / Elective Subject Remarks (Optional):
                </label>
                <input
                  type="text"
                  value={requestRemarks}
                  onChange={(e) => setRequestRemarks(e.target.value)}
                  placeholder="e.g. For semester elective module & project work"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBook(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedBook.availableQuantity <= 0 || submittingReq}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition shadow-lg ${
                    selectedBook.availableQuantity > 0
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                      : 'bg-slate-700 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingReq ? 'Submitting...' : 'Request Book Issue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- BOOK RETURN REQUEST MODAL ---------------- */}
      {returnModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase">
                  Return Book
                </span>
                <span className="text-xs font-mono text-slate-400">{returnModalTx.bookBarcode}</span>
              </div>
              <button
                onClick={() => setReturnModalTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              <h3 className="text-base font-bold text-white">{returnModalTx.bookName}</h3>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Issued Date:</span>
                  <span className="text-white font-medium">{returnModalTx.issueDate}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Return Due Date:</span>
                  <span className="text-amber-400 font-medium font-mono">{returnModalTx.dueDate}</span>
                </div>
                {returnModalTx.fineAmount > 0 && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>Accrued Fine:</span>
                    <span>₹{returnModalTx.fineAmount}</span>
                  </div>
                )}
              </div>

              {/* Workflow notice */}
              <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Two-Step Return Process:</span>
                </p>
                <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-0.5 pl-1">
                  <li>Submit this online return request for Admin review.</li>
                  <li>Once approved, physically visit the Circulation Desk (1st Floor) and hand over the book.</li>
                </ol>
              </div>
            </div>

            <form onSubmit={handleSubmitReturnRequest} className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Return Notes / Condition Remarks (Optional):
                </label>
                <input
                  type="text"
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  placeholder="e.g. Good condition, finished reading course material"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalTx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{submittingReturn ? 'Submitting...' : 'Confirm Return Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
