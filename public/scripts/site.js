const navToggle = document.querySelector('.nav-toggle');
const prefersMotion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const motionAllowed = prefersMotion.matches && document.documentElement.classList.contains('motion-ok');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.body.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelectorAll('.primary-nav a').forEach((link, index) => {
    link.style.setProperty('--nav-index', String(index));
    link.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const sentinel = document.querySelector('.scroll-sentinel');

if (sentinel && 'IntersectionObserver' in window) {
  const headerObserver = new IntersectionObserver(([entry]) => {
    document.body.classList.toggle('is-scrolled', !entry.isIntersecting);
  }, { threshold: 0 });
  headerObserver.observe(sentinel);
} else {
  document.body.classList.add('is-scrolled');
}

if (motionAllowed) {
  const revealSelectors = [
    '.proof-title',
    '.proof-band .stat-item',
    '.path-copy',
    '.path-item',
    '.handoff-copy',
    '.handoff-panel',
    '.handoff-feature',
    '.handoff-rail article',
    '.activity-primary',
    '.activity-row',
    '.builder-board',
    '.builder-board .board-list article',
    '.final-cta .cta-row',
    '.page-heading > .container',
    '.team-hero-copy',
    '.team-command-panel',
    '.team-directory-intro',
    '.team-department-chip',
    '.team-section-rail',
    '.event-card',
    '.resource-card',
    '.track-card',
    '.project-card',
    '.team-card',
    '.team-member-card',
    '.partner-card',
    '.post-card',
    '.content-block'
  ];

  const revealItems = Array.from(document.querySelectorAll(revealSelectors.join(',')));

  revealItems.forEach((item, index) => {
    item.classList.add('reveal-item');
    item.style.setProperty('--reveal-index', String(index % 7));
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.14 });

    revealItems.forEach((item) => {
      if (item.getBoundingClientRect().top < window.innerHeight * 0.9) {
        window.requestAnimationFrame(() => item.classList.add('is-visible'));
      }
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.team-member-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--card-x', x.toFixed(1) + '%');
        card.style.setProperty('--card-y', y.toFixed(1) + '%');
      });

      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--card-x', '50%');
        card.style.setProperty('--card-y', '18%');
      });
    });
  }

  document.addEventListener('pointerdown', (event) => {
    const target = event.target.closest('.button, .filter-button, .text-link, .nav-toggle');
    if (!target) return;
    target.classList.remove('is-pressing');
    void target.offsetWidth;
    target.classList.add('is-pressing');
    window.setTimeout(() => target.classList.remove('is-pressing'), 180);
  });
}

function updateFieldState(control) {
  const label = control.closest('label');
  const error = label?.querySelector('.field-error');
  const isInvalid = control.matches(':invalid') && (control.dataset.touched === 'true' || control.form?.dataset.submitted === 'true');

  control.setAttribute('aria-invalid', String(isInvalid));
  if (error) error.hidden = !isInvalid;
}

document.querySelectorAll('.contact-form, .verify-form').forEach((formElement) => {
  const controls = Array.from(formElement.querySelectorAll('input, select, textarea'))
    .filter((control) => control.type !== 'hidden');

  controls.forEach((control) => {
    updateFieldState(control);

    control.addEventListener('invalid', () => {
      control.dataset.touched = 'true';
      formElement.dataset.submitted = 'true';
      updateFieldState(control);
    });

    control.addEventListener('blur', () => {
      control.dataset.touched = 'true';
      updateFieldState(control);
    });

    control.addEventListener('input', () => updateFieldState(control));
    control.addEventListener('change', () => updateFieldState(control));
  });

  formElement.addEventListener('submit', () => {
    formElement.dataset.submitted = 'true';
    controls.forEach(updateFieldState);

    if (formElement.matches('.contact-form') && formElement.checkValidity()) {
      formElement.classList.add('is-submitting');
    }
  });
});
