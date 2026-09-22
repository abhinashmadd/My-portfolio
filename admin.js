/**
 * ADMIN DASHBOARD SCRIPT - ABHINASH Maddeshiya
 * Handles authentication, real-time message sync, search, filtering,
 * read/starred toggles, Gmail reply generation, and CSV export.
 */

document.addEventListener('DOMContentLoaded', () => {

  const loginScreen = document.getElementById('loginScreen');
  const dashboardApp = document.getElementById('dashboardApp');
  const loginForm = document.getElementById('loginForm');
  const adminPassInput = document.getElementById('adminPassInput');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  // Metrics
  const metricTotalCount = document.getElementById('metricTotalCount');
  const metricUnreadCount = document.getElementById('metricUnreadCount');
  const metricStarredCount = document.getElementById('metricStarredCount');

  // Tabs & Search
  const searchInput = document.getElementById('searchInput');
  const filterTabs = document.querySelectorAll('.toolbar-tabs .filter-tab');
  const tabCountAll = document.getElementById('tabCountAll');
  const tabCountUnread = document.getElementById('tabCountUnread');
  const tabCountStarred = document.getElementById('tabCountStarred');
  const listSummaryText = document.getElementById('listSummaryText');
  const messagesList = document.getElementById('messagesList');

  // Detail View Elements
  const noSelectionState = document.getElementById('noSelectionState');
  const activeMessageCard = document.getElementById('activeMessageCard');
  const detailAvatar = document.getElementById('detailAvatar');
  const detailSenderName = document.getElementById('detailSenderName');
  const detailSenderEmail = document.getElementById('detailSenderEmail');
  const detailTimestamp = document.getElementById('detailTimestamp');
  const detailSubjectText = document.getElementById('detailSubjectText');
  const detailMessageBody = document.getElementById('detailMessageBody');
  const replyGmailBtn = document.getElementById('replyGmailBtn');
  const detailStarBtn = document.getElementById('detailStarBtn');
  const detailReadBtn = document.getElementById('detailReadBtn');
  const detailDeleteBtn = document.getElementById('detailDeleteBtn');

  // Toolbar Actions
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const sendTestMsgBtn = document.getElementById('sendTestMsgBtn');

  // App State
  let messages = [];
  let activeMessageId = null;
  let currentFilter = 'all'; // 'all', 'unread', 'starred'
  let searchQuery = '';

  // ========================================================================
  // 1. AUTHENTICATION & SESSION MANAGEMENT
  // ========================================================================
  function checkSession() {
    const token = sessionStorage.getItem('am_admin_session');
    if (token) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    loginScreen.style.display = 'flex';
    dashboardApp.style.display = 'none';
  }

  function showDashboard() {
    loginScreen.style.display = 'none';
    dashboardApp.style.display = 'block';
    fetchMessages();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.textContent = '';
      const enteredPass = adminPassInput.value.trim();

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: enteredPass })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          sessionStorage.setItem('am_admin_session', data.token);
          showToast('Welcome back, Abhinash!', 'success');
          showDashboard();
        } else {
          loginError.textContent = data.error || 'Incorrect passcode. Try again.';
        }
      } catch (err) {
        // Fallback check if running purely static
        if (enteredPass === 'Abhi0819@') {
          sessionStorage.setItem('am_admin_session', 'static_token_ok');
          showToast('Authenticated in offline mode', 'success');
          showDashboard();
        } else {
          loginError.textContent = 'Incorrect passcode.';
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('am_admin_session');
      showToast('Logged out of Admin Portal', 'info');
      showLogin();
    });
  }

  // ========================================================================
  // 2. DATA FETCHING & SYNCHRONIZATION
  // ========================================================================
  async function fetchMessages() {
    try {
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        messages = data.messages || [];
        localStorage.setItem('am_portfolio_messages', JSON.stringify(messages));
      } else {
        throw new Error('API unavailable');
      }
    } catch (err) {
      // Fallback: read from localStorage
      const cached = localStorage.getItem('am_portfolio_messages');
      if (cached) {
        try {
          messages = JSON.parse(cached);
        } catch (e) {
          messages = [];
        }
      }
    }

    renderAll();
  }

  // ========================================================================
  // 3. UI RENDERING & FILTERING
  // ========================================================================
  function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.round((now - date) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getFilteredMessages() {
    return messages.filter(item => {
      // Tab filter
      if (currentFilter === 'unread' && item.isRead) return false;
      if (currentFilter === 'starred' && !item.isStarred) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesEmail = (item.email || '').toLowerCase().includes(q);
        const matchesSubject = (item.subject || '').toLowerCase().includes(q);
        const matchesMsg = (item.message || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesSubject || matchesMsg;
      }

      return true;
    });
  }

  function updateMetrics() {
    const total = messages.length;
    const unread = messages.filter(m => !m.isRead).length;
    const starred = messages.filter(m => m.isStarred).length;

    metricTotalCount.textContent = total;
    metricUnreadCount.textContent = unread;
    metricStarredCount.textContent = starred;

    tabCountAll.textContent = total;
    tabCountUnread.textContent = unread;
    tabCountStarred.textContent = starred;
  }

  function renderList() {
    const filtered = getFilteredMessages();
    listSummaryText.textContent = `Showing ${filtered.length} of ${messages.length} messages`;

    if (filtered.length === 0) {
      messagesList.innerHTML = `
        <div class="empty-list-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
          <p>No inquiries found matching criteria.</p>
        </div>
      `;
      return;
    }

    messagesList.innerHTML = filtered.map(msg => {
      const isActive = msg.id === activeMessageId;
      const unreadClass = !msg.isRead ? 'unread' : '';
      const activeClass = isActive ? 'active' : '';

      return `
        <div class="msg-list-item ${unreadClass} ${activeClass}" data-id="${msg.id}">
          <div class="msg-item-top">
            <span class="msg-sender-name">${escapeHTML(msg.name)}</span>
            <span class="msg-time-badge">${formatRelativeTime(msg.timestamp)}</span>
          </div>
          <div class="msg-item-subject">${escapeHTML(msg.subject)}</div>
          <div class="msg-snippet">${escapeHTML(msg.message)}</div>
          <div class="msg-status-icons">
            ${!msg.isRead ? '<span class="unread-dot" title="Unread"></span>' : ''}
            ${msg.isStarred ? '<span class="star-indicator" title="Starred">★</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards
    document.querySelectorAll('.msg-list-item').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        selectMessage(id);
      });
    });
  }

  function renderDetail() {
    const activeMsg = messages.find(m => m.id === activeMessageId);

    if (!activeMsg) {
      noSelectionState.style.display = 'block';
      activeMessageCard.style.display = 'none';
      return;
    }

    noSelectionState.style.display = 'none';
    activeMessageCard.style.display = 'flex';

    detailAvatar.textContent = (activeMsg.name || 'A').charAt(0).toUpperCase();
    detailSenderName.textContent = activeMsg.name;
    detailSenderEmail.textContent = activeMsg.email;
    detailSenderEmail.href = `mailto:${activeMsg.email}`;
    detailTimestamp.textContent = new Date(activeMsg.timestamp).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    detailSubjectText.textContent = activeMsg.subject;
    detailMessageBody.textContent = activeMsg.message;

    // Configure Direct Gmail Reply button
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(activeMsg.email)}&su=${encodeURIComponent('Re: ' + activeMsg.subject)}&body=${encodeURIComponent('Hi ' + activeMsg.name + ',\n\nThank you for reaching out via my portfolio website.\n\nBest regards,\nAbhinash Maddeshiya')}`;
    replyGmailBtn.href = gmailUrl;

    // Toggle Read Button appearance
    if (activeMsg.isRead) {
      detailReadBtn.title = 'Mark as Unread';
      detailReadBtn.style.color = 'var(--text-secondary)';
    } else {
      detailReadBtn.title = 'Mark as Read';
      detailReadBtn.style.color = 'var(--accent-cyan)';
    }

    // Toggle Star Button appearance
    if (activeMsg.isStarred) {
      detailStarBtn.classList.add('active-star');
      detailStarBtn.title = 'Unstar';
    } else {
      detailStarBtn.classList.remove('active-star');
      detailStarBtn.title = 'Star';
    }
  }

  function selectMessage(id) {
    activeMessageId = id;

    // Automatically mark message as read on click
    const target = messages.find(m => m.id === id);
    if (target && !target.isRead) {
      target.isRead = true;
      persistStatus(id, { isRead: true });
    }

    renderAll();
  }

  function renderAll() {
    updateMetrics();
    renderList();
    renderDetail();
  }

  // ========================================================================
  // 4. MESSAGE ACTIONS (STAR, READ, DELETE, PERSIST)
  // ========================================================================
  async function persistStatus(id, updates) {
    try {
      await fetch(`/api/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      // Local fallback
      localStorage.setItem('am_portfolio_messages', JSON.stringify(messages));
    }
    updateMetrics();
  }

  if (detailReadBtn) {
    detailReadBtn.addEventListener('click', () => {
      const activeMsg = messages.find(m => m.id === activeMessageId);
      if (!activeMsg) return;

      activeMsg.isRead = !activeMsg.isRead;
      persistStatus(activeMsg.id, { isRead: activeMsg.isRead });
      showToast(activeMsg.isRead ? 'Marked as read' : 'Marked as unread', 'info');
      renderAll();
    });
  }

  if (detailStarBtn) {
    detailStarBtn.addEventListener('click', () => {
      const activeMsg = messages.find(m => m.id === activeMessageId);
      if (!activeMsg) return;

      activeMsg.isStarred = !activeMsg.isStarred;
      persistStatus(activeMsg.id, { isStarred: activeMsg.isStarred });
      showToast(activeMsg.isStarred ? 'Message starred' : 'Message unstarred', 'info');
      renderAll();
    });
  }

  if (detailDeleteBtn) {
    detailDeleteBtn.addEventListener('click', async () => {
      if (!activeMessageId) return;

      const confirmed = confirm('Are you sure you want to permanently delete this inquiry?');
      if (!confirmed) return;

      try {
        await fetch(`/api/messages/${activeMessageId}`, { method: 'DELETE' });
      } catch (e) {
        // Fallback
      }

      messages = messages.filter(m => m.id !== activeMessageId);
      localStorage.setItem('am_portfolio_messages', JSON.stringify(messages));
      showToast('Message deleted successfully', 'success');

      activeMessageId = messages.length > 0 ? messages[0].id : null;
      renderAll();
    });
  }

  // ========================================================================
  // 5. TOOLBAR: SEARCH, TABS, TEST INQUIRY, CSV EXPORT
  // ========================================================================
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderList();
    });
  }

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      renderList();
    });
  });

  if (refreshDataBtn) {
    refreshDataBtn.addEventListener('click', async () => {
      showToast('Syncing with server...', 'info');
      await fetchMessages();
      showToast('Data refreshed successfully', 'success');
    });
  }

  // Generate Test Inquiry
  if (sendTestMsgBtn) {
    sendTestMsgBtn.addEventListener('click', async () => {
      const sampleNames = ['Rohan Kapoor', 'Ananya Gupta', 'Vikramaditya Sengupta', 'Deepika Nair'];
      const sampleRoles = ['HR Talent Partner', 'Technical Recruiter', 'AI Research Lab Lead', 'Lead Software Architect'];
      const randomIdx = Math.floor(Math.random() * sampleNames.length);

      const testMsg = {
        name: sampleNames[randomIdx],
        email: `${sampleNames[randomIdx].toLowerCase().replace(' ', '.')}@example.com`,
        subject: `Technical Opportunity / Inquiry regarding ${sampleRoles[randomIdx]}`,
        message: `Hello Abhinash, we reviewed your work on Kissan Valley and the AI CA Automation platform. We would love to discuss potential opportunities or project collaboration with you.`
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testMsg)
        });
        const data = await res.json();
        showToast('New test inquiry received and stored!', 'success');
        await fetchMessages();
        selectMessage(data.id || messages[0].id);
      } catch (err) {
        // Fallback local
        const newEntry = {
          id: 'msg_local_' + Date.now(),
          ...testMsg,
          timestamp: new Date().toISOString(),
          isRead: false,
          isStarred: false
        };
        messages.unshift(newEntry);
        localStorage.setItem('am_portfolio_messages', JSON.stringify(messages));
        showToast('Test inquiry created in local storage', 'success');
        renderAll();
        selectMessage(newEntry.id);
      }
    });
  }

  // Export to CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (messages.length === 0) {
        showToast('No messages available to export', 'error');
        return;
      }

      const headers = ['ID', 'Date', 'Name', 'Email', 'Subject', 'Message', 'IsRead', 'IsStarred'];
      const rows = messages.map(m => [
        `"${m.id}"`,
        `"${m.timestamp}"`,
        `"${(m.name || '').replace(/"/g, '""')}"`,
        `"${(m.email || '').replace(/"/g, '""')}"`,
        `"${(m.subject || '').replace(/"/g, '""')}"`,
        `"${(m.message || '').replace(/"/g, '""')}"`,
        m.isRead,
        m.isStarred
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `portfolio_inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('CSV export downloaded', 'success');
    });
  }

  // ========================================================================
  // 6. TOAST NOTIFICATIONS & UTILITIES
  // ========================================================================
  const toastContainer = document.getElementById('toastContainer');

  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slide-out-right 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // Initialize
  checkSession();

});
