/**
 * Opens Gmail "Compose" in a new tab with a pre-filled subject and body.
 * mailto: links fail for long bodies and do not target Gmail web explicitly.
 */
export function openGmailCompose(subject, body, options = {}) {
  const maxLen = options.maxBodyLength ?? 12000;
  const safeBody =
    body.length > maxLen ? `${body.slice(0, maxLen)}\n\n… (truncated)` : body;
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: '',
    su: subject,
    body: safeBody,
  });
  const url = `https://mail.google.com/mail/?${params.toString()}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
