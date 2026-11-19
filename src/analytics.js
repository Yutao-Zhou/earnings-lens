// Report events run only while the shared analytics preference is granted.
(function () {
  if (window.earningsAnalytics) return;

  const site = location.protocol === 'https:' && ['yutaozhou.com', 'www.yutaozhou.com'].includes(location.hostname);
  const reports = new Map();
  let current = null;
  let active = null;
  let usage = null;
  let last = 0;
  let visible = false;

  function allowed() {
    try {
      return site && localStorage.getItem('yz.analytics-consent.v1') === 'allow' &&
        localStorage.getItem('umami.disabled') !== '1' && navigator.doNotTrack !== '1' &&
        navigator.globalPrivacyControl !== true && window.yzAnalytics?.enabled === true;
    } catch {
      return false;
    }
  }

  function send(name, data) {
    if (allowed()) window.yzAnalytics.track(name, data);
  }

  function tick(checkEnd = true) {
    if (!allowed()) return;
    const now = performance.now();
    if (active && visible && active.tab === 'overview') active.state.elapsed += Math.max(0, now - last);
    last = now;
    visible = document.visibilityState !== 'hidden';
    if (!active || !visible || active.tab !== 'overview') return;
    const state = active.state;
    if (state.elapsed >= 30000 && !state.engaged) {
      state.engaged = true;
      send('report_engaged', active.properties);
    }
    const end = checkEnd && document.querySelector('[data-analytics-reading-end]');
    if (!state.complete && state.elapsed >= 3000 && window.scrollY > 80 && end && end.getBoundingClientRect().top <= window.innerHeight) {
      state.complete = true;
      send('report_complete', active.properties);
    }
  }

  function record(selection) {
    tick(false);
    if (!selection) {
      active = null;
      return;
    }
    const key = `${selection.report_id}@${selection.revision}`;
    if (!reports.has(key)) reports.set(key, { elapsed: 0, read: false, engaged: false, complete: false });
    const state = reports.get(key);
    const properties = {
      path: `/earnings-lens/${selection.ticker}/${selection.period}/v${selection.revision}`,
      report_date: selection.end,
      entry: active ? 'navigation' : 'initial',
    };
    if (active?.key !== key) send('report_open', properties);
    active = { key, tab: selection.tab, state, properties };
    if (selection.tab === 'overview' && !state.read) {
      state.read = true;
      send('report_read', properties);
    }
  }

  function refreshConsent() {
    if (!allowed()) {
      usage?.abort();
      usage = null;
      active = null;
      reports.clear();
      return;
    }
    if (usage) return;
    usage = new AbortController();
    const { signal } = usage;
    last = performance.now();
    visible = document.visibilityState !== 'hidden';
    const timer = setInterval(tick, 1000);
    signal.addEventListener('abort', () => clearInterval(timer), { once: true });
    document.addEventListener('visibilitychange', () => tick(false), { signal });
    window.addEventListener('scroll', () => tick(), { passive: true, signal });
    document.addEventListener('click', event => {
      const link = event.target.closest?.('a.external-source');
      if (!link || !active) return;
      send('source_click', { ...active.properties, destination: new URL(link.href).hostname });
    }, { capture: true, signal });
    record(current);
  }

  window.earningsAnalytics = {
    selection(selection) {
      current = selection;
      if (usage && allowed()) record(selection);
      else refreshConsent();
    },
  };
  if (!site) return;
  window.addEventListener('yz:analytics-consent', refreshConsent);
  if (!window.yzAnalytics) {
    const script = document.createElement('script');
    script.src = 'https://yutaozhou.com/js/site-analytics.js?v=privacy-1';
    script.referrerPolicy = 'no-referrer';
    script.defer = true;
    script.dataset.project = 'earnings-lens';
    script.addEventListener('load', refreshConsent, { once: true });
    document.head.append(script);
  }
})();
