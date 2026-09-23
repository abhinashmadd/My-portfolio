/**
 * PORTFOLIO SCRIPT - ABHINASH MADDHESHIYA
 * Interactive behaviors: Theme toggle, Project Modals, Skill Filters,
 * Copy-to-clipboard, Resume Modal, Form Validation, and Scroll Animations.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. THEME SWITCHER (Dark / Light)
  // ==========================================================================
  const themeToggle = document.getElementById('themeToggle');
  const htmlRoot = document.documentElement;

  // Retrieve saved preference or default to dark
  const savedTheme = localStorage.getItem('am_portfolio_theme') || 'dark';
  htmlRoot.setAttribute('data-theme', savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = htmlRoot.getAttribute('data-theme');
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      htmlRoot.setAttribute('data-theme', nextTheme);
      localStorage.setItem('am_portfolio_theme', nextTheme);
      showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
    });
  }

  // ==========================================================================
  // 2. SCROLL PROGRESS INDICATOR & BACK TO TOP BUTTON
  // ==========================================================================
  const scrollProgressBar = document.getElementById('scrollProgress');
  const backToTopBtn = document.getElementById('backToTopBtn');

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    if (scrollProgressBar) {
      scrollProgressBar.style.width = `${scrollPercent}%`;
      scrollProgressBar.setAttribute('aria-valuenow', Math.round(scrollPercent));
    }

    if (backToTopBtn) {
      if (scrollTop > 350) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }
  }, { passive: true });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // ==========================================================================
  // 3. MOBILE DRAWER NAVIGATION
  // ==========================================================================
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
      mobileDrawer.setAttribute('aria-hidden', !isOpen);
    });

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', false);
        mobileDrawer.setAttribute('aria-hidden', true);
      });
    });
  }

  // ==========================================================================
  // 4. TOAST NOTIFICATION SYSTEM
  // ==========================================================================
  const toastContainer = document.getElementById('toastContainer');

  function showToast(message, type = 'success') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slide-out-right 0.3s ease forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3200);
  }

  // ==========================================================================
  // 5. COPY TO CLIPBOARD
  // ==========================================================================
  const copyableItems = document.querySelectorAll('.copyable-chip');

  copyableItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const textToCopy = item.getAttribute('data-copy');
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        showToast(`Copied to clipboard: ${textToCopy}`, 'success');
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`Copied: ${textToCopy}`, 'success');
      }
    });
  });

  // ==========================================================================
  // 6. TECHNICAL SKILLS CATEGORY FILTER
  // ==========================================================================
  const filterTabs = document.querySelectorAll('.filter-tab');
  const skillCards = document.querySelectorAll('.skill-card');

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Toggle active tab
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filterValue = tab.getAttribute('data-filter');

      skillCards.forEach(card => {
        const categories = card.getAttribute('data-category') || '';
        if (filterValue === 'all' || categories.includes(filterValue)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  // ==========================================================================
  // 7. PROJECT DETAILS MODAL
  // ==========================================================================
  const projectModal = document.getElementById('projectModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalBody = document.getElementById('modalBody');
  const viewDetailBtns = document.querySelectorAll('.view-details-btn');

  const projectData = {
    'ai-ca': {
      title: 'AI Chartered Accountants Automation System',
      badge: 'HackIndia 2026 Finalist',
      image: 'assets/ai-accounting.jpg',
      tags: ['Python', 'AI / ML', 'Workflow Automation', 'Financial Data Processing'],
      overview: 'An advanced AI-powered automation architecture designed to eliminate time-consuming, repetitive accounting calculations, reconciliation workflows, and compliance audits for practicing Chartered Accountants.',
      problem: 'Chartered Accountants spend countless hours manually cross-referencing invoice statements, verifying tax deduction rates, matching ledger entries, and validating compliance data—leading to fatigue, potential compliance errors, and slow turnaround times.',
      solution: 'Our team engineered an intelligent automation pipeline that ingests heterogeneous financial documents, categorizes transactions through ML algorithms, flags compliance anomalies automatically, and streamlines approval workflows into an interactive dashboard.',
      features: [
        'Automated reconciliation pipelines for high-volume transactions.',
        'Intelligent document and transaction classification with exception routing.',
        'Real-time tax liability metrics, deadline tracking, and compliance alert mechanisms.',
        'Selected into the Finalist / Final Listing stage at Hackindia AI & Web3 Builders Hackathon 2026.'
      ],
      impact: 'Dramatically reduces data processing turnaround times and offers clear visibility into audit pipelines for financial professionals.'
    },
    'kissan-valley': {
      title: 'Kissan Valley | Online Agricultural Marketplace',
      badge: 'AgriTech Web Platform',
      image: 'assets/kissan-valley.jpg',
      tags: ['Node.js', 'MySQL', 'Web Development', 'E-Commerce Marketplace'],
      overview: 'A transparent, web-based digital marketplace connecting Indian farmers directly with commercial buyers, institutional procurers, and local mandi traders to ensure fair crop pricing.',
      problem: 'Agricultural producers in India frequently lose substantial profit margins to multi-tiered middleman networks and suffer from a lack of transparent real-time market price discovery for their harvests.',
      solution: 'Kissan Valley provides a centralized digital marketplace where farmers can create verified crop listings, showcase harvest specifications, monitor recent regional price trends, and communicate directly with buyers from diverse regions.',
      features: [
        'Direct farmer-to-buyer crop listing and inquiry interface.',
        'Localized crop market discovery enabling buyers to procure fresh harvest from proximate mandis.',
        'Interactive pricing charts tracking historical wheat, rice, and vegetable rates.',
        'Integrated order tracking pipeline from farm pickup to transit destination.'
      ],
      impact: 'Empowers rural agricultural producers with digital reach and eliminates intermediary markups.'
    }
  };

  function openProjectModal(projectId) {
    const data = projectData[projectId];
    if (!data || !modalBody || !projectModal) return;

    modalBody.innerHTML = `
      <img src="${data.image}" alt="${data.title}" class="modal-project-img">
      <div class="modal-project-header">
        <span class="section-badge">${data.badge}</span>
        <h3 id="modalTitle">${data.title}</h3>
        <div class="project-tags">
          ${data.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>

      <p class="about-text">${data.overview}</p>

      <h4 class="modal-sec-heading">The Challenge</h4>
      <p class="about-text">${data.problem}</p>

      <h4 class="modal-sec-heading">Engineered Solution</h4>
      <p class="about-text">${data.solution}</p>

      <h4 class="modal-sec-heading">Key Highlights &amp; Features</h4>
      <ul class="modal-features-list">
        ${data.features.map(f => `<li>${f}</li>`).join('')}
      </ul>

      <h4 class="modal-sec-heading">Project Impact</h4>
      <p class="about-text">${data.impact}</p>

      <div style="margin-top: 24px; text-align: right;">
        <button class="btn btn-secondary btn-sm" id="innerModalCloseBtn">Close</button>
      </div>
    `;

    projectModal.classList.add('open');
    projectModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Hook inner close button
    const innerClose = document.getElementById('innerModalCloseBtn');
    if (innerClose) {
      innerClose.addEventListener('click', closeProjectModal);
    }
  }

  function closeProjectModal() {
    if (!projectModal) return;
    projectModal.classList.remove('open');
    projectModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  viewDetailBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const projId = btn.getAttribute('data-project');
      if (projId) openProjectModal(projId);
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeProjectModal);
  }

  if (projectModal) {
    projectModal.querySelector('.modal-backdrop')?.addEventListener('click', closeProjectModal);
  }

  // ==========================================================================
  // 8. RESUME MODAL & DOWNLOAD HANDLERS
  // ==========================================================================
  const resumeModal = document.getElementById('resumeModal');
  const resumeCloseBtn = document.getElementById('resumeCloseBtn');
  const printResumeBtn = document.getElementById('printResumeBtn');

  function openResumeModal() {
    if (!resumeModal) return;
    resumeModal.classList.add('open');
    resumeModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeResumeModal() {
    if (!resumeModal) return;
    resumeModal.classList.remove('open');
    resumeModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // All buttons and links that open the Resume Modal
  const resumeTriggers = document.querySelectorAll('.open-resume-trigger, #openResumeModalBtn');
  resumeTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (mobileDrawer && mobileDrawer.classList.contains('open')) {
        mobileDrawer.classList.remove('open');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
      openResumeModal();
    });
  });

  if (resumeCloseBtn) {
    resumeCloseBtn.addEventListener('click', closeResumeModal);
  }

  if (resumeModal) {
    resumeModal.querySelector('.modal-backdrop')?.addEventListener('click', closeResumeModal);
  }

  // Print handlers for all print buttons
  const printTriggers = document.querySelectorAll('.print-resume-trigger, #printResumeBtn');
  printTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.print();
    });
  });

  // Download Resume button feedback and fallback
  const downloadResumeLinks = document.querySelectorAll('.download-resume-link, [download*="Resume"]');
  downloadResumeLinks.forEach(link => {
    link.addEventListener('click', () => {
      showToast('Downloading official PDF resume: Abhinash_Maddheshiya_Resume.pdf', 'info');
    });
  });

  // Universal Escape key listener for modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProjectModal();
      closeResumeModal();
    }
  });

  // ==========================================================================
  // 9. CONTACT FORM INTERACTIVE VALIDATION & SUBMISSION
  // ==========================================================================
  const contactForm = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;
      const nameInput = document.getElementById('nameInput');
      const emailInput = document.getElementById('emailInput');
      const subjectInput = document.getElementById('subjectInput');
      const messageInput = document.getElementById('messageInput');

      const nameError = document.getElementById('nameError');
      const emailError = document.getElementById('emailError');
      const subjectError = document.getElementById('subjectError');
      const messageError = document.getElementById('messageError');

      // Clear errors
      [nameError, emailError, subjectError, messageError].forEach(el => {
        if (el) el.textContent = '';
      });

      // Name validation
      if (!nameInput.value.trim()) {
        nameError.textContent = 'Please enter your name.';
        isValid = false;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim()) {
        emailError.textContent = 'Please enter your email address.';
        isValid = false;
      } else if (!emailRegex.test(emailInput.value.trim())) {
        emailError.textContent = 'Please enter a valid email address.';
        isValid = false;
      }

      // Subject validation
      if (!subjectInput.value.trim()) {
        subjectError.textContent = 'Please provide a subject.';
        isValid = false;
      }

      // Message validation
      if (!messageInput.value.trim()) {
        messageError.textContent = 'Please enter your message.';
        isValid = false;
      } else if (messageInput.value.trim().length < 10) {
        messageError.textContent = 'Message must be at least 10 characters.';
        isValid = false;
      }

      if (!isValid) return;

      // Submit feedback simulation
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
        </svg>
        <span>Sending to absmadd@gmail.com...</span>
      `;

      const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        subject: subjectInput.value.trim(),
        message: messageInput.value.trim(),
        timestamp: new Date().toISOString()
      };

      // 1. Save to local storage for instant dashboard synchronization
      try {
        const stored = JSON.parse(localStorage.getItem('am_portfolio_messages') || '[]');
        stored.unshift({
          id: 'msg_' + Date.now(),
          ...payload,
          isRead: false,
          isStarred: false
        });
        localStorage.setItem('am_portfolio_messages', JSON.stringify(stored));
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }

      // 2. Dispatch simultaneously to Server API and Gmail Forwarder (FormSubmit)
      const serverPromise = fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.log('Local server dispatch:', err));

      const emailForwardPromise = fetch('https://formsubmit.co/ajax/absmadd@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `New Portfolio Message from ${payload.name}: ${payload.subject}`,
          _replyto: payload.email,
          name: payload.name,
          email: payload.email,
          subject: payload.subject,
          message: payload.message
        })
      }).catch(err => console.log('Email forwarding dispatch:', err));

      Promise.allSettled([serverPromise, emailForwardPromise]).then(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        showToast('Thank you! Your message was sent to absmadd@gmail.com & stored in the database.', 'success');

        contactForm.reset();
      });
    });
  }

  // ==========================================================================
  // 10. SCROLL REVEAL OBSERVER
  // ==========================================================================
  const revealElements = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: show immediately
    revealElements.forEach(el => el.classList.add('revealed'));
  }

});
