/* People Directory — synced from Keka HRMS */
App.registerView('directory', {
  title: 'People Directory',
  render(ctx) {
    const rows = DB.employees.map(e => `
      <tr class="clickable" data-n="${e.name.toLowerCase()}" data-team="${e.team}" data-p="${e.presence}" onclick="App.directoryView.profile('${e.id}')">
        <td><div class="cell-person">${App.ui.avatar(e,'sm')}<div><div class="cell-strong">${App.esc(e.name)}</div><div class="muted" style="font-size:12px">${App.esc(e.email)}</div></div></div></td>
        <td><span class="mono" style="font-size:12px;color:var(--muted)">${e.id}</span></td>
        <td>${App.esc(e.title)}</td>
        <td><span class="tag">${App.esc(e.team)}</span></td>
        <td>${App.ui.presencePill(e.presence)}</td>
      </tr>`).join('');
    return `<div class="page">
      <div class="page__head"><div><h1>People Directory</h1><p>${DB.employees.length} people across ${DB.teams.length} teams.</p></div></div>
      <div class="info-banner">${App.icon('plug')} <span>Synced from <strong>Keka HRMS</strong> · 8 min ago. Compensation is gated to People &amp; Talent and the Founder's Office.</span></div>
      <div class="toolbar">
        <div class="search-input">${App.icon('search')}<input id="dirSearch" placeholder="Search by name or email…"/></div>
        <select class="select" id="dirTeam"><option value="">All teams</option>${DB.teams.map(t=>`<option>${t.name}</option>`).join('')}</select>
        <select class="select" id="dirP"><option value="">Any presence</option><option value="office">In office</option><option value="remote">Remote</option><option value="leave">On leave</option></select>
        <div class="spacer" style="flex:1"></div>
        <button class="btn btn--teal btn--sm" onclick="App.chat.toggle(true);App.chat.ask('Who is in office today?')">${App.icon('sparkles')} Ask about people</button>
      </div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Emp ID</th><th>Title</th><th>Team</th><th>Today</th></tr></thead><tbody id="dirBody">${rows}</tbody></table></div>
    </div>`;
  },
  mount(root, ctx) {
    const filter = () => {
      const q=(root.querySelector('#dirSearch').value||'').toLowerCase();
      const tm=root.querySelector('#dirTeam').value, pr=root.querySelector('#dirP').value;
      root.querySelectorAll('#dirBody tr').forEach(tr=>{
        tr.style.display = (tr.dataset.n.includes(q) && (!tm||tr.dataset.team===tm) && (!pr||tr.dataset.p===pr))?'':'none';
      });
    };
    root.querySelector('#dirSearch').oninput=filter;
    root.querySelector('#dirTeam').onchange=filter;
    root.querySelector('#dirP').onchange=filter;
    if (ctx.params && ctx.params.focus) setTimeout(()=>App.directoryView.profile(ctx.params.focus),120);
  }
});

App.directoryView = {
  profile(id) {
    const e = App.emp(id); const u = App.currentUser();
    const canComp = App.canSeeComp(u);
    const comp = canComp ? (DB.compensation[id] || 'Band L3 · ₹20–28L (indicative)') : null;
    const issues = DB.jiraIssues.filter(i=>i.assignee===id);
    App.openModal({
      title: e.name, sub: e.title+' · '+e.team,
      body: `<div class="row gap-12" style="margin-bottom:14px">${App.ui.avatar(e,'lg')}<div><div class="row gap-8">${App.ui.presencePill(e.presence)}<span class="muted" style="font-size:12px;align-self:center">${e.presence==='office'?'Checked in '+e.checkin:''}</span></div></div></div>
        <div class="minirow"><span class="muted">Employee ID</span><span class="spacer" style="flex:1"></span><b class="mono">${e.id}</b></div>
        <div class="minirow"><span class="muted">Email</span><span class="spacer" style="flex:1"></span><b>${App.esc(e.email)}</b></div>
        <div class="minirow"><span class="muted">Team</span><span class="spacer" style="flex:1"></span><b>${App.esc(e.team)}</b></div>
        <div class="minirow"><span class="muted">Compensation</span><span class="spacer" style="flex:1"></span>${comp?`<b>${App.esc(comp)}</b>`:`<span class="pill pill--red">${App.icon('lock')} Restricted</span>`}</div>
        ${issues.length?`<div class="divider"></div><b style="font-size:12.5px">Working on (Jira)</b>${issues.map(i=>`<div class="minirow"><span class="mono" style="font-size:11px;color:var(--muted);width:64px">${i.key}</span><span style="flex:1">${App.esc(i.title)}</span>${App.ui.statusPill(i.status)}</div>`).join('')}`:''}`,
      footer: `<button class="btn" onclick="App.closeModal()">Close</button><button class="btn btn--teal" onclick="App.closeModal();App.chat.toggle(true);App.chat.ask('What is ${e.name.split(' ')[0]} working on?')">${App.icon('sparkles')} Ask Tara</button>`
    });
  }
};
