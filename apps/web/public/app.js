// Plain browser JavaScript. No React, Next.js or build step.
document.querySelectorAll('[data-tradingview-chart]').forEach((container) => {
  if (!(container instanceof HTMLElement)) return;
  const button = container.parentElement?.querySelector('[data-load-chart]');
  const load = () => {
    if (container.dataset.loaded) return;
    container.dataset.loaded = 'true';
    container.removeAttribute('data-chart-error');
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true, symbol: 'OANDA:XAUUSD', interval: '60',
      timezone: 'Asia/Kuala_Lumpur', theme: 'dark', style: '1', locale: 'en',
      allow_symbol_change: false, hide_side_toolbar: false, hide_volume: true,
      backgroundColor: '#13151b', calendar: false, support_host: 'https://www.tradingview.com',
    });
    script.onerror = () => {
      container.dataset.loaded = '';
      script.remove();
      container.setAttribute('data-chart-error', '');
      if (button) { button.removeAttribute('hidden'); button.textContent = 'Retry TradingView chart'; }
    };
    container.append(script);
    button?.setAttribute('hidden', '');
  };
  button?.addEventListener('click', load);
  load();
});
const offlinePreview =
  document.documentElement.dataset.offlinePreview === "true";
if (offlinePreview) {
  document
    .querySelectorAll(
      'input[value="{{DISPLAY_NAME}}"], input[value="{{EMAIL}}"]',
    )
    .forEach((input) => {
      if (input instanceof HTMLInputElement)
        input.value =
          input.getAttribute("value") === "{{EMAIL}}"
            ? "preview@example.test"
            : "Demo preview";
    });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue?.includes("{{PLAN}}"))
      node.nodeValue = node.nodeValue.replaceAll("{{PLAN}}", "Foundation demo");
  }
}
const menuButton = document.querySelector("[data-menu-toggle]");
const compactMenu = document.getElementById("compact-navigation");
function closeMenu() {
  if (!(menuButton instanceof HTMLButtonElement) || !compactMenu) return;
  compactMenu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}
menuButton?.addEventListener("click", () => {
  if (!compactMenu) return;
  compactMenu.hidden = !compactMenu.hidden;
  menuButton.setAttribute("aria-expanded", String(!compactMenu.hidden));
  menuButton.setAttribute(
    "aria-label",
    compactMenu.hidden ? "Open navigation" : "Close navigation",
  );
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
    if (menuButton instanceof HTMLElement) menuButton.focus();
  }
});

document.querySelectorAll("[data-logout]").forEach((button) =>
  button.addEventListener("click", async () => {
    if (!(button instanceof HTMLButtonElement)) return;
    if (offlinePreview) {
      window.location.assign(
        document.querySelector("[data-preview-home]")?.getAttribute("href") ??
          "#",
      );
      return;
    }
    button.disabled = true;
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Sign out failed. Please retry.");
      window.location.assign("/auth/login");
    } catch {
      const message = button.parentElement?.querySelector(
        "[data-logout-error]",
      );
      if (message instanceof HTMLElement) {
        message.textContent = "Sign out failed. Please retry.";
        message.hidden = false;
      }
      button.disabled = false;
    }
  }),
);

document.querySelectorAll("[data-signal-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    if (!(button instanceof HTMLButtonElement)) return;
    const filter = button.dataset.signalFilter?.toLowerCase();
    document
      .querySelectorAll("[data-signal-filter]")
      .forEach((option) =>
        option.setAttribute("aria-pressed", String(option === button)),
      );
    document.querySelectorAll("[data-signal-status]").forEach((article) => {
      if (article instanceof HTMLElement)
        article.hidden =
          filter !== "all" && article.dataset.signalStatus !== filter;
    });
  }),
);

document.querySelectorAll('[data-auth-form] input[type="password"]').forEach((input) => {
  if (!(input instanceof HTMLInputElement)) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'password-control';
  input.before(wrapper); wrapper.append(input);
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'password-toggle';
  toggle.textContent = 'Show'; toggle.setAttribute('aria-label', 'Show password');
  toggle.setAttribute('aria-controls', input.id); toggle.setAttribute('aria-pressed', 'false');
  toggle.addEventListener('click', () => {
    const show = input.type === 'password'; input.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(show));
  });
  wrapper.append(toggle);
});
document.querySelectorAll("[data-auth-form]").forEach((form) => {
  if (!(form instanceof HTMLFormElement)) return;
  const mode = form.dataset.authForm;
  const button = form.querySelector("button[type=submit]");
  const message = form.querySelector("[data-form-message]");
  if (mode === 'login' && message instanceof HTMLElement && new URLSearchParams(window.location.search).get('registered') === '1') {
    message.hidden = false;
    message.textContent = 'Account created. Sign in to continue.';
  }
  if (
    !(button instanceof HTMLButtonElement) ||
    !(message instanceof HTMLElement)
  )
    return;
  if (offlinePreview) {
    form.addEventListener("submit", (event) => event.preventDefault());
    form.querySelectorAll("input, button").forEach((control) => {
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLButtonElement
      )
        control.disabled = true;
    });
    message.hidden = false;
    message.textContent =
      "Preview only. Start the local server to use sign-in, registration and password reset.";
    return;
  }
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  if (mode === "reset-password" && !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    button.disabled = true;
    message.hidden = false;
    message.textContent = "Open the reset link from your email to continue.";
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    const data = Object.fromEntries(new FormData(form));
    if (mode === "login" && typeof data.identifier === "string") {
      const identifier = data.identifier.trim();
      delete data.identifier;
      data[identifier.includes("@") ? "email" : "username"] = identifier;
    }
    if (mode === "reset-password") data.token = token;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Please wait…";
    form.setAttribute("aria-busy", "true");
    message.hidden = true;
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      message.textContent =
        typeof result.message === "string"
          ? result.message
          : "Unable to complete request.";
      message.hidden = false;
      message.classList.toggle("error", !response.ok);
      message.setAttribute("role", response.ok ? "status" : "alert");
      if (response.ok && mode === "login") {
        window.location.assign(
          ["/app", "/app/membership", "/admin"].includes(result.redirect)
            ? result.redirect
            : "/app/membership",
        );
        return;
      }
      if (response.ok && mode === 'register') {
        window.location.assign('/auth/login?registered=1');
        return;
      }
      if (response.ok && mode === "reset-password") {
        form.querySelectorAll("input").forEach((input) => {
          input.disabled = true;
        });
        button.textContent = "Completed";
      } else {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    } catch {
      message.textContent = "Connection unavailable. Please try again.";
      message.hidden = false;
      message.classList.add("error");
      message.setAttribute("role", "alert");
      button.disabled = false;
      button.textContent = originalLabel;
    } finally {
      form.setAttribute("aria-busy", "false");
    }
  });
});
// Native accordion gallery: expansion and navigation are separate actions.
(() => {
  const gallery = document.querySelector('[data-accordion-gallery]');
  if (!gallery) return;
  const panels = [...gallery.querySelectorAll('.gallery-panel')];
  const activate = selected => {
    panels.forEach(panel => {
      const active = panel === selected;
      panel.classList.toggle('is-active', active);
      panel.querySelector('.gallery-trigger')?.setAttribute('aria-expanded', String(active));
      const caption = panel.querySelector('.gallery-caption');
      if (caption instanceof HTMLElement) caption.inert = !active;
    });
  };
  panels.forEach(panel => {
    panel.addEventListener('pointerenter', event => { if (event instanceof window.PointerEvent && event.pointerType === 'mouse' && !gallery.contains(document.activeElement)) activate(panel); });
    panel.addEventListener('focusin', () => activate(panel));
    panel.querySelector('.gallery-trigger')?.addEventListener('click', () => activate(panel));
  });
  activate(panels[1] ?? panels[0]);
})();
