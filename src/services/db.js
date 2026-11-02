// MITS Library Management System – Supabase Connected Central Database & Synchronization Service

import {
  initialStudents,
  initialFaculty,
  initialBooks,
  initialTransactions,
  initialRequests,
  initialEmailLogs,
  initialSettings
} from '../data/initialData';
import { supabase } from './supabaseClient';
import {
  authService,
  profileService,
  bookService,
  issueService,
  requestService,
  reminderService,
  settingsService,
  metricsService
} from './supabaseService';

const STORAGE_KEYS = {
  STUDENTS: 'mits_lib_students',
  FACULTY: 'mits_lib_faculty',
  BOOKS: 'mits_lib_books',
  TRANSACTIONS: 'mits_lib_transactions',
  REQUESTS: 'mits_lib_requests',
  EMAIL_LOGS: 'mits_lib_email_logs',
  SETTINGS: 'mits_lib_settings',
  THEME: 'mits_lib_theme',
  CURRENT_USER: 'mits_lib_user'
};

// Listeners for reactivity
const listeners = new Set();

function notifyListeners() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error in listener', e);
    }
  });
  window.dispatchEvent(new Event('mits_db_updated'));
}

// Helpers for localStorage
function getFromStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch (e) {
    console.error('Storage parse error for', key, e);
    return fallback;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    notifyListeners();
  } catch (e) {
    console.error('Storage save error for', key, e);
  }
}

export const db = {
  subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  // ---------------- SUPABASE SYNCHRONIZATION ----------------
  async syncFromSupabase() {
    try {
      // 1. Fetch Books
      const { data: dbBooks } = await supabase.from('books').select('*').order('created_at', { ascending: false });
      if (dbBooks && dbBooks.length > 0) {
        const mappedBooks = dbBooks.map(b => ({
          id: b.id,
          name: b.book_name,
          author: b.author_name,
          subject: b.subject,
          category: b.subject?.includes('Design') ? 'Design' : b.subject?.includes('Arts') || b.subject?.includes('Literature') ? 'Arts' : b.subject?.includes('Commerce') || b.subject?.includes('Business') ? 'Commerce' : b.subject?.includes('Cooking') ? 'Cooking' : 'Science',
          isbn: b.isbn || 'N/A',
          barcode: b.barcode,
          totalQuantity: b.total_quantity,
          availableQuantity: b.available_quantity,
          coverImage: b.cover_image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
          rating: 4.8,
          shelf: 'Central Reading Room',
          description: b.description || ''
        }));
        localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(mappedBooks));
      }

      // 2. Fetch Profiles (Students & Faculty)
      const { data: profiles } = await supabase.from('profiles').select('*');
      if (profiles && profiles.length > 0) {
        const students = profiles.filter(p => p.role === 'student').map(s => ({
          id: s.id,
          name: s.full_name,
          enrollment: s.enrollment_number || s.library_card_barcode,
          email: s.email,
          department: s.department,
          semester: '1st Sem',
          batch: '2025-2029',
          status: s.account_status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
          barcode: s.library_card_barcode,
          issuedCount: 0,
          maxLimit: 4,
          fineAmount: 0,
          phone: s.phone_number || '',
          avatar: s.profile_image || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80`
        }));
        if (students.length > 0) localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

        const faculty = profiles.filter(p => p.role === 'faculty').map(f => ({
          id: f.id,
          name: f.full_name,
          email: f.email,
          department: f.department,
          designation: 'Faculty Member',
          status: f.account_status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
          barcode: f.library_card_barcode,
          issuedCount: 0,
          maxLimit: 8,
          phone: f.phone_number || '',
          avatar: f.profile_image || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80`
        }));
        if (faculty.length > 0) localStorage.setItem(STORAGE_KEYS.FACULTY, JSON.stringify(faculty));
      }

      // 3. Fetch Transactions
      const { data: issues } = await supabase
        .from('book_issues')
        .select(`
          *,
          books:book_id(id, book_name, author_name, barcode, cover_image),
          profiles:student_id(id, full_name, enrollment_number, email, role, phone_number),
          penalties:penalties(amount, status)
        `)
        .order('created_at', { ascending: false });

      if (issues && issues.length > 0) {
        const mappedTx = issues.map(it => {
          const fine = it.penalties && it.penalties.length > 0 ? Number(it.penalties[0].amount || 0) : 0;
          return {
            id: it.id,
            bookId: it.book_id,
            bookName: it.books?.book_name || 'Library Book',
            bookBarcode: it.books?.barcode || 'N/A',
            userId: it.student_id,
            userName: it.profiles?.full_name || 'Borrower',
            userEnrollment: it.profiles?.enrollment_number || it.student_id,
            userEmail: it.profiles?.email || '',
            userRole: (it.profiles?.role || 'student').toUpperCase(),
            issueDate: it.issue_date,
            dueDate: it.due_date,
            actualReturnDate: it.return_date,
            status: it.status?.toUpperCase(),
            issueMethod: it.issue_method?.toUpperCase(),
            issuedBy: 'Dr. R. K. Singh (Admin)',
            fineAmount: fine,
            finePaid: it.penalties?.[0]?.status === 'paid',
            firstReminderSent: false,
            secondReminderSent: false,
            penaltyNoticeSent: false
          };
        });
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(mappedTx));
      }

      // 4. Fetch Requests
      const { data: reqs } = await supabase
        .from('book_issue_requests')
        .select(`
          *,
          books:book_id(id, book_name, author_name, barcode),
          profiles:student_id(id, full_name, enrollment_number, email, role)
        `)
        .order('request_date', { ascending: false });

      if (reqs && reqs.length > 0) {
        const mappedReqs = reqs.map(r => ({
          id: r.id,
          userId: r.student_id,
          userName: r.profiles?.full_name || 'Student',
          userEnrollment: r.profiles?.enrollment_number || r.student_id,
          userEmail: r.profiles?.email || '',
          userRole: (r.profiles?.role || 'student').toUpperCase(),
          bookId: r.book_id,
          bookName: r.books?.book_name || 'Library Book',
          bookBarcode: r.books?.barcode || 'N/A',
          requestDate: new Date(r.request_date).toLocaleString(),
          status: r.status?.toUpperCase(),
          remarks: r.rejection_reason || ''
        }));
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(mappedReqs));
      }

      // 5. Fetch Reminders Log
      const { data: reminders } = await supabase
        .from('email_reminders')
        .select(`
          *,
          book_issues:book_issue_id(due_date, books:book_id(book_name)),
          profiles:student_id(full_name, email)
        `)
        .order('sent_at', { ascending: false });

      if (reminders && reminders.length > 0) {
        const mappedReminders = reminders.map(rm => ({
          id: rm.id,
          recipient: rm.recipient_email,
          studentName: rm.profiles?.full_name || 'Borrower',
          bookName: rm.book_issues?.books?.book_name || 'Library Book',
          action: rm.reminder_type === '7_day' ? '7-Day Return Due Reminder' : rm.reminder_type === '1_day' ? '1-Day Return Due Reminder' : 'URGENT: Overdue Book Notice & Fine Warning',
          subject: `MITS Library Notice: Return Due Reminder`,
          status: rm.delivery_status === 'delivered' ? 'Delivered' : 'Pending',
          timestamp: new Date(rm.sent_at).toLocaleString(),
          notes: rm.error_message || 'Auto-dispatched via Supabase background worker.'
        }));
        localStorage.setItem(STORAGE_KEYS.EMAIL_LOGS, JSON.stringify(mappedReminders));
      }

      notifyListeners();
    } catch (err) {
      console.warn('Supabase sync notice:', err?.message || err);
    }
  },

  // ---------------- STUDENTS ----------------
  getStudents() {
    return getFromStorage(STORAGE_KEYS.STUDENTS, initialStudents);
  },

  getStudentById(id) {
    const list = this.getStudents();
    return list.find(s => s.id === id || s.enrollment === id || s.barcode === id);
  },

  saveStudents(students) {
    saveToStorage(STORAGE_KEYS.STUDENTS, students);
  },

  async registerStudent(data) {
    const students = this.getStudents();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanEnrollment = (data.enrollment || '').trim().toUpperCase();

    // Enforce MITS College student email domain (.ac.in)
    if (!cleanEmail.endsWith('.ac.in')) {
      throw new Error('Access Denied: Student registration requires an official college email ending in ".ac.in" (e.g. yourname@mitsgwl.ac.in). Other email domains are strictly prohibited.');
    }

    // Check duplicate email
    if (students.some(s => s.email.toLowerCase() === cleanEmail)) {
      throw new Error(`An account with email "${cleanEmail}" is already registered. Please sign in instead.`);
    }

    // Check duplicate enrollment
    if (students.some(s => s.enrollment.toUpperCase() === cleanEnrollment)) {
      throw new Error(`Enrollment number "${cleanEnrollment}" is already registered. Please sign in instead.`);
    }

    const nextIdNum = 100 + students.length + 1;
    const studentBarcode = `STU-${cleanEnrollment.replace(/[^A-Z0-9]/g, '')}`;

    const newStudent = {
      id: `STU-${nextIdNum}`,
      name: data.name.trim(),
      enrollment: cleanEnrollment,
      email: cleanEmail,
      department: data.department || 'Information Technology',
      semester: data.semester || '1st Sem',
      batch: data.batch || '2025-2029',
      status: 'ACTIVE',
      barcode: studentBarcode,
      issuedCount: 0,
      maxLimit: 4,
      fineAmount: 0,
      phone: data.phone || '',
      password: data.password || 'student123',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80`
    };

    // Try Supabase Auth Sign Up
    try {
      const { user } = await authService.signUp({
        email: cleanEmail,
        password: data.password || 'student123',
        full_name: data.name.trim(),
        enrollment_number: cleanEnrollment,
        department: data.department || 'Information Technology',
        phone_number: data.phone || null,
        role: 'student'
      });
      if (user?.id) {
        newStudent.id = user.id;
      }
    } catch (authErr) {
      console.warn('Supabase auth signup notice:', authErr.message);
    }

    students.unshift(newStudent);
    this.saveStudents(students);

    // Welcome email delivery log
    this.logEmail({
      recipient: newStudent.email,
      studentName: newStudent.name,
      bookName: 'Digital Library Card Activation',
      action: 'Student College Registration',
      subject: `Welcome to MITS Library! Digital Pass ${studentBarcode} Issued`,
      status: 'Delivered',
      notes: `Verified institute domain (.ac.in): ${newStudent.email}. Barcode generated.`
    });

    const userSession = {
      id: newStudent.id,
      name: newStudent.name,
      enrollment: newStudent.enrollment,
      email: newStudent.email,
      department: newStudent.department,
      batch: newStudent.batch,
      role: 'STUDENT',
      barcode: newStudent.barcode,
      avatar: newStudent.avatar
    };

    this.setCurrentUser(userSession);
    return userSession;
  },

  async loginStudent(input, password) {
    const students = this.getStudents();
    const query = (input || '').trim().toLowerCase();

    // If logging in via email, verify that email ends in .ac.in
    if (query.includes('@')) {
      if (!query.endsWith('.ac.in')) {
        throw new Error('Access Denied: Student login requires an institutional email ending in ".ac.in" (e.g. student@mitsgwl.ac.in). Other email domains are not permitted.');
      }
    }

    const student = students.find(s => s.enrollment.toLowerCase() === query || s.email.toLowerCase() === query || s.id.toLowerCase() === query);

    // Try Supabase auth if email format
    if (query.includes('@')) {
      try {
        const { user, profile } = await authService.signIn({
          email: query,
          password: password || 'student123'
        });
        if (profile) {
          const userSession = {
            id: profile.id,
            name: profile.full_name,
            enrollment: profile.enrollment_number || student?.enrollment || '0901IT251014',
            email: profile.email,
            department: profile.department || 'Information Technology',
            batch: '2025-2029',
            role: 'STUDENT',
            barcode: profile.library_card_barcode,
            avatar: profile.profile_image || student?.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80`
          };
          this.setCurrentUser(userSession);
          return userSession;
        }
      } catch (authErr) {
        console.warn('Supabase signIn notice:', authErr.message);
      }
    }

    if (!student) {
      throw new Error('No student found with this enrollment number or college email.');
    }
    if (student.email && !student.email.toLowerCase().endsWith('.ac.in')) {
      throw new Error('Access Denied: The account associated with this enrollment does not have an authorized .ac.in institutional email.');
    }
    if (student.status === 'SUSPENDED') {
      throw new Error(`Account for ${student.name} is SUSPENDED. Outstanding fines must be paid.`);
    }
    if (student.password && password && student.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }

    const userSession = {
      id: student.id,
      name: student.name,
      enrollment: student.enrollment,
      email: student.email,
      department: student.department,
      batch: student.batch,
      role: 'STUDENT',
      barcode: student.barcode,
      avatar: student.avatar
    };
    this.setCurrentUser(userSession);
    return userSession;
  },

  async loginFaculty(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail.endsWith('gwalior.in')) {
      throw new Error('Access Denied: Faculty login requires an official institutional email ending in "gwalior.in" (e.g. professor@mitsgwalior.in). Other email domains are not allowed.');
    }

    const facultyList = this.getFaculty();
    const fac = facultyList.find(f => f.email.toLowerCase() === cleanEmail);
    if (!fac) {
      throw new Error('Faculty email not found in institutional directory.');
    }
    if (fac.status === 'SUSPENDED') {
      throw new Error(`Faculty account for ${fac.name} is SUSPENDED.`);
    }

    // Try Supabase auth
    try {
      const { profile } = await authService.signIn({
        email: cleanEmail,
        password: password || 'faculty123'
      });
      if (profile) {
        const userSession = {
          id: profile.id,
          name: profile.full_name || fac.name,
          email: profile.email,
          department: profile.department || fac.department,
          role: 'FACULTY',
          barcode: profile.library_card_barcode || fac.barcode,
          avatar: profile.profile_image || fac.avatar
        };
        this.setCurrentUser(userSession);
        return userSession;
      }
    } catch (e) {
      console.warn('Supabase faculty login notice:', e.message);
    }

    const userSession = {
      id: fac.id,
      name: fac.name,
      email: fac.email,
      department: fac.department,
      role: 'FACULTY',
      barcode: fac.barcode,
      avatar: fac.avatar
    };
    this.setCurrentUser(userSession);
    return userSession;
  },

  async loginAdmin(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail.endsWith('gwalior.in')) {
      throw new Error('Access Denied: Admin login requires an authorized administrator email ending in "gwalior.in" (e.g. admin@mitsgwalior.in).');
    }

    try {
      const { profile } = await authService.signIn({
        email: cleanEmail,
        password: password || 'admin123'
      });
      if (profile && profile.role === 'admin') {
        const adminSession = {
          id: profile.id,
          name: profile.full_name || 'Admin',
          title: 'Superuser Access',
          email: profile.email,
          role: 'ADMIN',
          avatar: profile.profile_image || 'A'
        };
        this.setCurrentUser(adminSession);
        return adminSession;
      }
    } catch (e) {
      console.warn('Supabase admin login fallback:', e.message);
    }

    // Direct fallback
    if (cleanEmail === 'admin@mitsgwalior.in' && password === 'admin123') {
      const adminSession = {
        id: 'a0000000-0000-0000-0000-000000000001',
        name: 'Dr. R. K. Singh',
        title: 'Superuser Access',
        email: 'admin@mitsgwalior.in',
        role: 'ADMIN',
        avatar: '/assets/Dr.Rajeev kumar singh.jpeg'
      };
      this.setCurrentUser(adminSession);
      return adminSession;
    }
    throw new Error('Invalid Administrator credentials. (Use admin@mitsgwalior.in / admin123)');
  },

  updateStudentStatus(studentId, status, reason = '') {
    const students = this.getStudents();
    const updated = students.map(s => {
      if (s.id === studentId || s.enrollment === studentId) {
        return {
          ...s,
          status,
          suspensionReason: status === 'SUSPENDED' ? reason || 'Administrative sanction for library overdue policy violation.' : ''
        };
      }
      return s;
    });
    this.saveStudents(updated);

    // Sync to Supabase
    profileService.updateAccountStatus(studentId, status.toLowerCase(), reason).catch(e => console.warn(e));

    return { success: true };
  },

  // ---------------- FACULTY ----------------
  getFaculty() {
    return getFromStorage(STORAGE_KEYS.FACULTY, initialFaculty);
  },

  saveFaculty(faculty) {
    saveToStorage(STORAGE_KEYS.FACULTY, faculty);
  },

  // ---------------- BOOKS ----------------
  getBooks() {
    return getFromStorage(STORAGE_KEYS.BOOKS, initialBooks);
  },

  getBookById(id) {
    const books = this.getBooks();
    return books.find(b => b.id === id || b.barcode === id || b.isbn === id);
  },

  saveBooks(books) {
    saveToStorage(STORAGE_KEYS.BOOKS, books);
  },

  addBook(bookData) {
    const books = this.getBooks();
    if (books.some(b => b.barcode.trim().toLowerCase() === bookData.barcode.trim().toLowerCase())) {
      throw new Error(`A book with barcode ${bookData.barcode} already exists.`);
    }
    const newBook = {
      id: bookData.id || `BK-${1000 + books.length + 1}`,
      name: bookData.name,
      author: bookData.author,
      subject: bookData.subject,
      category: bookData.category || 'Science',
      isbn: bookData.isbn || 'N/A',
      barcode: bookData.barcode,
      totalQuantity: Number(bookData.totalQuantity) || 1,
      availableQuantity: Number(bookData.totalQuantity) || 1,
      coverImage: bookData.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
      rating: 4.5,
      shelf: bookData.shelf || 'Central Reading Room',
      description: bookData.description || ''
    };
    books.unshift(newBook);
    this.saveBooks(books);

    // Sync to Supabase
    bookService.addBook(newBook).catch(e => console.warn('Supabase book insert notice:', e));

    return newBook;
  },

  updateBook(id, bookData) {
    const books = this.getBooks();
    const index = books.findIndex(b => b.id === id);
    if (index === -1) throw new Error('Book not found');

    if (bookData.barcode) {
      const conflict = books.some(b => b.id !== id && b.barcode.toLowerCase() === bookData.barcode.toLowerCase());
      if (conflict) throw new Error(`Barcode ${bookData.barcode} is already used by another book.`);
    }

    const current = books[index];
    const totalQty = Number(bookData.totalQuantity ?? current.totalQuantity);
    const issuedDiff = current.totalQuantity - current.availableQuantity;
    const newAvailable = Math.max(0, totalQty - issuedDiff);

    books[index] = {
      ...current,
      ...bookData,
      totalQuantity: totalQty,
      availableQuantity: newAvailable
    };
    this.saveBooks(books);

    // Sync to Supabase
    bookService.updateBook(id, bookData).catch(e => console.warn('Supabase book update notice:', e));

    return books[index];
  },

  deleteBook(id) {
    const books = this.getBooks();
    const transactions = this.getTransactions();
    const isIssued = transactions.some(t => t.bookId === id && (t.status === 'ISSUED' || t.status === 'OVERDUE'));
    if (isIssued) {
      throw new Error('Cannot delete this book because copies are currently issued to students/faculty.');
    }
    const updated = books.filter(b => b.id !== id);
    this.saveBooks(updated);

    // Sync to Supabase
    bookService.deleteBook(id).catch(e => console.warn('Supabase book delete notice:', e));

    return { success: true };
  },

  // ---------------- TRANSACTIONS & STOCK CONCURRENCY ----------------
  getTransactions() {
    const list = getFromStorage(STORAGE_KEYS.TRANSACTIONS, initialTransactions);
    const settings = this.getSettings();
    const todayStr = new Date().toISOString().split('T')[0];

    let updated = false;
    const recalculated = list.map(tx => {
      if (tx.status === 'ISSUED' || tx.status === 'OVERDUE') {
        const due = new Date(tx.dueDate);
        const today = new Date(todayStr);
        if (today > due) {
          const diffDays = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
          const penaltyDays = Math.max(0, diffDays - (settings.gracePeriodDays || 0));
          const fine = penaltyDays * (settings.finePerDay || 10);
          if (tx.status !== 'OVERDUE' || tx.fineAmount !== fine) {
            updated = true;
            return {
              ...tx,
              status: 'OVERDUE',
              fineAmount: fine
            };
          }
        }
      }
      return tx;
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(recalculated));
    }
    return recalculated;
  },

  saveTransactions(transactions) {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  },

  // Method 1: Barcode-based Issuing
  issueBookByBarcode({ bookBarcode, studentBarcode, adminName = 'Admin' }) {
    const books = this.getBooks();
    const book = books.find(b => b.barcode.trim().toLowerCase() === bookBarcode.trim().toLowerCase());
    if (!book) {
      throw new Error(`Book with barcode "${bookBarcode}" not found in catalog.`);
    }
    if (book.availableQuantity <= 0) {
      throw new Error(`"${book.name}" is currently OUT OF STOCK (0 copies available).`);
    }

    const students = this.getStudents();
    const faculty = this.getFaculty();
    let user = students.find(s => s.barcode.toLowerCase() === studentBarcode.toLowerCase() || s.enrollment.toLowerCase() === studentBarcode.toLowerCase());
    let role = 'STUDENT';

    if (!user) {
      user = faculty.find(f => f.barcode.toLowerCase() === studentBarcode.toLowerCase());
      if (user) role = 'FACULTY';
    }

    if (!user) {
      throw new Error(`No student or faculty found with Library Card/Barcode "${studentBarcode}".`);
    }

    if (user.status === 'SUSPENDED') {
      throw new Error(`Account for ${user.name} is SUSPENDED. Fines or disciplinary holds must be resolved first.`);
    }

    const transactions = this.getTransactions();
    const activeUserIssues = transactions.filter(t => t.userId === user.id && (t.status === 'ISSUED' || t.status === 'OVERDUE'));
    const maxLimit = role === 'FACULTY' ? (user.maxLimit || 8) : (user.maxLimit || 4);
    if (activeUserIssues.length >= maxLimit) {
      throw new Error(`${user.name} has reached the maximum borrowing limit of ${maxLimit} books.`);
    }

    const alreadyHas = activeUserIssues.some(t => t.bookId === book.id);
    if (alreadyHas) {
      throw new Error(`${user.name} already currently has a copy of "${book.name}" issued.`);
    }

    // Decrease stock safely
    book.availableQuantity = Math.max(0, book.availableQuantity - 1);
    this.saveBooks(books);

    const settings = this.getSettings();
    const now = new Date();
    const issueDateStr = now.toISOString().split('T')[0];
    const borrowDays = role === 'FACULTY' ? 30 : (settings.defaultBorrowDays || 14);
    const dueDate = new Date(now.getTime() + borrowDays * 24 * 60 * 60 * 1000);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const newTx = {
      id: `TX-${Date.now().toString().slice(-6)}`,
      bookId: book.id,
      bookName: book.name,
      bookBarcode: book.barcode,
      userId: user.id,
      userName: user.name,
      userEnrollment: user.enrollment || user.id,
      userEmail: user.email,
      userRole: role,
      issueDate: issueDateStr,
      dueDate: dueDateStr,
      actualReturnDate: null,
      status: 'ISSUED',
      issueMethod: 'BARCODE',
      issuedBy: adminName,
      fineAmount: 0,
      finePaid: false,
      firstReminderSent: false,
      secondReminderSent: false,
      penaltyNoticeSent: false
    };

    transactions.unshift(newTx);
    this.saveTransactions(transactions);

    if (role === 'STUDENT') {
      const updatedStudents = students.map(s => s.id === user.id ? { ...s, issuedCount: (s.issuedCount || 0) + 1 } : s);
      this.saveStudents(updatedStudents);
    }

    this.logEmail({
      recipient: user.email,
      studentName: user.name,
      bookName: book.name,
      action: 'Barcode Issue Confirmation',
      subject: `MITS Central Library: Book Issued - ${book.name}`,
      status: 'Delivered',
      notes: `Issued by ${adminName}. Due date: ${dueDateStr}. Barcode validated.`
    });

    // Invoke Supabase RPC in background
    if (user.id.includes('-') && book.id.includes('-')) {
      issueService.issueBookBarcode({
        studentId: user.id,
        bookId: book.id,
        method: 'barcode',
        issuedBy: 'a0000000-0000-0000-0000-000000000001'
      }).catch(e => console.warn('Supabase issue RPC notice:', e.message));
    }

    return { transaction: newTx, book, user };
  },

  // Method 2: Online Requests
  getRequests() {
    return getFromStorage(STORAGE_KEYS.REQUESTS, initialRequests);
  },

  saveRequests(requests) {
    saveToStorage(STORAGE_KEYS.REQUESTS, requests);
  },

  submitBookRequest({ userId, bookId, remarks = '' }) {
    const students = this.getStudents();
    const faculty = this.getFaculty();
    let user = students.find(s => s.id === userId || s.enrollment?.toLowerCase() === userId?.toLowerCase() || s.email?.toLowerCase() === userId?.toLowerCase());
    let role = 'STUDENT';
    if (!user) {
      user = faculty.find(f => f.id === userId || f.email?.toLowerCase() === userId?.toLowerCase() || f.barcode?.toLowerCase() === userId?.toLowerCase());
      if (user) role = 'FACULTY';
    }
    if (!user) {
      const cur = this.getCurrentUser();
      if (cur) {
        user = cur;
        role = cur.role || 'STUDENT';
      }
    }
    if (!user) throw new Error('User not found.');

    if (user.status === 'SUSPENDED') {
      throw new Error('Your library privileges are suspended. Please contact library administration.');
    }

    const books = this.getBooks();
    const book = books.find(b => b.id === bookId);
    if (!book) throw new Error('Book not found.');

    if (book.availableQuantity <= 0) {
      throw new Error(`"${book.name}" is currently out of stock.`);
    }

    const requests = this.getRequests();
    const existing = requests.some(r => 
      (r.userId === user.id || r.userEnrollment === user.enrollment || r.userEmail === user.email) && 
      r.bookId === bookId && 
      r.status === 'PENDING'
    );
    if (existing) {
      throw new Error(`You already have a pending request for "${book.name}".`);
    }

    const transactions = this.getTransactions();
    const activeIssues = transactions.filter(t => 
      (t.userId === user.id || t.userEnrollment === user.enrollment || t.userEmail === user.email) && 
      (t.status === 'ISSUED' || t.status === 'OVERDUE')
    );
    const maxLimit = role === 'FACULTY' ? (user.maxLimit || 8) : (user.maxLimit || 4);
    if (activeIssues.length >= maxLimit) {
      throw new Error(`You have reached the maximum active borrowing limit of ${maxLimit} books.`);
    }

    const now = new Date();
    const newReq = {
      id: `REQ-${Date.now().toString().slice(-4)}`,
      userId: user.id,
      userName: user.name,
      userEnrollment: user.enrollment || user.id,
      userEmail: user.email,
      userRole: role,
      bookId: book.id,
      bookName: book.name,
      bookBarcode: book.barcode,
      requestDate: now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'PENDING',
      remarks
    };

    requests.unshift(newReq);
    this.saveRequests(requests);

    // Call Supabase
    if (user.id && bookId && user.id.includes('-') && bookId.includes('-')) {
      requestService.submitRequest({ studentId: user.id, bookId }).catch(e => console.warn(e));
    }

    return newReq;
  },

  cancelBookRequest(requestId, userId) {
    const requests = this.getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error('Request not found.');
    const req = requests[reqIndex];
    if (req.status !== 'PENDING') throw new Error('Only pending requests can be cancelled.');

    requests.splice(reqIndex, 1);
    this.saveRequests(requests);
    return true;
  },

  acceptOnlineRequest(requestId, adminName = 'Admin Superuser') {
    const requests = this.getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error('Request not found.');

    const req = requests[reqIndex];
    if (req.status !== 'PENDING') throw new Error(`Request is already ${req.status}.`);

    const books = this.getBooks();
    const book = books.find(b => b.id === req.bookId);
    if (!book) throw new Error('Requested book was removed or not found.');
    if (book.availableQuantity <= 0) {
      throw new Error(`Cannot approve: "${book.name}" is now out of stock.`);
    }

    // Decrease stock
    book.availableQuantity = Math.max(0, book.availableQuantity - 1);
    this.saveBooks(books);

    // Mark request APPROVED
    requests[reqIndex] = {
      ...req,
      status: 'APPROVED',
      approvedBy: adminName,
      approvedAt: new Date().toISOString()
    };
    this.saveRequests(requests);

    // Compute dates
    const settings = this.getSettings();
    const now = new Date();
    const issueDateStr = now.toISOString().split('T')[0];
    const borrowDays = req.userRole === 'FACULTY' ? 30 : (settings.defaultBorrowDays || 14);
    const dueDate = new Date(now.getTime() + borrowDays * 24 * 60 * 60 * 1000);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Create transaction
    const transactions = this.getTransactions();
    const newTx = {
      id: `TX-${Date.now().toString().slice(-6)}`,
      bookId: book.id,
      bookName: book.name,
      bookBarcode: book.barcode,
      userId: req.userId,
      userName: req.userName,
      userEnrollment: req.userEnrollment,
      userEmail: req.userEmail,
      userRole: req.userRole || 'STUDENT',
      issueDate: issueDateStr,
      dueDate: dueDateStr,
      actualReturnDate: null,
      status: 'ISSUED',
      issueMethod: 'ONLINE_REQUEST',
      issuedBy: adminName,
      fineAmount: 0,
      finePaid: false,
      firstReminderSent: false,
      secondReminderSent: false,
      penaltyNoticeSent: false
    };

    transactions.unshift(newTx);
    this.saveTransactions(transactions);

    if (req.userRole === 'STUDENT') {
      const students = this.getStudents();
      const updatedStudents = students.map(s => s.id === req.userId ? { ...s, issuedCount: (s.issuedCount || 0) + 1 } : s);
      this.saveStudents(updatedStudents);
    }

    this.logEmail({
      recipient: req.userEmail,
      studentName: req.userName,
      bookName: book.name,
      action: 'Online Request Approved',
      subject: `MITS Library: Your request for '${book.name}' has been APPROVED`,
      status: 'Delivered',
      notes: `Approved by ${adminName}. Due date is ${dueDateStr}. Available for pickup.`
    });

    // Supabase RPC
    if (requestId.includes('-')) {
      requestService.approveRequest(requestId, 'a0000000-0000-0000-0000-000000000001').catch(e => console.warn(e));
    }

    return { transaction: newTx, request: requests[reqIndex] };
  },

  rejectOnlineRequest(requestId, reason = 'Not available / Limit exceeded') {
    const requests = this.getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error('Request not found.');

    const req = requests[reqIndex];
    if (req.status !== 'PENDING') throw new Error(`Request is already ${req.status}.`);

    requests[reqIndex] = {
      ...req,
      status: 'REJECTED',
      rejectionReason: reason
    };
    this.saveRequests(requests);

    this.logEmail({
      recipient: req.userEmail,
      studentName: req.userName,
      bookName: req.bookName,
      action: 'Online Request Rejected',
      subject: `MITS Library: Update on your request for '${req.bookName}'`,
      status: 'Delivered',
      notes: `Reason: ${reason}`
    });

    if (requestId.includes('-')) {
      requestService.rejectRequest(requestId, 'a0000000-0000-0000-0000-000000000001', reason).catch(e => console.warn(e));
    }

    return requests[reqIndex];
  },

  // ---------------- BOOK RETURN REQUEST & PHYSICAL DESK RETURN WORKFLOW ----------------
  submitReturnRequest({ transactionId, userId, remarks = '' }) {
    const transactions = this.getTransactions();
    const txIndex = transactions.findIndex(t => t.id === transactionId);
    if (txIndex === -1) throw new Error('Active loan record not found.');

    const tx = transactions[txIndex];
    if (tx.status === 'RETURNED') throw new Error('This book copy has already been returned.');

    if (tx.returnStatus === 'PENDING_ADMIN_REVIEW') {
      throw new Error('You have already submitted a return request for this book. Awaiting Admin review.');
    }
    if (tx.returnStatus === 'APPROVED_VISIT_DESK') {
      throw new Error('Your return request is already APPROVED! Please visit the Central Library Circulation Desk to physically submit the book.');
    }

    const nowStr = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Update transaction returnStatus
    transactions[txIndex] = {
      ...tx,
      returnStatus: 'PENDING_ADMIN_REVIEW',
      returnRequestDate: nowStr,
      returnRemarks: remarks || 'Student initiated online return request.'
    };
    this.saveTransactions(transactions);

    // 2. Add to requests queue with type: 'RETURN'
    const requests = this.getRequests();
    const newReturnReq = {
      id: `RET-${Date.now().toString().slice(-4)}`,
      type: 'RETURN',
      transactionId: tx.id,
      userId: tx.userId,
      userName: tx.userName,
      userEnrollment: tx.userEnrollment,
      userEmail: tx.userEmail,
      userRole: tx.userRole,
      bookId: tx.bookId,
      bookName: tx.bookName,
      bookBarcode: tx.bookBarcode,
      requestDate: nowStr,
      status: 'PENDING',
      remarks: remarks || 'Student initiated online return request.'
    };
    requests.unshift(newReturnReq);
    this.saveRequests(requests);

    // 3. Log notification
    this.logEmail({
      recipient: tx.userEmail,
      studentName: tx.userName,
      bookName: tx.bookName,
      action: 'Book Return Request Submitted',
      subject: `MITS Library: Return Request Submitted for '${tx.bookName}'`,
      status: 'Delivered',
      notes: `Submitted on ${nowStr}. Awaiting librarian verification.`
    });

    return { transaction: transactions[txIndex], request: newReturnReq };
  },

  approveReturnRequest(requestIdOrTxId, adminName = 'Admin Superuser') {
    const requests = this.getRequests();
    const transactions = this.getTransactions();

    let reqIndex = requests.findIndex(r => r.id === requestIdOrTxId);
    let txId = reqIndex !== -1 ? requests[reqIndex].transactionId : requestIdOrTxId;

    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex === -1) throw new Error('Transaction record not found.');

    const tx = transactions[txIndex];
    const todayStr = new Date().toLocaleDateString('en-GB');

    // Update transaction
    transactions[txIndex] = {
      ...tx,
      returnStatus: 'APPROVED_VISIT_DESK',
      returnApprovedAt: todayStr,
      returnApprovedBy: adminName
    };
    this.saveTransactions(transactions);

    // Update request record if exists
    if (reqIndex !== -1) {
      requests[reqIndex] = {
        ...requests[reqIndex],
        status: 'APPROVED',
        remarks: 'Approved by librarian. Student must physically visit the circulation desk to submit the book.'
      };
      this.saveRequests(requests);
    }

    // Log notification
    this.logEmail({
      recipient: tx.userEmail,
      studentName: tx.userName,
      bookName: tx.bookName,
      action: 'Return Request Approved - Visit Library Desk',
      subject: `MITS Library: Return Request APPROVED for '${tx.bookName}'`,
      status: 'Delivered',
      notes: `Approved by ${adminName}. Action Required: Please physically visit the Central Library Circulation Desk (1st Floor) and hand over the book.`
    });

    return transactions[txIndex];
  },

  confirmPhysicalBookReturn(transactionId, adminName = 'Admin Superuser') {
    return this.returnBook(transactionId, adminName);
  },

  rejectReturnRequest(requestIdOrTxId, reason = 'Reported Damaged or Physical Verification Required', adminName = 'Admin Superuser') {
    const requests = this.getRequests();
    const transactions = this.getTransactions();

    let reqIndex = requests.findIndex(r => r.id === requestIdOrTxId);
    let txId = reqIndex !== -1 ? requests[reqIndex].transactionId : requestIdOrTxId;

    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex !== -1) {
      transactions[txIndex] = {
        ...transactions[txIndex],
        returnStatus: 'REJECTED',
        returnRejectionReason: reason
      };
      this.saveTransactions(transactions);
    }

    if (reqIndex !== -1) {
      requests[reqIndex] = {
        ...requests[reqIndex],
        status: 'REJECTED',
        rejectionReason: reason
      };
      this.saveRequests(requests);
    }

    return true;
  },

  // ---------------- BOOK HISTORY (COMPLETE ISSUING & RETURNING LIFECYCLE) ----------------
  getBookHistory(bookIdOrBarcode) {
    const books = this.getBooks();
    const cleanQuery = (bookIdOrBarcode || '').trim().toLowerCase();
    const book = books.find(b => b.id.toLowerCase() === cleanQuery || b.barcode.toLowerCase() === cleanQuery || b.name.toLowerCase() === cleanQuery);
    
    const transactions = this.getTransactions();
    const bookTransactions = transactions.filter(t => {
      if (book) {
        return t.bookId === book.id || t.bookBarcode?.toLowerCase() === book.barcode.toLowerCase();
      }
      return t.bookId?.toLowerCase() === cleanQuery || t.bookBarcode?.toLowerCase() === cleanQuery || t.bookName?.toLowerCase().includes(cleanQuery);
    });

    const totalIssues = bookTransactions.length;
    const activeLoans = bookTransactions.filter(t => t.status === 'ISSUED' || t.status === 'OVERDUE').length;
    const totalReturns = bookTransactions.filter(t => t.status === 'RETURNED').length;
    const pendingReturnRequests = bookTransactions.filter(t => t.returnStatus === 'PENDING_ADMIN_REVIEW' || t.returnStatus === 'APPROVED_VISIT_DESK').length;

    return {
      book: book || (bookTransactions.length > 0 ? {
        id: bookTransactions[0].bookId,
        name: bookTransactions[0].bookName,
        barcode: bookTransactions[0].bookBarcode,
        author: 'MITS Library Title',
        shelf: 'Central Reading Room'
      } : null),
      totalIssues,
      activeLoans,
      totalReturns,
      pendingReturnRequests,
      transactions: bookTransactions
    };
  },

  getAllBooksHistorySummary() {
    const books = this.getBooks();
    const transactions = this.getTransactions();

    return books.map(book => {
      const bookTxs = transactions.filter(t => t.bookId === book.id || t.bookBarcode === book.barcode);
      const activeCount = bookTxs.filter(t => t.status === 'ISSUED' || t.status === 'OVERDUE').length;
      const returnedCount = bookTxs.filter(t => t.status === 'RETURNED').length;
      const lastIssue = bookTxs[0] ? bookTxs[0].issueDate : 'Never Issued';

      return {
        ...book,
        totalIssuedCount: bookTxs.length,
        activeLoansCount: activeCount,
        returnedCount,
        lastIssueDate: lastIssue
      };
    });
  },

  // Return Book module
  returnBook(transactionId, adminName = 'Admin Superuser') {
    const transactions = this.getTransactions();
    const txIndex = transactions.findIndex(t => t.id === transactionId);
    if (txIndex === -1) throw new Error('Transaction record not found.');

    const tx = transactions[txIndex];
    if (tx.status === 'RETURNED') throw new Error('This book copy has already been returned.');

    const todayStr = new Date().toISOString().split('T')[0];

    const books = this.getBooks();
    const bookIndex = books.findIndex(b => b.id === tx.bookId);
    if (bookIndex !== -1) {
      books[bookIndex].availableQuantity = Math.min(books[bookIndex].totalQuantity, books[bookIndex].availableQuantity + 1);
      this.saveBooks(books);
    }

    const students = this.getStudents();
    const sIndex = students.findIndex(s => s.id === tx.userId);
    if (sIndex !== -1) {
      students[sIndex].issuedCount = Math.max(0, (students[sIndex].issuedCount || 1) - 1);
      if (tx.fineAmount > 0) {
        students[sIndex].fineAmount = (students[sIndex].fineAmount || 0) + tx.fineAmount;
      }
      this.saveStudents(students);
    }

    transactions[txIndex] = {
      ...tx,
      status: 'RETURNED',
      actualReturnDate: todayStr,
      returnStatus: 'COMPLETED',
      returnedTo: adminName
    };

    this.saveTransactions(transactions);

    // Also update any matching return request in requests
    const requests = this.getRequests();
    const retReqIndex = requests.findIndex(r => r.transactionId === transactionId && r.type === 'RETURN');
    if (retReqIndex !== -1) {
      requests[retReqIndex] = {
        ...requests[retReqIndex],
        status: 'COMPLETED',
        remarks: `Physical book copy received and verified at desk by ${adminName} on ${todayStr}.`
      };
      this.saveRequests(requests);
    }

    this.logEmail({
      recipient: tx.userEmail,
      studentName: tx.userName,
      bookName: tx.bookName,
      action: 'Physical Book Return Confirmed',
      subject: `MITS Library: Return confirmation for '${tx.bookName}'`,
      status: 'Delivered',
      notes: `Physically received and verified by ${adminName} on ${todayStr}. Inventory restocked (+1).`
    });

    if (transactionId.includes('-')) {
      issueService.returnBook({
        issueId: transactionId,
        returnedBy: 'a0000000-0000-0000-0000-000000000001'
      }).catch(e => console.warn(e));
    }

    return transactions[txIndex];
  },

  // ---------------- BOX 5: AUTOMATED EMAIL REMINDER & PENALTY SCHEDULER ----------------
  getEmailLogs() {
    return getFromStorage(STORAGE_KEYS.EMAIL_LOGS, initialEmailLogs);
  },

  saveEmailLogs(logs) {
    saveToStorage(STORAGE_KEYS.EMAIL_LOGS, logs);
  },

  logEmail({ recipient, studentName, bookName, action, subject, status = 'Delivered', notes = '' }) {
    const logs = this.getEmailLogs();
    const now = new Date();
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      recipient,
      studentName,
      bookName,
      action,
      subject,
      status,
      timestamp: now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes
    };
    logs.unshift(newLog);
    this.saveEmailLogs(logs);
    return newLog;
  },

  triggerAutomatedScheduler() {
    // Trigger Supabase RPC
    reminderService.triggerScheduler().catch(e => console.warn('Supabase reminder RPC notice:', e));

    const transactions = this.getTransactions();
    const settings = this.getSettings();
    const students = this.getStudents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let remindersSent = 0;
    let finesApplied = 0;
    let accountsSuspended = 0;

    const updatedTransactions = transactions.map(tx => {
      if (tx.status !== 'ISSUED' && tx.status !== 'OVERDUE') return tx;

      const due = new Date(tx.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let updatedTx = { ...tx };

      // 1. First Reminder: 7 days before due date
      if (diffDays <= settings.firstReminderDaysBefore && diffDays > settings.secondReminderDaysBefore && !tx.firstReminderSent) {
        updatedTx.firstReminderSent = true;
        remindersSent++;
        this.logEmail({
          recipient: tx.userEmail,
          studentName: tx.userName,
          bookName: tx.bookName,
          action: '7-Day Return Due Reminder',
          subject: `MITS Library Notice: 7-Day Return Due Reminder for '${tx.bookName}'`,
          status: 'Delivered',
          notes: `Due on ${tx.dueDate}. Reminder dispatched successfully.`
        });
      }

      // 2. Second Reminder: 1 day before due date
      if (diffDays <= settings.secondReminderDaysBefore && diffDays >= 0 && !tx.secondReminderSent) {
        updatedTx.secondReminderSent = true;
        remindersSent++;
        this.logEmail({
          recipient: tx.userEmail,
          studentName: tx.userName,
          bookName: tx.bookName,
          action: '1-Day Return Due Reminder',
          subject: `URGENT: Return '${tx.bookName}' Tomorrow by Due Date`,
          status: 'Delivered',
          notes: `Due tomorrow (${tx.dueDate}). Return to Central Library counter.`
        });
      }

      // 3. Penalty and overdue checks
      if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);
        const penaltyDays = Math.max(0, daysOverdue - settings.gracePeriodDays);
        const calculatedFine = penaltyDays * settings.finePerDay;

        updatedTx.status = 'OVERDUE';
        updatedTx.fineAmount = calculatedFine;

        if (!tx.penaltyNoticeSent) {
          updatedTx.penaltyNoticeSent = true;
          finesApplied++;
          this.logEmail({
            recipient: tx.userEmail,
            studentName: tx.userName,
            bookName: tx.bookName,
            action: 'URGENT: Overdue Book Notice & Fine Warning',
            subject: `URGENT: Overdue Book Notice & Fine Warning - Action Required`,
            status: 'Delivered',
            notes: `Days overdue: ${daysOverdue}. Current fine: ₹${calculatedFine}.`
          });
        }

        if (calculatedFine >= (settings.suspensionFineThreshold || 200) || daysOverdue >= 30) {
          const s = students.find(stud => stud.id === tx.userId);
          if (s && s.status !== 'SUSPENDED') {
            s.status = 'SUSPENDED';
            s.suspensionReason = `Automated policy enforcement: Overdue fine (₹${calculatedFine}) exceeded threshold on book '${tx.bookName}'.`;
            accountsSuspended++;
            this.logEmail({
              recipient: s.email,
              studentName: s.name,
              bookName: tx.bookName,
              action: 'Account Suspended Notice',
              subject: `MITS Library Account Suspended - Penalty Settlement Required`,
              status: 'Delivered',
              notes: `Suspended due to unreturned book and fine of ₹${calculatedFine}.`
            });
          }
        }
      }

      return updatedTx;
    });

    this.saveTransactions(updatedTransactions);
    this.saveStudents(students);

    return {
      remindersSent,
      finesApplied,
      accountsSuspended,
      timestamp: new Date().toLocaleTimeString()
    };
  },

  // ---------------- SETTINGS ----------------
  getSettings() {
    return getFromStorage(STORAGE_KEYS.SETTINGS, initialSettings);
  },

  saveSettings(settings) {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  },

  // ---------------- AUTHENTICATION & SESSION ----------------
  getCurrentUser() {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!stored) {
      return null;
    }
    try {
      const user = JSON.parse(stored);
      const email = (user?.email || '').toLowerCase().trim();
      const isStudent = email.endsWith('.ac.in');
      const isFacultyOrAdmin = email.endsWith('gwalior.in');
      if (!isStudent && !isFacultyOrAdmin) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        return null;
      }
      return user;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    notifyListeners();
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    authService.signOut().catch(e => console.warn(e));
    notifyListeners();
  },

  // ---------------- THEME ----------------
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  },

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    notifyListeners();
  },

  // ---------------- METRICS & REPORT EXPORTS ----------------
  getExecutiveMetrics() {
    const students = this.getStudents();
    const books = this.getBooks();
    const transactions = this.getTransactions();
    const requests = this.getRequests();

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'ACTIVE').length;

    const totalBooks = books.reduce((sum, b) => sum + (b.totalQuantity || 0), 0);
    const availableBooks = books.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);

    const totalTransactions = transactions.length;
    const currentlyIssued = transactions.filter(t => t.status === 'ISSUED' || t.status === 'OVERDUE').length;
    const overdueCount = transactions.filter(t => t.status === 'OVERDUE').length;
    const returnedCount = transactions.filter(t => t.status === 'RETURNED').length;

    const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;
    const totalPendingFines = transactions.reduce((sum, t) => sum + (t.status === 'OVERDUE' ? (t.fineAmount || 0) : 0), 0);

    return {
      totalStudents,
      activeStudents,
      totalBooks,
      availableBooks,
      totalTransactions,
      currentlyIssued,
      overdueCount,
      returnedCount,
      pendingRequestsCount,
      totalPendingFines
    };
  },

  exportToCSV(type = 'transactions') {
    let rows = [];
    let filename = `mits_library_${type}_${new Date().toISOString().split('T')[0]}.csv`;

    if (type === 'transactions') {
      const txs = this.getTransactions();
      rows = [
        ['Transaction ID', 'Book Name', 'Book Barcode', 'Student/Faculty Name', 'Enrollment', 'Email', 'Role', 'Issue Date', 'Due Date', 'Return Date', 'Status', 'Method', 'Issued By', 'Fine (INR)']
      ];
      txs.forEach(t => {
        rows.push([
          t.id,
          `"${t.bookName.replace(/"/g, '""')}"`,
          t.bookBarcode,
          `"${t.userName.replace(/"/g, '""')}"`,
          t.userEnrollment,
          t.userEmail,
          t.userRole,
          t.issueDate,
          t.dueDate,
          t.actualReturnDate || 'N/A',
          t.status,
          t.issueMethod,
          `"${t.issuedBy}"`,
          t.fineAmount || 0
        ]);
      });
    } else if (type === 'books') {
      const books = this.getBooks();
      rows = [
        ['Book ID', 'Book Name', 'Author', 'Subject', 'Category', 'ISBN', 'Barcode', 'Total Qty', 'Available Qty', 'Shelf Location']
      ];
      books.forEach(b => {
        rows.push([
          b.id,
          `"${b.name.replace(/"/g, '""')}"`,
          `"${b.author.replace(/"/g, '""')}"`,
          `"${b.subject.replace(/"/g, '""')}"`,
          b.category,
          b.isbn,
          b.barcode,
          b.totalQuantity,
          b.availableQuantity,
          `"${b.shelf}"`
        ]);
      });
    } else if (type === 'students') {
      const students = this.getStudents();
      rows = [
        ['Student ID', 'Name', 'Enrollment No', 'Email', 'Department', 'Semester', 'Batch', 'Status', 'Barcode', 'Issued Books', 'Pending Fines']
      ];
      students.forEach(s => {
        rows.push([
          s.id,
          `"${s.name.replace(/"/g, '""')}"`,
          s.enrollment,
          s.email,
          `"${s.department}"`,
          s.semester,
          s.batch,
          s.status,
          s.barcode,
          s.issuedCount || 0,
          s.fineAmount || 0
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Initialize background sync from Supabase
if (typeof window !== 'undefined') {
  db.syncFromSupabase();

  // Set up Supabase Realtime subscription
  try {
    supabase
      .channel('public:realtime_library')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => db.syncFromSupabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_issues' }, () => db.syncFromSupabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_issue_requests' }, () => db.syncFromSupabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => db.syncFromSupabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_reminders' }, () => db.syncFromSupabase())
      .subscribe();
  } catch (rtErr) {
    console.warn('Realtime subscription notice:', rtErr);
  }
}
