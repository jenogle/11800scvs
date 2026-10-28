const db=supabase.createClient('https://juspbhysjkqwzfccrnhb.supabase.co','sb_publishable_SlN9cUzDYke3Mh2cmaBJxA_wnX5Pv7R');
const $=x=>document.getElementById(x);
let activeExam=null,attemptId=null,qs=[],ans={},idx=0,student=null,submitted=false;
let leaveTimer=null,leaveDeadline=null;

const AUTOSAVE_KEY='11800scvs:student-attempt:v2';
function saveAttempt(){
 if(!attemptId||submitted||!qs.length)return;
 try{
  const prev=JSON.parse(localStorage.getItem(AUTOSAVE_KEY)||'null');
  localStorage.setItem(AUTOSAVE_KEY,JSON.stringify({
   version:2,at:Date.now(),attemptId,activeExam,student,qs,ans,idx,
   hiddenAt:prev?.attemptId===attemptId?prev.hiddenAt||null:null
  }));
 }catch(e){console.warn('Autosave unavailable',e)}
}
function markPageHidden(){
 if(!attemptId||submitted)return;
 try{
  saveAttempt();
  const d=JSON.parse(localStorage.getItem(AUTOSAVE_KEY)||'null');
  if(d?.attemptId===attemptId){d.hiddenAt=Date.now();localStorage.setItem(AUTOSAVE_KEY,JSON.stringify(d))}
 }catch(e){console.warn('Pause state unavailable',e)}
}
function markPageVisible(){
 try{
  const d=JSON.parse(localStorage.getItem(AUTOSAVE_KEY)||'null');
  if(d?.attemptId===attemptId){d.hiddenAt=null;localStorage.setItem(AUTOSAVE_KEY,JSON.stringify(d))}
 }catch(e){}
}
function clearSavedAttempt(){try{localStorage.removeItem(AUTOSAVE_KEY)}catch(e){}}
async function restoreAttempt(){
 let saved;
 try{saved=JSON.parse(localStorage.getItem(AUTOSAVE_KEY)||'null')}catch(e){clearSavedAttempt();return}
 if(!saved||saved.version!==2||!saved.attemptId||!Array.isArray(saved.qs))return;
 if(Date.now()-saved.at>4*60*60*1000){clearSavedAttempt();return}
 if(!confirm('發現這台裝置有上次未完成的考卷，是否恢復先前的題目與作答？'))return;
 attemptId=saved.attemptId;activeExam=saved.activeExam;student=saved.student;
 qs=saved.qs;ans=saved.ans||{};idx=Math.max(0,Math.min(Number(saved.idx)||0,qs.length-1));submitted=false;
 if(!activeExam||!qs.length){clearSavedAttempt();return}
 $('runningTitle').textContent=activeExam.title;
 $('headInfo').textContent='恢復考卷｜'+activeExam.title;
 if(activeExam.prevent_leave){$('antiNotice').classList.remove('hidden');$('antiNotice').textContent='已恢復考卷；防切換規則仍然生效。'}
 else $('antiNotice').classList.add('hidden');
 only('exam');renderNav();render();
 if(activeExam.prevent_leave&&saved.hiddenAt&&Date.now()-saved.hiddenAt>=Math.max(1,Number(activeExam.leave_grace_seconds)||5)*1000){
  await autoSubmit('恢復考試時發現離頁超過允許秒數，系統已自動交卷。');
 }else{
  markPageVisible();bindLeaveGuard();
 }
}

function only(id){['home','exam','result'].forEach(x=>$(x).classList.toggle('hidden',x!==id))}
function friendly(e){return e?.message||'發生未知錯誤'}
let openRooms=[],chosenRoomId=null;
function roomMarkup(room){
 const safe=escapeHtml;
 return '<button type="button" class="student-room-card'+(chosenRoomId===room.id?' selected':'')+'" data-room-id="'+safe(room.id)+'" aria-pressed="'+(chosenRoomId===room.id)+'">'+
 '<div class="room-topline"><span class="room-live"><i></i> OPEN NOW</span><span class="room-arrow">↗</span></div>'+
 '<h3>'+safe(room.title)+'</h3>'+
 '<div class="room-details"><span>◈ '+Number(room.question_count)+' 題</span><span>◉ '+(room.prevent_leave?'防切換':'一般考試')+'</span><span>⌑ '+(room.gate_required?'考場密碼':'免密碼')+'</span></div>'+
 '<div class="room-enter">選擇此考場 <span>→</span></div></button>';
}
function chooseRoom(id){
 if(attemptId&&!submitted)return;
 const room=openRooms.find(r=>r.id===id);if(!room)return;
 chosenRoomId=id;activeExam=room;
 document.querySelectorAll('.student-room-card').forEach(btn=>{
 const yes=btn.dataset.roomId===id;btn.classList.toggle('selected',yes);btn.setAttribute('aria-pressed',String(yes));
 });
 $('selectedRoomName').textContent='已選擇考場｜'+room.title;
 $('rules').classList.toggle('hidden',!room.prevent_leave);
 if(room.prevent_leave)$('rules').textContent='本場啟用防切換：離開頁面超過 '+room.leave_grace_seconds+' 秒將自動交卷。';
 $('gateBox').classList.toggle('hidden',!room.gate_enabled);
 $('gatePasswordWrap').classList.toggle('hidden',!room.gate_required);
 if(room.gate_enabled)$('gateBox').textContent=room.gate_required?'此考場目前需要老師提供的考場密碼。':'本場設定了密碼時段，目前不需要密碼。';
 $('loginBox').classList.remove('hidden');
 $('headInfo').textContent='目前選擇｜'+room.title;
}
async function loadExam(){
 const {data,error}=await db.rpc('software_exam_get_open_rooms_v2');
 if(error){$('statusBox').className='msg err';$('statusBox').textContent='讀取考場失敗：'+friendly(error);return}
 openRooms=Array.isArray(data)?data:[];
 $('examTitle').textContent='可參加的考場';
 $('statusBox').className='msg info';
 $('statusBox').textContent=openRooms.length?'目前共有 '+openRooms.length+' 個考場開放，請選擇一個開始。':'目前沒有開放中的考場，請稍後重新整理。';
 $('studentRoomList').innerHTML=openRooms.map(roomMarkup).join('');
 document.querySelectorAll('.student-room-card').forEach(btn=>btn.addEventListener('click',()=>chooseRoom(btn.dataset.roomId)));
 if(chosenRoomId&&openRooms.some(r=>r.id===chosenRoomId))chooseRoom(chosenRoomId);
 else {chosenRoomId=null;activeExam=null;$('loginBox').classList.add('hidden');$('rules').classList.add('hidden');$('gateBox').classList.add('hidden')}
}
$('reloadRooms').onclick=loadExam;
async function startExam(){
 const sid=$('sid').value.trim(),name=$('sname').value.trim();if(!sid||!name)return alert('請輸入學號與姓名');
 $('startBtn').disabled=true;$('startBtn').textContent='正在建立考卷…';
 const gatePassword=$('gatePassword')?.value.trim()||''; const {data,error}=await db.rpc('software_exam_begin_attempt_v7',{p_exam_id:activeExam.id,p_student_id:sid,p_student_name:name,p_gate_password:gatePassword});
 $('startBtn').disabled=false;$('startBtn').textContent='我已了解規則，開始考試';
 if(error){let m=friendly(error);if(m.includes('考場密碼錯誤'))m='考場密碼錯誤，請向老師確認後再試。';return alert('無法開始考試：'+m)}
 student={sid,name};attemptId=data.attempt_id;qs=data.questions||[];ans={};idx=0;submitted=false;
 if(activeExam.prevent_leave){$('antiNotice').classList.remove('hidden');$('antiNotice').textContent='防切換已啟用：離開考試頁超過 '+activeExam.leave_grace_seconds+' 秒將自動交卷。'}
 else $('antiNotice').classList.add('hidden');
 $('runningTitle').textContent=activeExam.title;
 only('exam');renderNav();render();saveAttempt();bindLeaveGuard();
}
function renderNav(){$('nav').innerHTML=qs.map((q,i)=>'<button type="button" id="n'+i+'" onclick="go('+i+')">'+(i+1)+'</button>').join('')}
function render(){
 const q=qs[idx],sel=ans[q.id]||[],t=q.kind==='multiple'?'checkbox':'radio';
 $('qbox').innerHTML='<div class="question">'+(idx+1)+'. '+escapeHtml(q.prompt)+' <span class="badge '+q.kind+'">'+(q.kind==='multiple'?'複選題':'單選題')+'</span></div><div class="sub">'+q.section_title+'</div>'+
 (Array.isArray(q.options)?q.options:[]).map((o,i)=>'<label class="option"><input type="'+t+'" name="q_'+q.id+'" '+(sel.includes(i+1)?'checked':'')+' onchange="pick(\''+q.id+'\','+(i+1)+',this.checked,\''+q.kind+'\')"><span><b>'+String.fromCharCode(65+i)+'.</b> '+o+'</span></label>').join('');
 document.querySelectorAll('#nav button').forEach((b,i)=>b.classList.toggle('current',i===idx));stats();
}
window.pick=(id,v,ch,kind)=>{if(kind==='single')ans[id]=ch?[v]:[];else{let s=new Set(ans[id]||[]);ch?s.add(v):s.delete(v);ans[id]=[...s].sort((a,b)=>a-b)}stats();saveAttempt()};
function stats(){const done=qs.filter(q=>(ans[q.id]||[]).length).length,total=qs.length;$('total').textContent=total;$('done').textContent=done;$('left').textContent=total-done;$('now').textContent=(idx+1)+' / '+total;$('bar').style.width=(total?done/total*100:0)+'%';qs.forEach((q,i)=>$('n'+i)?.classList.toggle('done',(ans[q.id]||[]).length>0))}
window.go=i=>{idx=i;render();saveAttempt()};
function cancelLeaveCountdown(){if(leaveTimer){clearInterval(leaveTimer);leaveTimer=null}leaveDeadline=null;$('leaveOverlay').classList.add('hidden')} function returnToExam(){if(!leaveDeadline)return;if(Date.now()>=leaveDeadline){const secs=Math.max(1,Number(activeExam?.leave_grace_seconds)||5);if(leaveTimer){clearInterval(leaveTimer);leaveTimer=null}$('leaveOverlay').classList.add('hidden');autoSubmit('因離開考試頁超過 '+secs+' 秒，系統已自動交卷。');return}cancelLeaveCountdown()}
function startLeaveCountdown(){
 if(!activeExam?.prevent_leave||submitted||!attemptId||leaveTimer)return;
 const secs=Math.max(1,Number(activeExam.leave_grace_seconds)||5);leaveDeadline=Date.now()+secs*1000;$('countdown').textContent=secs;$('leaveOverlay').classList.remove('hidden');
 leaveTimer=setInterval(()=>{const left=Math.max(0,Math.ceil((leaveDeadline-Date.now())/1000));$('countdown').textContent=left;if(left<=0){clearInterval(leaveTimer);leaveTimer=null;autoSubmit('因離開考試頁超過 '+secs+' 秒，系統已自動交卷。')}},250);
}
let leaveGuardBound=false;
function bindLeaveGuard(){
 if(!activeExam?.prevent_leave||leaveGuardBound)return;
 leaveGuardBound=true;
 document.addEventListener('visibilitychange',()=>{
  if(!attemptId||submitted)return;
  if(document.hidden){markPageHidden();startLeaveCountdown()}
  else {returnToExam();if(!submitted)markPageVisible()}
 });
 // On mobile, showing a system keyboard or permission prompt can blur the window
 // without the student actually switching apps; visibility is a safer signal.
 window.addEventListener('focus',()=>{if(!document.hidden){returnToExam();if(!submitted)markPageVisible()}});
 window.addEventListener('pagehide',markPageHidden);
}
function answerLetters(arr){return (arr||[]).map(n=>String.fromCharCode(64+Number(n))).join('、')||'未作答'}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function loadReview(){
  $('reviewBox').textContent='正在載入檢討內容…';
  const {data,error}=await db.rpc('software_exam_attempt_review_v2',{p_attempt_id:attemptId});
  if(error){$('reviewBox').innerHTML='<div class="msg err">檢討內容讀取失敗：'+escapeHtml(friendly(error))+'</div>';return}
  const list=data||[];
  if(!list.length){$('reviewBox').innerHTML='<div class="msg warn">目前沒有可顯示的檢討內容。</div>';return}
  $('reviewBox').innerHTML=list.map((r,i)=>{
    const selected=Array.isArray(r.selected)?r.selected:[];
    const correct=Array.isArray(r.correct)?r.correct:[];
    const options=(r.options||[]).map((o,n)=>{
      const no=n+1;
      const mine=selected.includes(no);
      const right=correct.includes(no);
      let mark='';
      if(right&&mine) mark=' ✓';
      else if(right) mark=' ← 正確答案';
      else if(mine) mark=' ← 你的答案';
      const state=right?' review-correct':mine?' review-wrong':'';
      return '<div class="review-option'+state+'"><span class="review-letter">'+String.fromCharCode(65+n)+'</span><span class="review-option-text">'+escapeHtml(o)+(mark?'<strong class="review-mark">'+escapeHtml(mark)+'</strong>':'')+'</span></div>';
    }).join('');
    return '<div class="card review-question-card">'+
      '<div class="question">'+(i+1)+'. '+escapeHtml(r.prompt)+' <span class="badge '+(r.kind==='multiple'?'multiple':'single')+'">'+(r.kind==='multiple'?'複選題':'單選題')+'</span></div>'+
      '<div class="msg '+(r.is_correct?'ok':'err')+'"><b>'+(r.is_correct?'答對':'答錯')+'</b>｜你的答案：'+answerLetters(selected)+'｜正確答案：'+answerLetters(correct)+'</div>'+
      '<div style="margin-top:10px">'+options+'</div>'+
    '</div>';
  }).join('');
}
async function submitExam(manual=true,reason=''){
 if(submitted)return;const unanswered=qs.filter(q=>(ans[q.id]||[]).length===0).length;
 if(manual&&unanswered&&!confirm('還有 '+unanswered+' 題未作答，確定要交卷嗎？'))return;
 submitted=true;cancelLeaveCountdown();$('submitBtn').disabled=true;$('submitBtn').textContent='交卷中…';
 const {data,error}=await db.rpc('software_exam_submit_attempt_v2',{p_attempt_id:attemptId,p_answers:ans});
 if(error){submitted=false;saveAttempt();$('submitBtn').disabled=false;$('submitBtn').textContent='交卷';alert('交卷失敗：'+friendly(error));return}
 clearSavedAttempt();
 $('score').textContent=data.score;$('full').textContent=data.total;$('resultMeta').textContent=(student?.sid||'')+'｜'+(student?.name||'');
 $('resultReason').className='msg '+(manual?'info':'warn');$('resultReason').textContent=reason||'成績已送回老師端。';only('result');await loadReview();
}
async function autoSubmit(reason){await submitExam(false,reason)}
$('startBtn').onclick=startExam;$('prevBtn').onclick=()=>{if(idx>0){idx--;render()}};$('nextBtn').onclick=()=>{if(idx<qs.length-1){idx++;render()}};$('submitBtn').onclick=()=>submitExam(true);loadExam().then(restoreAttempt);