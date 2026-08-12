const GA_MEASUREMENT_ID = 'G-X2KSVBEBSQ';

window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });

const gaScript = document.createElement('script');
gaScript.async = true;
gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
document.head.appendChild(gaScript);

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;

  const href = link.href || '';
  if (href.includes('wa.me/')) {
    gtag('event', 'contact_click', { contact_method: 'whatsapp', link_url: href });
  } else if (href.startsWith('mailto:')) {
    gtag('event', 'contact_click', { contact_method: 'email' });
  } else if (/\.pdf(?:$|[?#])/i.test(href)) {
    gtag('event', 'file_download', { file_name: href.split('/').pop().split('?')[0] });
  }
});

const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.textContent = open ? '✕' : '☰';
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: .08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    const value = button.dataset.filter;
    document.querySelectorAll('[data-category]').forEach(card => {
      card.style.display = value === 'all' || card.dataset.category.includes(value) ? '' : 'none';
    });
  });
});

const inquiryForm = document.querySelector('#inquiry-form');
if (inquiryForm) {
  const params = new URLSearchParams(window.location.search);
  const productField = inquiryForm.querySelector('[name="product"]');
  if (productField && params.get('product')) productField.value = params.get('product');
  inquiryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = inquiryForm.querySelector('button[type="submit"]');
    const statusMessage = inquiryForm.querySelector('#inquiry-status');
    const data = new FormData(inquiryForm);
    const payload = Object.fromEntries(data.entries());

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    statusMessage.className = 'form-status';
    statusMessage.textContent = '';

    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'Unable to send your inquiry.');

      gtag('event', 'generate_lead', {
        form_id: 'inquiry_form',
        project_type: payload.project_type || 'not_selected'
      });
      statusMessage.className = 'form-status success';
      statusMessage.textContent = 'Inquiry sent successfully. Redirecting...';
      inquiryForm.reset();
      window.setTimeout(() => { window.location.href = '/thank-you'; }, 500);
    } catch (error) {
      statusMessage.className = 'form-status error';
      statusMessage.textContent = `${error.message} You can also email info@lh-industrial.com or use WhatsApp.`;
      submitButton.disabled = false;
      submitButton.textContent = 'Send Project Inquiry';
    }
  });
}

document.querySelectorAll('[data-wa-product]').forEach(link => {
  const product = link.dataset.waProduct || 'custom bakeware project';
  link.href = `https://wa.me/8615088452259?text=${encodeURIComponent(`Hello LINHAO BAKEWARE, I would like to discuss: ${product}.`)}`;
});
