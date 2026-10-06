(()=>{
 const toggle=document.querySelector('#menu-toggle'),backdrop=document.querySelector('#menu-backdrop'),nav=document.querySelector('#main-nav'),header=document.querySelector('body > header');
 const background=[document.querySelector('main'),document.querySelector('footer'),document.querySelector('.account-area')];
 function setBackgroundInert(value){background.forEach(element=>{if(element)element.inert=value;});}
 function close(focus=false){setBackgroundInert(false);document.body.classList.remove('navigation-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation');backdrop.hidden=true;if(focus)toggle.focus();}
 toggle.addEventListener('click',()=>{if(document.body.classList.contains('navigation-open')){close();return;}document.body.classList.add('navigation-open');setBackgroundInert(true);toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation');backdrop.hidden=false;nav.querySelector('button.active')?.focus();});
 backdrop.addEventListener('click',()=>close(true));
 document.addEventListener('keydown',event=>{
  if(!document.body.classList.contains('navigation-open'))return;
  if(event.key==='Escape'){event.preventDefault();close(true);return;}
  if(event.key==='Tab'){
   const controls=[toggle,...nav.querySelectorAll('button:not([disabled])')];
   const index=controls.indexOf(document.activeElement);
   event.preventDefault();controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length].focus();
  }
 });
 nav.addEventListener('click',event=>{if(event.target.closest('button[data-page]'))close(true);});
 function markCurrent(){nav.querySelectorAll('button[data-page]').forEach(button=>{if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});}
 document.addEventListener('click',event=>{if(event.target.closest('button[data-page]'))markCurrent();});markCurrent();
 const desktop=matchMedia('(min-width: 901px)');desktop.addEventListener('change',()=>close());
 function updateHeader(){document.documentElement.style.setProperty('--app-header-height',`${header.getBoundingClientRect().height}px`);}
 new ResizeObserver(updateHeader).observe(header);updateHeader();
})();
