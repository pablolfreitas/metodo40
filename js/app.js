/* Metodo 40+ -- App (Mobile-First) */
const S = {
  user:null, settings:null, templates:[], mealPlans:[],
  selectedLevel:'beginner', selectedTemplate:null, selectedMealPlan:null,
  workoutDays:[], todaySlots:[], todayMeals:[], progress:new Set(),
  viewDate:null, isAdmin:false, adminStudents:[], adminSelectedUser:null
};
const LL = {beginner:'Iniciante', intermediate:'Intermediario', advanced:'Avancado'};
const SCHED = {3:{1:0,3:1,5:2}, 4:{1:0,2:1,4:2,5:3}, 5:{1:0,2:1,3:2,4:3,5:4}};
const MOT = [
  {min:0,max:0,i:'W',t:'Cada dia e uma nova chance. Vamos la!'},
  {min:1,max:25,i:'S',t:'O primeiro passo e o mais importante. Continue!'},
  {min:26,max:50,i:'F',t:'Voce esta no caminho certo! Nao pare!'}
  ];
const WD=['Domingo','Segunda-feira','Terca-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sabado'];
const MN=['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WN=['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
const td=()=>new Date().toISOString().split('T')[0];
const getISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const fmtDate=d=>`${WD[d.getDay()]}, ${d.getDate()} de ${MN[d.getMonth()]}`;
async function init(){
  S.viewDate = td();
  DB.onAuth(async(_,session)=>{
    S.user=session?.user||null;
    if(S.user) await afterLogin();
    else showPage('login');
  });
}
const session=await DB.getSession();
S.user=session?.user||null;
if(S.user) await afterLogin();
else showPage('login');
}
async function afterLogin(){
  try{
    [S.templates,S.mealPlans]=await Promise.all([DB.getTemplates(),DB.getMealPlans()]);
    S.settings=await DB.getSettings(S.user.id);
    S.isAdmin=S.settings?.is_admin||false;
    const adminNav=document.getElementById('nav-admin');
    if(adminNav) adminNav.style.display=S.isAdmin?'flex':'none';
    if(!S.settings||!S.settings.workout_template_id){
      buildSetup(); showPage('setup');
    } else {
      await loadDashboard(); showPage('dashboard');
    }
  }catch(e){console.error('afterLogin:',e);toast('Erro ao carregar dados.')}
}
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
async function login(e){
  e.preventDefault();
  const email=document.getElementById('login-email').value;
  const pass=document.getElementById('login-password').value;
  const errEl=document.getElementById('login-error');
  errEl.classList.remove('show');
  const btn=document.getElementById('login-btn');
  btn.textContent='Entrando...';btn.disabled=true;
  try{await DB.signIn(email,pass);}catch(err){
    errEl.textContent=err.message?.includes('Invalid')?'Email ou senha incorretos.':(err.message||'Erro ao entrar.');
    errEl.classList.add('show');btn.textContent='Entrar';btn.disabled=false;
  }
}
async function logout(){await DB.signOut();S.user=null;S.settings=null;S.progress.clear();showPage('login');toast('Ate logo!');}
function buildSetup(){
  const levels=[...new Set(S.templates.map(t=>t.level))];
  document.getElementById('lvl-tabs').innerHTML=levels.map(l=>`<button class="lvl-tab ${l===S.selectedLevel?'active':''}" onclick="App.selectLevel('${l}')">${LL[l]||l}</button>`).join('');
  if(S.settings?.display_name) document.getElementById('setup-name').value=S.settings.display_name;
  renderProgList();renderMealOpts();updateSetupBtn();
}
function selectLevel(l){S.selectedLevel=l;S.selectedTemplate=null;buildSetup();updateSetupBtn();}
function renderProgList(){
  const el=document.getElementById('prog-list');
  const f=S.templates.filter(t=>t.level===S.selectedLevel);
  el.innerHTML=f.map(t=>`<div class="prog-card ${S.selectedTemplate?.id===t.id?'sel':''}" onclick="App.selectProg('${t.id}')"><span class="freq">${t.days_per_week}x por semana</span><h4>${t.name}</h4><p>${t.description||''}</p></div>`).join('')||'<p>Nenhum programa encontrado.</p>';
}
function selectProg(id){S.selectedTemplate=S.templates.find(t=>t.id===id);renderProgList();updateSetupBtn();}
function renderMealOpts(){
  const el=document.getElementById('meal-list-setup');
  el.innerHTML=S.mealPlans.map(p=>`<div class="meal-opt ${S.selectedMealPlan?.id===p.id?'sel':''}" onclick="App.selectMeal(${p.id})"><span class="mi">M</span><div><h4>${p.name}</h4><p>${p.description||''}</p></div></div>`).join('');
}
function selectMeal(id){S.selectedMealPlan=S.mealPlans.find(p=>p.id===id);renderMealOpts();updateSetupBtn();}
function updateSetupBtn(){document.getElementById('setup-btn').disabled=!(S.selectedTemplate&&S.selectedMealPlan&&document.getElementById('setup-name').value.trim());}
function goSetup(){buildSetup();showPage('setup');}
async function saveSetup(){
  const name=document.getElementById('setup-name').value.trim();
  try{
    await DB.saveSettings(S.user.id,S.selectedTemplate.id,S.selectedMealPlan.id,name);
    S.settings={user_id:S.user.id,workout_template_id:S.selectedTemplate.id,meal_plan_id:S.selectedMealPlan.id,display_name:name};
    await loadDashboard();showPage('dashboard');toast('Programa salvo!');
  }catch(err){console.error('saveSetup:',err);toast('Erro ao salvar.');}
}
function renderWeekStrip(){
  const el=document.getElementById('week-strip'); if(!el) return;
  const today=td();
  const curr=new Date(S.viewDate+'T12:00:00');
  const start=new Date(curr); start.setDate(curr.getDate()-curr.getDay());
  let h='';
  for(let i=0;i<7;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    const iso=getISODate(d);
    const isToday=iso===today; const isActive=iso===S.viewDate;
    h+=`<div class="week-day ${isActive?'active':''} ${isToday?'today':''}" onclick="App.selectDate('${iso}')"><span class="wd-name">${WN[d.getDay()]}</span><span class="wd-num">${d.getDate()}</span></div>`;
  }
  el.innerHTML=h;
  const act=el.querySelector('.active'); if(act) act.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
}
async function selectDate(iso){ S.viewDate=iso; await loadDashboard(); }
async function loadDashboard(){
  const now=new Date(S.viewDate+'T12:00:00');
  const name=S.settings?.display_name||S.user.email.split('@')[0];
  document.getElementById('dash-greet').textContent=`Ola, ${name}!`;
  document.getElementById('dash-date').textContent=fmtDate(now);
  renderWeekStrip();
  const tpl=S.templates.find(t=>t.id===S.settings.workout_template_id);
  if(tpl){
    document.getElementById('dash-program-badge').textContent=tpl.name;
    S.workoutDays=await DB.getTemplateDays(tpl.id);
    const dow=now.getDay(); const sch=SCHED[tpl.days_per_week]||SCHED[3]; const wi=sch[dow];
    if(wi!==undefined&&S.workoutDays[wi]){
      const day=S.workoutDays[wi]; S.todaySlots=await DB.getDaySlots(day.id); renderWorkout(day);
    }else{S.todaySlots=[];renderRest();}
  }
  const mp=S.mealPlans.find(p=>p.id===S.settings.meal_plan_id);
  if(mp){S.todayMeals=mp.meals||[];renderMeals();}
  try{const prog=await DB.getProgress(S.user.id,S.viewDate);S.progress=new Set(prog.map(p=>`${p.item_type}:${p.item_key}`));}catch{S.progress=new Set();}
  applyDoneStates();updateProgress();
}
function renderMeals(){
  document.getElementById('meal-list').innerHTML=S.todayMeals.map(m=>{
    const k=`meal:${m.id}`;const d=S.progress.has(k);
    return `<div class="meal-item ${d?'done':''}" data-key="${k}" onclick="App.toggle(this)"><div class="chk">${d?'V':''}</div><div><div class="meal-lbl">${m.meal_label}</div><div class="meal-dsc">${m.description}</div></div></div>`;
  }).join('');
}
function renderWorkout(day){
  document.getElementById('wk-title').textContent='Treino do Dia';
  let h=`<div class="wk-day-hdr"><h4>${day.name}</h4><p>${day.notes||''}</p></div>`;
  h+=S.todaySlots.filter(s=>s.exercise).map(s=>{
    const ex=s.exercise;const k=`exercise:${s.id}`;const d=S.progress.has(k);
    const reps=s.reps_min===s.reps_max?s.reps_min:`${s.reps_min}-${s.reps_max}`;
    return `<div class="ex-item ${d?'done':''}" data-key="${k}" onclick="App.toggle(this)"><div class="chk">${d?'V':''}</div><div style="flex:1"><div class="ex-name">${ex.name}</div><div class="ex-meta"><span class="ex-badge">${s.sets}x${reps}</span>${s.rest_seconds?`<span class="ex-badge">${s.rest_seconds}s desc.</span>`:''}</div></div></div>`;
  }).join('');
  document.getElementById('wk-area').innerHTML=h;
}
function renderRest(){
  document.getElementById('wk-title').textContent='Dia de Descanso';
  document.getElementById('wk-area').innerHTML=`<div class="rest-day"><div class="ri">R</div><h3>Dia de Descanso</h3><p>Hoje e dia de recuperacao!</p></div>`;
}
function applyDoneStates(){
  document.querySelectorAll('[data-key]').forEach(el=>{
    const done=S.progress.has(el.dataset.key); el.classList.toggle('done',done); el.querySelector('.chk').textContent=done?'V':'';
  });
}
async function toggle(el){
  const key=el.dataset.key;const[type,id]=key.split(':');const done=S.progress.has(key);
  if(done) S.progress.delete(key); else S.progress.add(key);
  applyDoneStates(); updateProgress();
  try{if(done)await DB.removeProgress(S.user.id,S.viewDate,type,id);else await DB.addProgress(S.user.id,S.viewDate,type,id);}catch(e){console.error(e);}
}
function updateProgress(){
  const totalM=S.todayMeals.length;const totalE=S.todaySlots.filter(s=>s.exercise).length;const total=totalM+totalE;
  const doneM=S.todayMeals.filter(m=>S.progress.has(`meal:${m.id}`)).length;
  const doneE=S.todaySlots.filter(s=>s.exercise&&S.progress.has(`exercise:${s.id}`)).length;
  const done=doneM+doneE;const pct=total>0?Math.round(done/total*100):0;
  const arc=document.getElementById('prog-arc'); if(arc) arc.style.strokeDashoffset=113.1-(113.1*pct/100);
  document.getElementById('prog-pct').textContent=pct+'%';
  document.getElementById('dash-prog-txt').innerHTML=total?`<strong>${done} de ${total}</strong> tarefas concluidas`:'Carregando...';
  const m=MOT.find(x=>pct>=x.min&&pct<=x.max)||MOT[0];
  document.getElementById('motiv-i').textContent=m.i; document.getElementById('motiv-txt').textContent=m.t;
}
async function loadChat(){
  const el=document.getElementById('chat-msgs'); el.innerHTML='<div class="spinner"></div>';
  try{
    const msgs=await DB.getMessages(S.user.id);
    el.innerHTML=msgs.map(m=>`<div class="chat-msg ${m.sender_role}"><div>${m.content}</div><span class="msg-time">${m.created_at}</span></div>`).join('')||'<p>Nenhuma mensagem.</p>';
    el.scrollTop=el.scrollHeight;
  }catch(e){el.innerHTML='<p>Chat indisponivel.</p>';}
}
async function sendMsg(){
  const input=document.getElementById('chat-input');const txt=input.value.trim();if(!txt)return; input.value='';
  try{await DB.sendMessage(S.user.id,txt,'user');loadChat();}catch(e){toast('Erro ao enviar.');}
}
function loadSettings(){
  if(S.settings?.display_name) document.getElementById('sett-name').value=S.settings.display_name;
  const tpl=S.templates.find(t
