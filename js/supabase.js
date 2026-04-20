const SUPABASE_URL = 'https://tzcwspaznhmwsrbghszd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6Y3dzcGF6bmhtd3NyYmdoc3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzU3MjMsImV4cCI6MjA5MTExMTcyM30.MI6dKsWP08mKVVgt8nHdf8-iVQczkDguTNiqq3gEeY8';
let _sb = null;
function sb() { if(!_sb) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); return _sb; }

window.DB = {
  signIn: async (e, p) => { const { data, error } = await sb().auth.signInWithPassword({ email:e, password:p }); if(error) throw error; return data; },
  signOut: async () => { await sb().auth.signOut(); },
  getSession: async () => { const { data } = await sb().auth.getSession(); return data.session; },
  onAuth: (cb) => sb().auth.onAuthStateChange(cb),
  updatePassword: async (p) => { const { error } = await sb().auth.updateUser({ password: p }); if(error) throw error; },

  getTemplates: async () => {
    const { data } = await sb().from('workout_templates').select('id,name,slug,goal,level,days_per_week,split_type,description,sort_order').eq('is_active', true).order('sort_order');
    return data || [];
  },
  getTemplateDays: async (tid) => {
    const { data } = await sb().from('workout_template_days').select('id,day_number,name,focus,notes').eq('workout_template_id', tid).eq('is_active', true).order('day_number');
    return data || [];
  },
  getDaySlots: async (dayId) => {
    const { data: slots } = await sb().from('workout_template_slots').select('id,slot_order,name,exercise_category,muscle_group,sets,reps_min,reps_max,rest_seconds,notes').eq('workout_template_day_id', dayId).order('slot_order');
    if(!slots||!slots.length) return [];
    const sids = slots.map(s=>s.id);
    const { data: matches } = await sb().from('workout_slot_exercise_matches').select('workout_template_slot_id,exercise_id').in('workout_template_slot_id', sids).eq('is_active',true).eq('is_default',true);
    const eids = [...new Set((matches||[]).map(m=>m.exercise_id))];
    let exs = [];
    if(eids.length){ const { data } = await sb().from('exercises').select('id,name,instructions').in('id', eids).eq('is_active',true); exs = data||[]; }
    const emap = new Map(exs.map(e=>[e.id,e]));
    const mmap = new Map((matches||[]).map(m=>[m.workout_template_slot_id,m.exercise_id]));
    return slots.map(s=>({...s, exercise: emap.get(mmap.get(s.id))||null}));
  },
  getMealPlans: async () => {
    const { data: plans } = await sb().from('meal_plans').select('*').order('sort_order');
    if(!plans||!plans.length) return [];
    const pids = plans.map(p=>p.id);
    const { data: meals } = await sb().from('meal_plan_meals').select('*').in('meal_plan_id', pids).order('sort_order');
    return plans.map(p=>({...p, meals: (meals||[]).filter(m=>m.meal_plan_id===p.id)}));
  },
  getSettings: async (uid) => {
    const { data } = await sb().from('user_settings').select('*').eq('user_id', uid).maybeSingle();
    return data;
  },
  saveSettings: async (uid, tid, mpid, name) => {
    const obj = { user_id:uid, workout_template_id:tid, meal_plan_id:mpid, updated_at:new Date().toISOString() };
    if(name !== undefined) obj.display_name = name;
    const { error } = await sb().from('user_settings').upsert(obj, {onConflict:'user_id'});
    if(error) throw error;
  },
  updateName: async (uid, name) => {
    const { error } = await sb().from('user_settings').update({ display_name: name, updated_at: new Date().toISOString() }).eq('user_id', uid);
    if(error) throw error;
  },
  getProgress: async (uid, date) => {
    const { data } = await sb().from('daily_progress').select('item_type,item_key').eq('user_id',uid).eq('tracking_date',date);
    return data||[];
  },
  addProgress: async (uid, date, type, key) => {
    const { error } = await sb().from('daily_progress').insert({user_id:uid,tracking_date:date,item_type:type,item_key:key});
    if(error && !error.message.includes('duplicate')) throw error;
  },
  removeProgress: async (uid, date, type, key) => {
    await sb().from('daily_progress').delete().eq('user_id',uid).eq('tracking_date',date).eq('item_type',type).eq('item_key',key);
  },
  resetAllProgress: async (uid) => {
    await sb().from('daily_progress').delete().eq('user_id', uid);
  },

  // Messages
  getMessages: async (uid) => {
    const { data } = await sb().from('messages').select('*').eq('user_id',uid).order('created_at',{ascending:true});
    return data||[];
  },
  sendMessage: async (uid, content, role='user') => {
    const { error } = await sb().from('messages').insert({user_id:uid,content,sender_role:role});
    if(error) throw error;
  },
  markRead: async (uid) => {
    await sb().from('messages').update({is_read:true}).eq('user_id',uid).eq('is_read',false);
  },

  // Admin
  getAllSettings: async () => {
    const { data } = await sb().from('user_settings').select('*');
    return data||[];
  },
  getUnreadCounts: async () => {
    const { data } = await sb().from('messages').select('user_id').eq('sender_role','user').eq('is_read',false);
    const counts = {};
    (data||[]).forEach(m => { counts[m.user_id] = (counts[m.user_id]||0) + 1; });
    return counts;
  },
  getUserProgress: async (uid, date) => {
    const { data } = await sb().from('daily_progress').select('item_type,item_key').eq('user_id',uid).eq('tracking_date',date);
    return data||[];
  }
};
