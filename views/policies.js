/* Policies - repository with permission-faithful (RBAC) filtering */
App.registerView('policies', {
  title: 'Policies',
  render(ctx) {
    const u = ctx.user;
    const vis = App.visiblePolicies(u);
    const hidden = DB.policies.length - vis.length;
    const canAdd = u.role==='policy_manager' || u.role==='admin';

    // columns mirror the production Policy Management table (PolicyTable.tsx):
    // select · Policy Name · Policy Owner · Category · Sub Category · Status · Created On · Last Modified On · Version · Action
    const rows = vis.map(p => {
      const owner = App.emp(p.owner);
      const created = p.created || p.updated;
      return `<tr class="clickable" data-name="${(p.name + ' ' + (owner ? owner.name : '') + ' ' + p.category + ' ' + (p.sub || '')).toLowerCase()}" data-cat="${p.category}" data-status="${p.status}" onclick="App.policiesView.open('${p.id}')">
        <td onclick="event.stopPropagation()" style="width:34px"><input type="checkbox" class="pol-check"/></td>
        <td><div class="cell-strong" style="color:var(--brand-600)">${App.esc(p.name)}${p.sensitive?' '+App.ui.pill('Confidential','red'):''}</div></td>
        <td><div class="cell-person">${App.ui.avatar(owner,'sm')}<span>${App.esc(owner.name)}</span></div></td>
        <td>${App.ui.pill(p.category,'violet')}</td>
        <td class="muted">${p.sub ? App.esc(p.sub) : 'N/A'}</td>
        <td>${App.ui.statusPill(p.status)}</td>
        <td class="muted" style="font-size:12.5px">${created}</td>
        <td class="muted" style="font-size:12.5px">${p.updated}</td>
        <td onclick="event.stopPropagation()"><button class="btn btn--sm" title="Version history & compare" onclick="App.versions.open('${p.id}')"><span class="mono">${App.esc(p.version)}</span> ${App.icon('chevron')}</button></td>
        <td onclick="event.stopPropagation()"><button class="btn btn--sm btn--icon-ok" title="View policy" onclick="App.policiesView.open('${p.id}')">${App.icon('eye')}</button></td>
      </tr>`;
    }).join('');

    return `<div class="page">
      <div class="page__head"><div><h1>Policy Management</h1><p>Manage, view, and edit all your active and inactive policies in one place.</p></div><div class="spacer"></div>
        ${canAdd?`<button class="btn btn--primary" onclick="App.policiesView.add()">${App.icon('plus')} Add Policy</button>`:''}</div>
      ${hidden?`<div class="lock-banner">${App.icon('lock')} <span><strong>${hidden} polic${hidden>1?'ies are':'y is'} hidden</strong> - outside your role's access scope. Permission is enforced at retrieval, not hidden in the UI alone.</span></div>`:''}
      <div class="toolbar">
        <div class="search-input" style="flex:1">${App.icon('search')}<input id="polSearch" placeholder="Search Policy, SPOC, Product and Categories"/></div>
        <button class="btn" onclick="App.policiesView.toggleFilter()">${App.icon('filter')} Filter</button>
        <div id="polFilters" class="row gap-8" style="display:none">
          <select class="select" id="polCat"><option value="">All categories</option>${App.enabledCats().map(c=>`<option>${c.name}</option>`).join('')}</select>
          <select class="select" id="polStatus"><option value="">All status</option><option>Active</option><option>Draft</option></select>
        </div>
      </div>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th style="width:34px"><input type="checkbox" class="pol-check" onclick="App.policiesView.toggleAll(this)"/></th>
        <th>Policy Name</th><th>Policy Owner</th><th>Category</th><th>Sub Category</th><th>Status</th><th>Created On</th><th>Last Modified On</th><th>Version</th><th>Action</th>
      </tr></thead><tbody id="polBody">${rows}</tbody></table></div>
    </div>`;
  },
  mount(root) {
    const filter = () => {
      const q=(root.querySelector('#polSearch').value||'').toLowerCase();
      const catEl=root.querySelector('#polCat'), stEl=root.querySelector('#polStatus');
      const cat=catEl?catEl.value:'', st=stEl?stEl.value:'';
      root.querySelectorAll('#polBody tr').forEach(tr=>{
        const ok = tr.dataset.name.includes(q) && (!cat||tr.dataset.cat===cat) && (!st||tr.dataset.status===st);
        tr.style.display = ok?'':'none';
      });
    };
    root.querySelector('#polSearch').oninput = filter;
    const catEl=root.querySelector('#polCat'); if(catEl) catEl.onchange = filter;
    const stEl=root.querySelector('#polStatus'); if(stEl) stEl.onchange = filter;
  }
});

App.policiesView = {
  toggleFilter() { const f = document.getElementById('polFilters'); if (f) f.style.display = f.style.display === 'none' ? 'flex' : 'none'; },
  toggleAll(cb) { document.querySelectorAll('#polBody .pol-check').forEach(x => { x.checked = cb.checked; }); },
  open(id) {
    const p = App.policy(id); const u = App.currentUser(); const owner = App.emp(p.owner);
    const facts = Object.entries(p.facts).map(([k,v])=>`<div class="minirow"><span class="muted">${App.esc(k)}</span><span class="spacer" style="flex:1"></span><b>${App.esc(v)}</b></div>`).join('');
    // access is category-scoped, plus optional company-wide / per-person document grants
    const grants = ['Category: '+p.category+(App.catEnabled(p.category)?'':' (disabled)')];
    if (p.access && p.access.everyone) grants.push('All staff (company-wide)');
    ((p.access && p.access.users) || []).forEach(uid => { const e = App.emp(uid); grants.push((e?e.name:uid)+' (direct)'); });
    const access = grants.map(a=>`<span class="tag">${App.esc(a)}</span>`).join(' ');
    const canRules = App.canEditPolicy(p, u);
    App.openModal({
      title: p.name, sub: p.category+' · '+p.sub+' · '+p.version, lg:true,
      body: `<div class="row gap-8" style="margin-bottom:14px;flex-wrap:wrap">${App.ui.statusPill(p.status)} ${App.ui.pill('Owner: '+owner.name,'gray')} <span class="muted" style="font-size:12px;align-self:center">Updated ${p.updated}</span></div>
        <div class="grid" style="grid-template-columns:1.3fr 1fr;gap:16px">
          <div id="polPdfPane" class="reg-review__pdf" style="max-height:440px"></div>
          <div>
            <div class="card__body" style="padding:0 0 10px"><b style="font-size:12.5px">Key parameters</b></div>${facts}
            <div class="divider"></div>
            <b style="font-size:12.5px">Who can access this</b><div class="row wrap gap-6 mt-8">${access}</div>
          </div>
        </div>`,
      footer: `<button class="btn" onclick="App.closeModal();App.versions.open('${p.id}')">${App.icon('layers')} Compare Versions</button>
        ${App.sim && App.sim.paramsFor(p.id) ? `<button class="btn" onclick="App.closeModal();App.simView.open('${p.id}')">${App.icon('chart')} Simulate impact</button>` : ''}
        ${canRules?`<button class="btn btn--primary" onclick="App.closeModal();App.navigate('rulesense',{policy:'${p.id}'})">${App.icon('code')} View Rules</button>`:''}`
    });
    if (App.pdf) App.pdf.renderInto('polPdfPane', 'policy', p.id, { fullBtn: true });
  },
  add() {
    App.openModal({
      title:'Add New Policy', sub:'Upload a policy document and publish it to the repository.',
      body:`<div class="field"><label>Policy document <span class="req">*</span></label><div class="pdf-ph" style="min-height:auto;padding:24px;text-align:center;cursor:pointer">${App.icon('download')}<div class="muted" style="margin-top:8px;font-size:12.5px">Click to upload PDF (≤ 25 MB)</div></div></div>
        <div class="grid grid-2"><div class="field"><label>Product Category <span class="req">*</span></label><select class="select" style="width:100%">${App.enabledCats().map(c=>`<option>${c.name}</option>`).join('')}</select></div>
        <div class="field"><label>Sub-category</label><select class="select" style="width:100%"><option>Personal Loan</option><option>MSME</option><option>Home Loan</option></select></div></div>
        <div class="field"><label>Policy Name <span class="req">*</span></label><input class="input" placeholder="e.g. Gold Loan Policy"/></div>
        <div class="field"><label>Description <span class="req">*</span></label><textarea class="textarea" placeholder="Short description…"></textarea></div>`,
      footer:`<button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn--primary" onclick="App.closeModal();App.toast('Policy submitted for approval (demo)')">Publish</button>`
    });
  }
};
