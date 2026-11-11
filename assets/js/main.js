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

  const productContext = productField?.value || params.get('product') || '';
  const isMuffinInquiry = /muffin|cupcake/i.test(productContext);
  const muffinFields = inquiryForm.querySelector('#muffin-quote-fields');
  const muffinContext = document.querySelector('#muffin-quote-context');
  if (muffinFields) muffinFields.hidden = !isMuffinInquiry;
  if (muffinContext) muffinContext.hidden = !isMuffinInquiry;

  inquiryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = inquiryForm.querySelector('button[type="submit"]');
    const statusMessage = inquiryForm.querySelector('#inquiry-status');
    const originalBtnHtml = submitBtn.innerHTML;

    // Loading state & prevent double submission
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;"><svg style="animation:spin 1s linear infinite;width:18px;height:18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Submitting Inquiry...</span>';
    if (statusMessage) {
      statusMessage.className = 'form-status';
      statusMessage.textContent = '';
    }

    const data = new FormData(inquiryForm);
    const payload = Object.fromEntries(data.entries());

    // Web3Forms API Configuration
    data.append('access_key', '7a689baa-62d5-4abb-ad5c-8f6cbc9739ca');
    data.append('from_name', 'LINHAO Bakeware B2B Portal');
    data.append('subject', `[New B2B Lead] ${payload.product || 'Bakeware Project'} from ${payload.company || payload.name}`);

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data
      });
      const result = await response.json();

      if (result.success) {
        // Track GA4 conversion
        if (typeof gtag === 'function') {
          gtag('event', 'generate_lead', {
            event_category: 'inquiry',
            form_id: 'inquiry_form',
            lead_type: 'b2b_inquiry',
            product: payload.product || 'Not specified',
            project_type: payload.project_type || 'not_selected',
            country: payload.country || 'Not specified'
          });
        }
        // Redirect to verified thank-you page
        window.location.href = 'thank-you.html';
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (err) {
      console.warn('Direct inquiry transmission failed:', err);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
      if (statusMessage) {
        statusMessage.className = 'form-status error';
        statusMessage.innerHTML = `Transmission delay detected. Please <a href="mailto:info@lh-industrial.com?subject=${encodeURIComponent('Inquiry from ' + (payload.company || 'Buyer'))}" style="text-decoration:underline;color:inherit;font-weight:bold;">send directly via email</a> or connect via WhatsApp.`;
      }
    }
  });
}

document.querySelectorAll('[data-wa-product]').forEach(link => {
  const product = link.dataset.waProduct || 'custom bakeware project';
  link.href = `https://wa.me/8615088452259?text=${encodeURIComponent(`Hello LINHAO BAKEWARE, I would like to discuss: ${product}.`)}`;
});
