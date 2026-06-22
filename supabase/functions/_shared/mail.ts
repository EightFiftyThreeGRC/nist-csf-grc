// Transactional email — SendGrid (single verified sender) or Resend (verified domain).
// No domain purchase: use SendGrid Single Sender Verification on your Gmail/work email.

export function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatOrgPossessive(org: string): string {
  const name = String(org || '').trim();
  if (!name) return "your organization's";
  if (/['']s$/i.test(name)) return name;
  if (name.endsWith('s')) return `${name}'`;
  return `${name}'s`;
}

function parseFromAddress(from: string): { email: string; name?: string } {
  const raw = String(from || '').trim();
  const m = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { email: raw };
}

function resendSandboxFrom(from: string): boolean {
  return from.indexOf('resend.dev') >= 0;
}

export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ ok: true; provider: string } | { ok: false; error: string }> {
  const to = String(opts.to || '').trim().toLowerCase();
  const sendgridKey = Deno.env.get('SENDGRID_API_KEY') || '';
  const resendKey = Deno.env.get('RESEND_API_KEY') || '';
  const fromRaw = Deno.env.get('EMAIL_FROM') || Deno.env.get('SENDER_EMAIL') || '';

  if (!fromRaw) {
    return { ok: false, error: 'EMAIL_FROM or SENDER_EMAIL not configured on edge function' };
  }

  if (sendgridKey) {
    const from = parseFromAddress(fromRaw);
    if (!from.email) return { ok: false, error: 'Invalid EMAIL_FROM' };
    const body: Record<string, unknown> = {
      personalizations: [{ to: [{ email: to }] }],
      from: from.name ? { email: from.email, name: from.name } : { email: from.email },
      subject: opts.subject,
      content: [
        { type: 'text/plain', value: opts.text },
        { type: 'text/html', value: opts.html },
      ],
    };
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + sendgridKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (res.ok || res.status === 202) return { ok: true, provider: 'sendgrid' };
    const errText = await res.text();
    return { ok: false, error: 'SendGrid: ' + errText.slice(0, 280) };
  }

  if (resendKey && !resendSandboxFrom(fromRaw)) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromRaw,
        to: [to],
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      }),
    });
    if (res.ok) return { ok: true, provider: 'resend' };
    const errText = await res.text();
    return { ok: false, error: 'Resend: ' + errText.slice(0, 280) };
  }

  if (resendKey && resendSandboxFrom(fromRaw)) {
    return {
      ok: false,
      error: 'Resend sandbox sender cannot mail external approvers — use SendGrid (verify your Gmail) or disable the Send Email hook to use Supabase built-in mail',
    };
  }

  return {
    ok: false,
    error: 'No mail provider configured — set SENDGRID_API_KEY + EMAIL_FROM, or disable the Send Email hook',
  };
}
