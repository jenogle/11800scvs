/* Shared accessibility: font-size preference. Does not affect question contents or scoring. */
(function(){
  'use strict';
  const key='11800scvs:reading-size:v1';
  const sizes=new Set(['small','normal','large','extra']);
  function apply(value){
    const choice=sizes.has(value)?value:'normal';
    document.documentElement.dataset.readingSize=choice;
    for(const select of document.querySelectorAll('[data-reading-size]'))select.value=choice;
    try{localStorage.setItem(key,choice)}catch(err){}
  }
  let preference='normal';
  try{preference=localStorage.getItem(key)||'normal'}catch(err){}
  if(sizes.has(preference))document.documentElement.dataset.readingSize=preference;
  else document.documentElement.dataset.readingSize='normal';
  function bind(){
    for(const select of document.querySelectorAll('[data-reading-size]')){
      select.value=document.documentElement.dataset.readingSize;
      select.addEventListener('change',()=>apply(select.value));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
