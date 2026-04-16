const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx1IBguF3YXZsYjNGrcHvV2BXAKnSuArYTyRyi4sBhRSjfkpiwLGytgVG8fPs3xqfGg5w/exec";
const CURRENCIES = ["TWD", "JPY", "KRW"];

const form = document.getElementById("entryForm");
const summaryGrid = document.getElementById("summaryGrid");
const details = document.getElementById("details");

const summaryToggle = document.getElementById("summaryToggle");
const summaryContent = document.getElementById("summaryContent");
const summaryToggleText = document.getElementById("summaryToggleText");

let entries = [];

init();
setupSummaryToggle();

async function init() {
  setDefaultDateTime();
  await fetchEntries();
  render();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const entry = {
    id: crypto.randomUUID(),
    date: formData.get("date"),
    time: formData.get("time"),
    category: formData.get("category"),
    detail: formData.get("detail").trim(),
    amount: Number(formData.get("amount")),
    currency: formData.get("currency"),
    type: formData.get("type"),
    account: formData.get("account"),
    note: formData.get("note").trim(),
    createdAt: Date.now()
  };

  try {
    setSubmitDisabled(true);

    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "create",
        entry: entry
      })
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.message || "新增失敗");
    }

    form.reset();
    setDefaultDateTime();
    await fetchEntries();
    render();
  } catch (error) {
    alert("新增失敗：" + error.message);
  } finally {
    setSubmitDisabled(false);
  }
});

async function fetchEntries() {
  try {
    const response = await fetch(WEB_APP_URL);
    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.message || "讀取失敗");
    }

    entries = Array.isArray(result.entries) ? result.entries : [];
  } catch (error) {
    console.error(error);
    details.innerHTML = `
      <div class="empty">讀取試算表失敗，請檢查 Apps Script 部署網址或權限設定。</div>
    `;
  }
}

function setSubmitDisabled(disabled) {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) return;

  submitBtn.disabled = disabled;
  submitBtn.textContent = disabled ? "新增中..." : "新增";
}

function render() {
  renderSummary();
  renderDetails();
}

function renderSummary() {
  const totals = Object.fromEntries(
    CURRENCIES.map((currency) => [currency, { income: 0, expense: 0 }])
  );

  entries.forEach((entry) => {
    if (!totals[entry.currency]) {
      totals[entry.currency] = { income: 0, expense: 0 };
    }
    totals[entry.currency][entry.type] += Number(entry.amount) || 0;
  });

  summaryGrid.innerHTML = Object.entries(totals)
    .map(([currency, values]) => {
      const balance = values.income - values.expense;

      return `
        <article class="summary-card">
          <div class="summary-top">
            <div class="summary-code">${currency}</div>
          </div>
          <div class="summary-row">
            <span>收入</span>
            <span class="income">+ ${formatMoney(values.income, currency)}</span>
          </div>
          <div class="summary-row">
            <span>支出</span>
            <span class="expense">- ${formatMoney(values.expense, currency)}</span>
          </div>
          <div class="summary-row">
            <span>結餘</span>
            <span class="balance">${formatSignedMoney(balance, currency)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDetails() {
  if (!entries.length) {
    details.innerHTML = `
      <div class="empty">
        目前還沒有紀錄。先新增第一筆。
      </div>
    `;
    return;
  }

  const grouped = groupByDate(entries);

  details.innerHTML = Object.entries(grouped)
    .map(([date, items]) => {
      return `
        <section class="day-block">
          <div class="day-title">${formatDateLabel(date)}</div>
          <div class="entry-list">
            ${items.map((entry) => renderEntry(entry)).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  document.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-delete-id");
      const ok = confirm("確定要刪除這筆紀錄嗎？");

      if (!ok) return;

      try {
        const response = await fetch(WEB_APP_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            id: id
          })
        });

        const result = await response.json();

        if (!result.ok) {
          throw new Error(result.message || "刪除失敗");
        }

        await fetchEntries();
        render();
      } catch (error) {
        alert("刪除失敗：" + error.message);
      }
    });
  });
}

function renderEntry(entry) {
  const sign = entry.type === "income" ? "+" : "-";
  const amountClass = entry.type === "income" ? "income" : "expense";

  return `
    <article class="entry">
      <div class="entry-main">
        <div class="entry-left">
          <div class="entry-detail">${escapeHtml(entry.detail)}</div>
          <div class="entry-meta">
            ${escapeHtml(entry.category)} ${formatTimeLabel(entry.time)}
          </div>
        </div>

        <div class="entry-right">
          <div class="entry-amount ${amountClass}">
            ${sign}${formatMoneyCompact(entry.amount, entry.currency)}
          </div>
          <div class="entry-account">
            ${escapeHtml(entry.account)}
          </div>
        </div>
      </div>

      ${entry.note ? `<div class="entry-note">${escapeHtml(entry.note)}</div>` : ""}

      <div class="entry-actions">
        <button class="link-btn" type="button" data-delete-id="${entry.id}">刪除</button>
      </div>
    </article>
  `;
}

function groupByDate(list) {
  return list
    .slice()
    .sort((a, b) => {
      const aDateTime = `${a.date}T${a.time}`;
      const bDateTime = `${b.date}T${b.time}`;
      return bDateTime.localeCompare(aDateTime);
    })
    .reduce((result, entry) => {
      if (!result[entry.date]) {
        result[entry.date] = [];
      }
      result[entry.date].push(entry);
      return result;
    }, {});
}

function setDefaultDateTime() {
  const now = new Date();
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const currencyInput = document.getElementById("currency");
  const typeInput = document.getElementById("type");

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");

  dateInput.value = `${yyyy}-${mm}-${dd}`;
  timeInput.value = `${hh}:${mi}`;
  currencyInput.value = "TWD";
  typeInput.value = "expense";
}

function formatMoney(value, currency) {
  return (
    new Intl.NumberFormat("zh-TW", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(value) +
    " " +
    currency
  );
}

function formatTimeLabel(timeString) {
  return String(timeString || "").replace(":", "：");
}

function formatMoneyCompact(value, currency) {
  return (
    new Intl.NumberFormat("zh-TW", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(value) + currency
  );
}

function formatSignedMoney(value, currency) {
  const sign = value > 0 ? "+ " : value < 0 ? "- " : "";
  return sign + formatMoney(Math.abs(value), currency);
}

function formatDateLabel(dateString) {
  const parts = dateString.split("-");
  return `${parts[0]} / ${parts[1]} / ${parts[2]}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setupSummaryToggle() {
  if (!summaryToggle || !summaryContent || !summaryToggleText) return;

  summaryToggle.addEventListener("click", () => {
    const isHidden = summaryContent.hidden;

    if (isHidden) {
      summaryContent.hidden = false;
      summaryToggle.setAttribute("aria-expanded", "true");
      summaryToggleText.textContent = "收起";
    } else {
      summaryContent.hidden = true;
      summaryToggle.setAttribute("aria-expanded", "false");
      summaryToggleText.textContent = "展開";
    }
  });
}
