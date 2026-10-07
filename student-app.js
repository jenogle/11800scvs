const db=supabase.createClient('https://juspbhysjkqwzfccrnhb.supabase.co','sb_publishable_SlN9cUzDYke3Mh2cmaBJxA_wnX5Pv7R');
const $=x=>document.getElementById(x);
let activeExam=null,attemptId=null,qs=[],ans={},idx=0,student=null,submitted=false;
let leaveTimer=null,leaveDeadline=null;
function only(id){['home','exam','result'].forEach(x=>$(x).classList.toggle('hidden',x!==id))}
function friendly(e){return e?.message||'發生未知錯誤'}
async function loadExam(){
 const {data,error}=await db.rpc('software_exam_get_active');
 if(error){$('statusBox').className='msg err';$('statusBox').textContent='讀取考試失敗：'+friendly(error);return}
 activeExam=data;
 if(!data){$('examTitle').textContent='目前沒有開放中的考試';$('statusBox').className='msg warn';$('statusBox').textContent='老師尚未開放考試。';$('loginBox').classList.add('hidden');return}
 $('examTitle').textContent=data.title;$('statusBox').className='msg info';$('statusBox').textContent='本次考試共 '+data.question_count+' 題。題型與範圍由老師設定。';
 if(data.prevent_leave){$('rules').classList.remove('hidden');$('rules').innerHTML='<b>本次考試已啟用防切換視窗。</b><br>考試開始後，若切換分頁、最小化瀏覽器或離開考試頁，將開始 '+data.leave_grace_seconds+' 秒倒數；若未在時間內回來，系統會直接交卷。';}
 else $('rules').classList.add('hidden');
 if(data.gate_enabled){
   $('gateBox').classList.remove('hidden');
   if(data.gate_required){
     $('gateBox').innerHTML='<b>目前為受密碼保護時段。</b><br>請輸入老師現場提供的考場密碼後才能開始作答。';
     $('gatePasswordWrap').classList.remove('hidden');
   }else{
     $('gateBox').innerHTML='<b>本場有設定密碼時段，但目前不在限制時間內。</b><br>現在為公開考場，可直接開始作答。';
     $('gatePasswordWrap').classList.add('hidden');
   }
 }else{
   $('gateBox').classList.add('hidden');$('gatePasswordWrap').classList.add('hidden');
 }
 $('loginBox').classList.remove('hidden');$('headInfo').textContent=data.title;
}
async function startExam(){
 const sid=$('sid').value.trim(),name=$('sname').value.trim();if(!sid||!name)return alert('請輸入學號與姓名');
 $('startBtn').disabled=true;$('startBtn').textContent='正在建立考卷…';
 const gatePassword=$('gatePassword')?.value.trim()||''; const {data,error}=await db.rpc('software_exam_begin_attempt_v2',{p_exam_id:activeExam.id,p_student_id:sid,p_student_name:name,p_gate_password:gatePassword});
 $('startBtn').disabled=false;$('startBtn').textContent='我已了解規則，開始考試';
 if(error){let m=friendly(error);if(m.includes('考場密碼錯誤'))m='考場密碼錯誤，請向老師確認後再試。';return alert('無法開始考試：'+m)}
 student={sid,name};attemptId=data.attempt_id;qs=data.questions||[];ans={};idx=0;submitted=false;
 if(activeExam.prevent_leave){$('antiNotice').classList.remove('hidden');$('antiNotice').textContent='防切換已啟用：離開考試頁超過 '+activeExam.leave_grace_seconds+' 秒將自動交卷。'}
 else $('antiNotice').classList.add('hidden');
 only('exam');renderNav();render();bindLeaveGuard();
}
function renderNav(){$('nav').innerHTML=qs.map((q,i)=>'<button id="n'+i+'" onclick="go('+i+')">'+(i+1)+'</button>').join('')}
function render(){
 const q=qs[idx],sel=ans[q.id]||[],t=q.kind==='multiple'?'checkbox':'radio';
 $('qbox').innerHTML='<div class="question">'+(idx+1)+'. '+q.prompt+' <span class="badge '+q.kind+'">'+(q.kind==='multiple'?'複選題':'單選題')+'</span></div><div class="sub">'+q.section_title+'</div>'+
 q.options.map((o,i)=>'<label class="option"><input type="'+t+'" name="q_'+q.id+'" '+(sel.includes(i+1)?'checked':'')+' onchange="pick(\''+q.id+'\','+(i+1)+',this.checked,\''+q.kind+'\')"><span><b>'+String.fromCharCode(65+i)+'.</b> '+o+'</span></label>').join('');
 document.querySelectorAll('#nav button').forEach((b,i)=>b.classList.toggle('current',i===idx));stats();
}
window.pick=(id,v,ch,kind)=>{if(kind==='single')ans[id]=ch?[v]:[];else{let s=new Set(ans[id]||[]);ch?s.add(v):s.delete(v);ans[id]=[...s].sort((a,b)=>a-b)}stats()};
function stats(){const done=qs.filter(q=>(ans[q.id]||[]).length).length,total=qs.length;$('total').textContent=total;$('done').textContent=done;$('left').textContent=total-done;$('now').textContent=(idx+1)+' / '+total;$('bar').style.width=(total?done/total*100:0)+'%';qs.forEach((q,i)=>$('n'+i)?.classList.toggle('done',(ans[q.id]||[]).length>0))}
window.go=i=>{idx=i;render()};
function cancelLeaveCountdown(){if(leaveTimer){clearInterval(leaveTimer);leaveTimer=null}leaveDeadline=null;$('leaveOverlay').classList.add('hidden')} function returnToExam(){if(!leaveDeadline)return;if(Date.now()>=leaveDeadline){const secs=Math.max(1,Number(activeExam?.leave_grace_seconds)||5);if(leaveTimer){clearInterval(leaveTimer);leaveTimer=null}$('leaveOverlay').classList.add('hidden');autoSubmit('因離開考試頁超過 '+secs+' 秒，系統已自動交卷。');return}cancelLeaveCountdown()}
function startLeaveCountdown(){
 if(!activeExam?.prevent_leave||submitted||!attemptId||leaveTimer)return;
 const secs=Math.max(1,Number(activeExam.leave_grace_seconds)||5);leaveDeadline=Date.now()+secs*1000;$('countdown').textContent=secs;$('leaveOverlay').classList.remove('hidden');
 leaveTimer=setInterval(()=>{const left=Math.max(0,Math.ceil((leaveDeadline-Date.now())/1000));$('countdown').textContent=left;if(left<=0){clearInterval(leaveTimer);leaveTimer=null;autoSubmit('因離開考試頁超過 '+secs+' 秒，系統已自動交卷。')}},250);
}
function bindLeaveGuard(){
 if(!activeExam?.prevent_leave)return;
 document.addEventListener('visibilitychange',()=>{if(document.hidden)startLeaveCountdown();else cancelLeaveCountdown()});
 window.addEventListener('blur',()=>{if(!document.hidden)startLeaveCountdown()});
 window.addEventListener('focus',()=>cancelLeaveCountdown());
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
      return '<div class="option" style="'+(right?'border-color:#86efac;background:#f0fdf4;':mine?'border-color:#fecaca;background:#fef2f2;':'')+'"><span><b>'+String.fromCharCode(65+n)+'.</b> '+escapeHtml(o)+mark+'</span></div>';
    }).join('');
    return '<div class="card" style="box-shadow:none;margin-bottom:12px">'+
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
 const {data,error}=await db.rpc('software_exam_submit_attempt',{p_attempt_id:attemptId,p_answers:ans});
 if(error){submitted=false;$('submitBtn').disabled=false;$('submitBtn').textContent='交卷';alert('交卷失敗：'+friendly(error));return}
 $('score').textContent=data.score;$('full').textContent=data.total;$('resultMeta').textContent=(student?.sid||'')+'｜'+(student?.name||'');
 $('resultReason').className='msg '+(manual?'info':'warn');$('resultReason').textContent=reason||'成績已送回老師端。';only('result');await loadReview();
}
async function autoSubmit(reason){await submitExam(false,reason)}
$('startBtn').onclick=startExam;$('prevBtn').onclick=()=>{if(idx>0){idx--;render()}};$('nextBtn').onclick=()=>{if(idx<qs.length-1){idx++;render()}};$('submitBtn').onclick=()=>submitExam(true);loadExam();