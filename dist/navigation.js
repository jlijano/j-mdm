(()=>{
 const toggle=document.querySelector('#menu-toggle'),backdrop=document.querySelector('#menu-backdrop'),nav=document.querySelector('#main-nav'),header=document.querySelector('body > header');
 function close(focus=false){document.body.classList.remove('navigation-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open navigation');backdrop.hidden=true;if(focus)toggle.focus();}
 toggle.addEventListener('click',()=>{if(document.body.classList.contains('navigation-open')){close();return;}document.body.classList.add('navigation-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close navigation');backdrop.hidden=false;nav.querySelector('button.active')?.focus();});
 backdrop.addEventListener('click',()=>close(true));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('navigation-open'))close(true);});
 nav.addEventListener('click',event=>{if(event.target.closest('button[data-page]'))close(true);});
 function markCurrent(){nav.querySelectorAll('button[data-page]').forEach(button=>{if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});}
 document.addEventListener('click',event=>{if(event.target.closest('button[data-page]'))markCurrent();});markCurrent();
 const desktop=matchMedia('(min-width: 901px)');desktop.addEventListener('change',()=>close());
 function updateHeader(){document.documentElement.style.setProperty('--app-header-height',`${header.getBoundingClientRect().height}px`);}
 new ResizeObserver(updateHeader).observe(header);updateHeader();
})();
