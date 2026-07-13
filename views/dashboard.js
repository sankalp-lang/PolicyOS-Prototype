/* Dashboard / Home - centered Ask-Tara hero + actions + KPIs + activity (policy-centric; connectors parked).
   Numbers render in JetBrains Mono via .kpi__val; the rest stays Playfair/Inter. */
App.registerView('dashboard', {
  title: 'Home',
  render(ctx) {
    const u = ctx.user;
    const kpi = (icon, color, label, val, sub) => `
      <div class="kpi"><div class="kpi__top"><div class="kpi__label">${label}</div>
        <div class="kpi__icon" style="background:${color}1a;color:${color}">${App.icon(icon)}</div></div>
        <div class="kpi__val">${val}</div>${sub ? `<div class="kpi__sub muted">${sub}</div>` : ''}</div>`;

    const visPolicies = App.visiblePolicies(u).length;                 // policies this user can access (User KPI)
    const activePolicies = App.activePoliciesInScope(u).length;        // active policies in scope (Admin=all, PM=their categories)
    // regulatory gaps = affected policies in the user's scope (Admin=all, PM=their categories)
    const regGaps = (function () {
      if (!DB.amendments) return (DB.circulars || []).filter(c => c.suggestion && c.status !== 'Actioned').length;
      const seen = {}; let n = 0;
      DB.amendments.forEach(a => (a.changes || []).forEach(ch => {
        const p = App.policy(ch.policyId); if (!p) return;
        if ((u.role === 'admin' || (u.categories || []).indexOf(p.category) >= 0) && !seen[ch.policyId]) { seen[ch.policyId] = 1; n++; }
      }));
      return n;
    })();
    // approvals scoped: Admin sees all pending; Policy Manager (maker) sees the ones they raised
    const scopedApprovals = u.role === 'admin' ? DB.approvals : DB.approvals.filter(a => a.requestedBy === u.id);
    const pendCount = scopedApprovals.length;
    const highCount = scopedApprovals.filter(a => a.priority === 'High').length;

    // front door: a single centered Ask-Tara command bar (everyone)
    const fn = u.name.split(' ')[0];
    const heroChips = App.suggestPrompts(u).slice(0, 3).map(s => s.q);
    const hero = `
      <div style="text-align:center;max-width:760px;margin:8px auto 36px">
        <h1 style="font-size:32px;font-weight:600;letter-spacing:-.01em">Hello, ${App.esc(fn)}.</h1>
        <p class="muted" style="margin:11px auto 0;font-size:14.5px;max-width:560px">Ask your policy library in plain English. Tara only ever answers from what you're allowed to see - and shows the page it came from.</p>
        <div class="chat-inputwrap" style="margin:22px auto 0;max-width:700px;align-items:center;border-radius:12px;padding:9px 9px 9px 15px;text-align:left">
          <span style="color:var(--brand-600);display:grid;place-items:center">${App.icon('sparkles')}</span>
          <textarea id="homeAsk" rows="1" placeholder="Ask anything…  e.g. what's the personal loan eligibility?" style="padding-top:6px" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();App.chat.toggle(true);App.chat.ask(this.value);this.value='';}"></textarea>
          <button class="chat-send" onclick="(function(){var el=document.getElementById('homeAsk');App.chat.toggle(true);App.chat.ask(el.value);el.value='';})()">${App.icon('send')}</button>
        </div>
        <div class="row gap-8" style="margin-top:14px;flex-wrap:wrap;justify-content:center">
          ${heroChips.map(q => `<button class="btn btn--sm" onclick="App.chat.toggle(true);App.chat.ask('${q.replace(/'/g, "\\'")}')">${App.esc(q)}</button>`).join('')}
        </div>
      </div>`;

    if (u.role === 'user') {
      const myAssess = DB.assessments.filter(a => a.status !== 'Draft').slice(0, 3);
      return `<div class="page">${hero}
        <div class="grid grid-3" style="margin-bottom:18px">
          ${kpi('file', '#2f49c4', 'Policies you can access', visPolicies, 'Scoped to your role')}
          ${kpi('clipboard', '#3a7479', 'Assessments assigned', 2, '1 pending')}
          ${kpi('check', '#3f7a57', 'Acknowledgements due', 1, 'this week')}
        </div>
        <div class="grid grid-2">
          <div class="card"><div class="card__head"><h3>My assessments</h3></div><div class="card__body" style="padding:6px 18px">
            ${myAssess.map(a => `<div class="minirow"><div style="flex:1"><b style="font-weight:600">${App.esc(a.name)}</b><div class="muted" style="font-size:12px">Due ${a.end} · pass ${a.passing}%</div></div><button class="btn btn--sm btn--primary" onclick="App.assessmentsView.take('${a.id}')">Start</button></div>`).join('')}
          </div></div>
          <div class="card"><div class="card__head"><h3>Quick knowledge</h3></div><div class="card__body" style="padding:6px 18px">
            <div class="minirow" style="cursor:pointer" onclick="App.chat.toggle(true);App.chat.ask('What\\'s the leave policy?')">${App.icon('shield')}<span style="flex:1">Leave policy</span>${App.icon('arrow')}</div>
            <div class="minirow" style="cursor:pointer" onclick="App.chat.toggle(true);App.chat.ask('Travel and expense policy?')">${App.icon('briefcase')}<span style="flex:1">Travel &amp; expense</span>${App.icon('arrow')}</div>
            <div class="minirow" style="cursor:pointer" onclick="App.chat.toggle(true);App.chat.ask('Information security policy summary')">${App.icon('shield')}<span style="flex:1">Information security</span>${App.icon('arrow')}</div>
          </div></div>
        </div></div>`;
    }

    // Admin / Policy Manager - quick actions (role-specific, per RBAC PRD; InsightGen is NOT a quick action)
    const actionCards = u.role === 'admin'
      ? [
          { ic: 'users',  c: '#2f49c4', t: 'User Management', s: 'People & access', r: 'usersaccess' },
          { ic: 'layers', c: '#5e4d83', t: 'Categories', s: 'Policy taxonomy', r: 'category' },
          { ic: 'branch', c: '#3a7479', t: 'Approvals', s: pendCount + ' pending', r: 'approvals' },
          { ic: 'alert',  c: '#a8553a', t: 'Regulatory', s: regGaps + ' gap' + (regGaps === 1 ? '' : 's') + ' to review', r: 'regulatory' }
        ]
      : [
          { ic: 'alert',  c: '#a8553a', t: 'Regulatory', s: regGaps + ' gap' + (regGaps === 1 ? '' : 's') + ' to review', r: 'regulatory' },
          { ic: 'chat',   c: '#3a7479', t: 'PolyGPT', s: 'Ask your policies', r: 'polygpt' },
          { ic: 'branch', c: '#5e4d83', t: 'Approvals', s: pendCount + ' pending', r: 'approvals' }
        ];
    const gridN = actionCards.length;
    const pendingApprovals = scopedApprovals.slice(0, 3);
    // quick links: fast hops to the tools NOT already in the top quick actions (four per role; InsightGen stays sidebar-only)
    const quickLinks = u.role === 'admin'
      ? [ ['file', 'Policies', 'policies'], ['chat', 'PolyGPT', 'polygpt'], ['code', 'RuleSense AI', 'rulesense'], ['clipboard', 'Assessments', 'assessments'] ]
      : [ ['file', 'Policies', 'policies'], ['code', 'RuleSense AI', 'rulesense'], ['key', 'BRE Decoder', 'bredecoder'], ['clipboard', 'Assessments', 'assessments'] ];
    const apprEmpty = App.ui.empty('branch', u.role === 'admin' ? 'No approvals pending' : 'Nothing awaiting you', u.role === 'admin' ? 'New requests will appear here.' : 'Changes you raise will show here with their status.');
    return `<div class="page">${hero}
      <div class="grid grid-${gridN}" style="margin-bottom:18px">
        ${actionCards.map(a => `<button class="actioncard" onclick="App.navigate('${a.r}')"><div class="actioncard__ic" style="background:${a.c}1a;color:${a.c}">${App.icon(a.ic)}</div><div><b>${a.t}</b><span>${a.s}</span></div></button>`).join('')}
      </div>
      <div class="grid grid-4" style="margin-bottom:18px">
        ${kpi('file', '#2f49c4', 'Active policies', activePolicies, u.role === 'admin' ? 'across the org' : 'in your categories')}
        ${kpi('branch', '#5e4d83', 'Pending approvals', pendCount, u.role === 'admin' ? (highCount + ' high priority') : 'you raised')}
        ${kpi('clipboard', '#3a7479', 'Avg assessment score', '78%', '+4% vs last quarter')}
        ${kpi('alert', '#a8553a', 'Regulatory gaps', regGaps, 'awaiting review')}
      </div>
      <div class="grid grid-2">
        <div class="card"><div class="card__head"><h3>Pending approvals</h3><div class="spacer"></div><button class="btn btn--sm" onclick="App.navigate('approvals')">View all</button></div>
          <div class="card__body" style="padding:6px 18px">
            ${pendingApprovals.length ? pendingApprovals.map(a => { const by = App.emp(a.requestedBy); return `<div class="minirow" style="cursor:pointer" onclick="App.navigate('approvals')"><div style="flex:1"><b style="font-weight:600">${App.esc(a.name)}</b><div class="muted" style="font-size:12px">${by ? App.esc(by.name) : ''} · ${a.on}</div></div>${App.ui.pill(a.priority, a.priority === 'High' ? 'red' : 'amber')}</div>`; }).join('') : apprEmpty}
          </div></div>
        <div class="card"><div class="card__head"><h3>Quick links</h3></div>
          <div class="card__body" style="padding:6px 18px">
            ${quickLinks.map(l => `<div class="minirow" style="cursor:pointer" onclick="App.navigate('${l[2]}')">${App.icon(l[0])}<span style="flex:1">${l[1]}</span>${App.icon('arrow')}</div>`).join('')}
          </div></div>
      </div>
    </div>`;
  }
});
