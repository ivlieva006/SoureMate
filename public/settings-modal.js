(function () {
  if (document.querySelector("[data-settings-widget]")) return;

  const API_ORIGIN_SETTINGS = window.location.port === "5500" ? "http://localhost:3000" : "";
  let overlay = null;
  let initialized = false;

  if (!window.SourceMateModalLayer) {
    const stack = [];
    window.SourceMateModalLayer = {
      bring(modal) {
        if (!modal) return;
        const index = stack.indexOf(modal);
        if (index !== -1) stack.splice(index, 1);
        stack.push(modal);
        this.sync();
      },
      clear(modal) {
        const index = stack.indexOf(modal);
        if (index !== -1) stack.splice(index, 1);
        modal?.classList.remove("is-top-modal");
        this.sync();
      },
      sync() {
        document.querySelectorAll(".widget-overlay, .settings-overlay, .support-widget").forEach((item) => {
          item.classList.remove("is-top-modal");
        });
        while (stack.length && stack.at(-1).hidden) stack.pop();
        stack.at(-1)?.classList.add("is-top-modal");
      }
    };
  }

  function formatPasswordUpdated(timestamp) {
    if (!timestamp) return "Обновлен недавно";
    const diffDays = Math.max(0, Math.round((Date.now() - Number(timestamp)) / (24 * 60 * 60 * 1000)));
    if (diffDays === 0) return "Обновлен сегодня";
    if (diffDays === 1) return "Обновлен вчера";
    return `Обновлен ${diffDays} дней назад`;
  }

  async function requestJson(path, options = {}) {
    const response = await fetch(`${API_ORIGIN_SETTINGS}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || data.message || "Ошибка запроса");
    return data;
  }

  function applyUser(user) {
    if (!overlay || !user) return;
    const name = user.name || (user.email ? user.email.split("@")[0] : "Имя Фамилия");
    const role = user.role || "Студент · Московский политех";
    overlay.querySelectorAll("[data-settings-name]").forEach((node) => { node.textContent = name; });
    overlay.querySelectorAll("[data-settings-role]").forEach((node) => { node.textContent = role; });
    overlay.querySelectorAll("[data-settings-email]").forEach((node) => { node.textContent = user.email || "student@mail.ru"; });
    overlay.querySelectorAll("[data-settings-password-updated]").forEach((node) => {
      node.textContent = formatPasswordUpdated(user.passwordUpdatedAt);
    });
    overlay.querySelectorAll("[data-account-avatar]").forEach((avatar) => {
      if (user.avatarUrl) {
        avatar.style.backgroundImage = `url("${user.avatarUrl}")`;
        avatar.classList.add("has-image");
      } else {
        avatar.style.backgroundImage = "";
        avatar.classList.remove("has-image");
      }
    });

    const settings = user.settings || {};
    overlay.querySelectorAll("[data-setting-select]").forEach((button) => {
      const key = button.dataset.settingSelect;
      if (!Object.prototype.hasOwnProperty.call(settings, key)) return;
      button.dataset.settingValue = settings[key];
      const label = button.querySelector("strong");
      if (label) label.textContent = settings[key];
    });
    overlay.querySelectorAll("[data-setting-toggle]").forEach((input) => {
      const key = input.dataset.settingToggle;
      if (Object.prototype.hasOwnProperty.call(settings, key)) input.checked = Boolean(settings[key]);
    });
  }

  async function loadState() {
    try {
      const data = await requestJson("/api/cabinet/state");
      applyUser(data.user);
    } catch {
      // The modal remains usable as a static settings view if the session is not available.
    }
  }

  function setTab(tab) {
    overlay.querySelectorAll("[data-settings-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.settingsTab === tab);
    });
    overlay.querySelectorAll("[data-settings-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.settingsPanel === tab);
    });
  }

  function closeSettings() {
    if (!overlay) return;
    overlay.hidden = true;
    window.SourceMateModalLayer.clear(overlay);
    document.body.classList.remove("modal-open");
  }

  async function ensureOverlay() {
    if (overlay) return overlay;
    const response = await fetch("./cabinet.html", { credentials: "include" });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    overlay = doc.querySelector("[data-settings-widget]");
    if (!overlay) throw new Error("Не удалось загрузить настройки");
    overlay.hidden = true;
    document.body.appendChild(overlay);
    initOverlay();
    await loadState();
    return overlay;
  }

  function initOverlay() {
    if (initialized || !overlay) return;
    initialized = true;

    overlay.addEventListener("click", async (event) => {
      if (event.target === overlay || event.target.closest("[data-close-settings]")) {
        closeSettings();
        return;
      }

      const tab = event.target.closest("[data-settings-tab]");
      if (tab) {
        setTab(tab.dataset.settingsTab);
        return;
      }

      const toggleButton = event.target.closest("[data-account-action='quiet-save']");
      if (toggleButton) {
        const quietMode = Boolean(overlay.querySelector("[data-setting-toggle='quietMode']")?.checked);
        await requestJson("/api/account/settings", {
          method: "POST",
          body: JSON.stringify({ quietMode })
        });
      }
    });

    overlay.addEventListener("change", async (event) => {
      const toggle = event.target.closest("[data-setting-toggle]");
      if (!toggle) return;
      try {
        await requestJson("/api/account/settings", {
          method: "POST",
          body: JSON.stringify({ [toggle.dataset.settingToggle]: Boolean(toggle.checked) })
        });
      } catch {
        toggle.checked = !toggle.checked;
      }
    });
  }

  async function openSettings(event) {
    event?.preventDefault();
    try {
      const modal = await ensureOverlay();
      modal.hidden = false;
      document.body.classList.add("modal-open");
      window.SourceMateModalLayer.bring(modal);
      modal.querySelector("[data-close-settings]")?.focus();
    } catch {
      window.location.href = "./cabinet.html?settings=1";
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="./cabinet.html?settings=1"], a[href^="cabinet.html?settings=1"]');
    if (!link) return;
    openSettings(event);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay && !overlay.hidden) closeSettings();
  });
})();
