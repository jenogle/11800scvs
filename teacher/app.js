const db=supabase.createClient('https://juspbhysjkqwzfccrnhb.supabase.co','sb_publishable_SlN9cUzDYke3Mh2cmaBJxA_wnX5Pv7R');
const $=x=>document.getElementById(x);
const code=()=>$('code').value.trim();
function friendly(e){let m=e?.message||'發生未知錯誤';if(m.includes('老師管理碼錯誤'))return '老師管理碼錯誤，請重新輸入。';if(m.includes('uuid'))return '老師管理驗證設定異常，請重新整理後再試。';return m}
function selected(){return [...document.querySelectorAll('input[type=checkbox][value]:checked')].map(x=>x.value)}
window.pickMain=()=>document.querySelectorAll('input[type=checkbox][value]').forEach(x=>x.checked=x.value.startsWith('11800-'));
window.pickAll=()=>document.querySelectorAll('input[type=checkbox][value]').forEach(x=>x.checked=true);
window.pickNone=()=>document.querySelectorAll('input[type=checkbox][value]').forEach(x=>x.checked=false);
function policy(){const on=$('prevent').checked,sec=+$('grace').value||5;$('grace').disabled=!on;$('policyPreview').textContent=on?'已啟用：學生離開考試頁超過 '+sec+' 秒將自動交卷。':'目前未啟用防切換視窗。'}
$('prevent').onchange=policy;$('grace').oninput=policy;policy();
function gatePolicy(){
  const on=$('gateEnabled').checked;
  ['gateStart','gateEnd','gatePassword'].forEach(id=>$(id).disabled=!on);
  if(!on){$('gatePreview').textContent='目前未啟用時段密碼；學生可直接進入考場。';return}
  const s=$('gateStart').value,e=$('gateEnd').value;
  $('gatePreview').textContent=(s&&e)?'已啟用：'+s.replace('T',' ')+' 到 '+e.replace('T',' ')+' 之間需要考場密碼；結束後自動公開。':'已啟用，請設定開始與結束時間。';
}
$('gateEnabled').onchange=gatePolicy;$('gateStart').oninput=gatePolicy;$('gateEnd').oninput=gatePolicy;gatePolicy();
async function active(){
  const {data,error}=await db.rpc('software_exam_get_active');
  if(error){$('active').className='msg err';$('active').textContent='讀取失敗：'+friendly(error);return}
  if(!data){$('active').className='msg info';$('active').textContent='目前沒有開放中的考試。';return}

  let html='<b>'+data.title+'</b><br>題數：'+data.question_count+' 題｜防切換：'+(data.prevent_leave?'啟用（'+data.leave_grace_seconds+' 秒）':'關閉')+'｜時段密碼：'+(data.gate_enabled?(data.gate_required?'目前需要密碼':'已設定，目前不需密碼'):'關閉');

  if(code()){
    const teacher=await db.rpc('software_exam_teacher_session_info_v2',{p_code:code()});
    const info=teacher.data&&teacher.data[0];
    if(info){
      if(info.gate_enabled){
        const start=info.gate_start_at?new Date(info.gate_start_at).toLocaleString('zh-TW'):'—';
        const end=info.gate_end_at?new Date(info.gate_end_at).toLocaleString('zh-TW'):'—';
        html+='<br><br><b>考場密碼：</b><span style="font-size:20px;color:#b42318;font-weight:900">'+(info.room_code||'未設定')+'</span>';
        html+='<br><span class="sub">密碼時段：'+start+' ～ '+end+'</span>';
      }else{
        html+='<br><br><b>考場密碼：</b>本場未啟用時段密碼';
      }
    }else{
      html+='<br><span style="color:#b42318">管理碼錯誤，無法顯示考場密碼。</span>';
    }
  }else{
    html+='<br><span class="sub">輸入老師管理碼後可顯示本場考場密碼。</span>';
  }

  $('active').className='msg ok';
  $('active').innerHTML=html;
}
async function publish(){if(!code())return alert('請先輸入老師管理碼');const subs=selected();if(!subs.length)return alert('請至少選擇一個考試範圍');$('publish').disabled=true;const gateOn=$('gateEnabled').checked;
 if(gateOn&&(!$('gateStart').value||!$('gateEnd').value||!$('gatePassword').value.trim())){ $('publish').disabled=false; return alert('請完整設定密碼時段與考場密碼'); }
 const localIso=v=>v?new Date(v).toISOString():null;
 const{data,error}=await db.rpc('software_exam_teacher_publish_v3',{p_code:code(),p_title:$('title').value,p_question_count:+$('count').value,p_type_mode:$('type').value,p_subjects:subs,p_draw_mode:$('draw').value,p_open:$('open').value==='true',p_prevent_leave:$('prevent').checked,p_leave_grace_seconds:+$('grace').value||5,p_gate_enabled:gateOn,p_gate_start_at:localIso($('gateStart').value),p_gate_end_at:localIso($('gateEnd').value),p_gate_password:$('gatePassword').value.trim()});$('publish').disabled=false;if(error){$('msg').className='msg err';$('msg').textContent='發布失敗：'+friendly(error);return}$('msg').className='msg ok';$('msg').textContent='發布成功，可用題數 '+data.available+' 題。';await active();await records()}
async function closeExam(){if(!code())return alert('請先輸入老師管理碼');if(!confirm('確定要關閉目前考試嗎？'))return;const{data,error}=await db.rpc('software_exam_teacher_close_v2',{p_code:code()});if(error){$('msg').className='msg err';$('msg').textContent='關閉失敗：'+friendly(error);return}if(!data){$('msg').className='msg err';$('msg').textContent='關閉失敗：管理碼錯誤，或目前沒有開放中的考試。';return}$('msg').className='msg ok';$('msg').textContent='目前考試已關閉。';await active()}
let examSessions=[],currentRecords=[],currentBest=[];

async function loadExamSessions(){
  if(!code()) return alert('請先輸入老師管理碼');
  $('examSelect').innerHTML='<option value="">讀取場次中…</option>';
  const {data,error}=await db.rpc('software_exam_teacher_exam_list_v2',{p_code:code()});
  if(error){
    $('examSelect').innerHTML='<option value="">讀取失敗</option>';
    $('examSummary').className='msg err';
    $('examSummary').textContent='場次讀取失敗：'+friendly(error);
    return;
  }
  examSessions=data||[];
  $('examSelect').innerHTML=examSessions.length
    ? '<option value="">請選擇場次</option>'+examSessions.map(e=>{
        const d=new Date(e.created_at).toLocaleString('zh-TW');
        const state=e.is_open?'開放中':'已結束';
        return '<option value="'+e.exam_id+'">'+d+'｜'+e.title+'｜'+state+'</option>';
      }).join('')
    : '<option value="">目前沒有場次</option>';
  $('examSummary').className='msg info';
  $('examSummary').textContent=examSessions.length?'已讀取 '+examSessions.length+' 個場次，請選擇要查看的場次。':'目前沒有考試場次。';
}

function sortRecords(list){
  const mode=$('recordSort')?.value||'student';
  const r=[...list];
  if(mode==='time') r.sort((a,b)=>new Date(b.started_at)-new Date(a.started_at));
  else if(mode==='score') r.sort((a,b)=>(b.score??-1)-(a.score??-1)||String(a.student_id).localeCompare(String(b.student_id),'zh-Hant',{numeric:true}));
  else r.sort((a,b)=>String(a.student_id).localeCompare(String(b.student_id),'zh-Hant',{numeric:true})||new Date(a.started_at)-new Date(b.started_at));
  return r;
}

function renderRecords(){
  const r=sortRecords(currentRecords);
  $('rows').innerHTML=r.length?r.map(x=>
    '<tr><td>'+x.student_id+'</td><td>'+x.student_name+'</td><td>'+(x.score==null?'—':'<b>'+x.score+' / '+x.total+'</b>')+'</td><td>'+(x.submitted_at?'已交卷':'作答中')+'</td><td>'+new Date(x.started_at).toLocaleString('zh-TW')+'</td><td>'+(x.submitted_at?new Date(x.submitted_at).toLocaleString('zh-TW'):'—')+'</td></tr>'
  ).join(''):'<tr><td colspan="6">此場次目前沒有作答紀錄。</td></tr>';

  $('bestRows').innerHTML=currentBest.length?currentBest.map(x=>
    '<tr><td>'+x.student_id+'</td><td>'+x.student_name+'</td><td><b>'+x.best_score+' / '+x.total+'</b></td><td>'+x.attempt_count+'</td><td>'+new Date(x.first_attempt_at).toLocaleString('zh-TW')+'</td><td>'+new Date(x.last_attempt_at).toLocaleString('zh-TW')+'</td><td>'+new Date(x.best_submitted_at).toLocaleString('zh-TW')+'</td></tr>'
  ).join(''):'<tr><td colspan="7">此場次目前沒有已交卷成績。</td></tr>';
}

async function loadSelectedExam(){
  if(!code()) return alert('請先輸入老師管理碼');
  const examId=$('examSelect')?.value;
  if(!examId) return alert('請先選擇一個場次');
  $('rows').innerHTML='<tr><td colspan="6">讀取中…</td></tr>';
  $('bestRows').innerHTML='<tr><td colspan="7">讀取中…</td></tr>';
  const [all,best]=await Promise.all([
    db.rpc('software_exam_teacher_records_by_exam_v2',{p_code:code(),p_exam_id:examId}),
    db.rpc('software_exam_teacher_best_by_exam_v2',{p_code:code(),p_exam_id:examId})
  ]);
  if(all.error||best.error){
    const e=all.error||best.error;
    $('rows').innerHTML='<tr><td colspan="6">'+friendly(e)+'</td></tr>';
    $('bestRows').innerHTML='<tr><td colspan="7">'+friendly(e)+'</td></tr>';
    return;
  }
  currentRecords=all.data||[];
  currentBest=best.data||[];
  const s=examSessions.find(x=>x.exam_id===examId);
  $('examSummary').className='msg ok';
  $('examSummary').innerHTML=s
    ? '<b>'+s.title+'</b><br>題數：'+s.question_count+'｜作答紀錄：'+s.attempt_count+' 筆｜已交卷：'+s.submitted_count+' 筆｜狀態：'+(s.is_open?'開放中':'已結束')
    : '已載入此場次紀錄。';
  renderRecords();
}

async function records(){
  await loadExamSessions();
  if(examSessions.length===1){
    $('examSelect').value=examSessions[0].exam_id;
    await loadSelectedExam();
  }
}

$('publish').onclick=publish;
$('close').onclick=closeExam;
$('refresh').onclick=records;
$('loadExams').onclick=loadExamSessions;
$('loadSelected').onclick=loadSelectedExam;
$('examSelect').onchange=()=>{ if($('examSelect').value) loadSelectedExam(); };
$('recordSort').onchange=renderRecords;
let codeTimer=null;
$('code').addEventListener('input',()=>{
  clearTimeout(codeTimer);
  codeTimer=setTimeout(active,350);
});
$('code').addEventListener('change',active);
active();