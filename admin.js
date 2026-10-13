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
  // 1. AUTHENTICATION, ROLES & SESSION MANAGEMENT
  // ========================================================================
  let selectedLoginRole = 'admin'; // 'admin' or 'recruiter'

  // Role Tab Switching
  const roleTabAdmin = document.getElementById('roleTabAdmin');
  const roleTabRecruiter = document.getElementById('roleTabRecruiter');
  const passcodeGroup = document.getElementById('passcodeGroup');
  const passcodeLabel = document.getElementById('passcodeLabel');
  const loginBtnText = document.getElementById('loginBtnText');

  function updateRoleTabUI(role) {
    selectedLoginRole = role;
    if (role === 'admin') {
      if (roleTabAdmin) {
        roleTabAdmin.style.background = 'var(--accent-primary, #00f0ff)';
        roleTabAdmin.style.color = '#0a0d14';
      }
      if (roleTabRecruiter) {
        roleTabRecruiter.style.background = 'transparent';
        roleTabRecruiter.style.color = 'var(--text-muted, #94a3b8)';
      }
      if (passcodeLabel) passcodeLabel.textContent = 'Admin Passcode';
      if (adminPassInput) {
        adminPassInput.placeholder = 'Enter admin passcode';
        adminPassInput.required = true;
      }
      if (loginBtnText) loginBtnText.textContent = 'Access as Admin';
    } else {
      if (roleTabRecruiter) {
        roleTabRecruiter.style.background = '#10b981';
        roleTabRecruiter.style.color = '#0a0d14';
      }
      if (roleTabAdmin) {
        roleTabAdmin.style.background = 'transparent';
        roleTabAdmin.style.color = 'var(--text-muted, #94a3b8)';
      }
      if (passcodeLabel) passcodeLabel.textContent = 'Recruiter Passcode (Optional: Press Access directly)';
      if (adminPassInput) {
        adminPassInput.placeholder = 'Press access or enter Recruiter2026';
        adminPassInput.required = false;
      }
      if (loginBtnText) loginBtnText.textContent = 'Access as Recruiter (Review Mode)';
    }
  }

  if (roleTabAdmin) {
    roleTabAdmin.addEventListener('click', () => updateRoleTabUI('admin'));
  }
  if (roleTabRecruiter) {
    roleTabRecruiter.addEventListener('click', () => updateRoleTabUI('recruiter'));
  }

  async function checkSession() {
    const token = sessionStorage.getItem('am_admin_session');
    if (!token) {
      showLogin();
      return;
    }

    // Attempt token verification against server with credentials
    try {
      const res = await fetch('/api/admin/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-Token': token
        },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.roleMapping) {
          sessionStorage.setItem('am_admin_role', data.roleMapping.role);
          sessionStorage.setItem('am_admin_role_details', JSON.stringify(data.roleMapping));
        }
      }
    } catch (e) {
      // Offline fallback preserves existing session
    }

    showDashboard();
  }

  function showLogin() {
    loginScreen.style.display = 'flex';
    dashboardApp.style.display = 'none';
  }

  function updateRoleBadgeUI() {
    const activeRoleText = document.getElementById('activeRoleText');
    const activeRoleBadge = document.getElementById('activeRoleBadge');
    const role = sessionStorage.getItem('am_admin_role') || 'admin';

    if (!activeRoleText) return;

    if (role === 'admin') {
      activeRoleText.textContent = 'Admin · Full Access';
      if (activeRoleBadge) {
        activeRoleBadge.style.borderColor = 'rgba(0, 240, 255, 0.4)';
        activeRoleBadge.style.color = 'var(--accent-primary, #00f0ff)';
      }
      if (detailDeleteBtn) {
        detailDeleteBtn.style.opacity = '1';
        detailDeleteBtn.removeAttribute('title');
      }
    } else if (role === 'recruiter') {
      activeRoleText.textContent = 'Recruiter · Review Mode';
      if (activeRoleBadge) {
        activeRoleBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        activeRoleBadge.style.color = '#10b981';
      }
      if (detailDeleteBtn) {
        detailDeleteBtn.title = 'Inquiry deletion is restricted to Lead Administrator';
      }
    } else {
      activeRoleText.textContent = 'Guest · Demo Mode';
      if (activeRoleBadge) {
        activeRoleBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        activeRoleBadge.style.color = '#f59e0b';
      }
    }
  }

  function updateDbStatusUI() {
    const dbStatusText = document.getElementById('dbStatusText');
    const dbStatusHeading = document.getElementById('dbStatusHeading');
    const dbStatusDesc = document.getElementById('dbStatusDesc');
    const dbStatusBadge = document.getElementById('dbStatusBadge');

    if (!dbStatusText) return;

    if (window.PortfolioDB && window.PortfolioDB.isReady()) {
      dbStatusText.textContent = 'Cloud Firestore Connected';
      dbStatusHeading.textContent = 'Firebase Cloud Database Active';
      dbStatusDesc.textContent = 'Live centralized sync enabled: All visitor messages from any device across the internet appear here in real time.';
      if (dbStatusBadge) {
        dbStatusBadge.style.borderColor = 'rgba(0, 240, 255, 0.4)';
        dbStatusBadge.style.color = 'var(--accent-primary)';
      }
    } else {
      dbStatusText.textContent = 'Local Mode (Cloud DB Setup Available)';
      dbStatusHeading.textContent = 'Cloud Database Setup';
      dbStatusDesc.innerHTML = 'To receive live messages from viewers on other devices without a backend, open <code>firebase-config.js</code> and paste your free Firebase project credentials.';
      if (dbStatusBadge) {
        dbStatusBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        dbStatusBadge.style.color = '#f59e0b';
      }
    }
  }

  let dbUnsubscribe = null;

  function showDashboard() {
    loginScreen.style.display = 'none';
    dashboardApp.style.display = 'block';
    updateRoleBadgeUI();
    updateDbStatusUI();
    fetchMessages();

    // Set up realtime Firestore subscription if available
    if (window.PortfolioDB && window.PortfolioDB.isReady() && !dbUnsubscribe) {
      dbUnsubscribe = window.PortfolioDB.subscribeToMessages((cloudMessages) => {
        if (cloudMessages && cloudMessages.length > 0) {
          console.log('[PortfolioDB] Realtime messages update received:', cloudMessages.length);
          messages = cloudMessages;
          localStorage.setItem('am_portfolio_messages', JSON.stringify(messages));
          renderAll();
        }
      });
    }
  }

  let currentMfaTempToken = null;

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.textContent = '';
      const mfaError = document.getElementById('mfaError');
      if (mfaError) mfaError.textContent = '';

      const mfaGroup = document.getElementById('mfaGroup');
      const passcodeGroup = document.getElementById('passcodeGroup');
      const mfaCodeInput = document.getElementById('mfaCodeInput');
      const loginBtnText = document.getElementById('loginBtnText');

      // Step 2: Handle TOTP MFA Validation
      if (currentMfaTempToken) {
        const enteredCode = mfaCodeInput ? mfaCodeInput.value.trim() : '';
        if (!enteredCode) {
          if (mfaError) mfaError.textContent = 'Please enter your 6-digit TOTP code or recovery key.';
          return;
        }

        try {
          const mfaRes = await fetch('/api/admin/mfa/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ tempToken: currentMfaTempToken, code: enteredCode })
          });
          const mfaData = await mfaRes.json();
          if (mfaRes.ok && mfaData.success) {
            sessionStorage.setItem('am_admin_session', mfaData.token);
            sessionStorage.setItem('am_admin_role', 'admin');
            if (mfaData.roleMapping) {
              sessionStorage.setItem('am_admin_role_details', JSON.stringify(mfaData.roleMapping));
            }
            showToast('Two-factor authentication verified. Welcome back, Lead Admin!', 'success');
            currentMfaTempToken = null;
            if (mfaGroup) mfaGroup.style.display = 'none';
            if (passcodeGroup) passcodeGroup.style.display = 'block';
            if (loginBtnText) loginBtnText.textContent = 'Access as Admin';
            showDashboard();
            return;
          } else {
            if (mfaError) mfaError.textContent = mfaData.error || 'Invalid authentication code.';
            return;
          }
        } catch (err) {
          if (mfaError) mfaError.textContent = 'Error verifying code. Please check server connection.';
          return;
        }
      }

      // Step 1: Initial Login with Passcode / Role
      const enteredPass = adminPassInput.value.trim();

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            password: enteredPass,
            role: selectedLoginRole
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // If server requires 2FA second factor
          if (data.mfaRequired && data.tempToken) {
            currentMfaTempToken = data.tempToken;
            if (passcodeGroup) passcodeGroup.style.display = 'none';
            if (mfaGroup) {
              mfaGroup.style.display = 'block';
              if (mfaCodeInput) mfaCodeInput.focus();
            }
            if (loginBtnText) loginBtnText.textContent = 'Verify 2FA Code';
            showToast('Passcode confirmed. Please enter your 6-digit TOTP code.', 'info');
            return;
          }

          sessionStorage.setItem('am_admin_session', data.token);
          const mappedRole = (data.roleMapping && data.roleMapping.role) || (data.user && data.user.role) || selectedLoginRole;
          sessionStorage.setItem('am_admin_role', mappedRole);
          if (data.roleMapping) {
            sessionStorage.setItem('am_admin_role_details', JSON.stringify(data.roleMapping));
          }

          if (mappedRole === 'admin') {
            showToast('Welcome back, Abhinash (Lead Admin)!', 'success');
          } else {
            showToast('Welcome! Logged in with Recruiter Review permissions.', 'success');
          }
          showDashboard();
        } else {
          loginError.textContent = data.error || 'Incorrect passcode. Try again.';
        }
      } catch (err) {
        // Fallback for purely static hosting (e.g. GitHub Pages without live Node.js backend)
        if (selectedLoginRole === 'admin') {
          if (enteredPass === 'Abhi0819@') {
            sessionStorage.setItem('am_admin_session', 'static_admin_session_' + Date.now());
            sessionStorage.setItem('am_admin_role', 'admin');
            showToast('Welcome back, Abhinash (Lead Admin)!', 'success');
            showDashboard();
          } else {
            loginError.textContent = 'Incorrect admin passcode. Try again.';
          }
        } else {
          sessionStorage.setItem('am_admin_session', 'demo_token_' + selectedLoginRole);
          sessionStorage.setItem('am_admin_role', selectedLoginRole);
          showToast(`Authenticated in review mode (${selectedLoginRole})`, 'info');
          showDashboard();
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const activeToken = sessionStorage.getItem('am_admin_session');
      if (activeToken) {
        try {
          await fetch('/api/admin/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${activeToken}` }
          });
        } catch {
          // Network errors during logout are non-blocking
        }
      }
      if (dbUnsubscribe) {
        try { dbUnsubscribe(); } catch (e) {}
        dbUnsubscribe = null;
      }
      sessionStorage.removeItem('am_admin_session');
      sessionStorage.removeItem('am_admin_role');
      sessionStorage.removeItem('am_admin_role_details');
      showToast('Logged out of Admin Portal. Session revoked.', 'info');
      showLogin();
    });
  }

  // --- Security & MFA Modal Controller ---
  const securitySettingsBtn = document.getElementById('securitySettingsBtn');
  const mfaModal = document.getElementById('mfaModal');
  const closeMfaModalBtn = document.getElementById('closeMfaModalBtn');
  const mfaStatusText = document.getElementById('mfaStatusText');
  const mfaActionContainer = document.getElementById('mfaActionContainer');
  const mfaSetupSection = document.getElementById('mfaSetupSection');
  const mfaSecretDisplay = document.getElementById('mfaSecretDisplay');
  const mfaSetupCodeInput = document.getElementById('mfaSetupCodeInput');
  const mfaSetupError = document.getElementById('mfaSetupError');
  const confirmMfaSetupBtn = document.getElementById('confirmMfaSetupBtn');
  const mfaBackupSection = document.getElementById('mfaBackupSection');
  const mfaRecoveryKeysList = document.getElementById('mfaRecoveryKeysList');
  const doneMfaSetupBtn = document.getElementById('doneMfaSetupBtn');

  let activeSetupSecret = '';
  let activeRecoveryCodes = [];

  async function checkMfaStatus() {
    const token = sessionStorage.getItem('am_admin_session');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/mfa/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.mfaEnabled) {
          mfaStatusText.textContent = 'Active (Protected with TOTP)';
          mfaStatusText.style.color = '#10b981';
          mfaActionContainer.innerHTML = `
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">Your administrator account requires a 6-digit TOTP code on login.</p>
            <button type="button" id="disableMfaBtn" class="btn btn-outline btn-sm" style="color:#ef4444; border-color:rgba(239,68,68,0.4);">Disable Two-Factor Authentication</button>
          `;
          const disableBtn = document.getElementById('disableMfaBtn');
          if (disableBtn) {
            disableBtn.addEventListener('click', async () => {
              const pass = prompt('Enter your administrator password to disable 2FA:');
              if (!pass) return;
              const disRes = await fetch('/api/admin/mfa/disable', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: pass })
              });
              const disData = await disRes.json();
              if (disRes.ok && disData.success) {
                showToast('Two-factor authentication disabled.', 'info');
                checkMfaStatus();
              } else {
                alert(disData.error || 'Failed to disable 2FA.');
              }
            });
          }
        } else {
          mfaStatusText.textContent = 'Disabled (Single Factor)';
          mfaStatusText.style.color = '#f59e0b';
          mfaActionContainer.innerHTML = `
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">Protect your admin portal with an authenticator app (Google Authenticator, Microsoft Authenticator, etc.).</p>
            <button type="button" id="startMfaSetupBtn" class="btn btn-primary btn-sm">Set Up Two-Factor Authentication</button>
          `;
          const startBtn = document.getElementById('startMfaSetupBtn');
          if (startBtn) {
            startBtn.addEventListener('click', startMfaSetup);
          }
        }
      }
    } catch {
      mfaStatusText.textContent = 'Server Unreachable';
    }
  }

  async function startMfaSetup() {
    const token = sessionStorage.getItem('am_admin_session');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/mfa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        activeSetupSecret = data.secret;
        activeRecoveryCodes = data.recoveryCodes || [];
        mfaSecretDisplay.textContent = activeSetupSecret;
        mfaSetupSection.style.display = 'block';
        mfaSetupCodeInput.focus();
      } else {
        alert(data.error || 'Failed to initiate MFA setup.');
      }
    } catch {
      alert('Error connecting to server for MFA setup.');
    }
  }

  if (confirmMfaSetupBtn) {
    confirmMfaSetupBtn.addEventListener('click', async () => {
      const token = sessionStorage.getItem('am_admin_session');
      const code = mfaSetupCodeInput.value.trim();
      if (!code) {
        mfaSetupError.textContent = 'Enter the 6-digit code from your authenticator app.';
        return;
      }
      mfaSetupError.textContent = '';
      try {
        const res = await fetch('/api/admin/mfa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            secret: activeSetupSecret,
            code,
            recoveryCodes: activeRecoveryCodes
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Two-factor authentication successfully enabled!', 'success');
          mfaSetupSection.style.display = 'none';
          mfaBackupSection.style.display = 'block';
          mfaRecoveryKeysList.innerHTML = activeRecoveryCodes.map(c => `<span style="padding:4px 8px; background:rgba(255,255,255,0.06); border-radius:4px;">${c}</span>`).join('');
        } else {
          mfaSetupError.textContent = data.error || 'Invalid code.';
        }
      } catch {
        mfaSetupError.textContent = 'Server error verifying code.';
      }
    });
  }

  if (doneMfaSetupBtn) {
    doneMfaSetupBtn.addEventListener('click', () => {
      mfaBackupSection.style.display = 'none';
      checkMfaStatus();
    });
  }

  if (securitySettingsBtn) {
    securitySettingsBtn.addEventListener('click', () => {
      const currentRole = sessionStorage.getItem('am_admin_role');
      if (currentRole !== 'admin') {
        showToast('Only Lead Administrator can configure Two-Factor Authentication.', 'error');
        return;
      }
      if (mfaModal) {
        mfaModal.style.display = 'flex';
        mfaSetupSection.style.display = 'none';
        mfaBackupSection.style.display = 'none';
        checkMfaStatus();
      }
    });
  }

  if (closeMfaModalBtn && mfaModal) {
    closeMfaModalBtn.addEventListener('click', () => {
      mfaModal.style.display = 'none';
    });
  }

  // ========================================================================
  // 2. DATA FETCHING & SYNCHRONIZATION
  // ========================================================================
  async function fetchMessages() {
    // 1. Try Firebase Cloud Firestore first (Centralized DB for all visitors)
    if (window.PortfolioDB && window.PortfolioDB.isReady()) {
      try {
        const cloudMessages = await window.PortfolioDB.getMessages();
        if (cloudMessages) {
          messages = cloudMessages;
          localStorage.setItem('am_portfolio_messages', JSON.stringify(messages));
          renderAll();
          return;
        }
      } catch (cloudErr) {
        console.warn('Error fetching from Cloud Firestore:', cloudErr);
      }
    }

    // 2. Fallback to Local Node Server API (if server.js is running)
    try {
      const token = sessionStorage.getItem('am_admin_session');
      const res = await fetch('/api/messages', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        messages = data.messages || [];
        localStorage.setItem('am_portfolio_messages', JSON.stringify(messages));
        renderAll();
        return;
      }
    } catch (apiErr) {
      // Server not active
    }

    // 3. Fallback: read from localStorage
    const cached = localStorage.getItem('am_portfolio_messages');
    if (cached) {
      try {
        messages = JSON.parse(cached);
      } catch (e) {
        messages = [];
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
            ${msg.isStarred ? '<span class="star-indicator" title="Starred"><svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>' : ''}
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
    // 1. Cloud Firestore
    if (window.PortfolioDB && window.PortfolioDB.isReady()) {
      try {
        await window.PortfolioDB.updateMessageStatus(id, updates);
      } catch (err) {
        console.warn('Error updating status in Cloud DB:', err);
      }
    }

    // 2. Local Node server API
    try {
      const token = sessionStorage.getItem('am_admin_session');
      await fetch(`/api/messages/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
    } catch (e) {
      // Local fallback
    }

    localStorage.setItem('am_portfolio_messages', JSON.stringify(messages));
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

      const currentRole = sessionStorage.getItem('am_admin_role') || 'admin';
      if (currentRole !== 'admin') {
        showToast('Inquiry deletion is restricted to Lead Administrator.', 'warning');
        return;
      }

      const confirmed = confirm('Are you sure you want to permanently delete this inquiry?');
      if (!confirmed) return;

      // 1. Cloud Firestore
      if (window.PortfolioDB && window.PortfolioDB.isReady()) {
        try {
          await window.PortfolioDB.deleteMessage(activeMessageId);
        } catch (err) {
          console.warn('Error deleting message from Cloud DB:', err);
        }
      }

      // 2. Local Node server API
      try {
        const token = sessionStorage.getItem('am_admin_session');
        await fetch(`/api/messages/${activeMessageId}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          credentials: 'include'
        });
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
        message: `Hello Abhinash, we reviewed your work on Kissan Valley and the AI CA Automation platform. We would love to discuss potential opportunities or project collaboration with you.`,
        timestamp: new Date().toISOString()
      };

      let newId = 'msg_local_' + Date.now();

      // 1. Save to Cloud Firestore if connected
      if (window.PortfolioDB && window.PortfolioDB.isReady()) {
        try {
          const cloudSaved = await window.PortfolioDB.saveMessage(testMsg);
          if (cloudSaved && cloudSaved.id) newId = cloudSaved.id;
        } catch (err) {
          console.warn('Cloud DB test msg error:', err);
        }
      }

      // 2. Dispatch to local Node server API
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testMsg)
        });
        const data = await res.json();
        if (data && data.id) newId = data.id;
      } catch (err) {
        // Fallback local
      }

      // 3. Local fallback persistence
      const newEntry = {
        id: newId,
        ...testMsg,
        isRead: false,
        isStarred: false
      };
      messages.unshift(newEntry);
      localStorage.setItem('am_portfolio_messages', JSON.stringify(messages));
      showToast('New test inquiry received and stored!', 'success');
      renderAll();
      selectMessage(newId);
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
