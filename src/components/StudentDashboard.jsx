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
  ArrowRight
} from 'lucide-react';
import { db } from '../services/db';

export default function StudentDashboard({ user, onLogout, onSwitchRole, isDarkMode, onToggleTheme, notify }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'issued' | 'requests' | 'card'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time data from db
  const [books, setBooks] = useState(db.getBooks());
  const [transactions, setTransactions] = useState(db.getTransactions());
  const [requests, setRequests] = useState(db.getRequests());

  // Book detail modal for issue request
  const [selectedBook, setSelectedBook] = useState(null);
  const [requestRemarks, setRequestRemarks] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

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

  // Filter books
  const filteredBooks = books.filter(b => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || b.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  // User's active issued books
  const myIssuedBooks = transactions.filter(t => t.userId === user?.id && (t.status === 'ISSUED' || t.status === 'OVERDUE'));
  // User's past returns
  const myReturnedBooks = transactions.filter(t => t.userId === user?.id && t.status === 'RETURNED');
  // User's online requests
  const myRequests = requests.filter(r => r.userId === user?.id);

  // Subject categories with counts matching Image 3 layout
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

  const handleSendIssueRequest = (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    setSubmittingReq(true);

    try {
      db.submitBookRequest({
        userId: user.id || 'STU-001',
        bookId: selectedBook.id,
        remarks: requestRemarks || 'Needed for university semester coursework.'
      });
      notify(`Online request for "${selectedBook.name}" submitted to Librarian queue!`, 'success');
      setSelectedBook(null);
      refreshData();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmittingReq(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070e1e] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ---------------- TOP NAVBAR (Matching Image 3) ---------------- */}
      <header className="sticky top-0 z-30 bg-[#0d162d]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                MITS LIBRARY
              </span>
              <span className="text-[10px] text-blue-400 font-bold block -mt-1 uppercase tracking-wider">
                {user?.role === 'FACULTY' ? 'Faculty Portal' : 'Student Portal'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'catalog' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Library Catalog
            </button>
            <button
              onClick={() => setActiveTab('issued')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'issued' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>My Issued Books</span>
              {myIssuedBooks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-[10px] text-white">
                  {myIssuedBooks.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'requests' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>My Requests</span>
              {myRequests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                  {myRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('card')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                activeTab === 'card' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Digital Card</span>
            </button>
          </nav>
        </div>

        {/* Search bar in header */}
        <div className="hidden lg:block w-72 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Profile pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full border border-blue-500/50 overflow-hidden bg-slate-800">
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
              <div className="text-xs font-bold text-white truncate max-w-[120px]">
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

      {/* ---------------- MAIN BODY ---------------- */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
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

        {/* SECTION 1: PREVIOUS READING / CURRENTLY ISSUED SHELF (Matching Image 3) */}
        {myIssuedBooks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Currently Issued & Reading</span>
              </h3>
              <span className="text-xs text-blue-400 font-semibold">
                {myIssuedBooks.length} Active {myIssuedBooks.length === 1 ? 'Book' : 'Books'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {myIssuedBooks.map(tx => {
                const book = books.find(b => b.id === tx.bookId);
                const isOverdue = tx.status === 'OVERDUE';

                return (
                  <div
                    key={tx.id}
                    className={`p-4 rounded-2xl border flex gap-3.5 items-center transition ${
                      isOverdue
                        ? 'bg-rose-950/30 border-rose-800/60'
                        : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-16 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-800">
                      <img
                        src={book?.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80'}
                        alt={tx.bookName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate" title={tx.bookName}>
                        {tx.bookName}
                      </h4>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        Issued: {tx.issueDate}
                      </div>
                      <div className={`text-[11px] font-mono mt-1 ${isOverdue ? 'text-rose-400 font-bold' : 'text-amber-400'}`}>
                        Due: {tx.dueDate}
                      </div>
                      {isOverdue && (
                        <div className="mt-1 text-[10px] font-bold text-rose-400">
                          Overdue Fine: ₹{tx.fineAmount}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: SUBJECTS SECTION (Matching Image 3 chips) */}
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

        {/* SECTION 3: BOOKS COLLECTION / POPULAR BOOKS (Matching Image 3) */}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredBooks.map(book => {
              const inStock = book.availableQuantity > 0;
              const hasActiveIssue = myIssuedBooks.some(t => t.bookId === book.id);

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
        </div>

        {/* SECTION 4: MY ONLINE REQUESTS (TAB OR ACCORDION) */}
        {myRequests.length > 0 && (
          <div className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              <span>My Submitted Online Issue Requests</span>
            </h3>

            <div className="space-y-2">
              {myRequests.map(req => (
                <div key={req.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-white">{req.bookName}</span>
                    <span className="text-slate-400 font-mono text-[11px] ml-2">({req.bookBarcode})</span>
                    <div className="text-[11px] text-slate-400">Requested on: {req.requestDate}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      req.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : req.status === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {req.status}
                    </span>
                    {req.status === 'APPROVED' && (
                      <div className="text-[10px] text-emerald-400 mt-1">Ready for pickup at counter</div>
                    )}
                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <div className="text-[10px] text-rose-400 mt-1">Reason: {req.rejectionReason}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 5: DIGITAL LIBRARY CARD (TAB: card) */}
        {activeTab === 'card' && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/50 max-w-lg mx-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-blue-800/60 mb-4">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">MADHAV INSTITUTE OF TECHNOLOGY & SCIENCE</span>
                <h4 className="text-base font-extrabold text-white">Digital Library Pass</h4>
              </div>
              <img src="/assets/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>

            <div className="flex items-center gap-4 mb-4">
              <img
                src={user?.avatar || '/assets/ankush photo.jpeg'}
                alt={user?.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-400/50"
              />
              <div>
                <h4 className="text-sm font-bold text-white">{user?.name}</h4>
                <p className="text-xs text-blue-300 font-mono">ID: {user?.enrollment || user?.id}</p>
                <p className="text-xs text-slate-400">{user?.department || 'Information Technology'}</p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">Status: ACTIVE BORROWER</p>
              </div>
            </div>

            {/* Render Barcode graphic */}
            <div className="p-4 rounded-xl bg-white text-slate-900 text-center font-mono">
              <div className="h-10 flex items-center justify-center gap-1 overflow-hidden tracking-widest font-bold">
                || | |||| | ||| || |||| | || |||| | |||
              </div>
              <div className="text-xs font-bold tracking-wider mt-1 text-slate-800">
                {user?.barcode || 'STU-0901-IT014'}
              </div>
            </div>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Present this barcode at the circulation desk for instantaneous book checkouts.
            </p>
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
                <p className="text-xs text-slate-300 mt-2 font-mono">Shelf: {selectedBook.shelf}</p>
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
    </div>
  );
}
