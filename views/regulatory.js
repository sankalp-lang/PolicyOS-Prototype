/* Regulatory — incoming regulator circulars → gap check → suggested edit → impact → Approvals.
   Tracked under Compliance › Regulatory Updates. */
App.registerView('regulatory', {
  title: 'Regulatory',
  render(ctx) {
    const rows = DB.circulars.map(c => {
      const p = App.policy(c.affects);
      const status = c.status === 'Actioned' ? App.ui.pill('Actioned', 'green', true)
        : c.suggestion ? App.ui.pill('Gap found', 'amber', true)
        : App.ui.pill('No gap', 'green', true);
      return `<tr class="clickable" data-n="${App.esc((c.title + ' ' + c.ref + ' ' + c.regulator).toLowerCase())}" onclick="App.regulatoryView.open('${c.id}')">
        <td><div class="cell-person">${App.icon('alert')}<div><div class="cell-strong">${App.esc(c.title)}</div><div class="muted" style="font-size:12px">${App.esc(c.regulator)} · ${App.esc(c.ref)}</div></div></div></td>
        <td class="muted">${c.date}</td>
        <td>${p ? App.ui.pill(p.name, 'violet') : App.ui.pill('—', 'gray')}</td>
        <td>${status}</td>
        <td><button class="btn btn--sm" onclick="event.stopPropagation();App.regulatoryView.open('${c.id}')">${App.icon('eye')} Review</button></td>
      </tr>`;
    }).join('');
    const gaps = DB.circulars.filter(c => c.suggestion && c.status !== 'Actioned').length;
    return `<div class="page">
      <div class="page__head"><div><h1>Regulatory</h1><p>Incoming regulator circulars, auto-compared against your policy library. Tara flags the gap, drafts the edit, and models the impact — before anything goes for approval.</p></div></div>
      <div class="info-banner">${App.icon('shield')} <span>Tracked under <strong>Compliance › Regulatory Updates</strong>. <strong>${gaps}</strong> of ${DB.circulars.length} circulars need a policy change. Suggestions are <strong>flagged for human review</strong> — never auto-applied.</span></div>
      <div class="toolbar"><div class="search-input">${App.icon('search')}<input id="regSearch" placeholder="Search circulars…"/></div></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Circular</th><th>Published</th><th>Affects</th><th>Status</th><th></th></tr></thead><tbody id="regBody">${rows}</tbody></table></div>
    </div>`;
  },
  mount(root) {
    const s = root.querySelector('#regSearch');
    if (s) s.oninput = () => { const q = (s.value || '').toLowerCase(); root.querySelectorAll('#regBody tr').forEach(tr => { tr.style.display = tr.dataset.n.includes(q) ? '' : 'none'; }); };
  }
});

App.regulatoryView = {
  open(id) {
    const c = DB.circulars.find(x => x.id === id); if (!c) return;
    const p = App.policy(c.affects);
    const canSim = App.sim && App.sim.paramsFor(c.affects) && c.simOverride;
    const done = c.status === 'Actioned';

    const gap = c.suggestion
      ? `<div class="answer-card"><div class="answer-card__h">${App.icon('edit')} Gap detected · ${App.esc(c.field)}</div><div class="answer-card__b">
          <div class="grid grid-2" style="gap:14px">
            <div><div class="login__label" style="margin-bottom:6px">Your policy today</div><div class="card card--pad" style="background:var(--surface-2)"><span class="diff-del">${App.esc(c.current)}</span></div></div>
            <div><div class="login__label" style="margin-bottom:6px">Regulator mandates</div><div class="card card--pad" style="background:var(--surface-2)"><span class="diff-add">${App.esc(c.mandated)}</span></div></div>
          </div></div></div>
          <div class="info-banner" style="margin-top:14px;margin-bottom:0">${App.icon('sparkles')} <span><strong>Suggested change (review required):</strong> ${App.esc(c.suggestion)}</span></div>`
      : `<div class="info-banner" style="margin-bottom:0;background:var(--green-50);border-color:#bcd3c2;color:var(--green-700)">${App.icon('check')} <span>No gap — your ${p ? App.esc(p.name) : 'policy'} already satisfies this circular.</span></div>`;

    let footer = `<button class="btn" onclick="App.closeModal()">Close</button>`;
    if (c.suggestion && !done) {
      if (canSim) {
        const ovLit = '{' + Object.keys(c.simOverride).map(k => k + ':' + c.simOverride[k]).join(',') + '}';
        footer += `<button class="btn" onclick="App.closeModal();App.simView.open('${c.affects}',${ovLit},'From circular ${App.esc(c.ref)}')">${App.icon('chart')} Simulate impact</button>`;
      }
      footer += `<button class="btn btn--primary" onclick="App.regulatoryView.createChange('${c.id}')">${App.icon('send')} Create change request</button>`;
    } else if (done) {
      footer += `<span class="pill pill--green" style="align-self:center">${App.icon('check')} Change request raised</span>`;
    }

    App.openModal({
      title: c.title, sub: c.regulator + ' · ' + c.ref + ' · ' + c.date, lg: true,
      body: `<div class="row gap-8" style="margin-bottom:12px;flex-wrap:wrap">${App.ui.pill(c.regulator, 'blue')} ${p ? App.ui.pill('Affects: ' + p.name, 'violet') : ''} ${App.ui.pill('Compliance › Regulatory Updates', 'gray')}</div>
        <p style="font-size:13.5px;color:var(--ink-2);line-height:1.6">${App.esc(c.summary)}</p>
        <div class="mt-16">${gap}</div>`,
      footer
    });
  },
  createChange(id) {
    const c = DB.circulars.find(x => x.id === id); if (!c) return;
    const p = App.policy(c.affects);
    let impact = null;
    let rationale = 'Aligns ' + (p ? p.name : 'policy') + ' with ' + c.regulator + ' ' + c.ref + ' (' + c.date + ').';
    if (App.sim && c.simOverride && App.sim.paramsFor(c.affects)) {
      const r = App.sim.run(c.affects, c.simOverride);
      if (r.applicable) {
        const dA = ((r.proposed.rate - r.base.rate) * 100).toFixed(1), dN = ((r.proposed.npa - r.base.npa) * 100).toFixed(1);
        impact = { approvalDelta: dA, npaDelta: dN, flipped: (r.flipped.length || r.gained.length) };
        rationale += ' Simulated impact: approval ' + (dA >= 0 ? '+' : '') + dA + ' pts, NPA ' + (dN >= 0 ? '+' : '') + dN + ' pts.';
      }
    }
    const me = (App.state.user && App.state.user.id) || 'THQ0144';
    const req = { id: 'REQ-' + (2000 + DB.approvals.length), name: (p ? p.name : 'Policy') + ' — ' + c.field + ' → ' + c.mandated,
      type: 'Regulatory Change', policy: c.affects, requestedBy: me, on: '21 Jun 2026', priority: 'High', status: 'Pending L1',
      change: { field: c.field, from: c.current, to: c.mandated }, rationale,
      complianceFlag: 'Matches ' + c.regulator + ' circular ' + c.ref + ' (' + c.date + ').', impact };
    DB.approvals.unshift(req);
    c.status = 'Actioned';
    App.closeModal(); App.toast('Change request created from ' + c.ref + ' → Approvals'); App.navigate('approvals');
  }
};
