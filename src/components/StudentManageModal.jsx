import React, { useState } from 'react';
import { Users, Search, ShieldCheck, ShieldAlert, BookOpen, AlertTriangle, X, CheckCircle, Mail, Phone } from 'lucide-react';
import { db } from '../services/db';

export default function StudentManageModal({ isOpen, onClose, onRefresh, onNotify }) {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [showConfirmSuspension, setShowConfirmSuspension] = useState(false);

  const students = db.getStudents();
  const transactions = db.getTransactions();

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.enrollment.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.department.toLowerCase().includes(search.toLowerCase())
  );

  const getStudentIssuedBooks = (studentId) => {
    return transactions.filter(t => t.userId === studentId && (t.status === 'ISSUED' || t.status === 'OVERDUE'));
  };

  const handleToggleStatus = (student) => {
    if (student.status === 'ACTIVE') {
      setSelectedStudent(student);
      setSuspensionReason('Violation of library borrowing rules / Unreturned overdue book penalties.');
      setShowConfirmSuspension(true);
    } else {
      // Reactivate
      db.updateStudentStatus(student.id, 'ACTIVE');
      onNotify?.(`Account for ${student.name} reactivated successfully.`, 'success');
      onRefresh?.();
    }
  };

  const confirmSuspension = () => {
    if (!selectedStudent) return;
    db.updateStudentStatus(selectedStudent.id, 'SUSPENDED', suspensionReason);
    onNotify?.(`Account for ${selectedStudent.name} has been SUSPENDED.`, 'warning');
    setShowConfirmSuspension(false);
    setSelectedStudent(null);
    onRefresh?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Registered Students Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Box 1: Total {students.length} Students ({students.filter(s => s.status === 'ACTIVE').length} Active, {students.filter(s => s.status === 'SUSPENDED').length} Suspended)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="my-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name, enrollment number (0901IT...), email, or department..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Students Table */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No registered students match your search criteria.
            </div>
          ) : (
            filteredStudents.map(student => {
              const activeBooks = getStudentIssuedBooks(student.id);
              const isSuspended = student.status === 'SUSPENDED';

              return (
                <div
                  key={student.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSuspended
                      ? 'bg-rose-950/20 border-rose-800/40'
                      : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {/* Student Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 bg-slate-800">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{student.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isSuspended
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {student.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono text-blue-500 font-semibold">{student.enrollment}</span>
                          <span>{student.department}</span>
                          <span>{student.batch}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {student.email}
                          </span>
                          <span className="font-mono text-slate-400">Card: {student.barcode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {activeBooks.length} / {student.maxLimit} Books
                        </div>
                        {student.fineAmount > 0 ? (
                          <div className="text-xs text-rose-500 font-semibold">Fine: ₹{student.fineAmount}</div>
                        ) : (
                          <div className="text-[11px] text-emerald-500">No Fines</div>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleStatus(student)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isSuspended
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                            : 'bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30'
                        }`}
                      >
                        {isSuspended ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Reactivate Account</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Suspend Account</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Active books mini list */}
                  {activeBooks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-blue-400" />
                        <span>Currently Issued Books:</span>
                      </div>
                      <div className="space-y-1.5">
                        {activeBooks.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tx.bookName}</span>
                            <div className="flex items-center gap-3 shrink-0 text-[11px]">
                              <span className="text-slate-400 font-mono">Due: {tx.dueDate}</span>
                              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                tx.status === 'OVERDUE' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {tx.status} {tx.fineAmount > 0 && `(₹${tx.fineAmount})`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSuspended && student.suspensionReason && (
                    <div className="mt-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{student.suspensionReason}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Suspension */}
      {showConfirmSuspension && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#131b34] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/20">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Suspend Student Account</h4>
                <p className="text-xs text-slate-400">Cancel library borrowing privileges</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Are you sure you want to suspend <strong className="text-white">{selectedStudent.name}</strong> ({selectedStudent.enrollment})?
              The student will be blocked from requesting and issuing books.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Suspension *</label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows="2"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSuspension(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSuspension}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
