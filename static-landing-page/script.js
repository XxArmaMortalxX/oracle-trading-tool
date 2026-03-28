/* ═══════════════════════════════════════════
   Axiarch Trading — Minimal JS
   FAQ accordion, radar demo, waitlist form
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Mobile Menu Toggle ── */
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () {
      mobileMenu.classList.toggle('open');
    });
    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
      });
    });
  }

  /* ── FAQ Accordion ── */
  document.querySelectorAll('.faq-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item').forEach(function (el) {
        el.classList.remove('open');
      });
      // Toggle clicked
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ── Social Radar Demo Animation ── */
  var radarDataSets = [
    [
      { ticker: 'AAPL', cross: false, reddit: 45, x: 38, tiktok: 12, total: 95, velocity: '+340%', signal: 'EXPLODING', bullPct: 72, bearPct: 28, bias: 'Long' },
      { ticker: 'TSLA', cross: true, reddit: 67, x: 52, tiktok: 28, total: 147, velocity: '+280%', signal: 'SURGING', bullPct: 58, bearPct: 42, bias: 'Long' },
      { ticker: 'GME', cross: true, reddit: 89, x: 34, tiktok: 45, total: 168, velocity: '+520%', signal: 'EXPLODING', bullPct: 81, bearPct: 19, bias: 'Long' },
      { ticker: 'NVDA', cross: false, reddit: 32, x: 28, tiktok: 8, total: 68, velocity: '+180%', signal: 'RISING', bullPct: 65, bearPct: 35, bias: 'Long' },
      { ticker: 'PLTR', cross: false, reddit: 28, x: 15, tiktok: 22, total: 65, velocity: '+150%', signal: 'RISING', bullPct: 44, bearPct: 56, bias: 'Short' },
      { ticker: 'AMC', cross: true, reddit: 56, x: 41, tiktok: 38, total: 135, velocity: '+410%', signal: 'SURGING', bullPct: 69, bearPct: 31, bias: 'Long' },
      { ticker: 'SOFI', cross: false, reddit: 18, x: 12, tiktok: 5, total: 35, velocity: '-20%', signal: 'FADING', bullPct: 38, bearPct: 62, bias: 'Short' },
    ],
    [
      { ticker: 'BBBY', cross: true, reddit: 112, x: 67, tiktok: 54, total: 233, velocity: '+680%', signal: 'EXPLODING', bullPct: 85, bearPct: 15, bias: 'Long' },
      { ticker: 'SPY', cross: false, reddit: 34, x: 45, tiktok: 6, total: 85, velocity: '+120%', signal: 'RISING', bullPct: 41, bearPct: 59, bias: 'Short' },
      { ticker: 'MARA', cross: false, reddit: 42, x: 28, tiktok: 31, total: 101, velocity: '+290%', signal: 'SURGING', bullPct: 73, bearPct: 27, bias: 'Long' },
      { ticker: 'RIVN', cross: true, reddit: 38, x: 42, tiktok: 19, total: 99, velocity: '+250%', signal: 'SURGING', bullPct: 62, bearPct: 38, bias: 'Long' },
      { ticker: 'COIN', cross: false, reddit: 25, x: 31, tiktok: 14, total: 70, velocity: '+160%', signal: 'RISING', bullPct: 55, bearPct: 45, bias: 'Mixed' },
      { ticker: 'MULN', cross: true, reddit: 78, x: 45, tiktok: 52, total: 175, velocity: '+450%', signal: 'EXPLODING', bullPct: 77, bearPct: 23, bias: 'Long' },
      { ticker: 'WISH', cross: false, reddit: 15, x: 8, tiktok: 3, total: 26, velocity: '-35%', signal: 'FADING', bullPct: 29, bearPct: 71, bias: 'Short' },
    ]
  ];

  var currentSet = 0;
  var radarBody = document.getElementById('radarBody');
  var refreshIcon = document.querySelector('.refresh-icon');
  var scanCount = document.querySelector('.radar-scan-count');
  var scanNum = 1;

  function signalClass(sig) {
    switch (sig) {
      case 'EXPLODING': return 'sig-exploding';
      case 'SURGING': return 'sig-surging';
      case 'RISING': return 'sig-rising';
      default: return 'sig-fading';
    }
  }

  function velClass(sig) {
    switch (sig) {
      case 'EXPLODING': return 'vel-hot';
      case 'SURGING': return 'vel-warm';
      case 'RISING': return 'vel-neutral';
      default: return 'vel-cold';
    }
  }

  function biasClass(b) {
    if (b === 'Long') return 'bias-long-badge';
    if (b === 'Short') return 'bias-short-badge';
    return 'bias-mixed-badge';
  }

  function biasEmoji(b) {
    if (b === 'Long') return '\uD83D\uDFE2';
    if (b === 'Short') return '\uD83D\uDD34';
    return '\u26AA';
  }

  function rowClass(sig) {
    if (sig === 'EXPLODING') return 'row-exploding';
    if (sig === 'SURGING') return 'row-surging';
    return '';
  }

  function renderRadar(data) {
    if (!radarBody) return;
    var html = '';
    data.forEach(function (d, i) {
      html += '<tr class="' + rowClass(d.signal) + '">';
      // Row number
      html += '<td style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--fg-muted)">' + (i + 1) + '</td>';
      // Ticker
      html += '<td><div class="ticker-cell"><span class="ticker-name">' + d.ticker + '</span>';
      if (d.cross) html += '<span class="cross-badge">CROSS-PLATFORM</span>';
      html += '</div></td>';
      // Platforms
      html += '<td><div class="platform-badges">';
      if (d.reddit > 0) html += '<span class="p-badge p-badge-orange"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>' + d.reddit + '</span>';
      if (d.x > 0) html += '<span class="p-badge p-badge-blue"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' + d.x + '</span>';
      if (d.tiktok > 0) html += '<span class="p-badge p-badge-pink"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.17a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.6z"/></svg>' + d.tiktok + '</span>';
      html += '</div></td>';
      // Total
      html += '<td class="mentions-cell">' + d.total + '</td>';
      // Velocity
      html += '<td class="velocity-cell ' + velClass(d.signal) + '">' + d.velocity + '</td>';
      // Signal
      html += '<td><span class="signal-badge ' + signalClass(d.signal) + '">';
      if (d.signal === 'EXPLODING') html += '\uD83D\uDD25 ';
      else if (d.signal === 'SURGING') html += '\u26A1 ';
      else if (d.signal === 'RISING') html += '\uD83D\uDCC8 ';
      else html += '\uD83D\uDCC9 ';
      html += d.signal + '</span></td>';
      // Sentiment
      var neutralPct = 100 - d.bullPct - d.bearPct;
      html += '<td class="sentiment-cell"><div class="sentiment-bar">';
      html += '<div class="bar-bull" style="width:' + d.bullPct + '%"></div>';
      html += '<div class="bar-neutral" style="width:' + neutralPct + '%"></div>';
      html += '<div class="bar-bear" style="width:' + d.bearPct + '%"></div>';
      html += '</div><div class="sentiment-pcts">';
      html += '<span class="pct-bull">' + d.bullPct + '%</span>';
      html += '<span class="pct-sep">/</span>';
      html += '<span class="pct-bear">' + d.bearPct + '%</span>';
      html += '</div></td>';
      // Bias
      html += '<td><span class="bias-badge ' + biasClass(d.bias) + '">' + biasEmoji(d.bias) + ' ' + d.bias + ' Bias</span></td>';
      html += '</tr>';
    });
    radarBody.innerHTML = html;
  }

  function cycleRadar() {
    if (refreshIcon) {
      refreshIcon.classList.add('spinning');
      setTimeout(function () { refreshIcon.classList.remove('spinning'); }, 600);
    }
    currentSet = (currentSet + 1) % radarDataSets.length;
    scanNum++;
    if (scanCount) scanCount.textContent = 'Scan #' + scanNum;
    renderRadar(radarDataSets[currentSet]);
  }

  // Initial render
  renderRadar(radarDataSets[0]);
  // Cycle every 8 seconds
  setInterval(cycleRadar, 8000);

  /* ── Waitlist Form ── */
  var waitlistForm = document.getElementById('waitlistForm');
  var waitlistMsg = document.getElementById('waitlistMsg');
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = waitlistForm.querySelector('input[type="email"]').value;
      var name = waitlistForm.querySelector('input[type="text"]').value || '';

      // Submit to the main app's waitlist API
      fetch('https://axiarchtrading.live/api/trpc/waitlist.join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { email: email, name: name } })
      })
        .then(function (res) {
          if (res.ok) {
            waitlistMsg.className = 'waitlist-msg success';
            waitlistMsg.textContent = "You're on the list! We'll notify you when your spot opens.";
            waitlistMsg.style.display = 'block';
            waitlistForm.reset();
          } else {
            return res.json().then(function (data) {
              throw new Error(data?.error?.json?.message || 'Something went wrong');
            });
          }
        })
        .catch(function (err) {
          waitlistMsg.className = 'waitlist-msg error';
          waitlistMsg.textContent = err.message || 'Something went wrong. Please try again.';
          waitlistMsg.style.display = 'block';
        });
    });
  }

  /* ── Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Stat Counter Animation ── */
  function animateCounters() {
    document.querySelectorAll('.stat-num[data-target]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      var current = 0;
      var step = Math.max(1, Math.floor(target / 40));
      var timer = setInterval(function () {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = current;
      }, 30);
    });
  }

  // Trigger on scroll into view
  var statsObserved = false;
  var statsBar = document.querySelector('.stats-bar');
  if (statsBar && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !statsObserved) {
        statsObserved = true;
        animateCounters();
      }
    }, { threshold: 0.5 });
    observer.observe(statsBar);
  } else {
    animateCounters();
  }

  /* ── Nav scroll effect ── */
  var nav = document.querySelector('.nav');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
      nav.style.background = 'rgba(10,10,15,0.95)';
    } else {
      nav.style.background = 'rgba(10,10,15,0.85)';
    }
  });

});
