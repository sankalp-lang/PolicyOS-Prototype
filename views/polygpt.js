/* PolyGPT - dedicated, permission-faithful policy Q&A chat.
   Scoped to one or more policies you explicitly attach. Only policies your role
   can view are selectable; answers come from App.askTara so RBAC is enforced at retrieval. */
App.registerView('polygpt', {
  title: 'PolyGPT',
  render(ctx) {
    if (!App.canAccessView('polygpt', ctx.user)) return App.lockedPage('PolyGPT', 'PolyGPT is for administrators and policy managers. Staff can ask from the Home Ask bar.');
    if (!App.state.polygpt) App.state.polygpt = [];
    if (!App.state.polygptSel) App.state.polygptSel = [];
    const u = ctx.user;
    const vis = App.visiblePolicies(u);

    // keep any stale selections honest (a persona switch can shrink visibility)
    App.state.polygptSel = App.state.polygptSel.filter(id => vis.some(p => p.id === id));

    // permission-faithful example prompts (2x2 grid, as in production NewGPT)
    const prompts = App.suggestPrompts(u).slice(0, 4).map(s => ({ q: s.q, ic: s.ic }));

    const empty = `<div style="max-width:600px;margin:6vh auto 0;text-align:center">
        <div style="width:54px;height:54px;border-radius:14px;margin:0 auto 18px;background:var(--ink);display:grid;place-items:center;color:var(--brand-400)">${App.icon('chat')}</div>
        <h1 style="font-size:24px">Chat with your policies</h1>
        <p class="muted" style="margin-top:8px;font-size:14px">PolyGPT answers questions grounded in the policy documents you attach. Pick a policy, or ask in plain English - Tara only ever reads from policies your role can open.</p>
        <div class="login__label" style="margin-top:24px;text-align:left">Example prompts</div>
        <div class="grid grid-2" style="margin-top:8px;text-align:left;gap:10px">
          ${prompts.map(s=>`<button class="chat-suggest__btn" onclick="App.polygptView.ask('${s.q.replace(/'/g,"\\'")}')">${App.icon(s.ic)}<span style="flex:1">${App.esc(s.q)}</span><span class="tag">Try</span></button>`).join('')}
        </div>
      </div>`;

    return `<div class="page" style="max-width:1060px;display:flex;flex-direction:column;height:calc(100vh - 150px)">
      <div style="flex:1;display:flex;gap:16px;min-height:0">

        <!-- threads rail: collapsed icons, expands on hover to show conversation titles (as in production) -->
        <div class="pg-rail" id="pgRail" onmouseenter="this.classList.add('is-open')" onmouseleave="this.classList.remove('is-open')">
          <button class="pg-rail__new" title="New chat" onclick="App.polygptView.newChat()">${App.icon('plus')}<span class="pg-rail__lbl">New chat</span></button>
          <div class="login__label pg-rail__head"><span class="pg-rail__lbl">Conversations</span></div>
          <div class="pg-rail__list" id="pgThreads"></div>
          <div style="flex:1"></div>
          <button class="pg-rail__item" title="Browse policies" onclick="App.navigate('policies')">${App.icon('file')}<span class="pg-rail__lbl">Browse policies</span></button>
        </div>

        <!-- chat column -->
        <div style="flex:1;display:flex;flex-direction:column;min-width:0">
          <div class="row gap-8" style="margin-bottom:10px;flex-wrap:wrap">
            <span class="src-chip policy">${App.icon('shield')} PolyGPT</span>
            <span class="muted" style="font-size:12px">${vis.length} polic${vis.length===1?'y':'ies'} available to you</span>
            <span class="spacer" style="flex:1"></span>
            <span class="muted" style="font-size:12px">${App.icon('lock','')} Permission-aware · on-prem · ${App.esc(DB.company.llm.split('(')[0])}</span>
          </div>

          <div id="polygptThread" style="flex:1;overflow-y:auto;padding:8px 2px 14px">${App.state.polygpt.length?'':empty}</div>

          <div id="polygptChips" style="margin-bottom:8px"></div>

          <div class="chat-foot" style="border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:12px 14px">
            <div class="row gap-8" style="margin-bottom:8px">
              <button class="btn btn--sm" onclick="App.polygptView.selectPolicy()">${App.icon('file')} Select Policy</button>
              <span class="spacer" style="flex:1"></span>
              <span class="muted" style="font-size:11.5px">Attach policies to ground every answer.</span>
            </div>
            <div class="chat-inputwrap" style="border:none;padding:0;align-items:center">
              <textarea id="polygptInput" rows="1" placeholder="Ask anything about your policies…" oninput="var e=document.getElementById('pgErr');if(e)e.style.display='none';" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();App.polygptView.ask();}"></textarea>
              <button class="chat-send" onclick="App.polygptView.ask()">${App.icon('send')}</button>
            </div>
            <div id="pgErr" style="display:none;color:#b3402e;font-size:12px;margin-top:6px"></div>
          </div>
        </div>
      </div>
    </div>`;
  },
  mount() { App.polygptView.mount(); }
});

App.polygptView = {
  /* ---------------- lifecycle (mirrors copilot.js) ---------------- */
  mount() {
    App.polygptView.render();
    App.polygptView.renderChips();
    App.polygptView.renderThreads();
    const i = document.getElementById('polygptInput');
    if (i) i.focus();
  },
  // render() repaints the live thread (alias kept to mirror App.copilot.render)
  render() { App.polygptView.renderThread(); },

  /* ---------------- conversations (threads rail; session-scoped in the demo) ----------------
     The active thread's message array IS the stored one (by reference), so new
     messages land in the saved conversation without extra bookkeeping. */
  _threads() { if (!App.state.polygptThreads) App.state.polygptThreads = []; return App.state.polygptThreads; },
  _ensureThread(firstText) {
    if (App.state.polygptCur) return;
    const id = 'T' + (this._threads().length + 1) + '-' + firstText.length;
    this._threads().unshift({ id, title: firstText.slice(0, 52) + (firstText.length > 52 ? '…' : ''), msgs: App.state.polygpt, sel: (App.state.polygptSel || []).slice() });
    App.state.polygptCur = id;
    this.renderThreads();
  },
  openThread(id) {
    const t = this._threads().find(x => x.id === id); if (!t) return;
    App.state.polygpt = t.msgs;
    App.state.polygptSel = (t.sel || []).slice();
    App.state.polygptCur = id;
    App.reload();
  },
  renderThreads() {
    const host = document.getElementById('pgThreads'); if (!host) return;
    const cur = App.state.polygptCur;
    const ts = this._threads();
    host.innerHTML = ts.length
      ? ts.map(t => `<button class="pg-rail__item pg-thread${t.id === cur ? ' is-cur' : ''}" title="${App.esc(t.title)}" onclick="App.polygptView.openThread('${t.id}')">${App.icon('chat')}<span class="pg-rail__lbl">${App.esc(t.title)}</span></button>`).join('')
      : `<div class="pg-rail__empty"><span class="pg-rail__lbl muted" style="font-size:11.5px">No conversations yet</span></div>`;
  },

  /* ---------------- selected-policy chips above the input ---------------- */
  renderChips() {
    const host = document.getElementById('polygptChips'); if (!host) return;
    const sel = App.state.polygptSel || [];
    if (!sel.length) { host.innerHTML = ''; return; }
    host.innerHTML = `<div class="row wrap gap-6">
      ${sel.map(id => { const p = App.policy(id); if(!p) return '';
        return `<span class="src-chip policy">${App.icon('shield')} ${App.esc(p.name)} · ${App.esc(p.version)}
          <button onclick="App.polygptView.removePolicy('${id}')" title="Detach" style="border:none;background:transparent;color:inherit;display:inline-flex;align-items:center;padding:0;margin-left:2px;cursor:pointer">${App.icon('x')}</button></span>`;
      }).join('')}
      <button class="btn btn--ghost btn--sm" onclick="App.polygptView.clearPolicies()">Clear all</button>
    </div>`;
  },
  removePolicy(id) {
    App.state.polygptSel = (App.state.polygptSel || []).filter(x => x !== id);
    App.polygptView.renderChips();
  },
  clearPolicies() {
    App.state.polygptSel = [];
    App.polygptView.renderChips();
  },

  /* ---------------- Select Policy modal (grouped by category) ---------------- */
  selectPolicy() {
    const u = App.currentUser();
    const vis = App.visiblePolicies(u);
    // working draft so checkbox toggles survive without re-rendering the whole modal
    App.state.polygptDraft = (App.state.polygptSel || []).slice();

    if (!vis.length) {
      App.openModal({
        title:'Select policies', sub:'Attach policy documents to ground PolyGPT answers.',
        body: App.ui.empty('lock','No policies in scope',"Your role can't access any policy documents yet. Ask an administrator to grant access."),
        footer:`<button class="btn" onclick="App.closeModal()">Close</button>`
      });
      return;
    }

    const cats = DB.categories.map(c => c.name).filter(name => vis.some(p => p.category === name));
    const groups = cats.map(cat => {
      const rows = vis.filter(p => p.category === cat).map(p => {
        const on = App.state.polygptDraft.includes(p.id);
        return `<div class="togglerow" id="pgrow_${p.id}">
          <label style="display:flex;align-items:center;gap:11px;flex:1;cursor:pointer">
            <input type="checkbox" ${on?'checked':''} onchange="App.polygptView._toggleDraft('${p.id}',this.checked)" style="width:16px;height:16px;accent-color:var(--brand-600);cursor:pointer"/>
            <div class="togglerow__txt"><b>${App.esc(p.name)}${p.sensitive?' '+App.ui.pill('Confidential','red'):''}</b><span>${App.esc(p.sub)} · owner ${App.esc((App.emp(p.owner)||{}).name||'-')}</span></div>
          </label>
          <div class="spacer"></div>
          <select class="select" onchange="App.toast('Version pinned: '+this.value+' (demo)')" title="Version">
            <option ${'selected'}>${App.esc(p.version)}</option>
            <option>previous</option>
          </select>
        </div>`;
      }).join('');
      return `<div style="margin-bottom:14px"><div class="login__label">${App.esc(cat)}</div>${rows}</div>`;
    }).join('');

    App.openModal({
      title:'Select policies', sub:'Attach one or more policy documents. Only policies your role can open are shown.', lg:true,
      body:`<div class="info-banner">${App.icon('shield')} <span>Showing <strong>${vis.length}</strong> of ${DB.policies.length} policies - the rest are outside your access scope and can't be attached.</span></div>${groups}`,
      footer:`<button class="btn" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn--primary" id="pgConfirm" onclick="App.polygptView._confirmSelection()">${App.icon('check')} Confirm Selection (${App.state.polygptDraft.length})</button>`
    });
  },
  _toggleDraft(id, on) {
    const d = App.state.polygptDraft || (App.state.polygptDraft = []);
    const i = d.indexOf(id);
    if (on && i < 0) d.push(id);
    else if (!on && i >= 0) d.splice(i, 1);
    const btn = document.getElementById('pgConfirm');
    if (btn) btn.innerHTML = `${App.icon('check')} Confirm Selection (${d.length})`;
  },
  _confirmSelection() {
    App.state.polygptSel = (App.state.polygptDraft || []).slice();
    App.closeModal();
    App.polygptView.renderChips();
    const n = App.state.polygptSel.length;
    App.toast(n ? `${n} polic${n===1?'y':'ies'} attached` : 'No policies attached');
  },

  /* ---------------- rail actions ---------------- */
  newChat() {
    App.state.polygpt = [];          // fresh array; the old one stays referenced by its thread
    App.state.polygptSel = [];
    App.state.polygptCur = null;
    App.reload();
    App.toast('Started a new PolyGPT chat');
  },
  history() {
    const items = (App.state.polygpt || []).filter(m => m.role === 'user');
    const body = items.length
      ? items.map(m => `<div class="minirow">${App.icon('chat')}<span style="flex:1">${App.esc(m.text)}</span></div>`).join('')
      : App.ui.empty('clock','No history yet','Your PolyGPT questions from this session will appear here.');
    App.openModal({
      title:'Chat history', sub:'Questions asked in this PolyGPT session (demo).',
      body, footer:`<button class="btn" onclick="App.closeModal()">Close</button>`
    });
  },

  /* ---------------- thread render (reuses copilot AI-bubble markup) ---------------- */
  renderThread() {
    const t = document.getElementById('polygptThread'); if (!t) return;
    if (!App.state.polygpt.length) return;
    t.innerHTML = App.state.polygpt.map((m, idx) => {
      if (m.role === 'user') {
        const att = m.attached && m.attached.length
          ? `<div class="row wrap gap-6" style="justify-content:flex-end;margin-top:6px">${m.attached.map(id=>{const p=App.policy(id);return p?`<span class="tag">${App.esc(p.name)}</span>`:'';}).join('')}</div>`
          : '';
        return `<div class="msg msg--user" style="margin-bottom:16px;flex-direction:column;align-items:flex-end"><div class="msg__bubble" style="max-width:70%">${App.esc(m.text)}</div>${att}</div>`;
      }
      if (m.typing) return `<div class="msg msg--ai" style="margin-bottom:16px"><div class="msg__av">${App.icon('sparkles')}</div><div class="msg__bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>`;

      const src = m.sources && m.sources.length
        ? `<div class="src-row">${m.sources.map(s=>{const ic={hrms:'users',jira:'branch',policy:'shield',locked:'lock',notion:'book',slack:'chat'}[s.kind]||'database';return `<span class="src-chip ${s.kind}">${App.icon(ic)} ${App.esc(s.label)}</span>`;}).join('')}</div>`
        : '';
      // attached policies as files with clickable page citations (open the PDF at the cited page)
      const files = m.attached && m.attached.length
        ? m.attached.map(id => { const p = App.policy(id); if (!p) return '';
            const cite = App.pdf ? App.pdf.cite('policy', p.id, Object.keys(p.facts || {})[0] || 1, null) : '';
            return `<span class="pg-file">${App.icon('file')} ${App.esc(p.name)} ${cite}</span>`;
          }).join('')
        : `<span style="font-size:11.5px;color:var(--ink-2)">None - answered across all policies you can access</span>`;
      const attachedLine = `<div class="row gap-8" style="margin-top:11px;padding-top:10px;border-top:1px dashed var(--line);flex-wrap:wrap">
          <span class="muted" style="font-size:11.5px;font-weight:600">${App.icon('shield','')} Policies attached:</span>
          ${files}
          <span class="spacer" style="flex:1"></span>
          <button class="btn btn--ghost btn--sm${m.rating === 'up' ? ' chg-ok is-on' : ''}" title="Helpful" onclick="App.polygptView.rate(${idx},'up')">${App.icon('up')}</button>
          <button class="btn btn--ghost btn--sm${m.rating === 'down' ? ' chg-no is-on' : ''}" title="Not helpful" onclick="App.polygptView.rate(${idx},'down')">${App.icon('down')}</button>
        </div>`;
      // dislike opens a reason picker (3 preset reasons + custom, as in production FeedbackBox)
      const fb = m.fbOpen
        ? `<div class="pg-fb"><span class="muted" style="font-size:12px">What went wrong?</span>
            ${App.polygptView.FB_REASONS.map((r, ri) => `<button class="btn btn--sm" onclick="App.polygptView.fbReason(${idx},${ri})">${App.esc(r)}</button>`).join('')}
            <button class="btn btn--sm" onclick="App.polygptView.fbCustom(${idx})">${App.icon('edit')} Custom reply</button>
          </div>`
        : (m.feedbackReason ? `<div class="pg-fb is-done"><span class="muted" style="font-size:12px">${App.icon('check','')} Feedback: ${App.esc(m.feedbackReason)}</span></div>` : '');
      return `<div class="msg msg--ai" style="margin-bottom:16px"><div class="msg__av">${App.icon('sparkles')}</div><div class="msg__bubble" style="max-width:82%">${m.html}${src}${attachedLine}${fb}</div></div>`;
    }).join('');
    t.scrollTop = t.scrollHeight;
  },

  /* ---------------- feedback (like = immediate accept; dislike = reason picker) ---------------- */
  FB_REASONS: ["Don't like the style", 'Not factually correct', "Didn't fully follow instructions"],
  rate(idx, dir) {
    const m = App.state.polygpt[idx]; if (!m) return;
    if (dir === 'up') {
      m.rating = 'up'; m.fbOpen = false; m.feedbackReason = '';
      App.toast('Feedback submitted - marked helpful');
    } else {
      m.rating = 'down'; m.fbOpen = true;   // ask why before recording the reason
    }
    App.polygptView.renderThread();
  },
  fbReason(idx, ri) {
    const m = App.state.polygpt[idx]; if (!m) return;
    m.feedbackReason = App.polygptView.FB_REASONS[ri] || ''; m.fbOpen = false;
    App.toast('Feedback submitted - thank you');
    App.polygptView.renderThread();
  },
  fbCustom(idx) {
    App.openModal({
      title: 'Tell us more', sub: 'What should this answer have done differently?',
      body: `<div class="field" style="margin-bottom:0"><label>Your feedback</label><textarea class="textarea" id="pgFbText" rows="3" placeholder="e.g. it missed the latest circular…"></textarea></div>`,
      footer: `<button class="btn" onclick="App.closeModal()">Cancel</button><button class="btn btn--primary" onclick="App.polygptView.fbCustomGo(${idx})">${App.icon('send')} Submit feedback</button>`
    });
  },
  fbCustomGo(idx) {
    const m = App.state.polygpt[idx];
    const txt = ((document.getElementById('pgFbText') || {}).value || '').trim();
    if (m) { m.feedbackReason = txt || 'Custom feedback'; m.fbOpen = false; }
    App.closeModal();
    App.toast('Feedback submitted - thank you');
    App.polygptView.renderThread();
  },

  /* ---------------- ask ---------------- */
  ask(text) {
    const inp = document.getElementById('polygptInput');
    text = (text || (inp && inp.value) || '').trim();
    if (!text) {  // visible validation instead of a silent return
      const er = document.getElementById('pgErr');
      if (er) { er.textContent = 'Enter a question to continue.'; er.style.display = 'block'; }
      if (inp) inp.focus();
      return;
    }
    if (inp) inp.value = '';
    const er = document.getElementById('pgErr'); if (er) er.style.display = 'none';

    const attached = (App.state.polygptSel || []).slice();
    App.polygptView._ensureThread(text);   // first message of a fresh chat starts a conversation (threads rail)

    // If exactly one policy is attached and the question is bare, nudge Tara
    // toward that policy by naming it - keeps retrieval permission-faithful.
    let query = text;
    if (attached.length === 1) {
      const p = App.policy(attached[0]);
      if (p && !text.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])) {
        query = text + ' (' + p.name + ')';
      }
    }

    App.state.polygpt.push({ role:'user', text, attached });
    const ph = { role:'ai', typing:true, attached };
    App.state.polygpt.push(ph);
    App.polygptView.renderThread();

    App.tara.answer(query, App.state.user).then(r => {
      ph.typing = false; ph.html = r.html; ph.sources = r.sources;
      App.polygptView.renderThread();
    }).catch(e => {
      ph.typing = false; ph.html = '<p>'+App.esc(String(e&&e.message||e))+'</p>'; ph.sources = [];
      App.polygptView.renderThread();
    });
  }
};
