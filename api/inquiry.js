const REQUIRED_FIELDS = ['name', 'company', 'email', 'product', 'message'];
const MAX_LENGTHS = {
  name: 120,
  company: 180,
  email: 254,
  country: 120,
  project_type: 120,
  product: 240,
  quantity: 120,
  timing: 120,
  message: 5000
};

function clean(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function json(response, status, payload) {
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { ok: false, message: 'Method not allowed.' });
  }

  const allowedOrigins = new Set([
    'https://linhaobakeware.com',
    'https://www.linhaobakeware.com'
  ]);
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return json(response, 403, { ok: false, message: 'Request origin is not allowed.' });
  }

  const body = request.body && typeof request.body === 'object' ? request.body : {};
  if (body.website) {
    return json(response, 200, { ok: true });
  }

  const inquiry = {};
  for (const [field, maxLength] of Object.entries(MAX_LENGTHS)) {
    inquiry[field] = clean(body[field], maxLength);
  }

  if (REQUIRED_FIELDS.some(field => !inquiry[field])) {
    return json(response, 400, { ok: false, message: 'Please complete all required fields.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return json(response, 400, { ok: false, message: 'Please enter a valid business email address.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const inquiryTo = process.env.INQUIRY_TO_EMAIL || 'info@lh-industrial.com';
  const inquiryFrom = process.env.INQUIRY_FROM_EMAIL || 'LINHAO Website <onboarding@resend.dev>';
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured.');
    return json(response, 503, { ok: false, message: 'The inquiry service is temporarily unavailable. Please contact us by email or WhatsApp.' });
  }

  const rows = [
    ['Name', inquiry.name],
    ['Company', inquiry.company],
    ['Email', inquiry.email],
    ['Country / Region', inquiry.country],
    ['Project Type', inquiry.project_type],
    ['Product / Project', inquiry.product],
    ['Estimated Quantity', inquiry.quantity],
    ['Target Timing', inquiry.timing]
  ].map(([label, value]) => `<tr><th style="padding:8px 12px;text-align:left;background:#f4f1ea;border:1px solid #ddd">${label}</th><td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml(value || 'Not provided')}</td></tr>`).join('');

  const subject = `Website inquiry: ${inquiry.product} — ${inquiry.company}`;
  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: inquiryFrom,
      to: [inquiryTo],
      reply_to: inquiry.email,
      subject,
      html: `<div style="font-family:Arial,sans-serif;color:#14283b;max-width:720px"><h1 style="font-size:24px">New LINHAO BAKEWARE website inquiry</h1><table style="border-collapse:collapse;width:100%">${rows}</table><h2 style="font-size:18px;margin-top:24px">Specification and packaging details</h2><p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(inquiry.message)}</p><p style="font-size:12px;color:#68737d;margin-top:28px">Submitted from linhaobakeware.com</p></div>`
    })
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    console.error('Resend delivery failed:', emailResponse.status, errorText);
    return json(response, 502, { ok: false, message: 'We could not send the inquiry. Please try again or contact us by WhatsApp.' });
  }

  response.setHeader('Cache-Control', 'no-store');
  return json(response, 200, { ok: true, message: 'Your project inquiry has been sent.' });
}
