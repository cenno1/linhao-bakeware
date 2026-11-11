const GA_MEASUREMENT_ID = 'G-X2KSVBEBSQ';

// ----------------------------------------------------
// 1. UTM & Traffic Source Persistence Engine
// ----------------------------------------------------
(function initTrafficSource() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
    let utmData = JSON.parse(sessionStorage.getItem('lh_traffic_attribution') || '{}');

    let hasNewUtm = false;
    utmKeys.forEach(key => {
      if (urlParams.has(key)) {
        utmData[key] = urlParams.get(key);
        hasNewUtm = true;
      }
    });

    if (!utmData.initial_landing_page) {
      utmData.initial_landing_page = window.location.pathname;
      utmData.referrer = document.referrer || 'Direct';
      hasNewUtm = true;
    }

    if (hasNewUtm) {
      sessionStorage.setItem('lh_traffic_attribution', JSON.stringify(utmData));
    }
  } catch (e) {
    console.warn('Traffic tracking initialized with fallback:', e);
  }
})();

function getAttributionData() {
  try {
    return JSON.parse(sessionStorage.getItem('lh_traffic_attribution') || '{}');
  } catch (e) {
    return {};
  }
}

// ----------------------------------------------------
// 2. Google Analytics 4 Setup & Global Gtag
// ----------------------------------------------------
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
gtag('js', new Date());

// Config GA4 with attribution parameters
const attribution = getAttributionData();
gtag('config', GA_MEASUREMENT_ID, {
  anonymize_ip: true,
  campaign_source: attribution.utm_source || undefined,
  campaign_medium: attribution.utm_medium || undefined,
  campaign_name: attribution.utm_campaign || undefined
});

const gaScript = document.createElement('script');
gaScript.async = true;
gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
document.head.appendChild(gaScript);

// ----------------------------------------------------
// 3. User Interaction & Micro-Conversion Tracking
// ----------------------------------------------------
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;

  const href = link.href || '';
  const text = (link.textContent || '').trim();

  // A. WhatsApp Click
  if (href.includes('wa.me/')) {
    gtag('event', 'contact_click', {
      contact_method: 'whatsapp',
      link_url: href,
      source_page: window.location.pathname
    });
  } 
  // B. Email Click
  else if (href.startsWith('mailto:')) {
    gtag('event', 'contact_click', {
      contact_method: 'email',
      target_email: href.replace('mailto:', '').split('?')[0],
      source_page: window.location.pathname
    });
  } 
  // C. PDF Catalog / Sourcing Guide Download
  else if (/\.pdf(?:$|[?#])/i.test(href)) {
    const fileName = href.split('/').pop().split('?')[0];
    gtag('event', 'file_download', {
      file_name: fileName,
      file_extension: 'pdf',
      source_page: window.location.pathname
    });
  } 
  // D. Core CTA Button Click (Request a Quote)
  else if (href.includes('contact.html') || link.classList.contains('nav-cta') || text.includes('Quote') || text.includes('Inquiry')) {
    gtag('event', 'begin_inquiry', {
      cta_text: text,
      cta_location: link.classList.contains('nav-cta') ? 'header_nav' : 'page_body',
      from_page: window.location.pathname
    });
  }
});

// E. Engaged Reading Milestone (Scroll > 65% & time > 25s)
let hasTriggeredEngagedReading = false;
const pageStartTime = Date.now();
window.addEventListener('scroll', () => {
  if (hasTriggeredEngagedReading) return;
  const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollTotal <= 0) return;
  const scrollPercent = (window.scrollY / scrollTotal) * 100;

  if (scrollPercent >= 65 && (Date.now() - pageStartTime) >= 25000) {
    hasTriggeredEngagedReading = true;
    gtag('event', 'engaged_reading', {
      page_title: document.title,
      page_path: window.location.pathname,
      engagement_time_sec: Math.round((Date.now() - pageStartTime) / 1000)
    });
  }
}, { passive: true });

// ----------------------------------------------------
// 4. Mobile Menu Navigation
// ----------------------------------------------------
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

// Reveal on Scroll Animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: .08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Catalog / Category Filters
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

// ----------------------------------------------------
// 5. High-Conversion Inquiry Form with Web3Forms & Analytics
// ----------------------------------------------------
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

  // Track Form Start (First interaction)
  let formStarted = false;
  inquiryForm.addEventListener('focusin', () => {
    if (!formStarted) {
      formStarted = true;
      gtag('event', 'form_start', {
        form_id: 'inquiry_form',
        target_product: productField?.value || 'General Project',
        traffic_source: attribution.utm_source || 'direct'
      });
    }
  }, { once: true });

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

    // Inject Web3Forms Access Key & Metadata
    data.append('access_key', '7a689baa-62d5-4abb-ad5c-8f6cbc9739ca');
    data.append('from_name', 'LINHAO Bakeware B2B Portal');
    data.append('subject', `[New B2B Lead] ${payload.product || 'Bakeware Project'} from ${payload.company || payload.name}`);

    // Append Traffic Attribution to Email Notification
    const trafficInfo = getAttributionData();
    if (trafficInfo.utm_source) data.append('Traffic Source', trafficInfo.utm_source);
    if (trafficInfo.utm_medium) data.append('Traffic Medium', trafficInfo.utm_medium);
    if (trafficInfo.utm_campaign) data.append('Campaign', trafficInfo.utm_campaign);
    if (trafficInfo.initial_landing_page) data.append('Landing Page', trafficInfo.initial_landing_page);

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data
      });
      const result = await response.json();

      if (result.success) {
        // Track GA4 Core Conversion: generate_lead
        gtag('event', 'generate_lead', {
          event_category: 'inquiry',
          form_id: 'inquiry_form',
          lead_type: 'b2b_inquiry',
          product: payload.product || 'Not specified',
          project_type: payload.project_type || 'not_selected',
          country: payload.country || 'Not specified',
          traffic_source: trafficInfo.utm_source || 'direct',
          value: 10.0,
          currency: 'USD'
        });

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

// WhatsApp Dynamic Links
document.querySelectorAll('[data-wa-product]').forEach(link => {
  const product = link.dataset.waProduct || 'custom bakeware project';
  link.href = `https://wa.me/8615088452259?text=${encodeURIComponent(`Hello LINHAO BAKEWARE, I would like to discuss: ${product}.`)}`;
});