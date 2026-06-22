/* Users & access — merged People directory + User management + Access control (Admin only).
   Add users: individually · via CSV · or sync HRMS to find new joiners → approve & assign. */
App.registerView('usersaccess', {
  title: 'Users & access',
  render(ctx) {
    const u = ctx.user;
    if (u.role !== 'admin') {
      return `<div class="page"><div class="page__head"><div><h1>Users &amp; access</h1><p>People, roles and what each person can see.</p></div></div>
        <div class="lock-banner">${App.icon('lock')} <span><strong>Administrator access required.</strong> User &amp; access management is restricted to administrators.</span></div></div>`;
    }
    const tab = (App.state.usersAccess && App.state.usersAccess.tab) || 'people';
    const tabBtn = (id, label) => `<div class="tab ${tab===id?'is-active':''}" onclick="App.usersAccessView.tab('${id}')">${label}</div>`;
    const addBtn = tab==='people'
      ? `<div style="position:relative"><button class="btn btn--primary" onclick="App.usersAccessView.addMenu(event)">${App.icon('plus')} Add users ${App.icon('chevron')}</button><div id="uaAddMenu" style="display:none"></div></div>`
      : '';
    return `<div class="page">
      <div class="page__head"><div><h1>Users &amp; access</h1><p>One place for your directory, user roles and permission rules — everything that decides who can see what.</p></div><div class="spacer"></div>${addBtn}</div>
      <div class="tabs">${tabBtn('people','People &amp; users')}${tabBtn('access','Access rules')}</div>
      <div id="uaBody">${tab==='people' ? App.usersAccessView.peopleHtml() : App.usersAccessView.accessHtml()}</div>
    </div>`;
  },
  mount(root, ctx) {
    if (ctx.user.role !== 'admin') return;
    const tab = (App.state.usersAccess && App.state.usersAccess.tab) || 'people';
    if (tab === 'people') App.usersAccessView.mountPeople(root); else App.usersAccessView.mountAccess(root);
  }
});

App.usersAccessView = {
  tab(t) { App.state.usersAccess = { tab: t }; App.reload(); },
  provisioned(id) { return DB.users.find(u => u.id === id); },

  /* ---------- People & users tab ---------- */
  peopleHtml() {
    const roleKind = { admin:'violet', policy_manager:'blue', risk_approver:'amber', assessment_manager:'teal', user:'green' };
    const rows = DB.employees.map(e => {
      const pu = App.usersAccessView.provisioned(e.id);
      const roleCell = pu
        ? App.ui.pill(DB.roleLabels[pu.role] + (pu.hrAdmin ? ' · HR' : ''), roleKind[pu.role] || 'gray')
        : `<span class="tag">Not provisioned</span>`;
      const access = pu ? (pu.role === 'admin' ? 'All policies' : App.visiblePolicies(Object.assign({}, e, pu)).length + ' policies') : '—';
      return `<tr class="clickable" data-n="${(e.name + ' ' + e.email).toLowerCase()}" data-team="${e.team}" data-prov="${pu ? 'y' : 'n'}" onclick="App.directoryView.profile('${e.id}')">
        <td><div class="cell-person">${App.ui.avatar(e,'sm')}<div><div class="cell-strong">${App.esc(e.name)}</div><div class="muted" style="font-size:12px">${App.esc(e.email)}</div></div></div></td>
        <td><span class="mono" style="font-size:12px;color:var(--muted)">${e.id}</span></td>
        <td><span class="tag">${App.esc(e.team)}</span></td>
        <td>${roleCell}</td>
        <td class="muted" style="font-size:12.5px">${access}</td>
        <td>${App.ui.presencePill(e.presence)}</td>
      </tr>`;
    }).join('');
    const prov = DB.employees.filter(e => App.usersAccessView.provisioned(e.id)).length;
    const src = App.edition() === 'standard' ? 'Synced from <strong>Keka HRMS</strong>.' : 'Manually managed (on-prem edition — no HRMS sync).';
    return `<div class="info-banner">${App.icon('users')} <span><strong>${prov} of ${DB.employees.length}</strong> people are provisioned with a PolicyOS role. ${src} Compensation stays gated to People &amp; Talent and the Founder's Office.</span></div>
      <div class="toolbar">
        <div class="search-input">${App.icon('search')}<input id="uaSearch" placeholder="Search people…"/></div>
        <select class="select" id="uaTeam"><option value="">All teams</option>${DB.teams.map(t => `<option>${t.name}</option>`).join('')}</select>
        <select class="select" id="uaProv"><option value="">Everyone</option><option value="y">Provisioned</option><option value="n">Not provisioned</option></select>
      </div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Emp ID</th><th>Team</th><th>Role</th><th>Access</th><th>Today</th></tr></thead><tbody id="uaRows">${rows}</tbody></table></div>`;
  },
  mountPeople(root) {
    const s = root.querySelector('#uaSearch'); if (!s) return;
    const f = () => {
      const q = (s.value || '').toLowerCase();
      const tm = root.querySelector('#uaTeam').value, pv = root.querySelector('#uaProv').value;
      root.querySelectorAll('#uaRows tr').forEach(tr => { tr.style.display = (tr.dataset.n.includes(q) && (!tm || tr.dataset.team === tm) && (!pv || tr.dataset.prov === pv)) ? '' : 'none'; });
    };
    s.oninput = f; root.querySelector('#uaTeam').onchange = f; root.querySelector('#uaProv').onchange = f;
  },

  /* ---------- Add users (split menu: individual / CSV / HRMS sync) ---------- */
  addMenu(e) {
    e.stopPropagation();
    const m = document.getElementById('uaAddMenu'); if (!m) return;
    if (m.style.display === 'block') { m.style.display = 'none'; return; }
    m.style.display = 'block';
    m.style.cssText = 'display:block;position:absolute;right:0;top:42px;width:264px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lg);padding:8px;z-index:50';
    const it = (ic, t, d, fn) => `<div class="cmdk__item" style="align-items:flex-start" onclick="${fn}"><span style="margin-top:2px">${App.icon(ic)}</span><div style="flex:1"><div style="font-weight:600;font-size:13px">${t}</div><div style="font-size:11.5px;color:var(--muted)">${d}</div></div></div>`;
    m.innerHTML = it('user', 'Add individually', 'One person — set role &amp; access', 'App.usersAccessView.addIndividual()')
      + it('download', 'Import CSV', 'Bulk-add from a spreadsheet', 'App.usersAccessView.addCsv()')
      + (App.edition() === 'standard' ? it('plug', 'Sync from HRMS', 'Find new joiners in Keka → approve &amp; assign', 'App.usersAccessView.syncHrms()') : '');
    setTimeout(() => document.addEventListener('click', function h() { const mm = document.getElementById('uaAddMenu'); if (mm) mm.style.display = 'none'; document.removeEventListener('click', h); }), 0);
  },
  _featRows() {
    const f = [['PolyGPT', 'Answer policy questions', true], ['Compare Policies', 'Side-by-side version diffs', true], ['Assessments', 'Create AI questionnaires', false]];
    return f.map(x => `<div class="togglerow"><div class="togglerow__txt"><b>${x[0]}</b><span>${x[1]}</span></div><div class="spacer"></div><button class="toggle ${x[2] ? 'on' : ''}" onclick="this.classList.toggle('on')"></button></div>`).join('');
  },
  _catRows(onNames) {
    return App.enabledCats().map(c => `<div class="togglerow"><div class="togglerow__txt"><b>${App.esc(c.name)}</b></div><div class="spacer"></div><button class="toggle ${(!onNames || onNames.includes(c.name)) ? 'on' : ''}" onclick="this.classList.toggle('on')"></button></div>`).join('');
  },
  addIndividual() {
    App.openModal({
      title: 'Add user', sub: 'Provision one person with a role and access.', lg: true,
      body: `<div class="grid grid-2"><div class="field"><label>Employee ID <span class="req">*</span></label><input class="input" placeholder="THQ0200"/></div><div class="field"><label>Work email <span class="req">*</span></label><input class="input" placeholder="name@tartanhq.com"/></div></div>
        <div class="grid grid-2"><div class="field"><label>Full name <span class="req">*</span></label><input class="input" placeholder="Full name"/></div>
        <div class="field"><label>Role <span class="req">*</span></label><select class="select" style="width:100%">${Object.keys(DB.roleLabels).map(r => `<option value="${r}"${r === 'user' ? ' selected' : ''}>${DB.roleLabels[r]}</option>`).join('')}</select></div></div>
        <div class="login__label" style="margin-top:6px">AI feature access</div>${App.usersAccessView._featRows()}
        <div class="login__label" style="margin-top:14px">Category access</div>${App.usersAccessView._catRows(null)}`,
      footer: `<button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn--primary" onclick="App.closeModal();App.toast('User added (demo)')">Add user</button>`
    });
  },
  addCsv() {
    App.openModal({
      title: 'Import users from CSV', sub: 'Bulk-provision people from a spreadsheet.',
      body: `<div class="field"><label>CSV file</label><div class="pdf-ph" style="min-height:auto;padding:24px;text-align:center;cursor:pointer" onclick="App.toast('File picker opens on the deployed app')">${App.icon('download')}<div class="muted" style="margin-top:8px;font-size:12.5px">Click to upload CSV (≤ 20 MB)</div></div></div>
        <div class="info-banner" style="margin-bottom:0">${App.icon('info')} <span>Mandatory columns: <strong>Employee ID, Name, Email, Role, Category</strong>. Admins can't be bulk-added; IDs &amp; emails must be unique. <a style="color:var(--brand-600);cursor:pointer" onclick="App.toast('Sample CSV downloaded (demo)')">Download sample</a>.</span></div>`,
      footer: `<button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn--primary" onclick="App.closeModal();App.toast('Users imported (demo)')">Import users</button>`
    });
  },
  syncHrms() {
    const news = DB.employees.filter(e => !App.usersAccessView.provisioned(e.id)).slice(0, 6);
    const rows = news.map(e => `<div class="minirow" id="ua-new-${e.id}">${App.ui.avatar(e,'sm')}<div style="flex:1"><b style="font-weight:600">${App.esc(e.name)}</b><div class="muted" style="font-size:11.5px">${App.esc(e.title)} · ${App.esc(e.team)} · ${e.id}</div></div><button class="btn btn--sm btn--primary" onclick="App.usersAccessView.approve('${e.id}')">${App.icon('check')} Approve</button></div>`).join('');
    App.openModal({
      title: 'Sync from Keka HRMS', sub: 'New joiners found in HRMS, not yet provisioned in PolicyOS.', lg: true,
      body: `<div class="info-banner">${App.icon('plug')} <span>Synced <strong>Keka HRMS</strong> just now — <strong>${news.length}</strong> ${news.length === 1 ? 'person is' : 'people are'} in HRMS but not yet in PolicyOS. Approve each to assign a role &amp; access.</span></div>
        <div id="uaNewList">${rows || App.ui.empty('check', 'All synced', 'Everyone in HRMS is already provisioned.')}</div>`,
      footer: `<button class="btn" onclick="App.closeModal()">Done</button>`
    });
  },
  approve(id) {
    const e = App.emp(id);
    App.openModal({
      title: 'Approve & assign · ' + e.name, sub: 'Set this new joiner\'s role and access before they get in.',
      body: `<div class="row gap-12" style="margin-bottom:14px">${App.ui.avatar(e,'lg')}<div><div style="font-weight:600">${App.esc(e.name)}</div><div class="muted" style="font-size:12.5px">${App.esc(e.title)} · ${App.esc(e.team)} · ${App.esc(e.email)}</div></div></div>
        <div class="field"><label>Role <span class="req">*</span></label><select class="select" id="uaApRole" style="width:100%">${Object.keys(DB.roleLabels).filter(r => r !== 'admin').map(r => `<option value="${r}"${r === 'user' ? ' selected' : ''}>${DB.roleLabels[r]}</option>`).join('')}</select></div>
        <div class="login__label">Category access</div>${App.usersAccessView._catRows(['HR', 'Compliance'])}`,
      footer: `<button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn--primary" onclick="App.usersAccessView.doApprove('${id}')">${App.icon('check')} Provision</button>`
    });
  },
  doApprove(id) {
    const sel = document.getElementById('uaApRole'); const role = sel ? sel.value : 'user';
    if (!DB.users.some(u => u.id === id)) DB.users.push({ id, role, features: { polygpt: true, compare: false, assessments: true, copilot: true } });
    App.closeModal();
    App.toast(App.emp(id).name + ' provisioned as ' + DB.roleLabels[role]);
    App.reload();
  },

  /* ---------- Access rules tab (sources + policy matrix + tester) ---------- */
  accessHtml() {
    const sourceCard = c => `<div class="card card--pad"><div class="row gap-8" style="margin-bottom:6px">${App.icon(c.id === 'keka' || c.id === 'greythr' ? 'users' : c.id === 'jira' ? 'branch' : c.id === 'notion' ? 'book' : c.id === 'slack' ? 'chat' : 'shield')}<b style="font-size:13.5px">${App.esc(c.name)}</b></div><div class="muted" style="font-size:12.5px">${App.esc(c.note)}</div><div class="row gap-6 mt-8"><span class="pill pill--gray">${App.icon('key')} ${App.esc(c.auth)}</span></div></div>`;
    const conns = DB.connectors.filter(c => c.status === 'connected' && (App.edition() === 'standard' || c.id === 'policyos'));
    const pols = DB.policies.filter(p => App.catEnabled(p.category));
    const polRows = pols.map(p => {
      const scope = p.access.everyone ? '<span class="pill pill--green">Everyone</span>'
        : [].concat((p.access.roles || []).map(r => `<span class="tag">${DB.roleLabels[r] || r}</span>`)).concat((p.access.teams || []).map(t => `<span class="tag">${App.esc(t)}</span>`)).join(' ');
      return `<tr><td><div class="cell-strong">${App.esc(p.name)}${p.sensitive ? ' ' + App.ui.pill('Confidential', 'red') : ''}</div><div class="muted" style="font-size:12px">${App.esc(p.category)} · ${p.version}</div></td><td><div class="row wrap gap-6">${scope}</div></td><td><button class="btn btn--sm" onclick="App.accessView.edit('${p.id}')">${App.icon('edit')} Edit</button></td></tr>`;
    }).join('');
    const srcBlock = App.edition() === 'standard'
      ? `<h3 style="margin:6px 0 12px;font-size:15px">Connected sources</h3><div class="grid grid-3" style="margin-bottom:24px">${conns.map(sourceCard).join('')}</div>`
      : `<div class="info-banner">${App.icon('lock')} <span><strong>On-prem edition:</strong> no external connectors. Access is scoped entirely within the policy library below.</span></div>`;
    return `<div class="info-banner">${App.icon('shield')} <span><strong>How access is derived:</strong> ${App.edition() === 'standard' ? "each connected source's own permissions are inherited automatically; the rules below are overrides &amp; scoping on top." : 'role- and team-based rules below.'} Tara enforces them at retrieval — it never returns a source the user couldn't open.</span></div>
      ${srcBlock}
      <h3 style="margin:6px 0 12px;font-size:15px">Policy access rules</h3>
      <div class="table-wrap" style="margin-bottom:24px"><table class="tbl"><thead><tr><th>Policy</th><th>Who can access</th><th></th></tr></thead><tbody>${polRows}</tbody></table></div>
      <div class="card"><div class="card__head">${App.icon('eye')}<h3>Access tester</h3><div class="spacer"></div><span class="muted" style="font-size:12px">Preview what a persona can retrieve</span></div>
        <div class="card__body"><div class="grid grid-2" style="margin-bottom:14px">
          <div class="field" style="margin:0"><label>Persona</label><select class="select" id="uaTU" style="width:100%">${DB.users.map(u => { const e = App.emp(u.id); return `<option value="${u.id}">${App.esc(e.name)} — ${DB.roleLabels[u.role]}</option>`; }).join('')}</select></div>
          <div class="field" style="margin:0"><label>Policy</label><select class="select" id="uaTP" style="width:100%">${pols.map(p => `<option value="${p.id}">${App.esc(p.name)}</option>`).join('')}</select></div>
        </div><div id="uaTR"></div></div></div>`;
  },
  mountAccess(root) {
    const tu = root.querySelector('#uaTU'), tp = root.querySelector('#uaTP'); if (!tu || !tp) return;
    const run = () => {
      const uid = tu.value, pid = tp.value; if (!uid || !pid || !App.emp(uid)) return;
      const persona = DB.users.find(u => u.id === uid); const user = Object.assign({}, App.emp(uid), persona);
      const p = App.policy(pid); const ok = App.canViewPolicy(p, user);
      root.querySelector('#uaTR').innerHTML = ok
        ? `<div class="lock-banner" style="background:var(--green-50);border-color:#bcd3c2;color:var(--green-700)">${App.icon('check')} <span><strong>${App.esc(App.emp(uid).name)}</strong> can view &amp; query “${App.esc(p.name)}”. Tara will use it as a source.</span></div>`
        : `<div class="lock-banner">${App.icon('lock')} <span><strong>${App.esc(App.emp(uid).name)}</strong> cannot access “${App.esc(p.name)}” — Tara refuses and marks the source hidden.</span></div>`;
    };
    tu.onchange = run; tp.onchange = run; run();
  }
};
