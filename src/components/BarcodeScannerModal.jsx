import React, { useState, useEffect, useRef } from 'react';
import { Scan, BookOpen, User, CheckCircle2, AlertCircle, X, Search, RefreshCw, Sparkles } from 'lucide-react';
import { db } from '../services/db';

export default function BarcodeScannerModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Scan Book, 2: Scan Student, 3: Confirm
  const [bookBarcode, setBookBarcode] = useState('');
  const [studentBarcode, setStudentBarcode] = useState('');
  
  const [identifiedBook, setIdentifiedBook] = useState(null);
  const [identifiedUser, setIdentifiedUser] = useState(null);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [manualInput, setManualInput] = useState('');

  const books = db.getBooks();
  const students = db.getStudents();
  const faculty = db.getFaculty();

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setBookBarcode('');
      setStudentBarcode('');
      setIdentifiedBook(null);
      setIdentifiedUser(null);
      setErrorMsg('');
      setManualInput('');
      setIsScanningActive(true);
    }
  }, [isOpen]);

  // USB Barcode Scanner listener (USB scanners type characters rapidly and end with Enter)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (!isOpen) return;
      const currentTime = Date.now();

      // If typed quickly (under 60ms gap), it's scanner input
      if (currentTime - lastKeyTime > 150) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          processScannedBarcode(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step]);

  const processScannedBarcode = (code) => {
    setErrorMsg('');
    if (step === 1) {
      // Find book
      const foundBook = books.find(b => b.barcode.toLowerCase() === code.toLowerCase() || b.id.toLowerCase() === code.toLowerCase());
      if (!foundBook) {
        setErrorMsg(`No book found matching barcode "${code}".`);
        return;
      }
      if (foundBook.availableQuantity <= 0) {
        setErrorMsg(`"${foundBook.name}" is OUT OF STOCK. Cannot issue.`);
        return;
      }
      setBookBarcode(foundBook.barcode);
      setIdentifiedBook(foundBook);
      setStep(2);
      setManualInput('');
    } else if (step === 2) {
      // Find student or faculty
      let foundUser = students.find(s => s.barcode.toLowerCase() === code.toLowerCase() || s.enrollment.toLowerCase() === code.toLowerCase() || s.id.toLowerCase() === code.toLowerCase());
      if (!foundUser) {
        foundUser = faculty.find(f => f.barcode.toLowerCase() === code.toLowerCase());
      }
      if (!foundUser) {
        setErrorMsg(`No student or faculty found matching Library Card barcode "${code}".`);
        return;
      }
      if (foundUser.status === 'SUSPENDED') {
        setErrorMsg(`Account ${foundUser.name} is SUSPENDED due to past overdue penalties.`);
        return;
      }
      setStudentBarcode(foundUser.barcode || foundUser.enrollment);
      setIdentifiedUser(foundUser);
      setStep(3);
      setManualInput('');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processScannedBarcode(manualInput.trim());
  };

  const handleConfirmIssue = () => {
    try {
      const res = db.issueBookByBarcode({
        bookBarcode: identifiedBook.barcode,
        studentBarcode: identifiedUser.barcode || identifiedUser.enrollment,
        adminName: 'Admin Superuser'
      });
      onSuccess?.(`Book "${identifiedBook.name}" successfully issued to ${identifiedUser.name}!`);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Method 1: Smart Barcode Book Issue</h3>
              <p className="text-xs text-slate-400">Support USB Handheld Scanners & On-Screen Camera Scanner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-between py-4 px-2">
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-blue-400' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>1</span>
            <span>Scan Book</span>
          </div>
          <div className="flex-1 h-0.5 mx-3 bg-slate-800">
            <div className={`h-full bg-blue-600 transition-all duration-300 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'}`} />
          </div>
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-blue-400' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-800'}`}>2</span>
            <span>Scan Card</span>
          </div>
          <div className="flex-1 h-0.5 mx-3 bg-slate-800">
            <div className={`h-full bg-blue-600 transition-all duration-300 ${step === 3 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center gap-2 text-xs font-bold ${step === 3 ? 'text-emerald-400' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-800'}`}>3</span>
            <span>Confirm Issue</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* STEP 1: Scan Book */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Camera Scanner Viewfinder simulation */}
              <div className="relative h-44 rounded-2xl bg-slate-900 border-2 border-dashed border-blue-500/50 flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-x-8 h-1 bg-red-500 shadow-[0_0_12px_#ef4444] animate-scan-laser" />
                <BookOpen className="w-12 h-12 text-blue-500/30 mb-2" />
                <p className="text-xs font-medium text-slate-300">Point USB Scanner or Camera at Book Barcode</p>
                <p className="text-[11px] text-slate-400">Barcode attached on back cover</p>
              </div>

              {/* Manual Entry Form */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter or paste Book Barcode (e.g. BK-MITS-1001)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-blue-500 font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
                >
                  Identify Book
                </button>
              </form>

              {/* Quick sample chips */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Quick Select Sample Books for Testing:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {books.slice(0, 4).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => processScannedBarcode(b.barcode)}
                      className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 flex items-center gap-2.5 text-left transition"
                    >
                      <img src={b.coverImage} alt={b.name} className="w-8 h-10 object-cover rounded shadow shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{b.name}</div>
                        <div className="text-[10px] text-blue-400 font-mono">{b.barcode}</div>
                        <div className="text-[10px] text-slate-400">Stock: {b.availableQuantity}/{b.totalQuantity}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Scan Student */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Identified Book Summary banner */}
              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-800/60 flex items-center gap-3">
                <img src={identifiedBook.coverImage} alt={identifiedBook.name} className="w-10 h-14 object-cover rounded-lg shadow shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">Book Selected</span>
                    <span className="text-xs text-blue-300 font-mono">{identifiedBook.barcode}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">{identifiedBook.name}</h4>
                  <p className="text-xs text-slate-400">{identifiedBook.author} • {identifiedBook.shelf}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setIdentifiedBook(null); }}
                  className="text-xs text-blue-400 hover:underline px-2"
                >
                  Change
                </button>
              </div>

              {/* Camera Scanner Viewfinder simulation */}
              <div className="relative h-44 rounded-2xl bg-slate-900 border-2 border-dashed border-indigo-500/50 flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-x-8 h-1 bg-red-500 shadow-[0_0_12px_#ef4444] animate-scan-laser" />
                <User className="w-12 h-12 text-indigo-500/30 mb-2" />
                <p className="text-xs font-medium text-slate-300">Scan Student Library ID Card Barcode</p>
                <p className="text-[11px] text-slate-400">Hold library card barcode in front of reader</p>
              </div>

              {/* Manual Entry Form */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter Student Barcode or Enrollment (e.g. STU-0901-IT014)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500 font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                >
                  Identify Student
                </button>
              </form>

              {/* Quick sample student chips */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Quick Select Sample Students / Faculty:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {students.slice(0, 4).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => processScannedBarcode(s.barcode || s.enrollment)}
                      className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 flex items-center gap-2.5 text-left transition"
                    >
                      <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover shrink-0" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'; }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{s.name}</div>
                        <div className="text-[10px] text-indigo-400 font-mono">{s.enrollment}</div>
                        <div className="text-[10px] text-slate-400">Issued: {s.issuedCount}/{s.maxLimit}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm Issue */}
          {step === 3 && identifiedBook && identifiedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Book Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-blue-400 text-xs font-bold">
                    <BookOpen className="w-4 h-4" />
                    <span>BOOK DETAILS</span>
                  </div>
                  <div className="flex gap-3">
                    <img src={identifiedBook.coverImage} alt={identifiedBook.name} className="w-14 h-20 object-cover rounded-xl shadow shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{identifiedBook.name}</h4>
                      <p className="text-xs text-slate-400">{identifiedBook.author}</p>
                      <div className="mt-2 text-[11px] font-mono text-blue-400">Barcode: {identifiedBook.barcode}</div>
                      <div className="text-[11px] text-slate-400">Available copies: {identifiedBook.availableQuantity}</div>
                    </div>
                  </div>
                </div>

                {/* User Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-bold">
                    <User className="w-4 h-4" />
                    <span>BORROWER DETAILS</span>
                  </div>
                  <div className="flex gap-3">
                    <img src={identifiedUser.avatar} alt={identifiedUser.name} className="w-12 h-12 rounded-full object-cover shrink-0" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'; }} />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{identifiedUser.name}</h4>
                      <p className="text-xs text-slate-400">{identifiedUser.department}</p>
                      <div className="mt-1 text-[11px] font-mono text-indigo-400">Enrollment: {identifiedUser.enrollment || identifiedUser.id}</div>
                      <div className="text-[11px] text-emerald-400 font-semibold">Status: {identifiedUser.status}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculated Dates & Policies */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-indigo-800/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Issue Date:</span>
                  <span className="text-white font-mono font-semibold">{new Date().toISOString().split('T')[0]} (Today)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Return Due Date:</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} (14 Days)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Automated Email Reminders:</span>
                  <span className="text-emerald-400 font-medium">Scheduled for 7-Day & 1-Day prior</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Overdue Fine Rate:</span>
                  <span className="text-slate-300">₹10/day after 1-day grace period</span>
                </div>
              </div>

              {/* Confirm Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmIssue}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm and Issue Book</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
