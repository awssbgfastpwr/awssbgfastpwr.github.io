const form = document.querySelector('[data-verify-form]');
const input = document.querySelector('[data-code-input]');
const result = document.querySelector('[data-verify-result]');
const submitButton = form?.querySelector('button[type="submit"]');
const defaultButtonLabel = submitButton?.textContent || 'Check status';

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toUpperCase();
}

function setResult(state, title, body, rows = []) {
  if (!result) return;
  result.className = `verify-result ${state}`;
  result.setAttribute('aria-busy', String(state === 'loading'));
  const table = rows.length
    ? `<table class="result-table"><tbody>${rows.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('')}</tbody></table>`
    : '';
  const skeleton = state === 'loading'
    ? '<div class="skeleton-lines" aria-hidden="true"><span></span><span></span><span></span></div>'
    : '';
  result.innerHTML = `<h2>${title}</h2><p>${body}</p>${skeleton}${table}`;
}

function setChecking(isChecking) {
  if (!submitButton || !form) return;
  form.classList.toggle('is-loading', isChecking);
  submitButton.disabled = isChecking;
  submitButton.setAttribute('aria-busy', String(isChecking));
  submitButton.textContent = isChecking ? 'Checking' : defaultButtonLabel;
}

function valueFrom(data, keys) {
  for (const key of keys) {
    if (data && data[key] !== undefined && data[key] !== null && data[key] !== '') return data[key];
  }
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderApiData(data) {
  const status = String(valueFrom(data, ['status', 'state']) || '').toLowerCase();
  const isRevoked = Boolean(data?.revoked) || status === 'revoked';
  const isValid = Boolean(data?.valid) || ['valid', 'active', 'issued'].includes(status);
  const isInvalid = status === 'invalid' || data?.valid === false;

  const rows = [
    ['Status', escapeHtml(valueFrom(data, ['status', 'state']) || (isValid ? 'Valid' : isRevoked ? 'Revoked' : 'Unknown'))],
    ['Certificate', escapeHtml(valueFrom(data, ['certificateId', 'certificate_id', 'id', 'code']) || 'Available')],
    ['Recipient', escapeHtml(valueFrom(data, ['recipientName', 'recipient_name', 'name']) || 'Not available')],
    ['Event', escapeHtml(valueFrom(data, ['eventName', 'event_name', 'event', 'title']) || 'Not available')],
    ['Role', escapeHtml(valueFrom(data, ['role', 'type']) || 'Not available')],
    ['Issued', escapeHtml(valueFrom(data, ['issuedAt', 'issued_at', 'date']) || 'Not available')]
  ];

  if (isRevoked) {
    setResult('revoked', 'Certificate revoked', 'This certificate is marked as revoked.', rows);
    return;
  }

  if (isValid) {
    setResult('valid', 'Certificate verified', 'This certificate is valid.', rows);
    return;
  }

  if (isInvalid) {
    setResult('invalid', 'Certificate not found', 'No valid certificate was found for this code.', rows.slice(0, 2));
    return;
  }

  setResult('error', 'Review needed', 'We could not read this certificate status. Contact the team if this looks wrong.', rows);
}

async function verifyCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    setChecking(false);
    setResult('missing', 'Waiting for a code', 'Scan a certificate QR code or enter the short code manually.');
    return;
  }

  const api = result?.dataset.api;
  if (!api) {
    setChecking(false);
    setResult('error', 'Verification unavailable', 'Certificate verification is unavailable right now.');
    return;
  }

  setChecking(true);
  setResult('loading', 'Checking certificate', 'Checking this certificate code.');

  try {
    const url = new URL(api);
    url.searchParams.set('c', normalized);
    const response = await fetch(url.toString(), { headers: { accept: 'application/json' } });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      setResult('invalid', 'Certificate not found', data?.message ? escapeHtml(data.message) : 'No valid certificate was found for this code.');
      return;
    }

    renderApiData(data || {});
  } catch {
    setResult('error', 'Verification error', 'Certificate verification could not be reached. Try again later or contact the team for certificate help.');
  } finally {
    setChecking(false);
  }
}

if (form && input) {
  const params = new URLSearchParams(window.location.search);
  const code = normalizeCode(params.get('c'));
  if (code) {
    input.value = code;
    verifyCode(code);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const normalized = normalizeCode(input.value);
    if (normalized) {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('c', normalized);
      window.history.replaceState({}, '', nextUrl.toString());
    }
    verifyCode(normalized);
  });
}
