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
async function active(){const{data,error}=await db.rpc('software_exam_get_active');if(error){$('active').className='msg err';$('active').textContent='讀取失敗：'+friendly(error);return}if(!data){$('active').className='msg info';$('active').textContent='目前沒有開放中的考試。';return}$('active').className='msg ok';$('active').innerHTML='<b>'+data.title+'</b><br>題數：'+data.question_count+' 題｜防切換：'+(data.prevent_leave?'啟用（'+data.leave_grace_seconds+' 秒）':'關閉')+'｜時段密碼：'+(data.gate_enabled?(data.gate_required?'目前需要密碼':'已設定，目前不需密碼'):'關閉')
async function publish(){if(!code())return alert('請先輸入老師管理碼');const subs=selected();if(!subs.length)return alert('請至少選擇一個考試範圍');$('publish').disabled=true;const gateOn=$('gateEnabled').checked;
 if(gateOn&&(!$('gateStart').value||!$('gateEnd').value||!$('gatePassword').value.trim())){ $('publish').disabled=false; return alert('請完整設定密碼時段與考場密碼'); }
 const localIso=v=>v?new Date(v).toISOString():null;
 const{data,error}=await db.rpc('software_exam_teacher_publish_v3',{p_code:code(),p_title:$('title').value,p_question_count:+$('count').value,p_type_mode:$('type').value,p_subjects:subs,p_draw_mode:$('draw').value,p_open:$('open').value==='true',p_prevent_leave:$('prevent').checked,p_leave_grace_seconds:+$('grace').value||5,p_gate_enabled:gateOn,p_gate_start_at:localIso($('gateStart').value),p_gate_end_at:localIso($('gateEnd').value),p_gate_password:$('gatePassword').value.trim()});$('publish').disabled=false;if(error){$('msg').className='msg err';$('msg').textContent='發布失敗：'+friendly(error);return}$('msg').className='msg ok';$('msg').textContent='發布成功，可用題數 '+data.available+' 題。';await active();await records()}
async function closeExam(){if(!code())return alert('請先輸入老師管理碼');if(!confirm('確定要關閉目前考試嗎？'))return;const{data,error}=await db.rpc('software_exam_teacher_close_v2',{p_code:code()});if(error){$('msg').className='msg err';$('msg').textContent='關閉失敗：'+friendly(error);return}if(!data){$('msg').className='msg err';$('msg').textContent='關閉失敗：管理碼錯誤，或目前沒有開放中的考試。';return}$('msg').className='msg ok';$('msg').textContent='目前考試已關閉。';await active()}
async function records(){if(!code())return alert('請先輸入老師管理碼');$('rows').innerHTML='<tr><td colspan="7">讀取中…</td></tr>';const{data,error}=await db.rpc('software_exam_teacher_records_v2',{p_code:code()});if(error){$('rows').innerHTML='<tr><td colspan="7">'+friendly(error)+'</td></tr>';return}const r=data||[];$('rows').innerHTML=r.length?r.map(x=>'<tr><td>'+new Date(x.started_at).toLocaleString('zh-TW')+'</td><td>'+(x.submitted_at?new Date(x.submitted_at).toLocaleString('zh-TW'):'—')+'</td><td>'+x.exam_title+'</td><td>'+x.student_id+'</td><td>'+x.student_name+'</td><td>'+(x.score==null?'—':'<b>'+x.score+' / '+x.total+'</b>')+'</td><td>'+(x.submitted_at?'已交卷':'作答中')+'</td></tr>').join(''):'<tr><td colspan="7">目前沒有作答紀錄。</td></tr>'}
$('publish').onclick=publish;$('close').onclick=closeExam;$('refresh').onclick=records;active();