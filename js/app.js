/* Método 40+ — App (Mobile-First) */
const S = {
  user:null, settings:null, templates:[], mealPlans:[],
  selectedLevel:'beginner', selectedTemplate:null, selectedMealPlan:null,
  workoutDays:[], todaySlots:[], todayMeals:[], progress:new Set(),
  isAdmin:false, adminStudents:[], adminSelectedUser:null
};

const LL = {beginner:'Iniciante',intermediate:'Intermediário',advanced:'Avançado'};
const SCHED = {3:{1:0,3:1,5:2}, 4:{1:0,2:1,4:2,5:3}, 5:{1:0,2:1,3:2,4:3,5:4}};
const MOT = [
  {min:0,max:0,i:'💪',t:'Cada dia é uma nova chance. Vamos lá!'},
  {min:1,max:25,i:'🌱',t:'O primeiro passo é o mais importante. Continue!'},
  {min:26,max:50,i:'🔥',t:'Você está no caminho certo! Não pare!'},
  {min:51,max:75,i:'💖',t:'Mais da metade! Seu corpo agradece!'},
  {min:76,max:99,i:'🌟',t:'Quase lá! Você é incrível!'},
  {min:100,max:100,i:'👑',t:'Dia PERFEITO! Parabéns, você arrasou!'}
];
const WD=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const MN=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const td=()=>new Date().toISOString().split('T')[0];
const fmtDate=d=>`${WD[d.getDay()]}, ${d.getDate()} de ${MN[d.getMonth()]}`;
function setLoginBusy(isBusy){
  const btn=document.getElementById('login-btn');
  if(!btn) return;
  btn.textContent=isBusy?'Entrando...':'Entrar';
  btn.disabled=!!isBusy;
}

// ==== INIT ====
async function init(){
  DB.onAuth(async(_,session)=>{
    S.user=session?.user||null;
    if(S.user) await afterLogin(); else showPage('login');
  });
  const session=await DB.getSession();
  S.user=session?.user||null;
  if(S.user) await afterLogin(); else showPage('login');
}

async function afterLogin(){
  try{
    [S.templates,S.mealPlans]=await Promise.all([DB.getTemplates(),DB.getMealPlans()]);
    S.settings=await DB.getSettings(S.user.id);
    S.isAdmin=S.settings?.is_admin||false;

    // Show/hide admin tab
    const adminNav=document.getElementById('nav-admin');
    if(adminNav) adminNav.style.display=S.isAdmin?'flex':'none';

    if(!S.settings||!S.settings.workout_template_id){
      buildSetup();
      setLoginBusy(false);
      showPage('setup');
    } else {
      await loadDashboard();
      setLoginBusy(false);
      showPage('dashboard');
    }
  }catch(e){
    console.error('afterLogin:',e);
    setLoginBusy(false);
    showPage('login');
    toast(e?.message ? `Erro ao carregar dados: ${e.message}` : 'Erro ao carregar dados.');
  }
}

// ==== PAGES ====
function showPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  const bn=document.getElementById('bottom-nav');
  const show=['dashboard','chat','settings','admin'].includes(name);
  if(bn) bn.style.display=show?'flex':'none';
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.nav===name));
}

function nav(page){
  if(page==='admin'&&S.isAdmin) loadAdmin();
  if(page==='chat') loadChat();
  if(page==='settings') loadSettings();
  showPage(page);
}

// ==== LOGIN ====
async function login(e){
  e.preventDefault();
  const email=document.getElementById('login-email').value;
  const pass=document.getElementById('login-password').value;
  const errEl=document.getElementById('login-error');
  errEl.classList.remove('show');
  setLoginBusy(true);
  try{
    const data=await DB.signIn(email,pass);
    const user=data?.session?.user||data?.user||null;

    // Nao dependa apenas do evento de auth para seguir a navegacao.
    if(user){
      S.user=user;
      await afterLogin();
    }
  }catch(err){
    console.error('login:',err);
    errEl.textContent=err.message?.includes('Invalid')?'Email ou senha incorretos.':(err.message||'Erro ao entrar.');
    errEl.classList.add('show');
    setLoginBusy(false);
  }
}
async function logout(){await DB.signOut();S.user=null;S.settings=null;S.progress.clear();showPage('login');toast('Até logo! 👋');}

// ==== SETUP ====
function buildSetup(){
  const levels=[...new Set(S.templates.map(t=>t.level))];
  document.getElementById('lvl-tabs').innerHTML=levels.map(l=>`<button class="lvl-tab ${l===S.selectedLevel?'active':''}" onclick="App.selectLevel('${l}')">${LL[l]||l}</button>`).join('');
  if(S.settings?.display_name) document.getElementById('setup-name').value=S.settings.display_name;
  if(S.settings?.workout_template_id) S.selectedTemplate=S.templates.find(t=>t.id===S.settings.workout_template_id);
  if(S.settings?.meal_plan_id) S.selectedMealPlan=S.mealPlans.find(p=>p.id===S.settings.meal_plan_id);
  renderProgList();renderMealOpts();updateSetupBtn();
}
function selectLevel(l){S.selectedLevel=l;S.selectedTemplate=null;document.querySelectorAll('.lvl-tab').forEach(t=>t.classList.toggle('active',t.textContent===(LL[l]||l)));renderProgList();updateSetupBtn();}
function renderProgList(){
  const el=document.getElementById('prog-list');
  const f=S.templates.filter(t=>t.level===S.selectedLevel);
  el.innerHTML=f.map(t=>`<div class="prog-card ${S.selectedTemplate?.id===t.id?'sel':''}" onclick="App.selectProg('${t.id}')"><span class="freq">${t.days_per_week}x por semana</span><h4>${t.name}</h4><p>${t.description||''}</p></div>`).join('');
  if(!f.length) el.innerHTML='<p style="color:var(--text-lt);font-size:.88rem">Nenhum programa encontrado para este nível.</p>';
}
function selectProg(id){S.selectedTemplate=S.templates.find(t=>t.id===id);renderProgList();updateSetupBtn();}
function renderMealOpts(){
  const el=document.getElementById('meal-list-setup');
  el.innerHTML=S.mealPlans.map(p=>`<div class="meal-opt ${S.selectedMealPlan?.id===p.id?'sel':''}" onclick="App.selectMeal(${p.id})"><span class="mi">${p.icon||'🍽️'}</span><div><h4>${p.name}</h4><p>${p.description||''}</p></div></div>`).join('');
}
function selectMeal(id){S.selectedMealPlan=S.mealPlans.find(p=>p.id===id);renderMealOpts();updateSetupBtn();}
function updateSetupBtn(){document.getElementById('setup-btn').disabled=!(S.selectedTemplate&&S.selectedMealPlan&&document.getElementById('setup-name').value.trim());}
function goSetup(){buildSetup();showPage('setup');}

async function saveSetup(){
  const name=document.getElementById('setup-name').value.trim();
  if(!S.selectedTemplate||!S.selectedMealPlan||!name) return;
  try{
    await DB.saveSettings(S.user.id,S.selectedTemplate.id,S.selectedMealPlan.id,name);
    S.settings={user_id:S.user.id,workout_template_id:S.selectedTemplate.id,meal_plan_id:S.selectedMealPlan.id,display_name:name};
    await loadDashboard();showPage('dashboard');toast('Programa salvo! Bora começar! 💪');
  }catch(err){console.error('saveSetup:',err);toast('Erro ao salvar.');}
}

// ==== DASHBOARD ====
async function loadDashboard(){
  const now=new Date();
  const name=S.settings?.display_name||S.user.email.split('@')[0];
  document.getElementById('dash-greet').textContent=`Olá, ${name}! 👋`;
  document.getElementById('dash-date').textContent=fmtDate(now);

  const tpl=S.templates.find(t=>t.id===S.settings.workout_template_id);
  if(tpl){
    document.getElementById('dash-program-badge').textContent=tpl.name;
    S.workoutDays=await DB.getTemplateDays(tpl.id);
    const dow=now.getDay();
    const sch=SCHED[tpl.days_per_week]||SCHED[3];
    const wi=sch[dow];
    if(wi!==undefined&&S.workoutDays[wi]){
      const day=S.workoutDays[wi];
      S.todaySlots=await DB.getDaySlots(day.id);
      renderWorkout(day);
    }else{S.todaySlots=[];renderRest();}
  }

  const mp=S.mealPlans.find(p=>p.id===S.settings.meal_plan_id);
  if(mp){S.todayMeals=mp.meals||[];renderMeals();}

  try{const prog=await DB.getProgress(S.user.id,td());S.progress=new Set(prog.map(p=>`${p.item_type}:${p.item_key}`));}catch{S.progress=new Set();}
  applyDoneStates();updateProgress();
}

function renderMeals(){
  document.getElementById('meal-list').innerHTML=S.todayMeals.map(m=>{
    const k=`meal:${m.id}`;const d=S.progress.has(k);
    return `<div class="meal-item ${d?'done':''}" data-key="${k}" onclick="App.toggle(this)"><div class="chk">${d?'✓':''}</div><div><div class="meal-lbl">${m.meal_label}</div><div class="meal-dsc">${m.description}</div></div></div>`;
  }).join('');
}

function renderWorkout(day){
  document.getElementById('wk-title').textContent='💪 Treino do Dia';
  let h=`<div class="wk-day-hdr"><h4>${day.name}</h4><p>${day.notes||''}</p></div>`;
  h+=S.todaySlots.filter(s=>s.exercise).map(s=>{
    const ex=s.exercise;const k=`exercise:${s.id}`;const d=S.progress.has(k);
    const reps=s.reps_min===s.reps_max?s.reps_min:`${s.reps_min}-${s.reps_max}`;
    return `<div class="ex-item ${d?'done':''}" data-key="${k}" onclick="App.toggle(this)"><div class="chk">${d?'✓':''}</div><div style="flex:1"><div class="ex-name">${ex.name}</div><div class="ex-meta"><span class="ex-badge">${s.sets}×${reps}</span>${s.rest_seconds?`<span class="ex-badge">${s.rest_seconds}s desc.</span>`:''}</div>${s.notes?`<div class="ex-tip">💡 ${s.notes}</div>`:''}</div></div>`;
  }).join('');
  document.getElementById('wk-area').innerHTML=h;
}

function renderRest(){
  document.getElementById('wk-title').textContent='😴 Dia de Descanso';
  document.getElementById('wk-area').innerHTML=`<div class="rest-day"><div class="ri">🧘‍♀️</div><h3>Dia de Descanso</h3><p>Hoje é dia de recuperação! Hidrate, alongue e durma bem.</p></div>`;
}

function applyDoneStates(){
  document.querySelectorAll('[data-key]').forEach(el=>{
    const done=S.progress.has(el.dataset.key);
    el.classList.toggle('done',done);
    el.querySelector('.chk').textContent=done?'✓':'';
  });
}

// ==== TOGGLE ====
async function toggle(el){
  const key=el.dataset.key;const[type,id]=key.split(':');const done=S.progress.has(key);
  if(done){S.progress.delete(key);el.classList.remove('done');el.querySelector('.chk').textContent='';}
  else{S.progress.add(key);el.classList.add('done');el.querySelector('.chk').textContent='✓';}
  updateProgress();
  try{if(done)await DB.removeProgress(S.user.id,td(),type,id);else await DB.addProgress(S.user.id,td(),type,id);}catch(e){console.error(e);}
}

function updateProgress(){
  const totalM=S.todayMeals.length;const totalE=S.todaySlots.filter(s=>s.exercise).length;const total=totalM+totalE;
  const doneM=S.todayMeals.filter(m=>S.progress.has(`meal:${m.id}`)).length;
  const doneE=S.todaySlots.filter(s=>s.exercise&&S.progress.has(`exercise:${s.id}`)).length;
  const done=doneM+doneE;const pct=total>0?Math.round(done/total*100):0;
  const arc=document.getElementById('prog-arc');arc.style.strokeDashoffset=113.1-(113.1*pct/100);
  document.getElementById('prog-pct').textContent=pct+'%';
  document.getElementById('dash-prog-txt').innerHTML=total?`<strong>${done} de ${total}</strong> tarefas concluídas`:'Carregando...';
  const m=MOT.find(x=>pct>=x.min&&pct<=x.max)||MOT[0];
  document.getElementById('motiv-i').textContent=m.i;
  document.getElementById('motiv-txt').textContent=m.t;
}

// ==== CHAT ====
async function loadChat(){
  const el=document.getElementById('chat-msgs');
  el.innerHTML='<div class="spinner"></div>';
  try{
    const msgs=await DB.getMessages(S.user.id);
    el.innerHTML=msgs.length?msgs.map(m=>`<div class="chat-msg ${m.sender_role}"><div>${esc(m.content)}</div><span class="msg-time">${fmtTime(m.created_at)}</span></div>`).join(''):'<p style="text-align:center;color:var(--text-lt);padding:40px 20px;font-size:.88rem">Nenhuma mensagem. Envie uma dúvida, sugestão ou reclamação!</p>';
    el.scrollTop=el.scrollHeight;
  }catch(e){el.innerHTML='<p style="text-align:center;color:var(--text-lt);padding:40px">Chat indisponível no momento.</p>';}
}
async function sendMsg(){
  const input=document.getElementById('chat-input');const txt=input.value.trim();if(!txt)return;
  input.value='';
  try{await DB.sendMessage(S.user.id,txt,'user');loadChat();toast('Mensagem enviada!');}catch(e){toast('Erro ao enviar.');console.error(e);}
}

// ==== SETTINGS ====
function loadSettings(){
  if(S.settings?.display_name) document.getElementById('sett-name').value=S.settings.display_name;
  const tpl=S.templates.find(t=>t.id===S.settings?.workout_template_id);
  document.getElementById('sett-prog').textContent=tpl?tpl.name:'—';
  document.getElementById('sett-prog-desc').textContent=tpl?`${tpl.days_per_week}x/semana — ${LL[tpl.level]||tpl.level}`:'';
  const mp=S.mealPlans.find(p=>p.id===S.settings?.meal_plan_id);
  document.getElementById('sett-meal').textContent=mp?mp.name:'—';
}
async function saveName(){
  const name=document.getElementById('sett-name').value.trim();if(!name)return;
  try{await DB.updateName(S.user.id,name);S.settings.display_name=name;toast('Nome atualizado! ✨');}catch(e){toast('Erro ao salvar nome.');}
}
async function changePass(){
  const pass=document.getElementById('sett-newpass').value;
  if(!pass||pass.length<6){toast('Senha deve ter no mínimo 6 caracteres.');return;}
  try{await DB.updatePassword(pass);document.getElementById('sett-newpass').value='';toast('Senha alterada! 🔐');}catch(e){toast('Erro ao alterar senha.');}
}
// ==== ADMIN ====
async function loadAdmin(){
  const body=document.getElementById('admin-body');
  const detail=document.getElementById('admin-detail');
  body.style.display='block';detail.style.display='none';
  document.getElementById('student-list').innerHTML='<div class="spinner"></div>';
  try{
    const[settings,unread]=await Promise.all([DB.getAllSettings(),DB.getUnreadCounts()]);
    S.adminStudents=settings.filter(s=>!s.is_admin).map(s=>({...s,unread:unread[s.user_id]||0}));
    renderStudents();
  }catch(e){document.getElementById('student-list').innerHTML='<p style="color:var(--text-lt)">Erro ao carregar.</p>';console.error(e);}
}
function renderStudents(){
  const q=(document.getElementById('admin-search')?.value||'').toLowerCase();
  const filtered=S.adminStudents.filter(s=>(s.display_name||'').toLowerCase().includes(q));
  document.getElementById('student-list').innerHTML=filtered.map(s=>{
    const initials=(s.display_name||'?').substring(0,2).toUpperCase();
    const tpl=S.templates.find(t=>t.id===s.workout_template_id);
    return `<div class="student-card" onclick="App.openStudent('${s.user_id}')"><div class="student-avatar">${initials}</div><div class="student-info"><h4>${esc(s.display_name||'Sem nome')} ${s.unread?'<span class="new-msg-dot"></span>':''}</h4><p>${tpl?tpl.name:'Sem programa'}</p></div></div>`;
  }).join('')||'<p style="color:var(--text-lt);text-align:center;padding:20px">Nenhuma aluna encontrada.</p>';
}
function filterStudents(){renderStudents();}

async function openStudent(uid){
  S.adminSelectedUser=uid;
  document.getElementById('admin-body').style.display='none';
  document.getElementById('admin-detail').style.display='block';
  const s=S.adminStudents.find(x=>x.user_id===uid);
  document.getElementById('detail-name').textContent=s?.display_name||'Aluna';
  document.getElementById('detail-email').textContent=uid;
  const tpl=S.templates.find(t=>t.id===s?.workout_template_id);
  document.getElementById('detail-prog').textContent=tpl?`${tpl.name} (${tpl.days_per_week}x/sem)`:'—';
  const mp=S.mealPlans.find(p=>p.id===s?.meal_plan_id);
  document.getElementById('detail-meal').textContent=mp?mp.name:'—';
  try{const prog=await DB.getUserProgress(uid,td());document.getElementById('detail-progress').textContent=`${prog.length} itens concluídos hoje`;}catch{document.getElementById('detail-progress').textContent='—';}
  loadAdminChat(uid);
}
async function loadAdminChat(uid){
  const el=document.getElementById('admin-chat-msgs');
  try{
    const msgs=await DB.getMessages(uid);
    el.innerHTML=msgs.map(m=>`<div class="chat-msg ${m.sender_role}"><div>${esc(m.content)}</div><span class="msg-time">${fmtTime(m.created_at)}</span></div>`).join('')||'<p style="color:var(--text-lt);font-size:.85rem;text-align:center">Sem mensagens.</p>';
    el.scrollTop=el.scrollHeight;
    await DB.markRead(uid);
  }catch(e){el.innerHTML='<p style="color:var(--text-lt)">Erro.</p>';}
}
async function adminSendMsg(){
  const input=document.getElementById('admin-chat-input');const txt=input.value.trim();if(!txt||!S.adminSelectedUser)return;
  input.value='';
  try{await DB.sendMessage(S.adminSelectedUser,txt,'admin');loadAdminChat(S.adminSelectedUser);toast('Enviado!');}catch(e){toast('Erro.');console.error(e);}
}
function backToList(){document.getElementById('admin-body').style.display='block';document.getElementById('admin-detail').style.display='none';}

// ==== UTILS ====
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),3000);}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function fmtTime(iso){const d=new Date(iso);return `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}

// Listen for name input changes to update setup button
document.addEventListener('DOMContentLoaded',()=>{
  const ni=document.getElementById('setup-name');
  if(ni) ni.addEventListener('input',updateSetupBtn);
});

window.App={login,logout,showPage,nav,selectLevel,selectProg:selectProg,selectMeal,saveSetup,goSetup,toggle,toast,sendMsg,saveName,changePass,loadAdmin,openStudent,adminSendMsg,backToList,filterStudents};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
