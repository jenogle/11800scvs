/* Shared accessibility: font-size preference. Does not affect question contents or scoring. */
(function(){
  'use strict';
  const key='11800scvs:reading-size:v1';
  const fontKey='11800scvs:reading-font:v1';
  const fonts=new Set(['sans','serif','wenkai','system']);
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
  let font='sans';
  try{font=localStorage.getItem(fontKey)||'sans'}catch(err){}
  if(!fonts.has(font))font='sans';
  document.documentElement.dataset.readingFont=font;
  function applyFont(value){
    const choice=fonts.has(value)?value:'sans';
    document.documentElement.dataset.readingFont=choice;
    for(const select of document.querySelectorAll('[data-reading-font]'))select.value=choice;
    try{localStorage.setItem(fontKey,choice)}catch(err){}
  }
  const oldBind=bind;
  function bindAll(){
    oldBind();
    for(const select of document.querySelectorAll('[data-reading-font]')){
      select.value=document.documentElement.dataset.readingFont;
      select.addEventListener('change',()=>applyFont(select.value));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindAll,{once:true});
  else bindAll();
})();
