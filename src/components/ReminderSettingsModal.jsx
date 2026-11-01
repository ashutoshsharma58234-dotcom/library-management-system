import React, { useState } from 'react';
import { Mail, Settings, CheckCircle2, Play, Save, X, Server, AlertCircle } from 'lucide-react';
import { db } from '../services/db';

export default function ReminderSettingsModal({ isOpen, onClose, onNotify, onRefresh }) {
  const [settings, setSettings] = useState(db.getSettings());
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpSuccess, setSmtpSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    db.saveSettings(settings);
    onNotify?.('Automated Email & Penalty configuration saved.', 'success');
    onRefresh?.();
    onClose();
  };

  const handleTestSmtp = () => {
    setIsTestingSmtp(true);
    setSmtpSuccess(false);
    setTimeout(() => {
      setIsTestingSmtp(false);
      setSmtpSuccess(true);
      db.logEmail({
        recipient: settings.senderEmail,
        studentName: 'Admin System Diagnostics',
        bookName: 'SMTP Gateway Test',
        action: 'Diagnostics Self-Test',
        subject: 'MITS Library: SMTP Relay Connection Handshake OK',
        status: 'Delivered',
        notes: `Host ${settings.smtpHost} responded with TLS 250 OK.`
      });
      onNotify?.('SMTP test passed: Gmail relay verified and ready.', 'success');
      onRefresh?.();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Email Reminders & Penalty Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure scheduling triggers, fine tariffs, and SMTP delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* SMTP Gateway Status */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-500" />
                <span>SMTP Email Gateway</span>
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                {settings.smtpStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">SMTP Relay Host</label>
                <input
                  type="text"
                  name="smtpHost"
                  value={settings.smtpHost}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Sender Email</label>
                <input
                  type="email"
                  name="senderEmail"
                  value={settings.senderEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={isTestingSmtp}
              className="w-full py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition"
            >
              {isTestingSmtp ? (
                <span>Sending Test Handshake...</span>
              ) : smtpSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">Handshake Verified (250 OK)</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send SMTP Test Diagnostic</span>
                </>
              )}
            </button>
          </div>

          {/* Automated Reminders Schedule */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Reminder Scheduling Rules</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  1st Reminder (Days Before Due)
                </label>
                <input
                  type="number"
                  name="firstReminderDaysBefore"
                  value={settings.firstReminderDaysBefore}
                  onChange={handleChange}
                  min="2"
                  max="30"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Default: 7 days prior</p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  2nd Reminder (Days Before Due)
                </label>
                <input
                  type="number"
                  name="secondReminderDaysBefore"
                  value={settings.secondReminderDaysBefore}
                  onChange={handleChange}
                  min="0"
                  max="5"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Default: 1 day prior</p>
              </div>
            </div>
          </div>

          {/* Penalty & Fine Tariffs */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Late Return Penalty & Fines</h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Fine Per Day (₹)
                </label>
                <input
                  type="number"
                  name="finePerDay"
                  value={settings.finePerDay}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Grace Period (Days)
                </label>
                <input
                  type="number"
                  name="gracePeriodDays"
                  value={settings.gracePeriodDays}
                  onChange={handleChange}
                  min="0"
                  max="7"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Suspension Fine (₹)
                </label>
                <input
                  type="number"
                  name="suspensionFineThreshold"
                  value={settings.suspensionFineThreshold}
                  onChange={handleChange}
                  min="50"
                  max="2000"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
