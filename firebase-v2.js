(() => {
  const VERSION='v2.0.2';
  const cfg={
    apiKey:'AIzaSyAxDNqFPx8quVK-DPM24sYM-IOE9KmXH_I',
    authDomain:'kunnskapslab.firebaseapp.com',
    projectId:'kunnskapslab',
    storageBucket:'kunnskapslab.firebasestorage.app',
    messagingSenderId:'965821299844',
    appId:'1:965821299844:web:668324a0e5a7a6890f96d1'
  };

  const $=id=>document.getElementById(id);
  let auth,db,user=null,role=null,ready=false,remoteApplying=false;
  document.title='KunnskapsLab '+VERSION;
  const h=document.querySelector('header h1'); if(h) h.textContent='KunnskapsLab';
  const v=document.querySelector('.version'); if(v) v.textContent=VERSION;

  const style=document.createElement('style');
  style.textContent=`#klAuth{position:fixed;inset:0;z-index:20000;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:20px}#klAuth.hidden{display:none}.kl-box{width:min(430px,100%);background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:24px;box-shadow:0 18px 55px rgba(15,23,42,.12)}.kl-box h2{margin:0 0 6px}.kl-box input{margin:5px 0 10px}.kl-error{color:#b91c1c;min-height:22px;margin-top:10px;overflow-wrap:anywhere}#klUser{font-size:.82rem;color:#cbd5e1;text-align:right}.kl-logout{background:#334155!important;color:#fff!important}`;
  document.head.appendChild(style);
  const overlay=document.createElement('div'); overlay.id='klAuth';
  overlay.innerHTML=`<div class="kl-box"><h2>KunnskapsLab</h2><p class="muted">Logg inn for å få tilgang til oppgavene.</p><label>E-post</label><input id="klEmail" type="email" autocomplete="username"><label>Passord</label><input id="klPass" type="password" autocomplete="current-password"><button id="klLogin" class="primary" style="width:100%;margin-top:8px">Logg inn</button><div id="klErr" class="kl-error small"></div></div>`;
  document.body.appendChild(overlay);
  const nav=document.querySelector('header nav');
  if(nav){const info=document.createElement('div');info.id='klUser';nav.appendChild(info);const out=document.createElement('button');out.id='klLogout';out.className='kl-logout';out.textContent='Logg ut';out.style.display='none';nav.appendChild(out);}
  function parse(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
  function roleDoc(uid){return db.collection('users').doc(uid);}
  async function putTasks(tasks){if(role!=='teacher'||remoteApplying)return;const batch=db.batch();Object.entries(tasks||{}).forEach(([id,t])=>batch.set(db.collection('tasks').doc(id),{...t,_updatedAt:firebase.firestore.FieldValue.serverTimestamp()}));await batch.commit();}
  async function putResponses(arr){if(remoteApplying)return;const batch=db.batch();(arr||[]).forEach(r=>{if(!r?.id)return;const data={...r,studentId:r.studentId||user?.uid||''};batch.set(db.collection('responses').doc(r.id),data,{merge:true});});await batch.commit();}
  async function pullTasks(){const snap=await db.collection('tasks').get();const cloud={};snap.forEach(d=>{const x=d.data();delete x._updatedAt;cloud[d.id]=x;});const local=parse('sg_tasks',{});const merged=role==='teacher'?{...cloud,...local}:cloud;remoteApplying=true;localStorage.setItem('sg_tasks',JSON.stringify(merged));remoteApplying=false;if(role==='teacher'&&Object.keys(local).length)await putTasks(merged);}
  async function pullResponses(){if(role!=='teacher')return;const snap=await db.collection('responses').get();const cloud=[];snap.forEach(d=>cloud.push(d.data()));const local=parse('sg_responses',[]);const map=new Map(cloud.map(r=>[r.id,r]));local.forEach(r=>map.set(r.id,r));const merged=[...map.values()];remoteApplying=true;localStorage.setItem('sg_responses',JSON.stringify(merged));remoteApplying=false;if(local.length)await putResponses(merged);}
  const nativeSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,val){nativeSet.call(this,k,val);if(this!==localStorage||!ready||remoteApplying)return;if(k==='sg_tasks'&&role==='teacher')putTasks(parse('sg_tasks',{})).catch(console.error);if(k==='sg_responses')putResponses(parse('sg_responses',[])).catch(console.error);};
  async function afterLogin(u){user=u;const ds=await roleDoc(u.uid).get();role=ds.exists?ds.data().role:null;if(!['teacher','student'].includes(role)){await auth.signOut();throw new Error('Denne brukeren mangler tilgangsrolle.');}await pullTasks();await pullResponses();ready=true;overlay.classList.add('hidden');const info=$('klUser');if(info)info.textContent=(role==='teacher'?'Lærer: ':'Elev: ')+u.email;const out=$('klLogout');if(out)out.style.display='inline-block';if(role==='student'){document.body.classList.remove('teacher-auth');['navTeacher','navArchive','navResponses','teacherLogoutBtn'].forEach(id=>{const e=$(id);if(e)e.style.display='none';});const ns=$('navStudent');if(ns)ns.click();}else{const oldLogout=$('teacherLogoutBtn');if(oldLogout)oldLogout.style.display='none';}}
  function friendlyAuthError(err){const code=err?.code||'ukjent-feil';const map={'auth/invalid-credential':'Firebase avviser e-post eller passord.','auth/invalid-login-credentials':'Firebase avviser e-post eller passord.','auth/user-not-found':'Firebase finner ikke denne brukeren.','auth/wrong-password':'Passordet stemmer ikke.','auth/unauthorized-domain':'Domenet er ikke godkjent i Firebase.','auth/operation-not-allowed':'E-post/passord er ikke aktivert som innloggingsmetode.','auth/network-request-failed':'Nettleseren fikk ikke kontakt med Firebase.','auth/invalid-api-key':'Firebase API-nøkkelen i appen er ugyldig.'};return (map[code]||err?.message||'Kunne ikke logge inn.')+' Feilkode: '+code;}
  function init(){if(!window.firebase){$('klErr').textContent='Kunne ikke laste Firebase. Oppdater siden.';return;}try{if(!firebase.apps.length)firebase.initializeApp(cfg);auth=firebase.auth();db=firebase.firestore();}catch(err){console.error(err);$('klErr').textContent='Firebase kunne ikke startes. '+(err.code||err.message||'');return;}$('klLogin').onclick=async()=>{const e=$('klEmail').value.trim(),p=$('klPass').value;$('klErr').textContent='Logger inn …';try{await auth.signInWithEmailAndPassword(e,p);}catch(err){console.error(err);$('klErr').textContent=friendlyAuthError(err);}};$('klPass').addEventListener('keydown',e=>{if(e.key==='Enter')$('klLogin').click();});$('klLogout').onclick=()=>auth.signOut();auth.onAuthStateChanged(async u=>{ready=false;if(!u){user=null;role=null;overlay.classList.remove('hidden');const out=$('klLogout');if(out)out.style.display='none';return;}try{await afterLogin(u);}catch(err){console.error(err);$('klErr').textContent=(err.message||'Kunne ikke åpne KunnskapsLab.')+(err.code?' Feilkode: '+err.code:'');overlay.classList.remove('hidden');}});}
  init();
})();