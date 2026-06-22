/* Headless self-test (run with jsc; NOT included by index.html).
   Stubs a minimal DOM, loads data.js + core.js + all views, then executes
   every view.render() for every persona and exercises App.askTara(). */

function makeEl() {
  var e = { innerHTML:'', textContent:'', value:'', scrollTop:0, style:{}, dataset:{} };
  e.classList = { toggle:function(){}, add:function(){}, remove:function(){}, contains:function(){return false;} };
  e.querySelector = function(){ return makeEl(); };
  e.querySelectorAll = function(){ return []; };
  e.addEventListener = function(){};
  e.removeEventListener = function(){};
  e.appendChild = function(){};
  e.removeChild = function(){};
  e.remove = function(){};
  e.focus = function(){};
  e.closest = function(){ return makeEl(); };
  e.setAttribute = function(){};
  e.getAttribute = function(){ return null; };
  return e;
}
var document = {
  getElementById:function(){ return makeEl(); },
  querySelector:function(){ return makeEl(); },
  querySelectorAll:function(){ return []; },
  addEventListener:function(){},
  createElement:function(){ return makeEl(); },
  body: makeEl()
};
var window = globalThis;
globalThis.window = window;
globalThis.document = document;
globalThis.setTimeout = function(){ return 0; };
globalThis.clearTimeout = function(){};
globalThis.console = { log:function(){}, error:function(){}, warn:function(){}, info:function(){} };
globalThis.localStorage = { _d:{}, getItem:function(k){ return this._d[k]||null; }, setItem:function(k,v){ this._d[k]=v; }, removeItem:function(k){ delete this._d[k]; } };
globalThis.fetch = function(){ return Promise.reject(new Error('no network in harness')); };

var rd = (typeof readFile !== 'undefined') ? readFile : read;
function load(p){ try { (0, eval)(rd(p)); return null; } catch(e){ return p + ' :: ' + e; } }

var loadErrors = [];
['data.js','core.js','llm.js','sim.js','tour.js'].forEach(function(f){ var e=load(f); if(e) loadErrors.push('LOAD '+e); });

var viewFiles = ['dashboard','copilot','policies','directory','access','usersaccess','polygpt','rulesense',
  'approvals','regulatory','usermgmt','category','bredecoder','insightgen','assessments','connectors'];
viewFiles.forEach(function(v){ var e=load('views/'+v+'.js'); if(e) loadErrors.push('LOAD '+e); });

if (loadErrors.length) { print('LOAD ERRORS:\n' + loadErrors.join('\n')); throw 'stop'; }

var personas = DB.users.map(function(u){ return Object.assign({}, App.emp(u.id), u); });
var routes = Object.keys(App.views);
var renderFails = [], mountWarns = [];

personas.forEach(function(user){
  App.state.user = user;
  App.state.copilot = []; App.state.chat = [];
  routes.forEach(function(route){
    var ctx = { user:user, params:{} };
    try {
      var html = App.views[route].render(ctx);
      if (typeof html !== 'string' || !html.length) renderFails.push(route+' ['+user.role+']: render returned non-string');
    } catch(e) { renderFails.push(route+' ['+user.role+']: '+e); }
    if (App.views[route].mount) {
      try { App.views[route].mount(makeEl(), ctx); }
      catch(e){ mountWarns.push(route+' ['+user.role+']: '+e); }
    }
  });
});

var queries = ["who's in the engineering team", "who is working on policyos",
  "what is abhishek chaudhary working on", "is sankalp in office today", "who is in office today",
  "what's the leave policy", "personal loan eligibility criteria", "what's anmol's salary",
  "two wheeler ltv", "show me the team headcount", "asdf gibberish nonsense"];
var askFails = [];
personas.forEach(function(user){
  queries.forEach(function(q){
    try { var r = App.askTara(q, user); if(!r || typeof r.html!=='string') askFails.push('askTara ['+user.role+'] "'+q+'" bad shape'); }
    catch(e){ askFails.push('askTara ['+user.role+'] "'+q+'": '+e); }
  });
});

/* --- RBAC semantic assertions (the actual product thesis) --- */
var semFails = [];
function chk(cond, msg){ if(!cond) semFails.push(msg); }
var admin = personas.find(function(p){return p.id==='THQ0144';});   // Sankalp / admin
var staff = personas.find(function(p){return p.id==='THQ0125';});   // Chirag / staff user
var hr    = personas.find(function(p){return p.id==='THQ0145';});   // Putul / HR admin
function locked(r){ return /don.t have access|no access|cannot access|hidden|restricted/i.test(r.html) || (r.sources||[]).some(function(s){return s.kind==='locked';}); }
var a1=App.askTara('personal loan eligibility criteria', staff); chk(locked(a1), 'RBAC: staff must be DENIED the personal loan policy');
var a2=App.askTara("what's anmol's salary", staff);             chk(locked(a2), 'RBAC: staff must be DENIED salary data');
var a3=App.askTara('personal loan eligibility criteria', admin); chk(/700|cibil/i.test(a3.html), 'RBAC: admin must SEE personal loan facts');
var a4=App.askTara("what's anmol's salary", hr);                 chk(/₹|ctc|band/i.test(a4.html), 'RBAC: HR must SEE salary');
var a5=App.askTara("who's in the engineering team", staff);      chk((a5.sources||[]).some(function(s){return s.kind==='hrms';}), 'Routing: people query -> HRMS source');
var a6=App.askTara('who is working on policyos', staff);          chk((a6.sources||[]).some(function(s){return s.kind==='jira';}), 'Routing: work query -> Jira source');
var a7=App.askTara("what's the leave policy", staff);            chk(/leave|privilege|18/i.test(a7.html) && !locked(a7), 'RBAC: staff CAN see everyone-policy (leave)');

// LLM real-model path: the CONTEXT handed to the model is itself permission-filtered
var ctxAdmin = App.llm.buildContext(admin), ctxStaff = App.llm.buildContext(staff);
chk(/Personal Loan Credit Policy/.test(ctxAdmin), 'LLM context: admin context INCLUDES the personal-loan policy');
chk(!/Personal Loan Credit Policy/.test(ctxStaff), 'LLM context: staff context EXCLUDES the personal-loan policy (moat is real)');
chk(/compensation:/i.test(ctxAdmin), 'LLM context: admin context INCLUDES compensation');
chk(!/compensation:/i.test(ctxStaff), 'LLM context: staff context EXCLUDES compensation');
var P = App.llm.PROVIDERS;
chk(P.gemini.models.length===3 && P.openai.models.length===2 && P.anthropic.models.length===3 && P.sarvam.models.length===1 && P.grok.models.length===1 && P.perplexity.models.length===1,
  'LLM catalog: 3 Gemini / 2 ChatGPT / 3 Claude / 1 Sarvam / 1 Grok / 1 Perplexity');
chk(App.llm.configured() === false, 'LLM: nothing connected by default (no Claude default)');
chk(typeof App.conn.openSetup === 'function' && DB.connectors.some(c=>c.id==='greythr') && DB.connectors.some(c=>c.id==='keka'), 'Connectors: greytHR + Keka present and connectable');
chk(typeof App.signIn==='function' && typeof App.doSignIn==='function' && typeof App.signFill==='function', 'Sign-in flow handlers present');
var bootErr=null; try { App.boot(); } catch(e){ bootErr=e; } chk(!bootErr, 'Landing (multi-section) renders without throwing: '+(bootErr||''));
var nm = App.navModel(admin);
chk(nm.pinned && nm.groups && nm.groups.length>=3, 'Sidebar: pinned items + collapsible groups');
chk(nm.groups.some(g=>g.title==='Administration' && g.items.some(i=>i.id==='usersaccess')) && !nm.groups.some(g=>g.items.some(i=>['directory','access','usermgmt'].indexOf(i.id)>=0)), 'Sidebar: People Directory + Access Control + User Management merged into one "Users & access"');
chk(typeof App.toggleSidebar==='function' && typeof App.renderNav==='function' && typeof App.playScene==='function' && App.scene && App.scene.boundary && App.scene.insight && App.scene.connect, 'Sidebar toggle + renderNav + 3 animated scenes present');
var cmdErr=null; try { App.cmd.items(); } catch(e){ cmdErr=e; } chk(!cmdErr, 'Command palette works with new nav shape: '+(cmdErr||''));

// Category disable hides policies everywhere (visiblePolicies + Tara)
var hrCat = DB.categories.find(function(c){return c.name==='HR';});
chk(!!hrCat, 'Categories: HR present (only Lending/HR/Compliance)');
chk(!DB.categories.some(function(c){return c.name==='Others';}), 'Categories: Others removed');
hrCat.enabled = false;
chk(!App.visiblePolicies(admin).some(function(p){return p.id==='P-LEAVE';}), 'Category disable: HR policies vanish from visiblePolicies');
var leaveAns = App.askTara("what's the leave policy", admin);
chk(!/privilege leave|18 \/ yr/i.test(leaveAns.html), 'Category disable: Tara no longer answers the disabled HR leave policy');
hrCat.enabled = true;
chk(App.visiblePolicies(admin).some(function(p){return p.id==='P-LEAVE';}), 'Category re-enable: HR leave policy returns');

// Edition gating: Enterprise (on-prem) = policies only, no connectors/company-brain
try { localStorage.setItem('tara_edition','enterprise'); } catch(e){}
var entPeople = App.askTara("who's in the engineering team", admin);
chk(!(entPeople.sources||[]).some(function(s){return s.kind==='hrms';}), 'Enterprise: people query NOT answered from HRMS');
var entJira = App.askTara('who is working on policyos', admin);
chk(!(entJira.sources||[]).some(function(s){return s.kind==='jira';}), 'Enterprise: work query NOT answered from Jira');
var entPol = App.askTara('personal loan eligibility criteria', admin);
chk(/700|cibil/i.test(entPol.html), 'Enterprise: policy query still works');
var entCtx = App.llm.buildContext(admin);
chk(!/WORK IN PROGRESS/.test(entCtx) && /POLICIES/.test(entCtx), 'Enterprise: LLM context drops Jira, keeps policies');
var entNav = App.navModel(admin);
chk(!entNav.groups.some(function(g){return g.items.some(function(i){return i.id==='connectors';});}), 'Enterprise: Connectors hidden from nav');
try { localStorage.setItem('tara_edition','standard'); } catch(e){}

// Standard nav: admin-only Administration + Connectors; Assessments under Company Brain
var navAdmin = App.navModel(admin), navPM = App.navModel(personas.find(function(p){return p.id==='THQ0101';}));
chk(navAdmin.groups.some(function(g){return g.title==='Administration' && g.items.some(function(i){return i.id==='usersaccess';});}), 'Admin sees "Users & access" under Administration');
chk(navAdmin.groups.some(function(g){return g.items.some(function(i){return i.id==='connectors';});}), 'Admin (standard) sees Connectors');
chk(!navPM.groups.some(function(g){return g.title==='Administration';}), 'Policy Manager does NOT see Administration');
chk(!navPM.groups.some(function(g){return g.items.some(function(i){return i.id==='connectors';});}), 'Policy Manager does NOT see Connectors');
chk(navAdmin.groups.some(function(g){return g.title==='Company Brain' && g.items.some(function(i){return i.id==='assessments';});}), 'Assessments lives under Company Brain');
chk(!navAdmin.groups.some(function(g){return g.items.some(function(i){return ['directory','access','usermgmt'].indexOf(i.id)>=0;});}), 'Old directory/access/usermgmt removed from nav');

// Feature 1 — Impact simulator
chk(!!DB.simParams && !!DB.simParams['P-PL'] && DB.testBase && DB.testBase.length >= 100, 'Simulator: simParams + test cohort present');
chk(typeof App.sim === 'object' && typeof App.sim.run === 'function', 'Simulator: App.sim engine present');
var simBase = App.sim.run('P-PL', {});
chk(simBase.applicable && simBase.flipped.length === 0 && simBase.gained.length === 0, 'Simulator: no override → no applicants flip');
var simTight = App.sim.run('P-PL', { minCibil: 760 });
chk(simTight.proposed.rate < simBase.base.rate && simTight.flipped.length > 0, 'Simulator: tightening CIBIL cutoff lowers approval rate + flips applicants');
chk(simTight.proposed.npa <= simBase.base.npa + 1e-9, 'Simulator: tightening cutoff does not raise projected NPA');
chk(App.sim.run('P-KYC', {}).applicable === false, 'Simulator: a non-credit policy is not simulable');
chk(typeof App.simView === 'object' && typeof App.simView.open === 'function' && typeof App.simView.propose === 'function', 'Simulator: App.simView modal present');

// Feature 2 — Regulatory radar
chk(!!DB.circulars && DB.circulars.length >= 3, 'Regulatory: circular feed present');
chk(DB.categories.find(function(c){return c.name==='Compliance';}).subs.indexOf('Regulatory Updates') >= 0, 'Regulatory: Compliance has the "Regulatory Updates" sub-category');
chk(App.navModel(admin).groups.some(function(g){return g.items.some(function(i){return i.id==='regulatory';});}), 'Regulatory: nav item present under Policy Management');
chk(typeof App.regulatoryView === 'object' && typeof App.regulatoryView.createChange === 'function', 'Regulatory: view + createChange present');
var beforeN = DB.approvals.length; App.state.user = admin;
App.regulatoryView.createChange('CIR-36');
chk(DB.approvals.length === beforeN + 1 && /RBI/.test(DB.approvals[0].complianceFlag||'') && !!DB.approvals[0].impact, 'Regulatory: createChange raises an Approval with citation + projected impact');

// Tara what-if hook routes to the simulator (RBAC-scoped)
var simAns = App.askTara('what if we raise the personal loan cibil cutoff to 760', admin);
chk(/approval rate|impact simulation/i.test(simAns.html), 'Tara: what-if query routes to impact simulation for admin');
var simDenied = App.askTara('what if we raise the personal loan cibil cutoff to 760', staff);
chk(!/approval rate|impact simulation/i.test(simDenied.html), 'Tara: staff (no PL access) does NOT get the simulation');

// Assessments — staff takes a test, admin sees the score
chk(typeof App.assessmentsView.take === 'function' && typeof App.assessmentsView.submit === 'function' && typeof App.assessmentsView._subs === 'function', 'Assessments: staff take/submit + submission store present');
chk(!App.assessmentsView._subForUser('AS1','THQ0125'), 'Assessments: staff has no submission before taking');
App.assessmentsView._subs('AS1').push({ userId:'THQ0125', score:80, correct:4, total:5, attempted:5, passed:true, answers:[], date:'21 Jun 2026' });
chk(!!App.assessmentsView._subForUser('AS1','THQ0125') && App.assessmentsView._subForUser('AS1','THQ0125').score===80, 'Assessments: staff submission recorded & retrievable (admin can read it)');
var asErr=null; App.state.user=admin; try { App.assessmentsView.open('AS1'); App.closeModal(); } catch(e){ asErr=e; }
chk(!asErr, 'Assessments: admin detail renders with the real staff submission: '+(asErr||''));

// Assessments: staff still cannot see a Lending quiz (RBAC gating retained on the My Assessments page)
chk(!App.visiblePolicies(staff).some(function(p){return p.category==='Lending';}), 'Assessments: staff cannot see Lending, so the Lending quiz stays gated off');

// Guided product tour (role-aware spotlight walkthrough)
chk(typeof App.tour === 'object' && typeof App.tour.start === 'function', 'Tour: engine present');
chk(Array.isArray(App.tour.stepsFor(admin)) && App.tour.stepsFor(admin).length >= 5, 'Tour: admin gets a role-aware step list');
chk(App.tour.stepsFor(staff)[3] && /home/i.test(App.tour.stepsFor(staff)[3].title), 'Tour: step list includes the home step');

print('=== RBAC semantics ===');
print(semFails.length ? 'SEMANTIC FAILS:\n'+semFails.join('\n') : 'RBAC semantics OK (deny + allow paths verified)');
print('=== render: '+routes.length+' views x '+personas.length+' personas ===');
print(renderFails.length ? 'RENDER FAILS:\n'+renderFails.join('\n') : 'render OK');
print('=== askTara: '+queries.length+' queries x '+personas.length+' personas ===');
print(askFails.length ? 'ASK FAILS:\n'+askFails.join('\n') : 'askTara OK');
print('=== mount (warnings only; stub values may differ from real DOM) ===');
print(mountWarns.length ? 'MOUNT WARNINGS:\n'+mountWarns.join('\n') : 'mount OK');
print('=== views registered: '+routes.join(', ')+' ===');
