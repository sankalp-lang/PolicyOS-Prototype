/* ============================================================
   PolicyOS · Tara — Runtime core
   Router · RBAC · Tara chat engine · shell · modal · cmd-palette
   ============================================================ */
window.App = (function () {
  const App = {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------------- state ---------------- */
  App.state = { user: null, route: 'dashboard', params: {}, chat: [], chatOpen: false, navOpen: {} };
  App.views = {};
  App.registerView = (id, def) => { App.views[id] = def; };

  /* ---------------- icons (lucide-style) ---------------- */
  const I = {
    home:'<path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/>',
    sparkles:'<path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 14l.7 1.8L21.5 16.5 19.7 17.2 19 19l-.7-1.8L16.5 16.5l1.8-.7z"/>',
    file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    chat:'<path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z"/>',
    shield:'<path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>',
    branch:'<path d="M6 3v12"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.8"/><path d="M16 3.1a4 4 0 0 1 0 7.7"/>',
    layers:'<path d="M12 2 2 7l10 5 10-5z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
    code:'<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    chart:'<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
    clipboard:'<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    plug:'<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v3a6 6 0 0 1-12 0V8z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    command:'<path d="M15 6a3 3 0 1 0 3 3h-3V6zM9 6a3 3 0 1 1-3 3h3V6zM9 18a3 3 0 1 0-3-3h3v3zM15 18a3 3 0 1 1 3-3h-3v3z"/>',
    bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    chevron:'<path d="m6 9 6 6 6-6"/>',
    check:'<path d="M20 6 9 17l-5-5"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    send:'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/>',
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    filter:'<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    arrow:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    up:'<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z"/>',
    down:'<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    zap:'<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    dot:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'
  };
  App.icon = (name, cls) => `<svg class="ico ${cls||''}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${I[name]||I.dot}</svg>`;

  /* ---------------- helpers ---------------- */
  const PALETTE = ['#4f46e5','#0891b2','#7c3aed','#db2777','#059669','#d97706','#2563eb','#e11d48','#0d9488','#9333ea'];
  App.esc = s => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  App.color = s => PALETTE[Math.abs(String(s).split('').reduce((a,c)=>a*31+c.charCodeAt(0)|0,7)) % PALETTE.length];
  App.initials = n => n.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  App.emp = id => DB.employees.find(e => e.id === id);
  App.empByName = q => { const l=q.toLowerCase(); return DB.employees.find(e=>e.name.toLowerCase()===l) || DB.employees.find(e=>l.includes(e.name.split(' ')[0].toLowerCase()) && e.name.split(' ')[0].length>2); };
  App.policy = id => DB.policies.find(p => p.id === id);
  App.currentUser = () => App.state.user;

  App.ui = {
    avatar(emp, size) {
      const name = typeof emp === 'string' ? emp : emp.name;
      return `<span class="avatar ${size||''}" style="background:${App.color(name)}">${App.initials(name)}</span>`;
    },
    pill(text, kind, dot) { return `<span class="pill pill--${kind||'gray'} ${dot?'pill--dot':''}">${App.esc(text)}</span>`; },
    presencePill(p) {
      if (p==='office') return App.ui.pill('In office','green',true);
      if (p==='remote') return App.ui.pill('Remote','blue',true);
      return App.ui.pill('On leave','amber',true);
    },
    statusPill(s) {
      const m={Active:'green',Draft:'amber',Completed:'blue','In Progress':'blue','In Review':'violet',Done:'green',Backlog:'gray',Available:'gray',connected:'green',available:'gray'};
      return App.ui.pill(s, m[s]||'gray');
    },
    empty(icon, title, sub) { return `<div class="empty"><div class="empty__ic">${App.icon(icon)}</div><b>${title}</b><span>${sub||''}</span></div>`; }
  };

  /* ---------------- RBAC ---------------- */
  App.canViewPolicy = (p, user) => {
    user = user || App.state.user;
    if (!p) return false;
    if (user.role === 'admin') return true;
    const a = p.access || {};
    if (a.everyone) return true;
    if ((a.roles||[]).includes(user.role)) return true;
    if ((a.teams||[]).includes(user.team)) return true;
    if ((a.users||[]).includes(user.id)) return true;
    return false;
  };
  App.catEnabled = (name) => { const c = DB.categories.find(x => x.name === name); return !c || c.enabled !== false; };
  App.enabledCats = () => DB.categories.filter(c => c.enabled !== false);
  App.visiblePolicies = user => DB.policies.filter(p => App.catEnabled(p.category) && App.canViewPolicy(p, user));
  App.canSeeComp = user => { user = user||App.state.user; return user.role==='admin' || user.hrAdmin || user.team==='People & Talent' || user.team==="Founder's Office"; };

  /* ---------------- edition (Standard = full + connectors · Enterprise = on-prem, policies only) ---------------- */
  App.edition = () => { try { return localStorage.getItem('tara_edition') || 'standard'; } catch (e) { return 'standard'; } };
  App.setEdition = (ed) => { try { localStorage.setItem('tara_edition', ed); } catch (e) {} renderShell(); App.navigate('dashboard'); App.toast(ed === 'enterprise' ? 'Switched to Enterprise · on-prem (policies only)' : 'Switched to Standard (connectors + company brain)'); };

  /* ---------------- TARA chat engine (keyword routing + permission-faithful) ---------------- */
  function sourceChip(kind, label) {
    const ic = { hrms:'users', jira:'branch', policy:'shield', locked:'lock', notion:'book', slack:'chat', llm:'sparkles' }[kind] || 'database';
    return `<span class="src-chip ${kind}">${App.icon(ic)} ${App.esc(label)}</span>`;
  }
  function ansCard(header, icon, bodyHtml) {
    return `<div class="answer-card"><div class="answer-card__h">${App.icon(icon)} ${App.esc(header)}</div><div class="answer-card__b">${bodyHtml}</div></div>`;
  }
  function personRow(e) {
    return `<div class="minirow">${App.ui.avatar(e,'sm')}<div style="flex:1"><b style="font-weight:600">${App.esc(e.name)}</b> <span class="muted" style="font-size:12px">· ${App.esc(e.title)}</span></div>${App.ui.presencePill(e.presence)}</div>`;
  }

  // returns { html, sources:[{kind,label}] }
  App.askTara = function (raw, user) {
    user = user || App.state.user;
    const q = ' ' + raw.toLowerCase().trim() + ' ';
    const has = (...ws) => ws.some(w => q.includes(w));
    const emp = App.empByName(raw);
    const team = DB.teams.find(t => q.includes(t.name.toLowerCase()) || q.includes(t.name.split(' ')[0].toLowerCase()+' team'));
    const proj = DB.jiraProjects.find(p => q.includes(p.name.toLowerCase()) || q.includes(p.key.toLowerCase()) || (p.key==='TARA'&&has('policyos','policy os','tara')) || (p.key==='HS'&&has('hypersync','hyper sync')) || (p.key==='HV'&&has('hyperverify','hyper verify')));
    const ent = App.edition() === 'enterprise';  // on-prem edition: policies only, no connectors

    // ---- 0) Impact / what-if simulation (policy-side; works in both editions, RBAC-scoped) ----
    const simVerb = has('what if','simulate','impact of','effect of') || (has('raise','lower','increase','decrease','tighten','loosen','set ') && has('cibil','cutoff','foir','ltv','threshold','score','eligib'));
    if (App.sim && simVerb) {
      const order = ['P-PL','P-HL','P-2W','P-MSME'].map(App.policy).filter(pp => pp && App.sim.paramsFor(pp.id) && App.canViewPolicy(pp, user));
      let simPol = order.find(pp => (pp.id==='P-PL'&&has('personal','pl ','unsecured')) || (pp.id==='P-HL'&&has('home','mortgage')) || (pp.id==='P-2W'&&has('wheeler','two wheeler','2 wheeler')) || (pp.id==='P-MSME'&&has('msme','business'))) || order[0];
      if (simPol) {
        const mnum = raw.match(/\b(6\d\d|7\d\d|8\d\d)\b/);
        const ov = mnum ? { minCibil: parseInt(mnum[1], 10) } : {};
        const r = App.sim.run(simPol.id, ov);
        if (r.applicable) {
          const pc = x => (x*100).toFixed(1)+'%';
          const dA = ((r.proposed.rate-r.base.rate)*100).toFixed(1), dN = ((r.proposed.npa-r.base.npa)*100).toFixed(1);
          const body = `<div class="minirow"><span class="muted">Approval rate</span><span class="spacer" style="flex:1"></span><b>${pc(r.base.rate)} → ${pc(r.proposed.rate)} (${dA>=0?'+':''}${dA} pts)</b></div>
            <div class="minirow"><span class="muted">Projected NPA</span><span class="spacer" style="flex:1"></span><b>${pc(r.base.npa)} → ${pc(r.proposed.npa)} (${dN>=0?'+':''}${dN} pts)</b></div>
            <div class="minirow"><span class="muted">Applicants reclassified</span><span class="spacer" style="flex:1"></span><b>${(r.flipped.length||r.gained.length)} of ${r.total}</b></div>`;
          return { html:`<p>Modelled on the test cohort for <strong>${App.esc(simPol.name)}</strong>${mnum?` (cutoff → ${App.esc(mnum[1])})`:''}:</p>${ansCard('Impact simulation','chart',body)}<p style="margin-top:8px"><button class="btn btn--sm" onclick="App.simView.open('${simPol.id}',${mnum?`{minCibil:${parseInt(mnum[1],10)}}`:'{}'})">${App.icon('chart')} Open full simulator</button></p>`,
                   sources:[{kind:'policy',label:simPol.name+' · test cohort'}] };
        }
      }
    }

    // ---- 1) Compensation / salary (GATED) ----
    if (!ent && has('salary','compensation',' ctc',' pay ','package','esop','income of','earn')) {
      if (!App.canSeeComp(user)) {
        return { html:`<p>🔒 <strong>You don't have access to compensation data.</strong></p><p class="muted" style="margin-top:6px">Salary &amp; band information is restricted to <strong>People &amp; Talent</strong> and the <strong>Founder's Office</strong>. Tara only ever returns what your role is permitted to see in the source system.</p>`,
                 sources:[{kind:'locked',label:'HRMS · compensation (no access)'}] };
      }
      if (emp) {
        const c = DB.compensation[emp.id] || 'Band L3 · ₹20–28L (indicative)';
        return { html:`<p>Here's the compensation on record for <strong>${App.esc(emp.name)}</strong> (${App.esc(emp.title)}):</p>${ansCard('Compensation · confidential','lock',`<div class="minirow"><span class="muted">Annual CTC</span><span class="spacer" style="flex:1"></span><b>${App.esc(c)}</b></div>`)}<p class="muted" style="margin-top:8px;font-size:12px">Visible to you because you're in <strong>${App.esc(user.team)}</strong>.</p>`,
                 sources:[{kind:'hrms',label:'Keka HRMS · compensation'}] };
      }
      return { html:`<p>You have access to compensation data. Ask about a specific person, e.g. <em>“what's Anmol's salary?”</em>, or open the <strong>Compensation &amp; Salary Bands Policy</strong> for band structure.</p>`, sources:[{kind:'hrms',label:'Keka HRMS'}] };
    }

    // ---- 2) Jira / who is working on what ----
    if (!ent && has('working on','work on','building','what is','whats','doing','jira','ticket','issue','sprint','progress','tasks','task ','status of','assigned')) {
      if (proj) {
        const issues = DB.jiraIssues.filter(i => i.project === proj.key);
        const body = issues.map(i => { const a=App.emp(i.assignee);
          return `<div class="minirow"><span class="mono" style="font-size:11px;color:var(--muted);width:64px">${i.key}</span><div style="flex:1"><b style="font-weight:600">${App.esc(i.title)}</b><div class="muted" style="font-size:11.5px;margin-top:2px">${App.ui.avatar(a,'sm')} ${App.esc(a.name)} · ${i.sprint}</div></div>${App.ui.statusPill(i.status)}</div>`;
        }).join('');
        return { html:`<p>Here's what's in flight on <strong>${App.esc(proj.name)}</strong> — ${issues.length} active issue${issues.length>1?'s':''}:</p>${ansCard('From Jira · '+proj.key,'branch',body)}`,
                 sources:[{kind:'jira',label:'Jira · '+proj.name}] };
      }
      if (emp) {
        const issues = DB.jiraIssues.filter(i => i.assignee === emp.id);
        if (!issues.length) return { html:`<p><strong>${App.esc(emp.name)}</strong> has no active Jira issues assigned right now.</p>`, sources:[{kind:'jira',label:'Jira'}] };
        const body = issues.map(i => `<div class="minirow"><span class="mono" style="font-size:11px;color:var(--muted);width:64px">${i.key}</span><div style="flex:1"><b style="font-weight:600">${App.esc(i.title)}</b><div class="muted" style="font-size:11.5px;margin-top:2px">${App.esc(DB.jiraProjects.find(p=>p.key===i.project).name)} · ${i.sprint} · updated ${i.updated}</div></div>${App.ui.statusPill(i.status)}</div>`).join('');
        return { html:`<p><strong>${App.esc(emp.name)}</strong> (${App.esc(emp.title)}, ${App.esc(emp.team)}) is currently working on:</p>${ansCard('From Jira · assigned to '+emp.name.split(' ')[0],'branch',body)}`,
                 sources:[{kind:'jira',label:'Jira'},{kind:'hrms',label:'Keka HRMS · identity'}] };
      }
      // generic
      const inprog = DB.jiraIssues.filter(i=>i.status==='In Progress').slice(0,5);
      const body = inprog.map(i=>{const a=App.emp(i.assignee);return `<div class="minirow"><span class="mono" style="font-size:11px;color:var(--muted);width:64px">${i.key}</span><div style="flex:1"><b style="font-weight:600">${App.esc(i.title)}</b><div class="muted" style="font-size:11.5px;margin-top:2px">${App.esc(a.name)}</div></div>${App.ui.statusPill(i.status)}</div>`;}).join('');
      return { html:`<p>Across all projects, here's what's actively in progress:</p>${ansCard('From Jira · In Progress','branch',body)}<p class="muted" style="margin-top:8px;font-size:12px">Tip: ask “who's working on PolicyOS?” or “what is Abhishek working on?”.</p>`, sources:[{kind:'jira',label:'Jira'}] };
    }

    // ---- 3) Presence / attendance (HRMS) ----
    if (!ent && has('in office','in the office','present','on leave','attendance','wfh','checked in','who is in','whos in','here today','office today','working from')) {
      if (emp) {
        const txt = emp.presence==='office' ? `is <strong>in the office</strong> today (checked in ${emp.checkin})` : emp.presence==='remote' ? `is <strong>working remotely</strong> today` : `is <strong>on leave</strong> today`;
        return { html:`<p>${App.esc(emp.name)} ${txt}.</p>`, sources:[{kind:'hrms',label:'Keka HRMS · attendance'}] };
      }
      const office = DB.employees.filter(e=>e.presence==='office');
      const remote = DB.employees.filter(e=>e.presence==='remote').length;
      const leave = DB.employees.filter(e=>e.presence==='leave').length;
      const body = office.slice(0,8).map(personRow).join('') + `<div class="minirow muted" style="font-size:12px">…and ${office.length-8} more in office</div>`;
      return { html:`<p>Today: <strong>${office.length} in office</strong>, ${remote} remote, ${leave} on leave (of ${DB.employees.length}).</p>${ansCard('From HRMS · attendance today','users',body)}`,
               sources:[{kind:'hrms',label:'Keka HRMS · attendance'}] };
    }

    // ---- 4) People / teams (HRMS) ----
    if (!ent && (team || has('team','teams','department','members','directory','people','colleagues','reports to','manager','headcount','how many','who are','list ','org '))) {
      if (team) {
        const members = DB.employees.filter(e => e.team === team.name);
        const body = members.map(personRow).join('');
        return { html:`<p>The <strong>${App.esc(team.name)}</strong> team has <strong>${members.length}</strong> ${members.length===1?'person':'people'} (lead: ${App.esc(team.lead)}):</p>${ansCard('From HRMS · '+team.name,'users',body)}`,
                 sources:[{kind:'hrms',label:'Keka HRMS · directory'}] };
      }
      if (emp) {
        return { html:`<p>Here's <strong>${App.esc(emp.name)}</strong> from the directory:</p>${ansCard('From HRMS · profile','user',
          `<div class="minirow"><span class="muted">Team</span><span class="spacer" style="flex:1"></span><b>${App.esc(emp.team)}</b></div>
           <div class="minirow"><span class="muted">Title</span><span class="spacer" style="flex:1"></span><b>${App.esc(emp.title)}</b></div>
           <div class="minirow"><span class="muted">Email</span><span class="spacer" style="flex:1"></span><b>${App.esc(emp.email)}</b></div>
           <div class="minirow"><span class="muted">Today</span><span class="spacer" style="flex:1"></span>${App.ui.presencePill(emp.presence)}</div>`)}`,
                 sources:[{kind:'hrms',label:'Keka HRMS · directory'}] };
      }
      const body = DB.teams.map(t => { const n = DB.employees.filter(e=>e.team===t.name).length;
        return `<div class="minirow"><span style="width:9px;height:9px;border-radius:3px;background:${t.color}"></span><div style="flex:1"><b style="font-weight:600">${App.esc(t.name)}</b></div><b>${n}</b></div>`; }).join('');
      return { html:`<p><strong>${DB.employees.length} people</strong> across ${DB.teams.length} teams:</p>${ansCard('From HRMS · headcount by team','users',body)}<p class="muted" style="margin-top:8px;font-size:12px">Ask “who's in the Engineering team?” to drill in.</p>`,
               sources:[{kind:'hrms',label:'Keka HRMS · directory'}] };
    }

    // ---- enterprise (on-prem): connected-source questions aren't available ----
    if (ent && (team || emp || has('salary','compensation','working on','work on','in office','present','attendance','team','people','headcount','jira','who is','whos in','directory','colleagues'))) {
      return { html:`<p>In the <strong>on-prem PolicyOS edition</strong>, Tara answers from your <strong>policy library</strong> only — connected sources like HRMS and Jira aren't part of this deployment.</p>`, sources:[] };
    }

    // ---- 5) Policy Q&A (permission-faithful) ----
    const topicMap = [
      {kw:['leave','vacation','holiday','sick','maternity','paternity'], id:'P-LEAVE'},
      {kw:['travel','expense','reimburs','per diem','per-diem'], id:'P-TRAVEL'},
      {kw:['salary band','compensation policy','esop','increment','leveling'], id:'P-COMP'},
      {kw:['kyc','aml','money laundering','pep','due diligence'], id:'P-KYC'},
      {kw:['security','infosec','mfa','encryption','device'], id:'P-ISEC'},
      {kw:['personal loan','pl ','cibil','foir','unsecured'], id:'P-PL'},
      {kw:['two wheeler','two-wheeler','2 wheeler','2-wheeler','ltv'], id:'P-2W'},
      {kw:['msme','business loan','gst','vintage','constitution'], id:'P-MSME'},
      {kw:['home loan','mortgage','property'], id:'P-HL'},
      {kw:['collection','recovery','npa','delinquen','dpd'], id:'P-COLL'}
    ];
    let hit = topicMap.find(t => t.kw.some(k => q.includes(k)));
    if (hit || has('policy','eligibility','criteria','rule','cutoff','underwriting')) {
      let p = hit ? App.policy(hit.id) : null;
      if (p && !App.catEnabled(p.category)) p = null;  // disabled category → treat as unavailable
      if (p) {
        if (!App.canViewPolicy(p, user)) {
          return { html:`<p>🔒 <strong>You don't have access to the “${App.esc(p.name)}”.</strong></p><p class="muted" style="margin-top:6px">This policy is scoped to ${App.esc((p.access.teams||[]).concat(p.access.roles||[]).join(', ')||'restricted roles')}. Tara never answers from a source you can't already open — permission is enforced at retrieval, not in the prompt.</p>`,
                   sources:[{kind:'locked',label:p.name+' · no access'}] };
        }
        const facts = Object.entries(p.facts).map(([k,v]) => `<div class="minirow"><span class="muted">${App.esc(k)}</span><span class="spacer" style="flex:1"></span><b>${App.esc(v)}</b></div>`).join('');
        return { html:`<p>${App.esc(p.summary)}</p>${ansCard(p.name+' · '+p.version,'shield',facts)}`,
                 sources:[{kind:'policy',label:p.name+' ('+p.version+')'}] };
      }
      // generic policy — list what THIS user can see
      const vis = App.visiblePolicies(user);
      const hidden = DB.policies.length - vis.length;
      const body = vis.map(p=>`<div class="minirow">${App.icon('file')}<div style="flex:1"><b style="font-weight:600">${App.esc(p.name)}</b></div><span class="tag">${App.esc(p.category)}</span></div>`).join('');
      return { html:`<p>You can query <strong>${vis.length}</strong> ${vis.length===1?'policy':'policies'} with your access:</p>${ansCard('Policies you can access','shield',body)}${hidden?`<p class="muted" style="margin-top:8px;font-size:12px">🔒 ${hidden} more polic${hidden>1?'ies are':'y is'} hidden — outside your role's scope.</p>`:''}`,
               sources:[{kind:'policy',label:'PolicyOS repository'}] };
    }

    // ---- fallback ----
    if (ent) {
      return { html:`<p>I'm <strong>Tara</strong> — on-prem, scoped to your <strong>policy library</strong> and only what your role can see. Try:</p>
        <ul><li><strong>Policies</strong> — “what's the leave policy?”, “personal loan eligibility?”, “KYC &amp; AML summary”</li></ul>`, sources:[] };
    }
    return { html:`<p>I'm <strong>Tara</strong> — your company copilot. I answer only from sources <em>you're</em> permitted to see. Try:</p>
      <ul>
        <li><strong>People & teams</strong> — “who's in the Design team?”, “is Sankalp in office?”</li>
        <li><strong>Work in progress</strong> — “who's working on PolicyOS?”, “what is Abhishek working on?”</li>
        <li><strong>Policies</strong> — “what's the leave policy?”, “personal loan eligibility?”</li>
      </ul>`, sources:[] };
  };

  /* ---------------- chat panel ---------------- */
  function suggestionsFor(user) {
    if (App.edition()==='enterprise') {
      const e = [ { q:"What's the leave policy?", ic:'shield' }, { q:'KYC & AML policy summary', ic:'shield' } ];
      if (user.role!=='user') e.push({ q:'Personal loan eligibility criteria?', ic:'file' });
      return e;
    }
    const base = [
      { q:"Who's in the Engineering team?", ic:'users' },
      { q:'Who is working on PolicyOS?', ic:'branch' },
      { q:"What's the leave policy?", ic:'shield' }
    ];
    if (user.role==='admin'||user.role==='policy_manager'||user.role==='risk_approver') base.push({ q:'Personal loan eligibility criteria?', ic:'file' });
    else base.push({ q:'Is Sankalp in office today?', ic:'clock' });
    return base;
  }
  App.chat = {
    toggle(open) { App.state.chatOpen = open==null ? !App.state.chatOpen : open; $('#chatPanel').classList.toggle('open', App.state.chatOpen); if(App.state.chatOpen){ App.chat.render(); setTimeout(()=>$('#chatInput')&&$('#chatInput').focus(),120);} },
    render() {
      const body = $('#chatBody'); if(!body) return;
      if (!App.state.chat.length) {
        body.innerHTML = `<div class="msg msg--ai"><div class="msg__av">${App.icon('sparkles')}</div><div class="msg__bubble">Hi ${App.esc(App.state.user.name.split(' ')[0])} — ${App.edition()==='enterprise' ? `I'm <strong>Tara</strong>, scoped to your <strong>policy library</strong> and what your role can access.` : `I'm <strong>Tara</strong>. I pull from <strong>HRMS</strong>, <strong>Jira</strong>, <strong>Notion</strong> and your <strong>policies</strong> — only what your role can access.`} What do you need?</div></div>
          <div class="chat-suggest">${suggestionsFor(App.state.user).map(s=>`<button class="chat-suggest__btn" onclick="App.chat.ask('${s.q.replace(/'/g,"\\'")}')">${App.icon(s.ic)} ${App.esc(s.q)}</button>`).join('')}</div>`;
        return;
      }
      body.innerHTML = App.state.chat.map(m => {
        if (m.role==='user') return `<div class="msg msg--user"><div class="msg__bubble">${App.esc(m.text)}</div></div>`;
        if (m.typing) return `<div class="msg msg--ai"><div class="msg__av">${App.icon('sparkles')}</div><div class="msg__bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>`;
        const src = m.sources && m.sources.length ? `<div class="src-row">${m.sources.map(s=>sourceChip(s.kind,s.label)).join('')}</div>` : '';
        return `<div class="msg msg--ai"><div class="msg__av">${App.icon('sparkles')}</div><div class="msg__bubble">${m.html}${src}</div></div>`;
      }).join('');
      body.scrollTop = body.scrollHeight;
    },
    ask(text) {
      text = (text || ($('#chatInput')&&$('#chatInput').value) || '').trim();
      if (!text) return;
      if ($('#chatInput')) $('#chatInput').value='';
      App.state.chat.push({ role:'user', text });
      const ph = { role:'ai', typing:true };
      App.state.chat.push(ph);
      App.chat.render();
      App.tara.answer(text, App.state.user).then(res => {
        ph.typing = false; ph.html = res.html; ph.sources = res.sources;
        App.chat.render();
      }).catch(e => {
        ph.typing = false; ph.html = '<p>'+App.esc(String(e&&e.message||e))+'</p>'; ph.sources = [];
        App.chat.render();
      });
    }
  };

  /* ---------------- nav model (role-aware) ---------------- */
  function navModel(user) {
    if (user.role === 'user') {
      return { pinned: [ { id:'dashboard', label:'Home', icon:'home' }, { id:'copilot', label:'Ask Tara', icon:'sparkles', tag:'AI' } ],
        groups: [
          { title:'Knowledge', items:[ {id:'policies',label:'Policies',icon:'file'}, {id:'polygpt',label:'PolyGPT',icon:'chat'}, {id:'assessments',label:'My Assessments',icon:'clipboard'} ] }
        ] };
    }
    const std = App.edition() === 'standard';
    const pinned = [ { id:'dashboard', label:'Dashboard', icon:'home' }, { id:'copilot', label:'Ask Tara', icon:'sparkles', tag:'AI' } ];
    const groups = [{ title:'Policy Management', items: [
      { id:'policies', label:'Policies', icon:'file' },
      { id:'polygpt', label:'PolyGPT', icon:'chat' },
      { id:'rulesense', label:'RuleSense AI', icon:'code' },
      { id:'approvals', label:'Approvals', icon:'branch' },
      { id:'regulatory', label:'Regulatory', icon:'alert' },
      { id:'bredecoder', label:'BRE Decoder', icon:'key' },
      { id:'insightgen', label:'InsightGen', icon:'chart' }
    ] }];
    // Assessments now lives under Company Brain
    const brain = [];
    if (user.role==='policy_manager'||user.role==='admin'||user.role==='assessment_manager') brain.push({ id:'assessments', label:'Assessments', icon:'clipboard' });
    if (brain.length) groups.push({ title:'Company Brain', items: brain });
    // Administration + Connectors: ADMIN ONLY. Connectors only in the Standard edition.
    if (user.role==='admin') {
      const admin = [ { id:'usersaccess', label:'Users & access', icon:'users' } ];
      if (std) admin.push({ id:'connectors', label:'Connectors', icon:'plug' });
      admin.push({ id:'category', label:'Categories', icon:'layers' });
      groups.push({ title:'Administration', items: admin });
    }
    return { pinned, groups };
  }
  App.navModel = navModel;

  App.renderNav = () => {
    const nav = document.getElementById('navRoot'); if (!nav) return;
    const m = navModel(App.state.user); const route = App.state.route;
    const item = it => `<div class="nav__item${it.id===route?' is-active':''}" data-route="${it.id}" onclick="App.navigate('${it.id}')">${App.icon(it.icon)}<span>${it.label}</span>${it.tag?`<span class="nav__tag">${it.tag}</span>`:''}</div>`;
    let html = m.pinned.map(item).join('') + '<div style="height:6px"></div>';
    m.groups.forEach(g => {
      const open = g.items.some(i => i.id === route) || !!App.state.navOpen[g.title];
      html += `<div class="nav__group"><button class="nav__grouphead${open?' is-open':''}" onclick="App.toggleNavGroup('${g.title.replace(/'/g, "\\'")}')"><span>${g.title}</span><span class="nav__plus">${App.icon('plus')}</span></button><div class="nav__sub"${open?'':' style="display:none"'}>${g.items.map(item).join('')}</div></div>`;
    });
    nav.innerHTML = html;
  };
  App.toggleNavGroup = (t) => { App.state.navOpen[t] = !App.state.navOpen[t]; App.renderNav(); };
  App.toggleSidebar = () => { const s = document.getElementById('shell'); if (s) s.classList.toggle('nav-collapsed'); };

  /* ---------------- shell render ---------------- */
  function renderShell() {
    const u = App.state.user;
    document.getElementById('app').innerHTML = `
      <div class="shell" id="shell">
        <aside class="sidebar">
          <div class="sidebar__brand">
            <div class="sidebar__logo">P</div>
            <div class="sidebar__brandtext"><b>PolicyOS</b><span>· Tara company brain</span></div>
          </div>
          <div class="sidebar__search" onclick="App.cmd.open()">${App.icon('search')}<span>Search or ask…</span><span class="kbd">⌘K</span></div>
          <nav class="nav" id="navRoot"></nav>
          <div style="padding:12px 16px;border-top:1px solid var(--line);font-size:11px;color:var(--faint)">${App.icon('lock','')} On-prem · ${App.edition()==='enterprise'?'Enterprise':'Standard'} edition</div>
        </aside>
        <div class="main">
          <header class="topbar">
            <button class="topbar__btn" onclick="App.toggleSidebar()" title="Toggle sidebar">${App.icon('menu')}</button>
            <div id="tbTitle" class="topbar__title"></div>
            <div class="topbar__spacer"></div>
            <button class="topbar__btn" onclick="App.cmd.open()" title="Command (⌘K)">${App.icon('command')}</button>
            <button class="topbar__btn" title="Notifications">${App.icon('bell')}</button>
            <div style="position:relative">
              <button class="userchip" onclick="App.toggleUserMenu(event)">
                ${App.ui.avatar(u)}
                <div style="text-align:left"><div class="userchip__name">${App.esc(u.name)}</div><div class="userchip__role">${App.esc(DB.roleLabels[u.role])}</div></div>
                ${App.icon('chevron')}
              </button>
              <div id="userMenu" style="display:none"></div>
            </div>
          </header>
          <main class="content"><div id="viewRoot"></div></main>
        </div>
      </div>
      <button class="chat-launch" onclick="App.chat.toggle()">${App.icon('sparkles')} Ask Tara</button>
      <aside class="chat-panel" id="chatPanel">
        <div class="chat-head">
          <div class="chat-head__logo">${App.icon('sparkles')}</div>
          <div style="flex:1"><b>Tara</b><span>Company copilot · permission-aware</span></div>
          <button class="btn btn--sm tara-status" title="Model status — connect a model" onclick="App.llm.openSetup()"></button>
          <button class="modal__x" onclick="App.chat.toggle(false)">${App.icon('x')}</button>
        </div>
        <div class="chat-body" id="chatBody"></div>
        <div class="chat-foot">
          <div class="chat-inputwrap">
            <textarea id="chatInput" rows="1" placeholder="Ask about people, work, or policies…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();App.chat.ask();}"></textarea>
            <button class="chat-send" onclick="App.chat.ask()">${App.icon('send')}</button>
          </div>
        </div>
      </aside>
      <div class="overlay" id="overlay"><div id="modalHost"></div></div>
      <div class="cmdk-overlay" id="cmdkOverlay" onclick="if(event.target.id==='cmdkOverlay')App.cmd.close()">
        <div class="cmdk">
          <div class="cmdk__in">${App.icon('search')}<input id="cmdkInput" placeholder="Search pages, people, or ask Tara…" oninput="App.cmd.filter(this.value)" onkeydown="App.cmd.key(event)"/></div>
          <div class="cmdk__list" id="cmdkList"></div>
        </div>
      </div>
      <div class="toast-wrap" id="toastWrap"></div>
    `;
    App.chat.render();
    App.renderNav();
    if (App.llm && App.llm.refreshBadges) App.llm.refreshBadges();
  }

  /* ---------------- user menu ---------------- */
  App.toggleUserMenu = (e) => {
    e.stopPropagation();
    const m = $('#userMenu');
    if (m.style.display==='block') { m.style.display='none'; return; }
    m.style.display='block';
    m.style.cssText = 'display:block;position:absolute;right:0;top:46px;width:240px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lg);padding:8px;z-index:50';
    m.innerHTML = `<div style="padding:6px 8px;font-size:11px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">Switch persona (demo)</div>
      ${DB.users.map(p=>{const e2=App.emp(p.id);const active=p.id===App.state.user.id;return `<div class="cmdk__item ${active?'is-active':''}" onclick="App.login('${p.id}')">${App.ui.avatar(e2,'sm')}<div style="flex:1"><div style="font-weight:600;font-size:13px">${App.esc(e2.name)}</div><div style="font-size:11.5px;color:var(--muted)">${App.esc(DB.roleLabels[p.role])}${p.hrAdmin?' · HR':''}</div></div>${active?App.icon('check'):''}</div>`;}).join('')}
      ${App.state.user.role==='admin' ? `<div class="divider" style="margin:8px 0"></div>
      <div style="padding:6px 8px;font-size:11px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">Edition</div>
      <div class="cmdk__item ${App.edition()==='standard'?'is-active':''}" onclick="App.setEdition('standard')">${App.icon('grid')}<div style="flex:1"><div style="font-weight:600;font-size:13px">Standard</div><div style="font-size:11px;color:var(--muted)">Connectors + company brain</div></div>${App.edition()==='standard'?App.icon('check'):''}</div>
      <div class="cmdk__item ${App.edition()==='enterprise'?'is-active':''}" onclick="App.setEdition('enterprise')">${App.icon('lock')}<div style="flex:1"><div style="font-weight:600;font-size:13px">Enterprise · on-prem</div><div style="font-size:11px;color:var(--muted)">Policies only, no connectors</div></div>${App.edition()==='enterprise'?App.icon('check'):''}</div>` : ''}
      <div class="divider" style="margin:8px 0"></div>
      <div class="cmdk__item" onclick="App.logout()">${App.icon('logout')}<span>Log out</span></div>`;
    setTimeout(()=>document.addEventListener('click', function h(){ if($('#userMenu'))$('#userMenu').style.display='none'; document.removeEventListener('click',h); }),0);
  };

  /* ---------------- router ---------------- */
  App.navigate = (route, params) => {
    if (!App.views[route]) route = 'dashboard';
    App.state.route = route; App.state.params = params || {};
    App.renderNav();
    const def = App.views[route];
    const ctx = { user: App.state.user, params: App.state.params };
    $('#tbTitle').textContent = (typeof def.title==='function'?def.title(ctx):def.title) || '';
    const root = $('#viewRoot');
    try { root.innerHTML = def.render(ctx); if (def.mount) def.mount(root, ctx); }
    catch(err){ root.innerHTML = `<div class="page">${App.ui.empty('alert','View error', String(err))}</div>`; console.error(err); }
    $('.content').scrollTop = 0;
  };
  App.reload = () => App.navigate(App.state.route, App.state.params);

  /* ---------------- modal ---------------- */
  App.openModal = ({ title, sub, body, footer, lg }) => {
    $('#modalHost').innerHTML = `<div class="modal ${lg?'modal--lg':''}">
      <div class="modal__head"><div><h3>${title}</h3>${sub?`<p>${sub}</p>`:''}</div><button class="modal__x" onclick="App.closeModal()">${App.icon('x')}</button></div>
      <div class="modal__body">${body}</div>
      ${footer?`<div class="modal__foot">${footer}</div>`:''}</div>`;
    $('#overlay').classList.add('open');
    $('#overlay').onclick = e => { if (e.target.id==='overlay') App.closeModal(); };
  };
  App.closeModal = () => { $('#overlay').classList.remove('open'); $('#modalHost').innerHTML=''; };

  /* ---------------- toast ---------------- */
  App.toast = (msg, kind) => {
    const w = $('#toastWrap'); const t = document.createElement('div');
    t.className = `toast toast--${kind||'ok'}`;
    t.innerHTML = `${App.icon(kind==='err'?'alert':kind==='warn'?'alert':'check')}<span>${App.esc(msg)}</span>`;
    w.appendChild(t); setTimeout(()=>t.remove(), 2600);
  };

  /* ---------------- command palette ---------------- */
  App.cmd = {
    items() {
      const m = navModel(App.state.user);
      const nav = m.pinned.concat(m.groups.flatMap(g => g.items)).map(i => ({ type:'page', label:i.label, route:i.id, icon:i.icon }));
      const ppl = DB.employees.slice(0,40).map(e => ({ type:'person', label:e.name, sub:e.title, emp:e }));
      return { nav, ppl };
    },
    open() { $('#cmdkOverlay').classList.add('open'); const i=$('#cmdkInput'); i.value=''; App.cmd.filter(''); setTimeout(()=>i.focus(),60); },
    close() { $('#cmdkOverlay').classList.remove('open'); },
    filter(q) {
      const { nav, ppl } = App.cmd.items(); const l=q.toLowerCase();
      const navF = nav.filter(n=>n.label.toLowerCase().includes(l));
      const pplF = q ? ppl.filter(p=>p.label.toLowerCase().includes(l)).slice(0,5) : [];
      let html = '';
      if (q) html += `<div class="cmdk__sec">Ask Tara</div><div class="cmdk__item" data-act="ask" data-q="${App.esc(q)}">${App.icon('sparkles')}<span>Ask: “${App.esc(q)}”</span><span class="spacer"></span><span class="cmdk__hint">↵</span></div>`;
      if (navF.length) html += `<div class="cmdk__sec">Pages</div>` + navF.map(n=>`<div class="cmdk__item" data-act="nav" data-route="${n.route}">${App.icon(n.icon)}<span>${n.label}</span></div>`).join('');
      if (pplF.length) html += `<div class="cmdk__sec">People</div>` + pplF.map(p=>`<div class="cmdk__item" data-act="person" data-id="${p.emp.id}">${App.ui.avatar(p.emp,'sm')}<span>${App.esc(p.label)}</span><span class="spacer"></span><span class="cmdk__hint">${App.esc(p.sub)}</span></div>`).join('');
      if (!html) html = `<div class="cmdk__sec">No matches</div>`;
      $('#cmdkList').innerHTML = html;
      $$('#cmdkList .cmdk__item').forEach((el,idx)=>{ if(idx===0)el.classList.add('is-active'); el.onclick=()=>App.cmd.exec(el); });
    },
    key(e) {
      const items = $$('#cmdkList .cmdk__item'); let i = items.findIndex(x=>x.classList.contains('is-active'));
      if (e.key==='ArrowDown'){ e.preventDefault(); i=Math.min(items.length-1,i+1);}
      else if (e.key==='ArrowUp'){ e.preventDefault(); i=Math.max(0,i-1);}
      else if (e.key==='Enter'){ e.preventDefault(); if(items[i])App.cmd.exec(items[i]); return; }
      else if (e.key==='Escape'){ App.cmd.close(); return; } else return;
      items.forEach(x=>x.classList.remove('is-active')); if(items[i])items[i].classList.add('is-active');
    },
    exec(el) {
      const act = el.dataset.act; App.cmd.close();
      if (act==='nav') App.navigate(el.dataset.route);
      else if (act==='person') { App.directoryView.profile(el.dataset.id); }
      else if (act==='ask') { App.chat.toggle(true); App.chat.ask(el.dataset.q); }
    }
  };

  /* ---------------- auth ---------------- */
  App.login = (id) => {
    App.stopLoginDemo();
    const persona = DB.users.find(u => u.id === id);
    const emp = App.emp(id);
    App.state.user = Object.assign({}, emp, persona);
    App.state.chat = []; App.state.copilot = []; App.state.polygpt = []; App.state.polygptSel = []; App.state.insightgen = null;
    renderShell();
    App.navigate('dashboard');
  };
  App.logout = () => { App.state.user = null; App.state.chat = []; renderLogin(); };

  App.signIn = () => {
    const rk = { admin:'violet', policy_manager:'blue', risk_approver:'amber', user:'green' };
    App.openModal({
      title: 'Sign in', sub: 'Use one of the demo accounts below — any password works.',
      body: `
        <div class="field"><label>Work email</label><input class="input" id="siEmail" autocomplete="off" placeholder="you@tartanhq.com" onkeydown="if(event.key==='Enter'){var p=document.getElementById('siPass');if(p)p.focus();}"/></div>
        <div class="field" style="margin-bottom:8px"><label>Password</label><input class="input" id="siPass" type="password" placeholder="anything" onkeydown="if(event.key==='Enter')App.doSignIn();"/></div>
        <div id="siErr" class="lock-banner" style="display:none"></div>
        <div class="login__label" style="margin-top:14px">Demo accounts</div>
        <div class="persona">${DB.users.map(p => { const e=App.emp(p.id);
          return `<button class="persona__item" onclick="App.signFill('${App.esc(e.email)}')">${App.ui.avatar(e,'lg')}<div class="persona__meta"><b>${App.esc(e.name)}</b><span>${App.esc(e.email)}</span></div><span class="persona__role pill--${rk[p.role]||'gray'}">${App.esc(DB.roleLabels[p.role])}${p.hrAdmin?' · HR':''}</span></button>`; }).join('')}</div>`,
      footer: `<button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn--primary" onclick="App.doSignIn()">Sign in ${App.icon('arrow')}</button>`
    });
    setTimeout(() => { const i = document.getElementById('siEmail'); if (i) i.focus(); }, 60);
  };
  App.signFill = (email) => { const i = document.getElementById('siEmail'); if (i) i.value = email; const p = document.getElementById('siPass'); if (p) p.focus(); };
  App.doSignIn = () => {
    const email = (document.getElementById('siEmail').value || '').trim().toLowerCase();
    const pass = (document.getElementById('siPass').value || '');
    const persona = DB.users.find(u => App.emp(u.id).email.toLowerCase() === email);
    const err = document.getElementById('siErr');
    const fail = (msg) => { if (err) { err.style.display = 'flex'; err.innerHTML = App.icon('alert') + ' <span>' + msg + '</span>'; } };
    if (!email || !persona) return fail('No account for that email. Pick a demo account below.');
    if (!pass) return fail('Enter any password to continue.');
    App.login(persona.id);
  };

  /* ---- animated landing demo (cycles scripted Tara Q&A, incl. a denial) ---- */
  App._loginTimers = [];
  function lt(fn, ms) { const id = setTimeout(fn, ms); App._loginTimers.push(id); return id; }
  App.stopLoginDemo = () => { App._loginTimers.forEach(clearTimeout); App._loginTimers = []; };
  let _demoIdx = 0;
  const DEMO_FRAMES = [
    { persona:'Anmol · Policy Manager', q:'Who is working on PolicyOS?',
      a:`<div class="answer-card"><div class="answer-card__h">${App.icon('branch')} From Jira · TARA</div><div class="answer-card__b"><div class="minirow"><span class="mono" style="font-size:11px;color:var(--muted);width:62px">TARA-101</span><div style="flex:1"><b style="font-weight:600">Revised PolicyOS — RBAC + Tara</b><div class="muted" style="font-size:11.5px">Sankalp Chandra</div></div>${App.ui.statusPill('In Progress')}</div><div class="minirow"><span class="mono" style="font-size:11px;color:var(--muted);width:62px">TARA-104</span><div style="flex:1"><b style="font-weight:600">Permission inheritance engine</b><div class="muted" style="font-size:11.5px">Abhishek Chaudhary</div></div>${App.ui.statusPill('In Progress')}</div></div></div>`,
      chips:[{k:'jira',l:'Jira'}] },
    { persona:'Sankalp · Admin', q:"Who's in the Design team?",
      a:`<div class="answer-card"><div class="answer-card__h">${App.icon('users')} From HRMS · Design</div><div class="answer-card__b"><div class="minirow">${App.ui.avatar('Harshita Gupta','sm')}<div style="flex:1"><b style="font-weight:600">Harshita Gupta</b> <span class="muted" style="font-size:12px">· Product Designer</span></div></div><div class="minirow">${App.ui.avatar('Tanisha','sm')}<div style="flex:1"><b style="font-weight:600">Tanisha</b> <span class="muted" style="font-size:12px">· UI Designer</span></div></div></div></div>`,
      chips:[{k:'hrms',l:'Keka HRMS'}] },
    { persona:'Chirag · Staff', q:'Show me the personal loan policy',
      a:`<p>🔒 <strong>You don't have access to the Personal Loan Credit Policy.</strong></p><p class="muted" style="margin-top:6px;font-size:12.5px">It's scoped to Risk &amp; Policy and the Founder's Office. Permission is enforced at retrieval — not in the prompt.</p>`,
      chips:[{k:'locked',l:'Personal Loan Policy · no access'}] },
    { persona:'Chirag · Staff', q:"What's the leave policy?",
      a:`<div class="answer-card"><div class="answer-card__h">${App.icon('shield')} Employee Leave Policy · v2.2</div><div class="answer-card__b"><div class="minirow"><span class="muted">Privilege leave</span><span class="spacer" style="flex:1"></span><b>18 / yr</b></div><div class="minirow"><span class="muted">Sick leave</span><span class="spacer" style="flex:1"></span><b>10 / yr</b></div><div class="minirow"><span class="muted">Carry-forward</span><span class="spacer" style="flex:1"></span><b>up to 30 days</b></div></div></div>`,
      chips:[{k:'policy',l:'PolicyOS'}] }
  ];
  App.loginDemo = () => {
    const host = document.getElementById('loginDemo'); if (!host) return;
    const f = DEMO_FRAMES[_demoIdx % DEMO_FRAMES.length];
    host.innerHTML = `<div class="demo-persona">${App.icon('user')} ${App.esc(f.persona)} asks</div>
      <div class="demo-msg demo-msg--user"><span id="demoQ"></span><span class="demo-caret">▍</span></div><div id="demoA"></div>`;
    const type = (n) => {
      const el = document.getElementById('demoQ'); if (!el) return;
      if (n > f.q.length) {
        const c = host.querySelector('.demo-caret'); if (c) c.style.visibility = 'hidden';
        lt(() => { const a = document.getElementById('demoA'); if (!a) return;
          a.innerHTML = `<div class="demo-msg demo-msg--ai"><div class="typing"><span></span><span></span><span></span></div></div>`;
          lt(() => { const a2 = document.getElementById('demoA'); if (!a2) return;
            a2.innerHTML = `<div class="demo-msg demo-msg--ai">${f.a}<div class="src-row">${f.chips.map(c2 => `<span class="src-chip ${c2.k}">${App.icon({jira:'branch',hrms:'users',policy:'shield',locked:'lock'}[c2.k]||'database')} ${App.esc(c2.l)}</span>`).join('')}</div></div>`;
            _demoIdx++; lt(App.loginDemo, 3400);
          }, 820);
        }, 420);
        return;
      }
      el.textContent = f.q.slice(0, n); lt(() => type(n + 1), 34);
    };
    type(0);
  };

  /* ---- scene player: extra animated demo windows, started on scroll ---- */
  function typeHost(host, id, text, done) {
    let n = 0;
    const tick = () => { const el = host.querySelector('#' + id); if (!el) return;
      if (n > text.length) { const c = host.querySelector('.demo-caret'); if (c) c.style.visibility = 'hidden'; return done && done(); }
      el.textContent = text.slice(0, n); n++; lt(tick, 30); };
    tick();
  }
  App.scene = {
    boundary(host) {
      const allowed = `<div class="answer-card"><div class="answer-card__h">${App.icon('shield')} Personal Loan Credit Policy · v3.2</div><div class="answer-card__b"><div class="minirow"><span class="muted">Min CIBIL</span><span class="spacer" style="flex:1"></span><b>700</b></div><div class="minirow"><span class="muted">Age band</span><span class="spacer" style="flex:1"></span><b>23–58</b></div><div class="minirow"><span class="muted">Max FOIR</span><span class="spacer" style="flex:1"></span><b>55%</b></div></div></div><div class="src-row"><span class="src-chip policy">${App.icon('shield')} PolicyOS</span></div>`;
      const denied = `<p>🔒 <strong>You don't have access to the Personal Loan Credit Policy.</strong></p><p class="muted" style="margin-top:6px;font-size:12.5px">Scoped to Risk &amp; Policy and the Founder's Office — same question, different person, different answer.</p><div class="src-row"><span class="src-chip locked">${App.icon('lock')} no access</span></div>`;
      const frames = [{ p:'Sankalp · Admin', ok:true }, { p:'Chirag · Staff', ok:false }];
      let i = 0;
      const step = () => { if (!document.body.contains(host)) return; const f = frames[i % 2];
        host.innerHTML = `<div class="demo-persona">${App.icon('user')} ${App.esc(f.p)} asks</div><div class="demo-msg demo-msg--user"><span id="bq"></span><span class="demo-caret">▍</span></div><div id="ba"></div>`;
        typeHost(host, 'bq', 'Show me the personal loan policy', () => {
          lt(() => { const a = host.querySelector('#ba'); if (!a) return; a.innerHTML = `<div class="demo-msg demo-msg--ai"><div class="typing"><span></span><span></span><span></span></div></div>`;
            lt(() => { const a2 = host.querySelector('#ba'); if (!a2) return; a2.innerHTML = `<div class="demo-msg demo-msg--ai">${f.ok ? allowed : denied}</div>`; i++; lt(step, 2700); }, 760); }, 380);
        });
      };
      step();
    },
    insight(host) {
      const data = [{ r:'Low bureau score', c:373 }, { r:'High FOIR', c:246 }, { r:'Age outside policy', c:190 }, { r:'Insufficient income', c:188 }];
      const render = () => { if (!document.body.contains(host)) return;
        host.innerHTML = `<div class="demo-persona">${App.icon('chart')} InsightGen · risk analytics</div><div class="demo-msg demo-msg--user"><span id="iq"></span><span class="demo-caret">▍</span></div><div id="ia"></div>`;
        typeHost(host, 'iq', 'Top reasons for loan rejection', () => {
          lt(() => { const a = host.querySelector('#ia'); if (!a) return; a.innerHTML = `<div class="demo-msg demo-msg--ai"><div class="typing"><span></span><span></span><span></span></div></div>`;
            lt(() => { const a2 = host.querySelector('#ia'); if (!a2) return;
              a2.innerHTML = `<div class="demo-msg demo-msg--ai"><div style="font-size:12.5px;font-weight:600;margin-bottom:12px">Rejection reasons · last quarter</div>${data.map(d => `<div class="bar-row" style="margin-bottom:9px"><div class="bar-row__lbl" style="width:128px;font-size:12px">${d.r}</div><div class="bar-track" style="height:20px"><div class="bar-fill scene-bar" data-w="${Math.round(d.c / 373 * 100)}" style="width:0%">${d.c}</div></div></div>`).join('')}<div class="src-row"><span class="src-chip">${App.icon('chart')} InsightGen · SQL</span></div></div>`;
              lt(() => { host.querySelectorAll('.scene-bar').forEach(b => { b.style.width = b.getAttribute('data-w') + '%'; }); }, 90);
              lt(render, 4400);
            }, 760); }, 380);
        });
      };
      render();
    },
    connect(host) {
      const conns = [{ id:'keka', n:'Keka HRMS' }, { id:'jira', n:'Jira' }, { id:'notion', n:'Notion' }, { id:'greythr', n:'greytHR' }];
      const render = () => { if (!document.body.contains(host)) return;
        host.innerHTML = `<div class="demo-persona">${App.icon('plug')} Connect your stack</div><div>${conns.map(c => `<div class="minirow" data-cid="${c.id}" style="border:1px solid var(--line);border-radius:10px;padding:9px 12px;margin-bottom:8px">${App.conn.logo(c.id,24)}<div style="flex:1;font-weight:600;font-size:13px">${c.n}</div><span class="c-stat">${App.ui.pill('Available','gray')}</span></div>`).join('')}</div><div id="cmodel" style="opacity:.4;border:1px dashed var(--line);border-radius:10px;padding:9px 12px;display:flex;align-items:center;gap:9px">${App.icon('sparkles')}<div style="flex:1;font-weight:600;font-size:13px">Bring your own model</div></div>`;
        let k = 0;
        const flip = () => { if (!document.body.contains(host)) return;
          if (k < conns.length) { const s = host.querySelector('[data-cid="' + conns[k].id + '"] .c-stat'); if (s) s.innerHTML = App.ui.pill('Connected', 'green', true); k++; lt(flip, 720); }
          else { const m = host.querySelector('#cmodel'); if (m) { m.style.opacity = '1'; m.innerHTML = `${App.llm.logo('gemini',24)}<div style="flex:1;font-weight:600;font-size:13px">Gemini · on-prem</div>${App.ui.pill('Live','green',true)}`; } lt(render, 4000); }
        };
        lt(flip, 780);
      };
      render();
    }
  };
  App.playScene = (id) => { const host = document.getElementById(id); if (!host || host.dataset.played === '1') return; const key = host.dataset.scene; if (!key || !App.scene[key]) return; host.dataset.played = '1'; App.scene[key](host); };

  function renderLogin() {
    const chip = (ic, t) => `<span class="login__chip">${App.icon(ic)} ${t}</span>`;
    const feat = (ic, t, d) => `<div class="feature-card reveal"><div class="feature-card__ic">${App.icon(ic)}</div><h3>${t}</h3><p>${d}</p></div>`;
    const uc = (tag, t, d) => `<div class="usecase reveal"><div class="usecase__tag">${tag}</div><h3>${t}</h3><p>${d}</p></div>`;
    const route = (ic, kind, d) => `<div class="feature-card reveal"><div class="row gap-8" style="margin-bottom:8px">${App.icon(ic)}<b style="font-size:14px">${kind}</b></div><p style="margin-top:0">${d}</p></div>`;
    const win = (id, scene, title) => `<div class="demo-window"><div class="demo-window__bar"><span class="demo-dot"></span><span class="demo-dot"></span><span class="demo-dot"></span><span class="demo-window__title">${App.icon('sparkles')} ${title}</span></div><div class="demo-window__body" id="${id}"${scene ? ` data-scene="${scene}"` : ''}></div></div>`;
    const split = (rev, kicker, h2, sub, id, scene, title) => `<div class="lp-section"><div class="lp-split${rev ? ' lp-split--rev' : ''}"><div class="lp-split__copy reveal"><div class="lp-kicker">${kicker}</div><h2 class="lp-h2">${h2}</h2><p class="lp-sub">${sub}</p></div><div class="lp-split__media reveal">${win(id, scene, title)}</div></div></div>`;
    document.getElementById('app').innerHTML = `
      <div class="landing">
        <div class="landing__nav">
          <div class="landing__brand"><div class="login__logo">P</div><b>PolicyOS · Tara</b></div>
          <button class="btn btn--primary btn--sm" onclick="App.signIn()">Sign in</button>
        </div>

        <div class="landing__hero">
          <div class="landing__copy">
            <span class="landing__eyebrow">${App.icon('lock')} On-prem · permission-aware</span>
            <h1>Your company,<br>answered — for<br>each person.</h1>
            <p>One copilot across HRMS, Jira, Notion and your policy library — that only ever answers from what each person is allowed to see. Bring your own model. Your data never leaves.</p>
            <div class="landing__cta">
              <button class="btn btn--primary" onclick="App.signIn()">Sign in ${App.icon('arrow')}</button>
              <button class="btn" onclick="document.getElementById('lp-how').scrollIntoView({behavior:'smooth'})">See how it works</button>
            </div>
            <div class="login__chips">${chip('shield','Permission-faithful')}${chip('plug','HRMS · Jira · Notion')}${chip('sparkles','Bring your own LLM')}</div>
          </div>
          <div class="landing__demo">${win('loginDemo', '', 'Ask Tara')}</div>
        </div>

        <div class="lp-section" id="lp-how">
          <div class="lp-kicker reveal">How it works</div>
          <h2 class="lp-h2 reveal">One question. The right source. The right person.</h2>
          <p class="lp-sub reveal">Ask in plain language. Tara routes to the system that has the answer — then filters what comes back to exactly what you're allowed to see. Enforced at retrieval, not in the prompt.</p>
          <div class="lp-features">
            ${route('users','People &amp; teams','“Who’s in the Design team?”, “is Sankalp in today?” → Keka / greytHR.')}
            ${route('branch','Work in progress','“Who’s working on PolicyOS?”, “what is Abhishek on?” → Jira.')}
            ${route('shield','Policies','“Personal-loan eligibility?”, “the leave policy?” → your policy library.')}
          </div>
        </div>

        ${split(false, 'The boundary, live', 'Same question. Different person. Different answer.', 'Watch an admin pull the full personal-loan policy — then a staff member ask the exact same thing and hit a wall. The model never even receives what they’re not allowed to see.', 'sceneBoundary', 'boundary', 'Permission boundary')}

        <div class="lp-section--tint"><div class="lp-section">
          <div class="lp-kicker reveal">Built for regulated teams</div>
          <h2 class="lp-h2 reveal">Everything Tara does</h2>
          <div class="lp-features">
            ${feat('shield','Permission-faithful retrieval','Every answer is scoped to the asker. The model never receives a source the user couldn’t open — so it can’t leak what a role can’t see.')}
            ${feat('sparkles','Bring your own model','Gemini, ChatGPT, Claude, Sarvam, Grok or Perplexity. Your key, your usage, LLM-agnostic — with an optional fallback.')}
            ${feat('plug','Connect your stack','Keka, greytHR, Jira, Notion, Slack and more — over API or MCP. Each source’s own permissions are inherited.')}
            ${feat('branch','Policy lifecycle &amp; approvals','A versioned policy library with maker-checker workflows, audit trails and side-by-side change review.')}
            ${feat('clipboard','Assessments &amp; attestation','Roll out AI-generated quizzes and attestations so teams actually read what changed.')}
            ${feat('code','Rules → deployable code','Turn a policy change into business-rules code and cut time-to-market.')}
          </div>
        </div></div>

        ${split(true, 'Insights on tap', 'Ask your data in plain English.', '“Top reasons for loan rejection” becomes SQL, runs on your warehouse and comes back as a chart — no analyst, no ticket. Scoped to what you can see.', 'sceneInsight', 'insight', 'InsightGen')}

        ${split(false, 'Connect in minutes', 'Your stack, your model, on your infra.', 'Plug in Keka, greytHR, Jira and Notion over API or MCP, point Tara at your own model key — and it answers for real, permission-faithfully. Nothing leaves your environment.', 'sceneConnect', 'connect', 'Connectors')}

        <div class="lp-section">
          <div class="lp-kicker reveal">Use cases</div>
          <h2 class="lp-h2 reveal">One platform, two ways to sell it.</h2>
          <div class="usecases">
            ${uc('BFSI','Policy governance for lenders','Compliance-grade approval trails, RBAC by product, and regulator-gap checks — the original PolicyOS, now agentic.')}
            ${uc('Mid-market','A company brain that respects walls','One copilot over HRMS, projects and docs that never tells someone what their role can’t see.')}
            ${uc('On-prem','Your data never leaves','Self-hosted and bring-your-own-LLM — keys and context stay inside your environment.')}
          </div>
        </div>

        <div class="lp-cta reveal">
          <h2>See it answer — for each person.</h2>
          <p>Sign in with a demo account and test the permission boundary yourself.</p>
          <div class="row gap-8" style="justify-content:center;margin-top:22px"><button class="btn btn--primary" onclick="App.signIn()">Sign in ${App.icon('arrow')}</button></div>
        </div>

        <div class="landing__foot">Prototype · dummy data · connect your own keys on the Connectors page to make it live</div>
      </div>
      <div class="overlay" id="overlay"><div id="modalHost"></div></div>
      <div class="toast-wrap" id="toastWrap"></div>`;
    _demoIdx = 0;
    lt(App.loginDemo, 400);
    const root = document.querySelector('.landing');
    const targets = document.querySelectorAll('.landing .reveal, .landing [data-scene]');
    const start = (el) => { if (el.classList.contains('reveal')) el.classList.add('is-in'); if (el.dataset && el.dataset.scene) App.playScene(el.id); };
    if (!('IntersectionObserver' in window) || !root) { targets.forEach(start); }
    else { const io = new IntersectionObserver((ents) => { ents.forEach(en => { if (en.isIntersecting) { start(en.target); io.unobserve(en.target); } }); }, { root, threshold: 0.18 }); targets.forEach(e => io.observe(e)); }
  }

  /* ---------------- boot ---------------- */
  App.boot = () => {
    document.addEventListener('keydown', e => {
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k') { e.preventDefault(); if(App.state.user) App.cmd.open(); }
      if (e.key==='Escape') { App.closeModal(); if (App.state.user) App.cmd.close(); }
    });
    renderLogin();
  };

  return App;
})();
