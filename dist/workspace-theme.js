(()=>{'use strict';
const root=document.documentElement,key='jmdm-workspace-theme';
try{const stored=localStorage.getItem(key);root.dataset.theme=['light','dark'].includes(stored)?stored:'light'}catch{root.dataset.theme='light'}
// Existing admin preferences remain authoritative and are shared with scanner pages.
new MutationObserver(()=>{try{localStorage.setItem(key,root.dataset.theme)}catch{}}).observe(root,{attributes:true,attributeFilter:['data-theme']});
document.addEventListener('DOMContentLoaded',()=>{const mac=/Mac|iPhone|iPad/.test(navigator.platform||'');const hint=document.querySelector('.global-search-wrap kbd'),search=document.querySelector('#global-search');if(hint)hint.textContent=mac?'⌘ K':'Ctrl K';if(search)search.setAttribute('aria-keyshortcuts',mac?'Meta+K':'Control+K')});
})();
