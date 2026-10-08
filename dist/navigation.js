(()=>{
 const toggle=document.querySelector('#menu-toggle'),backdrop=document.querySelector('#menu-backdrop'),nav=document.querySelector('#main-nav'),mobileNav=document.querySelector('#mobile-nav'),header=document.querySelector('body > header');
 if(!toggle||!backdrop||!nav||!header)return;
 const background=[document.querySelector('main'),document.querySelector('footer'),document.querySelector('.account-area')];
 function setBackgroundInert(value){background.forEach(element=>{if(element)element.inert=value;});}
 function close(focus=false){setBackgroundInert(false);document.body.classList.remove('navigation-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation');backdrop.hidden=true;if(focus)toggle.focus();}
 function open(){document.body.classList.add('navigation-open');setBackgroundInert(true);toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation');backdrop.hidden=false;setTimeout(()=>nav.querySelector('[data-page].active:not([hidden])')?.focus(),0);}
 function route(page){
  close(false);
  if(typeof window.jmdmSetPage==='function'){window.jmdmSetPage(page);markCurrent();return;}
  const target=page==='scanner'?'/assets/scanner':page==='dashboard'?'/dashboard':'/dashboard#'+encodeURIComponent(page);
  location.assign(target);
 }
 toggle.addEventListener('click',event=>{event.preventDefault();document.body.classList.contains('navigation-open')?close():open();});
 backdrop.addEventListener('click',()=>close(true));
 document.addEventListener('keydown',event=>{
  if(!document.body.classList.contains('navigation-open'))return;
  if(event.key==='Escape'){event.preventDefault();close(true);return;}
  if(event.key==='Tab'){
   const controls=[toggle,...Array.from(nav.querySelectorAll('[data-page]:not([disabled])')).filter(button=>!false)];
   if(!controls.length)return;
   const index=controls.indexOf(document.activeElement);
   event.preventDefault();controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length].focus();
  }
 });
 function bindNavigation(container){
  container?.addEventListener('click',event=>{
   const button=event.target.closest('[data-page]');
   if(!button||button.disabled||false)return;
   if(button.tagName==='A'&&typeof window.jmdmSetPage!=='function'){close(false);return;}
   event.preventDefault();
   event.stopPropagation();
   route(button.dataset.page);
  });
 }
 bindNavigation(nav);
 bindNavigation(mobileNav);
 function markCurrent(){
  document.querySelectorAll('#main-nav [data-page],#mobile-nav [data-page]').forEach(button=>{
   if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
 }
 document.addEventListener('click',event=>{if(event.target.closest('[data-page]'))setTimeout(markCurrent,0);});
 markCurrent();
 const desktop=matchMedia('(min-width: 901px)');
 desktop.addEventListener?.('change',()=>close());
 function updateHeader(){document.documentElement.style.setProperty('--app-header-height',header.getBoundingClientRect().height+'px');}
 if('ResizeObserver'in window)new ResizeObserver(updateHeader).observe(header);
 updateHeader();
})();