// Account verification UI. Every authorization decision is made by the server.
(() => {
  const offline = document.documentElement.dataset.offlinePreview === "true";
  const memberForm = document.querySelector("[data-membership-form]");
  const reviewList = document.querySelector("[data-membership-reviews]");
  const money = (cents) =>
    cents == null ? "Not provided" : `USD ${(Number(cents) / 100).toFixed(2)}`;
  const text = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };
  async function api(url, data) {
    const response = await fetch(
      url,
      data === undefined
        ? {cache:'no-store'}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.message ?? "Unable to complete membership request.",
      );
    return result;
  }
  if (memberForm instanceof HTMLFormElement) {
    const offers=document.querySelector('.membership-plans');
    const requestPanel=memberForm.closest('#membership-request');
    const submit = memberForm.querySelector("button[type=submit]");
    let version = 0, refreshSequence=0, submitting=false;
    const disable = (disabled) =>
      memberForm
        .querySelectorAll("input, textarea, button")
        .forEach((control) => {
          if (
            control instanceof HTMLInputElement ||
            control instanceof HTMLTextAreaElement ||
            control instanceof HTMLButtonElement
          )
            control.disabled = disabled;
        });
    if (offline) {
      disable(true);
      memberForm.addEventListener("submit", (event) => event.preventDefault());
    } else {
      async function load() {
        const sequence=++refreshSequence;
        const result = await api("/api/membership/me", undefined);
        if(sequence!==refreshSequence)return;
        const m = result.membership;
        version = m.version;
        const hideOffers=Boolean(result.isAdmin||result.fullAccess);
        if(offers instanceof HTMLElement)offers.hidden=hideOffers;
        if(requestPanel instanceof HTMLElement){
          const restoreFocus=hideOffers&&requestPanel.contains(document.activeElement);
          requestPanel.hidden=hideOffers;
          if(restoreFocus){const status=document.querySelector('[data-membership-status]');if(status instanceof HTMLElement){status.tabIndex=-1;status.focus({preventScroll:true});}}
        }
        text(
          "[data-membership-status]",
          result.isAdmin
            ? "ADMINISTRATOR"
            : result.trialDaysLeft > 0
              ? "FREE TRIAL"
              : m.status === "APPROVED" && !result.fullAccess
                ? "REVIEW REQUIRED"
                : m.status,
        );
        text(
          "[data-membership-summary]",
          result.isAdmin
            ? "Administrator access is separate from IB membership."
            : result.trialDaysLeft > 0
              ? `Free trial: ${result.trialDaysLeft} days left. Everything is unlocked. Paid plans are coming soon.`
              : result.fullAccess
              ? "Full member access is approved. This does not enable broker trading or grant administration."
              : m.status === "PENDING"
                ? "Your request is waiting for an administrator to check the broker records. Private education unlocks after approval."
                : "Your account has Free membership. Submit your IB and qualifying deposit details for review to unlock private education.",
        );
        text(
          "[data-membership-reason]",
          m.reviewReason ? `Review: ${m.reviewReason}` : "",
        );
        disable(result.isAdmin || result.fullAccess);
        if (submit instanceof HTMLButtonElement)
          submit.textContent = result.fullAccess
            ? "Already verified"
            : m.status === "PENDING"
              ? "Update verification request"
              : "Submit verification request";
        text(
          "[data-membership-message]",
          result.isAdmin
            ? "Administrators do not submit member verification requests."
            : result.fullAccess
              ? "Your verification is approved. Access is checked on every protected request."
              : "Enter your MT5 account number and deposit amount for admin review. Never enter your broker password.",
        );
      }
      load().catch((error) => {
        disable(true);
        text("[data-membership-message]", error.message);
        text('[data-membership-status]','Status unavailable');
        text('[data-membership-summary]','Your membership status could not be refreshed. Try again shortly.');
      });
      const refresh=()=>{
        if(document.hidden||submitting)return;
        void load().catch(()=>{
          disable(true);
          text('[data-membership-status]','Status unavailable');
          text('[data-membership-summary]','Your membership status could not be refreshed. Try again shortly.');
        });
      };
      document.addEventListener('visibilitychange',refresh);
      window.setInterval(refresh,30000);
      memberForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!(submit instanceof HTMLButtonElement) || submit.disabled) return;
        submitting=true;refreshSequence++;
        submit.disabled = true;
        try {
          const result = await api("/api/membership/request", {
            ...Object.fromEntries(new FormData(memberForm)),
            version,
          });
          await load();
          text("[data-membership-message]", result.message);
        } catch (error) {
          text(
            "[data-membership-message]",
            error instanceof Error
              ? error.message
              : "Unable to submit request.",
          );
          submit.disabled = false;
        }
        finally{submitting=false;}
      });
    }
  }
  if (!(reviewList instanceof HTMLElement)) return;
  const reviewContainer = reviewList;
  const dialog = document.querySelector('[data-membership-dialog]');
  document.querySelector('[data-close-membership]')?.addEventListener('click', () => { if (dialog instanceof window.HTMLDialogElement) dialog.close(); });
  const refresh = document.querySelector("[data-refresh-memberships]");
  const more = document.querySelector("[data-more-memberships]");
  let cursor = null;
  function element(tag, content = "", className = "") {
    const node = document.createElement(tag);
    node.textContent = content;
    node.className = className;
    return node;
  }
  function field(label, name, value = "", type = "text") {
    const wrapper = element("label", label, "field");
    const input = document.createElement("input");
    input.name = name;
    input.value = value;
    input.type = type;
    wrapper.append(input);
    return { wrapper, input };
  }
  function renderReview(m) {
    const card = element("section", "", "card membership-review");
    card.dataset.memberEmail = m.user.email;
    card.append(element("h2", `${m.user.name} — ${m.status}`));
    const details = element("div", "", "review-details");
    for (const line of [
      m.user.email,
      `Client broker: ${m.user.brokerName ?? m.brokerName ?? 'Not provided'} / MT5: ${m.user.mt5Account ?? (m.accountSuffix ? `ending ${m.accountSuffix}` : 'Not provided')}`,
      `MT5 server: ${m.user.mt5Server ?? 'Not provided'} / IB: ${m.ibCode ?? 'Requires independent admin verification'}`,
      `Member-reported qualifying deposit: ${money(m.claimedDepositCents)}`,
      `Unverified reference: ${m.depositReference ?? 'No member request — administrator can verify directly'}`,
      ...(m.verifiedDepositCents !== null
        ? [`Admin-recorded deposit: ${money(m.verifiedDepositCents)}`]
        : []),
      ...(m.reviewReason ? [`Last review: ${m.reviewReason}`] : []),
    ])
      details.append(element("p", line));
    card.append(details);
    const form = document.createElement("form");
    form.className = "form-stack";
    const actionLabel = element("label", "Review action", "field");
    const select = document.createElement("select");
    select.name = "action";
    for (const action of m.status === "APPROVED"
      ? ["revoke"]
      : m.status === 'PENDING' ? ["approve", "reject"] : ['approve']) {
      const option = element(
        "option",
        action[0].toUpperCase() + action.slice(1),
      );
      option.value = action;
      select.append(option);
    }
    actionLabel.append(select);
    form.append(actionLabel);
    const verification = element("div", "", "form-stack");
    const broker = field("Verified broker", "verifiedBroker", "JUSTMARKET");
    const ib = field("Verified IB code", "verifiedIbCode", "jai4w0w6");
    const account = field('Verified MT5 account (last four digits)', 'verifiedAccountSuffix', m.user.mt5Account?.slice(-4) ?? m.accountSuffix ?? '');
    account.input.pattern = '[0-9]{4}'; account.input.maxLength = 4; account.input.inputMode = 'numeric';
    const amount = field(
      "Verified qualifying deposit (USD)",
      "verifiedDepositAmount",
      "",
      "number",
    );
    amount.input.min = "100";
    amount.input.max = "1000000";
    amount.input.step = "0.01";
    const confirmation = element("label", "", "review-confirmation");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.name = "confirmed";
    confirmation.append(
      check,
      document.createTextNode(
        "I independently checked broker records and verified this account is under IB jai4w0w6 with a qualifying deposit of at least USD 100.",
      ),
    );
    verification.append(
      broker.wrapper,
      ib.wrapper,
      amount.wrapper,
      account.wrapper,
      confirmation,
    );
    form.append(verification);
    const reasonLabel = element(
      "label",
      "Review reason (visible to the member)",
      "field",
    );
    const reason = document.createElement("textarea");
    reason.name = "reason";
    reason.minLength = 10;
    reason.maxLength = 500;
    reason.required = true;
    reasonLabel.append(reason);
    form.append(reasonLabel);
    const revokeLabel = element('label', 'Revoke reason', 'field');
    const revokeReason = document.createElement('select'); revokeReason.name = 'reasonCode'; revokeReason.setAttribute('aria-label', 'Revoke reason');
    for (const [code,label] of [['OTHER','Other / manual review'],['MC','MC / account blown'],['IB_CHANGED','Changed IB']]) { const option = element('option',label); option.value = code; revokeReason.append(option); }
    revokeLabel.append(revokeReason); form.append(revokeLabel);
    revokeReason.addEventListener('change', () => {
      if (revokeReason.value === 'MC') reason.value = 'MC / account blown — access revoked after administrator review.';
      else if (revokeReason.value === 'IB_CHANGED') reason.value = 'Changed IB — client is no longer under YENGFX IB code.';
    });
    const button = element("button", "Save review", "button button-gold");
    button.type = "submit";
    form.append(button);
    const status = element("p", "", "form-status");
    status.setAttribute("role", "status");
    status.hidden = true;
    form.append(status);
    const update = () => {
      const approve = select.value === "approve";
      reasonLabel.hidden = approve;
      reason.required = !approve;
      reason.disabled = approve;
      button.textContent = approve ? 'Approve membership' : select.value === 'revoke' ? 'Revoke access' : 'Reject request';
      verification.hidden = !approve;
      revokeLabel.hidden = select.value !== 'revoke'; revokeReason.disabled = select.value !== 'revoke';
      for (const input of [broker.input, ib.input, amount.input, account.input, check]) {
        input.required = approve;
        input.disabled = !approve;
      }
    };
    select.addEventListener("change", update);
    update();
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      button.disabled = true;
      const data = {
        action: select.value,
        version: m.version,
        ...(select.value !== 'approve' ? { reason: reason.value } : {}),
        profileVersion: m.user.profileVersion,
        ...(select.value === 'revoke' ? { reasonCode: revokeReason.value } : {}),
        ...(select.value === "approve"
          ? {
              verifiedBroker: broker.input.value,
              verifiedIbCode: ib.input.value,
              verifiedDepositAmount: amount.input.value,
              confirmed: check.checked,
              verifiedAccountSuffix: account.input.value,
            }
          : {}),
      };
      try {
        const result = await api(
          `/api/admin/memberships/${encodeURIComponent(m.id)}/review`,
          data,
        );
        text("[data-admin-membership-message]", result.message);
        if (dialog instanceof window.HTMLDialogElement) dialog.close();
        await loadReviews(false);
        document.dispatchEvent(new window.Event('memberships:updated'));
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : "Review failed.";
        status.hidden = false;
        button.disabled = false;
      }
    });
    card.append(form);
    return card;
  }
  async function loadReviews(append) {
    const result = await api(
      "/api/admin/memberships" +
        (append && cursor ? `?after=${encodeURIComponent(cursor)}` : ""),
      undefined,
    );
    if (!append) reviewContainer.replaceChildren();
    for (const m of result.memberships) reviewContainer.append(renderReview(m));
    if (!result.memberships.length && !append)
      reviewContainer.append(
        element("p", "No registered members available for review."),
      );
    cursor = result.next;
    if (more instanceof HTMLButtonElement) more.hidden = !cursor;
  }
  if (offline) {
    if (refresh instanceof HTMLButtonElement) refresh.disabled = true;
    reviewList.append(
      element("p", "No real members are included in this offline preview."),
    );
  } else {
    const load = (append) =>
      loadReviews(append).catch((error) =>
        text("[data-admin-membership-message]", error.message),
      );
    refresh?.addEventListener("click", () => load(false));
    document.addEventListener('membership:open', async (event) => {
      const { email, action } = /** @type {CustomEvent} */ (event).detail;
      try {
        await loadReviews(false);
        const find = () => [...reviewContainer.querySelectorAll('.membership-review')].find(card => /** @type {HTMLElement} */ (card).dataset.memberEmail === email);
        let card = find();
        if (!card) { await loadReviews(false); card = find(); }
        while (!card && cursor) { await loadReviews(true); card = find(); }
        if (!(card instanceof HTMLElement)) throw new Error('Client review unavailable. Refresh the directory.');
        const select = /** @type {HTMLSelectElement} */ (card.querySelector('select[name="action"]'));
        if (![...select.options].some(option => option.value === action)) throw new Error('Membership status changed. Refresh the directory.');
        select.value = action; select.dispatchEvent(new window.Event('change'));
        reviewContainer.querySelectorAll('.membership-review').forEach(node => { if (node instanceof HTMLElement) node.hidden = node !== card; });
        if (dialog instanceof window.HTMLDialogElement && !dialog.open) dialog.showModal();
        card.scrollIntoView({ block: 'center', behavior: 'instant' });
        select.focus({ preventScroll: true });
      } catch (error) { text('[data-admin-membership-message]', error instanceof Error ? error.message : 'Unable to open review.'); }
    });
    more?.addEventListener("click", () => load(true));
    text(
      "[data-admin-membership-message]",
      "Select a client to review membership.",
    );
    load(false);
  }
})();
