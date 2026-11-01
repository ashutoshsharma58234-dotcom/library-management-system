import { supabase } from './supabaseClient';

// =================================================================
// 1. AUTHENTICATION SERVICE
// =================================================================
export const authService = {
  async signUp({ email, password, full_name, enrollment_number, department, phone_number, role = 'student' }) {
    const cleanEmail = (email || '').trim().toLowerCase();

    // Verify institute domain
    if (!cleanEmail.endsWith('@mitsgwl.ac.in') && !cleanEmail.endsWith('@mitsgwalior.in')) {
      throw new Error('Registration requires an official MITS College email (@mitsgwl.ac.in or @mitsgwalior.in).');
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name,
          enrollment_number: enrollment_number ? enrollment_number.toUpperCase().trim() : null,
          department: department || 'Information Technology',
          phone_number: phone_number || null,
          role
        }
      }
    });

    if (error) throw error;

    // Fetch newly created profile
    let profile = null;
    if (data.user) {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      profile = p;
    }

    return { user: data.user, session: data.session, profile };
  },

  async signIn({ email, password }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) throw error;

    // Fetch profile
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profError) {
      console.warn('Profile fetch warning:', profError.message);
    }

    if (profile && profile.account_status === 'suspended') {
      await supabase.auth.signOut();
      throw new Error('Your library privileges are SUSPENDED. Please contact library administration.');
    }

    return { user: data.user, session: data.session, profile };
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Sign out error:', error);
  },

  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return { user: session.user, session, profile };
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      let profile = null;
      if (session?.user) {
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        profile = p;
      }
      callback(event, session, profile);
    });
  }
};

// =================================================================
// 2. USER PROFILES SERVICE
// =================================================================
export const profileService = {
  async getProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getProfileById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async updateAccountStatus(id, status, reason = '') {
    const { data, error } = await supabase
      .from('profiles')
      .update({ account_status: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Log to audit log
    await supabase.from('admin_audit_logs').insert({
      action: `ACCOUNT_STATUS_${status.toUpperCase()}`,
      table_name: 'profiles',
      record_id: id,
      details: { reason, status }
    });

    return data;
  }
};

// =================================================================
// 3. BOOKS INVENTORY SERVICE
// =================================================================
export const bookService = {
  async getBooks(search = '', category = 'ALL') {
    let query = supabase.from('books').select('*').order('created_at', { ascending: false });

    if (category && category !== 'ALL') {
      query = query.eq('subject', category);
    }
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`book_name.ilike.%${s}%,author_name.ilike.%${s}%,barcode.ilike.%${s}%,isbn.ilike.%${s}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async addBook(bookData) {
    const { data, error } = await supabase
      .from('books')
      .insert({
        book_name: bookData.name || bookData.book_name,
        author_name: bookData.author || bookData.author_name,
        subject: bookData.subject || 'Computer Science',
        description: bookData.description || '',
        isbn: bookData.isbn || null,
        barcode: bookData.barcode,
        total_quantity: Number(bookData.totalQuantity || bookData.total_quantity) || 1,
        available_quantity: Number(bookData.totalQuantity || bookData.available_quantity) || 1,
        cover_image: bookData.coverImage || bookData.cover_image || null
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBook(id, bookData) {
    const payload = {};
    if (bookData.name || bookData.book_name) payload.book_name = bookData.name || bookData.book_name;
    if (bookData.author || bookData.author_name) payload.author_name = bookData.author || bookData.author_name;
    if (bookData.subject) payload.subject = bookData.subject;
    if (bookData.isbn !== undefined) payload.isbn = bookData.isbn;
    if (bookData.barcode) payload.barcode = bookData.barcode;
    if (bookData.description !== undefined) payload.description = bookData.description;
    if (bookData.coverImage || bookData.cover_image) payload.cover_image = bookData.coverImage || bookData.cover_image;
    if (bookData.totalQuantity !== undefined) payload.total_quantity = Number(bookData.totalQuantity);
    if (bookData.availableQuantity !== undefined) payload.available_quantity = Number(bookData.availableQuantity);
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('books')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteBook(id) {
    // Check if issued
    const { data: activeIssues } = await supabase
      .from('book_issues')
      .select('id')
      .eq('book_id', id)
      .in('status', ['issued', 'overdue']);

    if (activeIssues && activeIssues.length > 0) {
      throw new Error('Cannot delete this book: active copies are currently checked out.');
    }

    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async uploadBookCover(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `cover_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('book-covers')
      .getPublicUrl(filePath);

    return publicUrl;
  }
};

// =================================================================
// 4. BOOK ISSUING & RETURN SERVICE (RPC BACKED)
// =================================================================
export const issueService = {
  async issueBookBarcode({ studentId, bookId, method = 'barcode', issuedBy }) {
    const { data, error } = await supabase.rpc('issue_book', {
      p_student_id: studentId,
      p_book_id: bookId,
      p_issue_method: method,
      p_issued_by: issuedBy
    });
    if (error) throw error;
    return data;
  },

  async returnBook({ issueId, returnedBy }) {
    const { data, error } = await supabase.rpc('return_book', {
      p_issue_id: issueId,
      p_returned_by: returnedBy
    });
    if (error) throw error;
    return data;
  },

  async getActiveIssues() {
    const { data, error } = await supabase
      .from('book_issues')
      .select(`
        *,
        books:book_id(id, book_name, author_name, barcode, cover_image),
        profiles:student_id(id, full_name, enrollment_number, email, role, phone_number)
      `)
      .in('status', ['issued', 'overdue'])
      .order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAllTransactions() {
    const { data, error } = await supabase
      .from('book_issues')
      .select(`
        *,
        books:book_id(id, book_name, author_name, barcode, cover_image),
        profiles:student_id(id, full_name, enrollment_number, email, role, phone_number),
        penalties:penalties(amount, status)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};

// =================================================================
// 5. ONLINE BOOK ISSUE REQUESTS SERVICE
// =================================================================
export const requestService = {
  async submitRequest({ studentId, bookId }) {
    const { data, error } = await supabase
      .from('book_issue_requests')
      .insert({
        student_id: studentId,
        book_id: bookId,
        status: 'pending'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getRequests() {
    const { data, error } = await supabase
      .from('book_issue_requests')
      .select(`
        *,
        books:book_id(id, book_name, author_name, barcode, cover_image, available_quantity),
        profiles:student_id(id, full_name, enrollment_number, email, role, phone_number)
      `)
      .order('request_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async approveRequest(requestId, adminId) {
    const { data, error } = await supabase.rpc('approve_issue_request', {
      p_request_id: requestId,
      p_admin_id: adminId
    });
    if (error) throw error;
    return data;
  },

  async rejectRequest(requestId, adminId, reason = 'Not available / Quota exceeded') {
    const { data, error } = await supabase.rpc('reject_issue_request', {
      p_request_id: requestId,
      p_admin_id: adminId,
      p_reason: reason
    });
    if (error) throw error;
    return data;
  }
};

// =================================================================
// 6. AUTOMATED REMINDERS & CRON SCHEDULER
// =================================================================
export const reminderService = {
  async getReminders() {
    const { data, error } = await supabase
      .from('email_reminders')
      .select(`
        *,
        book_issues:book_issue_id(due_date, books:book_id(book_name)),
        profiles:student_id(full_name, email)
      `)
      .order('sent_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async triggerScheduler() {
    const { data, error } = await supabase.rpc('process_email_reminders');
    if (error) throw error;
    return data;
  }
};

// =================================================================
// 7. LIBRARY SETTINGS & METRICS
// =================================================================
export const settingsService = {
  async getSettings() {
    const { data, error } = await supabase
      .from('library_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return data;
  },

  async updateSettings(settingsData) {
    const { data, error } = await supabase
      .from('library_settings')
      .update({ ...settingsData, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const metricsService = {
  async getExecutiveMetrics() {
    try {
      const [
        { count: totalStudents },
        { count: activeStudents },
        { data: booksData },
        { count: totalTransactions },
        { count: currentlyIssued },
        { count: overdueCount },
        { count: pendingRequestsCount },
        { data: penaltiesData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').eq('account_status', 'active'),
        supabase.from('books').select('total_quantity, available_quantity'),
        supabase.from('book_issues').select('*', { count: 'exact', head: true }),
        supabase.from('book_issues').select('*', { count: 'exact', head: true }).in('status', ['issued', 'overdue']),
        supabase.from('book_issues').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from('book_issue_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('penalties').select('amount').eq('status', 'pending')
      ]);

      const totalBooks = (booksData || []).reduce((sum, b) => sum + (b.total_quantity || 0), 0);
      const availableBooks = (booksData || []).reduce((sum, b) => sum + (b.available_quantity || 0), 0);
      const totalPendingFines = (penaltiesData || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

      return {
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        totalBooks,
        availableBooks,
        totalTransactions: totalTransactions || 0,
        currentlyIssued: currentlyIssued || 0,
        overdueCount: overdueCount || 0,
        pendingRequestsCount: pendingRequestsCount || 0,
        totalPendingFines
      };
    } catch (e) {
      console.error('Error fetching Supabase metrics:', e);
      return null;
    }
  }
};
