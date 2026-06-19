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
['data.js','core.js','llm.js'].forEach(function(f){ var e=load(f); if(e) loadErrors.push('LOAD '+e); });

var viewFiles = ['dashboard','copilot','policies','directory','access','polygpt','rulesense',
  'approvals','usermgmt','category','bredecoder','insightgen','assessments','connectors'];
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
chk(nm.groups.some(g=>g.title==='Administration' && g.items.some(i=>i.id==='directory') && g.items.some(i=>i.id==='access') && g.items.some(i=>i.id==='usermgmt')), 'Sidebar: People Directory + Access Control + User Management merged into Administration');
chk(typeof App.toggleSidebar==='function' && typeof App.renderNav==='function' && typeof App.playScene==='function' && App.scene && App.scene.boundary && App.scene.insight && App.scene.connect, 'Sidebar toggle + renderNav + 3 animated scenes present');
var cmdErr=null; try { App.cmd.items(); } catch(e){ cmdErr=e; } chk(!cmdErr, 'Command palette works with new nav shape: '+(cmdErr||''));

print('=== RBAC semantics ===');
print(semFails.length ? 'SEMANTIC FAILS:\n'+semFails.join('\n') : 'RBAC semantics OK (deny + allow paths verified)');
print('=== render: '+routes.length+' views x '+personas.length+' personas ===');
print(renderFails.length ? 'RENDER FAILS:\n'+renderFails.join('\n') : 'render OK');
print('=== askTara: '+queries.length+' queries x '+personas.length+' personas ===');
print(askFails.length ? 'ASK FAILS:\n'+askFails.join('\n') : 'askTara OK');
print('=== mount (warnings only; stub values may differ from real DOM) ===');
print(mountWarns.length ? 'MOUNT WARNINGS:\n'+mountWarns.join('\n') : 'mount OK');
print('=== views registered: '+routes.join(', ')+' ===');
