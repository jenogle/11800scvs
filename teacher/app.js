const db=supabase.createClient('https://juspbhysjkqwzfccrnhb.supabase.co','sb_publishable_SlN9cUzDYke3Mh2cmaBJxA_wnX5Pv7R');
const $=x=>document.getElementById(x);
const code=()=>$('code').value.trim();
function friendly(e){let m=e?.message||'發生未知錯誤';if(m.includes('老師管理碼錯誤'))return '老師管理碼錯誤，請重新輸入。';if(m.includes('uuid'))return '老師管理驗證設定異常，請重新整理後再試。';return m}
const GROUPS=[
 {id:'11800',name:'11800 電腦軟體應用',sections:[['11800-01','電腦概論',271,55],['11800-02','應用軟體使用',122,50],['11800-03','系統軟體使用',162,22],['11800-04','資訊安全',66,22]]},
 {id:'90011',name:'90011 資訊相關共同科目',sections:[['90011-01','電腦硬體架構',20,0],['90011-02','網路概論與應用',29,0],['90011-03','作業系統',10,0],['90011-04','資訊運算思維',16,0],['90011-05','資訊安全',40,0]]},
 {id:'90006',name:'90006 職業安全衛生',sections:[['90006-01','職業安全衛生',100,0]]},
 {id:'90007',name:'90007 工作倫理與職業道德',sections:[['90007-01','工作倫理與職業道德',100,0]]},
 {id:'90008',name:'90008 環境保護',sections:[['90008-03','環境保護',94,0]]},
 {id:'90009',name:'90009 節能減碳',sections:[['90009-04','節能減碳',97,0]]}
];
const plans=Object.fromEntries(GROUPS.map(g=>[g.id,{enabled:g.id==='11800',mode:'all',selected:g.sections.map(s=>s[0]),kind:'mixed',count:g.id==='11800'?40:0,quotas:Object.fromEntries(g.sections.map(s=>[s[0],{single:0,multiple:0}]))}]));
function esc(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));}
function selected(){return [...new Set(GROUPS.filter(g=>plans[g.id].enabled).flatMap(g=>plans[g.id].selected))]}
function planList(){return GROUPS.filter(g=>plans[g.id].enabled).map(g=>{const p=plans[g.id];return {group:g.id,mode:p.mode,sections:p.mode==='all'?g.sections.map(s=>s[0]):p.selected,kind:p.kind,count:+p.count||0,quotas:p.quotas}}).filter(p=>p.mode==='quota'?Object.values(p.quotas).some(q=>q.single||q.multiple):p.count>0)}
function recalc(){
 let n=0,single=0,multiple=0;
 for(const g of GROUPS){const p=plans[g.id];if(!p.enabled)continue;
 if(p.mode==='quota'){for(const s of g.sections){if(!p.selected.includes(s[0]))continue;single+=Number(p.quotas[s[0]].single)||0;multiple+=Number(p.quotas[s[0]].multiple)||0;}}
 else {const amount=Number(p.count)||0;n+=amount;if(p.kind==='single')single+=amount;else if(p.kind==='multiple')multiple+=amount;}
 }
 const unknown=n;const total=n+single+multiple;
 $('count').value=total;$('quotaSummary').textContent='本次合計 '+total+' 題｜指定單選 '+single+'、指定複選 '+multiple+'、混合／隨機 '+unknown+' 題';
 $('singleCount').textContent=String(single);$('multipleCount').textContent=String(multiple);
 const scoreSingle=Number($('scoreSingle').value)||0,scoreMultiple=Number($('scoreMultiple').value)||0;
 $('singleSub').textContent=(single*scoreSingle).toString();$('multipleSub').textContent=(multiple*scoreMultiple).toString();
 $('scoreSummary').textContent='已明確指定的配分小計 '+(single*scoreSingle+multiple*scoreMultiple)+' 分；隨機混合題依實際抽到的單複選數量計分。';
}
function renderGroups(){
 $('groupConfig').innerHTML=GROUPS.map(g=>{const p=plans[g.id];const opts=p.mode==='quota'?g.sections.filter(s=>p.selected.includes(s[0])).map(s=>'<tr><td>'+esc(s[1])+'<div class="sub">'+s[0]+'</div></td><td>'+s[2]+'</td><td><input class="planQuota" data-group="'+g.id+'" data-section="'+s[0]+'" data-kind="single" type="number" min="0" max="'+s[2]+'" value="'+p.quotas[s[0]].single+'"></td><td>'+s[3]+'</td><td><input class="planQuota" data-group="'+g.id+'" data-section="'+s[0]+'" data-kind="multiple" type="number" min="0" max="'+s[3]+'" value="'+p.quotas[s[0]].multiple+'" '+(!s[3]?'disabled':'')+'></td></tr>').join(''):'';
 return '<div class="group plan-group" style="margin-top:16px"><label class="switchrow"><input type="checkbox" class="planEnabled" data-group="'+g.id+'" '+(p.enabled?'checked':'')+'><b>'+esc(g.name)+'</b></label>'+(p.enabled?'<div class="toolbar"><label>抽題模式<select class="planMode" data-group="'+g.id+'"><option value="all" '+(p.mode==='all'?'selected':'')+'>全題庫隨機</option><option value="partial" '+(p.mode==='partial'?'selected':'')+'>部分題庫隨機</option><option value="quota" '+(p.mode==='quota'?'selected':'')+'>精準指定單／複選</option></select></label></div>'+
 (p.mode!=='all'?'<div class="checks" style="margin:14px 0">'+g.sections.map(s=>'<label><input type="checkbox" class="planSection" data-group="'+g.id+'" value="'+s[0]+'" '+(p.selected.includes(s[0])?'checked':'')+'> '+esc(s[1])+'</label>').join('')+'</div>':'')+
 (p.mode==='quota'?'<div class="scroll-table"><table><thead><tr><th>題庫</th><th>單選可抽</th><th>單選題數</th><th>複選可抽</th><th>複選題數</th></tr></thead><tbody>'+opts+'</tbody></table></div>':'<div class="grid2"><div class="field"><label>抽選題數</label><input class="planCount" data-group="'+g.id+'" type="number" min="0" value="'+p.count+'"></div><div class="field"><label>題型</label><select class="planKind" data-group="'+g.id+'"><option value="mixed" '+(p.kind==='mixed'?'selected':'')+'>單選＋複選</option><option value="single" '+(p.kind==='single'?'selected':'')+'>僅單選</option><option value="multiple" '+(p.kind==='multiple'?'selected':'')+'>僅複選</option></select></div></div>'):'')+'</div>';
 }).join('');
 document.querySelectorAll('.planEnabled').forEach(x=>x.onchange=()=>{plans[x.dataset.group].enabled=x.checked;renderGroups()});
 document.querySelectorAll('.planMode').forEach(x=>x.onchange=()=>{plans[x.dataset.group].mode=x.value;renderGroups()});
 document.querySelectorAll('.planSection').forEach(x=>x.onchange=()=>{const a=plans[x.dataset.group].selected;plans[x.dataset.group].selected=x.checked?[...new Set([...a,x.value])]:a.filter(s=>s!==x.value);renderGroups()});
 document.querySelectorAll('.planCount').forEach(x=>x.oninput=()=>{plans[x.dataset.group].count=Number(x.value)||0;recalc()});
 document.querySelectorAll('.planKind').forEach(x=>x.onchange=()=>{plans[x.dataset.group].kind=x.value;recalc()});
 document.querySelectorAll('.planQuota').forEach(x=>x.oninput=()=>{plans[x.dataset.group].quotas[x.dataset.section][x.dataset.kind]=Number(x.value)||0;recalc()});
 recalc();
}
$('resetPlan').onclick=()=>{for(const p of Object.values(plans)){p.enabled=false;p.count=0;for(const q of Object.values(p.quotas)){q.single=0;q.multiple=0}}renderGroups()};
$('scoreSingle').oninput=recalc;$('scoreMultiple').oninput=recalc;
renderGroups();
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
async function publish(){
 if(!code())return alert('請先驗證老師管理碼');
 const parts=planList();if(!parts.length)return alert('請先設定抽題範圍和題數');
 const subs=[...new Set(parts.flatMap(x=>x.sections))];
 for(const g of GROUPS){const p=plans[g.id];if(!p.enabled)continue;const ss=p.mode==='all'?g.sections:g.sections.filter(s=>p.selected.includes(s[0]));
 if(!ss.length)return alert(g.name+' 尚未選擇題庫');
 if(p.mode==='quota')for(const s of ss){const q=p.quotas[s[0]];if(!Number.isInteger(q.single)||!Number.isInteger(q.multiple)||q.single<0||q.multiple<0||q.single>s[2]||q.multiple>s[3])return alert(s[1]+' 出題數超過題庫可抽數或不是有效整數')}
 else if(p.count>ss.reduce((n,s)=>n+(p.kind==='multiple'?s[3]:p.kind==='single'?s[2]:s[2]+s[3]),0))return alert(g.name+' 可抽題數不足');
 }
 const gateOn=$('gateEnabled').checked;
 if(gateOn&&(!$('gateStart').value||!$('gateEnd').value||!$('gatePassword').value.trim()))return alert('請完整設定考場密碼時段');
 const num=id=>Number($(id).value);
 if(![num('scoreSingle'),num('scoreMultiple')].every(n=>Number.isFinite(n)&&n>=0&&n<=100))return alert('配分數值不正確');
 $('publish').disabled=true;
 const localIso=v=>v?new Date(v).toISOString():null;
 const {data,error}=await db.rpc('software_exam_teacher_publish_v6',{p_code:code(),p_title:$('title').value,p_question_count:num('count'),p_type_mode:'mixed',p_subjects:subs,p_draw_mode:'quota',p_open:$('open').value==='true',p_prevent_leave:$('prevent').checked,p_leave_grace_seconds:num('grace')||5,p_gate_enabled:gateOn,p_gate_start_at:localIso($('gateStart').value),p_gate_end_at:localIso($('gateEnd').value),p_gate_password:$('gatePassword').value.trim(),p_subject_quotas:{},p_draw_plan:parts,p_score_single:num('scoreSingle'),p_score_multiple:num('scoreMultiple')});
 $('publish').disabled=false;
 $('msg').className='msg '+(error?'err':'ok');
 $('msg').textContent=error?'發布失敗：'+friendly(error):'發布成功，已建立 '+data.available+' 題的考試。';
 if(!error){await active();await records()}
}
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