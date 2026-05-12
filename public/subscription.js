(function () {
  const page = document.querySelector("[data-subscription-page]");
  const shell = document.querySelector("[data-billing-mode]");
  const pricingRoot = document.querySelector("[data-personal-plans]");
  const teamPreview = document.querySelector("[data-team-preview]");
  const teamPlans = document.querySelector("[data-team-plans]");
  const periodToggle = document.querySelector(".period-toggle");
  const title = document.querySelector("[data-subscription-title]");
  const subtitle = document.querySelector("[data-subscription-subtitle]");
  const toast = document.querySelector("[data-subscription-toast]");

  if (!shell || !pricingRoot) return;

  function pinCloseButton() {
    const closeButton = document.querySelector("[data-close-subscription]");
    if (!closeButton) return;

    if (closeButton.parentElement !== document.body) {
      document.body.append(closeButton);
    }

    closeButton.style.setProperty("position", "fixed", "important");
    closeButton.style.setProperty("top", "126px");
    closeButton.style.setProperty("right", "24px");
    closeButton.style.setProperty("z-index", "100");
    closeButton.style.setProperty("transform", "none");
  }

  pinCloseButton();
  window.addEventListener("resize", pinCloseButton);
  window.addEventListener("scroll", pinCloseButton, { passive: true });

  const state = {
    mode: "personal",
    period: "year",
    subscription: {
      planId: "free",
      period: "forever",
      status: "active",
      teamRequest: false
    },
    busyPlan: ""
  };

  const plans = [
    {
      id: "free",
      name: "Free",
      subtitle: "Новый пользователь",
      prices: { month: ["0 ₽", "навсегда"], year: ["0 ₽", "навсегда"] },
      purpose: "Быстро изучить SourceMate",
      limit: "1 проект · 1 проверка · до 10 000 знаков",
      features: [
        "Базовая уникальность",
        "3 источника совпадений",
        "3 проблемных фрагмента",
        "Краткий отчёт",
        "Без экспорта PDF"
      ]
    },
    {
      id: "deadline",
      name: "Deadline Pass",
      subtitle: "Разовая сдача работы",
      prices: { month: ["399 ₽", "/ 7 дней"], year: ["399 ₽", "/ 7 дней"] },
      purpose: "Когда дедлайн уже близко",
      limit: "5 проверок · до 150 000 знаков",
      features: [
        "Полный академический отчёт",
        "Все проблемные фрагменты",
        "Источники и цитаты",
        "Экспорт PDF / DOCX",
        "История 30 дней"
      ]
    },
    {
      id: "student",
      name: "Student",
      subtitle: "Основной тариф для учёбы",
      badge: "Год выгоднее",
      featured: true,
      prices: { month: ["499 ₽", "/ мес"], year: ["2 990 ₽", "/ год"] },
      purpose: "Оптимальный план на семестр",
      limit: "15 проверок/мес · до 500 000 знаков",
      features: [
        "Полные отчёты",
        "Карточки источников",
        "Быстрое цитирование",
        "Экспорт PDF / DOCX",
        "История 12 месяцев"
      ],
      footnotes: {
        month: "Годовая оплата экономит 40%",
        year: "≈ 249 ₽/мес при оплате за год"
      }
    },
    {
      id: "pro",
      name: "Pro",
      subtitle: "Магистры, аспиранты, авторы",
      prices: { month: ["1 190 ₽", "/ мес"], year: ["6 990 ₽", "/ год"] },
      purpose: "Для больших работ и версий",
      limit: "60 проверок/мес · до 2 млн знаков",
      features: [
        "Всё из Student",
        "Расширенная аналитика",
        "Больше источников",
        "Версии работ",
        "Высокий приоритет"
      ],
      footnotes: {
        month: "Годовая оплата экономит 40%",
        year: "≈ 583 ₽/мес при оплате за год"
      }
    }
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || "Не удалось выполнить запрос");
    return data;
  }

  function periodForPlan(planId) {
    return planId === "deadline" ? "week" : state.period;
  }

  function isCurrentPlan(plan) {
    if (plan.id !== state.subscription.planId) return false;
    if (plan.id === "free") return true;
    return state.subscription.period === periodForPlan(plan.id);
  }

  function actionLabel(plan) {
    if (state.busyPlan === plan.id) return "Обновляем...";
    if (isCurrentPlan(plan)) return "Текущий план";
    if (plan.id === "free") return "Текущий план";
    if (plan.id === "deadline") return "Купить на 7 дней";
    const suffix = state.period === "year" ? "на год" : "на месяц";
    return `Оплатить ${plan.name} ${suffix}`;
  }

  function renderPlans() {
    pricingRoot.innerHTML = plans.map((plan) => {
      const [price, suffix] = plan.prices[state.period] || plan.prices.year;
      const current = isCurrentPlan(plan);
      const disabled = current || plan.id === "free" || state.busyPlan === plan.id;
      const classes = [
        "plan-card",
        plan.featured ? "featured" : "",
        current ? "is-current" : ""
      ].filter(Boolean).join(" ");
      const actionClasses = [
        "plan-action",
        plan.featured ? "primary" : "",
        current || plan.id === "free" ? "current" : "",
        state.busyPlan === plan.id ? "pending" : ""
      ].filter(Boolean).join(" ");
      const footnote = plan.footnotes?.[state.period] || "";

      return `
        <article class="${classes}">
          <div class="plan-top">
            <h2>${escapeHtml(plan.name)}</h2>
            ${plan.badge ? `<span class="plan-badge">${escapeHtml(plan.badge)}</span>` : ""}
          </div>
          <p class="plan-subtitle">${escapeHtml(plan.subtitle)}</p>
          <div class="plan-price">
            <strong>${escapeHtml(price)}</strong>
            <span>${escapeHtml(suffix)}</span>
          </div>
          <p class="plan-purpose">${escapeHtml(plan.purpose)}</p>
          <button class="${actionClasses}" type="button" data-checkout-plan="${escapeHtml(plan.id)}" ${disabled ? "disabled" : ""}>
            ${escapeHtml(actionLabel(plan))}
          </button>
          <div class="plan-features">
            <div class="plan-limit">${escapeHtml(plan.limit)}</div>
            <ul>
              ${plan.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
            </ul>
            ${footnote ? `<span class="plan-footnote">${escapeHtml(footnote)}</span>` : ""}
          </div>
        </article>
      `;
    }).join("");
  }

  function renderMode() {
    shell.dataset.billingMode = state.mode;
    shell.dataset.period = state.period;

    document.querySelectorAll("[data-plan-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.planTab === state.mode);
    });
    document.querySelectorAll("[data-period-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.periodTab === state.period);
    });

    const teamMode = state.mode === "team";
    pricingRoot.hidden = teamMode;
    if (teamPreview) teamPreview.hidden = teamMode;
    if (teamPlans) teamPlans.hidden = !teamMode;
    if (periodToggle) periodToggle.hidden = teamMode;
    if (title) title.textContent = teamMode ? "Командный план SourceMate" : "Личный план SourceMate";
    if (subtitle) {
      subtitle.textContent = teamMode
        ? "Единый кабинет для преподавателей, кафедр, курсов и учебных групп"
        : "Выберите тариф под дедлайн, семестр или большую исследовательскую работу";
    }

    const requestButtons = document.querySelectorAll("[data-team-request]");
    requestButtons.forEach((button) => {
      button.textContent = state.subscription.teamRequest ? "Заявка отправлена" : "Запросить командный доступ";
      button.disabled = Boolean(state.subscription.teamRequest);
    });

    renderPlans();
    page?.classList.remove("is-loading");
  }

  async function loadState() {
    try {
      const data = await requestJson("/api/subscription/state");
      if (data.subscription) state.subscription = data.subscription;
      if (data.subscription?.period === "month" || data.subscription?.period === "year") {
        state.period = data.subscription.period;
      }
    } catch {
      const cached = localStorage.getItem("sourcemate.subscription");
      if (cached) {
        try {
          state.subscription = { ...state.subscription, ...JSON.parse(cached) };
        } catch {
          localStorage.removeItem("sourcemate.subscription");
        }
      }
    }
    renderMode();
  }

  async function checkout(planId) {
    const plan = plans.find((item) => item.id === planId);
    if (!plan || plan.id === "free" || state.busyPlan) return;
    state.busyPlan = planId;
    renderPlans();
    try {
      const data = await requestJson("/api/subscription/checkout", {
        method: "POST",
        body: JSON.stringify({ planId, period: periodForPlan(planId) })
      });
      state.subscription = data.subscription || state.subscription;
      localStorage.setItem("sourcemate.subscription", JSON.stringify(state.subscription));
      showToast(data.message || "Подписка обновлена");
    } catch (error) {
      showToast(error.message);
    } finally {
      state.busyPlan = "";
      renderMode();
    }
  }

  async function requestTeamAccess() {
    if (state.subscription.teamRequest) return;
    try {
      const data = await requestJson("/api/subscription/team-request", { method: "POST", body: "{}" });
      state.subscription = data.subscription || state.subscription;
      localStorage.setItem("sourcemate.subscription", JSON.stringify(state.subscription));
      showToast(data.message || "Заявка отправлена");
    } catch (error) {
      showToast(error.message);
    } finally {
      renderMode();
    }
  }

  document.addEventListener("click", (event) => {
    const planTab = event.target.closest("[data-plan-tab]");
    if (planTab) {
      state.mode = planTab.dataset.planTab === "team" ? "team" : "personal";
      renderMode();
      return;
    }

    const periodTab = event.target.closest("[data-period-tab]");
    if (periodTab) {
      state.period = periodTab.dataset.periodTab === "month" ? "month" : "year";
      renderMode();
      return;
    }

    const checkoutButton = event.target.closest("[data-checkout-plan]");
    if (checkoutButton) {
      checkout(checkoutButton.dataset.checkoutPlan);
      return;
    }

    if (event.target.closest("[data-team-request]")) {
      requestTeamAccess();
      return;
    }

    if (event.target.closest("[data-close-subscription]")) {
      window.location.href = "./cabinet.html";
    }
  });

  renderMode();
  loadState();
})();
