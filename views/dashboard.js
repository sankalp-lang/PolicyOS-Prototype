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

    const visPolicies = App.visiblePolicies(u).length;
    const regGaps = (DB.circulars || []).filter(c => c.suggestion && c.status !== 'Actioned').length;

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
            <div class="minirow" style="cursor:pointer" onclick="App.chat.toggle(true);App.chat.ask('KYC and AML policy summary')">${App.icon('shield')}<span style="flex:1">KYC &amp; AML</span>${App.icon('arrow')}</div>
          </div></div>
        </div></div>`;
    }

    // manager / admin / risk - quick actions to the core features
    const actionCards = [
      { ic: 'alert', c: '#a8553a', t: 'Regulatory', s: regGaps + ' gap' + (regGaps === 1 ? '' : 's') + ' to review', r: 'regulatory' },
      { ic: 'chat', c: '#3a7479', t: 'PolyGPT', s: 'Ask your policies', r: 'polygpt' },
      { ic: 'branch', c: '#5e4d83', t: 'Approvals', s: DB.approvals.length + ' pending', r: 'approvals' },
      { ic: 'chart', c: '#3f7a57', t: 'InsightGen', s: 'Ask your data', r: 'insightgen' }
    ];
    const pendingApprovals = DB.approvals.slice(0, 3);
    return `<div class="page">${hero}
      <div class="grid grid-4" style="margin-bottom:18px">
        ${actionCards.map(a => `<button class="actioncard" onclick="App.navigate('${a.r}')"><div class="actioncard__ic" style="background:${a.c}1a;color:${a.c}">${App.icon(a.ic)}</div><div><b>${a.t}</b><span>${a.s}</span></div></button>`).join('')}
      </div>
      <div class="grid grid-4" style="margin-bottom:18px">
        ${kpi('file', '#2f49c4', 'Active policies', visPolicies, 'visible to you')}
        ${kpi('branch', '#5e4d83', 'Pending approvals', DB.approvals.length, '2 high priority')}
        ${kpi('clipboard', '#3a7479', 'Avg assessment score', '78%', '+4% vs last quarter')}
        ${kpi('alert', '#a8553a', 'Regulatory gaps', regGaps, 'awaiting review')}
      </div>
      <div class="grid grid-2">
        <div class="card"><div class="card__head"><h3>Pending approvals</h3><div class="spacer"></div><button class="btn btn--sm" onclick="App.navigate('approvals')">View all</button></div>
          <div class="card__body" style="padding:6px 18px">
            ${pendingApprovals.map(a => { const by = App.emp(a.requestedBy); return `<div class="minirow" style="cursor:pointer" onclick="App.navigate('approvals')"><div style="flex:1"><b style="font-weight:600">${App.esc(a.name)}</b><div class="muted" style="font-size:12px">${App.esc(by.name)} · ${a.on}</div></div>${App.ui.pill(a.priority, a.priority === 'High' ? 'red' : 'amber')}</div>`; }).join('')}
          </div></div>
        <div class="card"><div class="card__head"><h3>Recent attestations</h3></div>
          <div class="card__body" style="padding:6px 18px">
            ${[['KYC & AML Awareness', '41/64'], ['Personal Loan Quiz', '12/18'], ['Leave Policy Onboarding', '12/12']].map(r => `<div class="minirow"><div style="flex:1"><b style="font-weight:600">${r[0]}</b><div class="muted" style="font-size:12px">Attested ${r[1]}</div></div><button class="btn btn--sm">Remind</button></div>`).join('')}
          </div></div>
      </div>
    </div>`;
  }
});
