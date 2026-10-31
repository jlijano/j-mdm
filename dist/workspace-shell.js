// Shared, non-privileged navigation for standalone Quick Scanner pages.
// Protected ITAM screens keep their existing RBAC-aware app-shell/navigation.js.
(() => {
  'use strict';
  if (!document.body.classList.contains('quick-shell')) return;
  const locationPath = window.location.pathname;
  const isLibrary = locationPath === '/quick/assets';
  const groups = [
    { label: 'OVERVIEW', items: [
      { name: 'Dashboard', icon: '▦', href: '/dashboard', private: true },
      { name: 'Open ITAM Workspace', icon: '↗', href: '/dashboard' }
    ]},
    { label: 'ASSET MANAGEMENT', private: true, items: [
      { name: 'Assets', icon: '▤', href: '/dashboard#records' },
      { name: 'Employee Equipment', icon: '▤', href: '/dashboard?module=employee_equipment_register#records', requiresEnterprise: true },
      { name: 'Scan Asset', icon: '▣', href: '/assets/scanner' },
      { name: 'Device inventory', icon: '▤', href: '/dashboard#inventory' },
      { name: 'Device scan history', icon: '◷', href: '/dashboard#history' }
    ]},
    { label: 'QUICK SCANNER', items: [
      { name: 'Scanner Library', icon: '▦', href: '/quick/assets', active: isLibrary },
      { name: 'Connect & Scan', icon: '▣', href: '/quick', active: !isLibrary }
    ]},
    { label: 'ADMINISTRATION', private: true, items: [
      { name: 'Master Data', icon: '▦', href: '/dashboard#master-data' },
      { name: 'Settings', icon: '⚙', href: '/dashboard#settings' },
      { name: 'Users & Roles', icon: '♙', href: '/dashboard#users', adminOnly: true }
    ]}
  ];

  function makeSection(group) {
    const section = document.createElement('div');
    section.className = 'ws-section';
    if (group.private) { section.hidden = true; section.classList.add('ws-private'); }
    const heading = document.createElement('span');
    heading.className = 'ws-section-label';
    heading.textContent = group.label;
    section.appendChild(heading);
    for (const item of group.items) {
      const anchor = document.createElement('a');
      anchor.className = 'ws-nav-link' + (item.active ? ' active' : '');
      anchor.href = item.href;
      if (item.active) anchor.setAttribute('aria-current', 'page');
      if (item.private || item.adminOnly || item.requiresEnterprise) {
        anchor.hidden = true;
        anchor.classList.add('ws-private');
      }
      if (item.adminOnly) anchor.dataset.adminOnly = 'true';
      if (item.requiresEnterprise) anchor.dataset.enterpriseOnly = 'true';
      const symbol = document.createElement('span');
      symbol.className = 'ws-nav-icon';
      symbol.setAttribute('aria-hidden', 'true');
      symbol.textContent = item.icon;
      const text = document.createElement('span');
      text.textContent = item.name;
      anchor.append(symbol, text);
      section.appendChild(anchor);
    }
    return section;
  }

  function start() {
    if (document.querySelector('#ws-header')) return;
    const oldHeader = document.querySelector('body > header');
    const liveStatus = oldHeader?.querySelector('#link-status') || document.createElement('span');
    liveStatus.id = 'link-status';
    if (!liveStatus.textContent.trim()) liveStatus.textContent = 'Ready';

    const header = document.createElement('header');
    header.id = 'ws-header';
    header.setAttribute('role', 'banner');
    header.innerHTML = '<button type="button" id="ws-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="ws-sidebar">☰</button>' +
      '<a class="ws-brand" href="/quick"><span class="ws-mark" aria-hidden="true">J</span>' +
      '<span><strong>J-MDM</strong><small>Asset &amp; Device Management</small></span></a>' +
      '<form class="ws-search" id="ws-search-form" role="search">' +
      '<label for="ws-search-field" class="ws-visually-hidden">Search scanned assets</label>' +
      '<span class="ws-search-icon" aria-hidden="true">⌕</span><input id="ws-search-field" type="search" placeholder="Search assets, serials, barcodes..." autocomplete="off">' +
      '<kbd aria-hidden="true">Ctrl K</kbd></form>' +
      '<div class="ws-account"><span class="ws-avatar" aria-hidden="true">J</span><span id="ws-user-state">Quick Scanner</span><span id="ws-status-slot"></span></div>';
    header.querySelector('#ws-status-slot').replaceWith(liveStatus);
    const sidebar = document.createElement('nav');
    sidebar.id = 'ws-sidebar';
    sidebar.setAttribute('aria-label', 'Main navigation');
    for (const group of groups) sidebar.appendChild(makeSection(group));
    const backdrop = document.createElement('button');
    backdrop.id = 'ws-backdrop';
    backdrop.type = 'button';
    backdrop.hidden = true;
    backdrop.setAttribute('aria-label', 'Close navigation');
    document.body.prepend(header, sidebar, backdrop);
    oldHeader?.remove();
    document.body.classList.add('ws-layout');
    const button = header.querySelector('#ws-toggle');
    let beforeOpen = null;
    function close(restoreFocus = false) {
      document.body.classList.remove('ws-nav-open');
      backdrop.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Open navigation');
      if (restoreFocus) (beforeOpen || button).focus();
    }
    function open() {
      beforeOpen = document.activeElement;
      document.body.classList.add('ws-nav-open');
      backdrop.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      button.setAttribute('aria-label', 'Close navigation');
      sidebar.querySelector('a:not([hidden])')?.focus();
    }
    button.addEventListener('click', () => {
      if (document.body.classList.contains('ws-nav-open')) close(true);
      else open();
    });
    backdrop.addEventListener('click', () => close(true));
    sidebar.addEventListener('click', event => {
      if (event.target.closest('a')) close(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('ws-nav-open')) {
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key === 'Tab' && document.body.classList.contains('ws-nav-open')) {
        const elements = [...sidebar.querySelectorAll('a:not([hidden]),button:not([hidden])')]
          .filter(node => node.getClientRects().length);
        if (!elements.length) return;
        const index = elements.indexOf(document.activeElement);
        if (event.shiftKey && index === 0) { event.preventDefault(); elements[elements.length - 1].focus(); }
        else if (!event.shiftKey && index === elements.length - 1) { event.preventDefault(); elements[0].focus(); }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        header.querySelector('#ws-search-field').focus();
      }
    });
    const breakpoint = window.matchMedia('(min-width: 901px)');
    breakpoint.addEventListener?.('change', () => close(false));
    const searchInput = header.querySelector('#ws-search-field');
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
    header.querySelector('kbd').textContent = isMac ? '⌘ K' : 'Ctrl K';
    if (isLibrary) {
      const librarySearch = document.querySelector('#search');
      if (librarySearch) {
        searchInput.value = librarySearch.value;
        searchInput.addEventListener('input', () => {
          librarySearch.value = searchInput.value;
          librarySearch.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
    }
    header.querySelector('#ws-search-form').addEventListener('submit', event => {
      event.preventDefault();
      const query = searchInput.value.trim();
      if (isLibrary) {
        const librarySearch = document.querySelector('#search');
        if (librarySearch) { librarySearch.value = query; librarySearch.dispatchEvent(new Event('input', { bubbles: true })); librarySearch.focus(); }
      } else {
        window.location.assign('/quick/assets' + (query ? '?q=' + encodeURIComponent(query) : ''));
      }
    });
    // The public scanner never exposes privileged records. Show gated navigation
    // only after the server confirms a valid session; otherwise links stay hidden.
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(result => {
        const user = result?.user;
        if (!user) return;
        const role = String(user.role || '');
        const admin = /super.admin/i.test(role);
        sidebar.querySelectorAll('.ws-private').forEach(node => {
          if (node.dataset.adminOnly === 'true' && !admin) return;
          if (node.dataset.enterpriseOnly === 'true' && !user.super && !user.scopes?.some(scope => scope.scope_type === 'ENTERPRISE')) return;
          node.hidden = false;
        });
        const state = header.querySelector('#ws-user-state');
        if (state) state.textContent = 'Workspace';
      })
      .catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
