// ============================================================
// app.js — לוגיקת הדאשבורד: סינון, KPIs, טבלה, גרפים, מודאל פרטים
// ============================================================

(function () {
  "use strict";

  const { TICKETS, CATEGORIES, STATUSES, OPEN_STATUSES, CHANNELS, AGENTS, NOW } = window.DASHBOARD_DATA;

  const state = {
    search: "",
    status: "all",
    priority: "all",
    category: "all",
    agent: "all",
    dateRange: "30", // '7' | '30' | '45' | 'all'
    sortKey: "createdAt",
    sortDir: "desc",
    page: 1,
    pageSize: 12,
  };

  // ---------- עזרי תצוגה ----------
  const dtf = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  const tf = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" });
  function fmtDate(d) {
    return d ? `${dtf.format(d)} ${tf.format(d)}` : "—";
  }
  function fmtHours(h) {
    if (h == null) return "—";
    if (h < 1) return `${Math.round(h * 60)} דק'`;
    return `${h.toFixed(1)} שע'`;
  }
  function relDay(d) {
    const diff = Math.floor((NOW - d) / (24 * 60 * 60 * 1000));
    if (diff <= 0) return "היום";
    if (diff === 1) return "אתמול";
    return `לפני ${diff} ימים`;
  }

  const STATUS_CLASS = {
    "פתוחה": "status-open",
    "בטיפול": "status-progress",
    "ממתינה ללקוח": "status-waiting",
    "נפתרה": "status-resolved",
    "סגורה": "status-closed",
  };
  const PRIORITY_CLASS = {
    "דחופה": "priority-urgent",
    "גבוהה": "priority-high",
    "בינונית": "priority-medium",
    "נמוכה": "priority-low",
  };

  // ---------- סינון ----------
  function getFilteredTickets() {
    let list = TICKETS;

    if (state.dateRange !== "all") {
      const days = parseInt(state.dateRange, 10);
      const cutoff = new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
      list = list.filter((t) => t.createdAt >= cutoff);
    }
    if (state.status !== "all") list = list.filter((t) => t.status === state.status);
    if (state.priority !== "all") list = list.filter((t) => t.priority === state.priority);
    if (state.category !== "all") list = list.filter((t) => t.category === state.category);
    if (state.agent !== "all") list = list.filter((t) => t.agentId === state.agent);
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.customerEmail.toLowerCase().includes(q)
      );
    }

    const dir = state.sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const ka = a[state.sortKey];
      const kb = b[state.sortKey];
      if (ka == null && kb == null) return 0;
      if (ka == null) return 1;
      if (kb == null) return -1;
      if (ka instanceof Date) return (ka - kb) * dir;
      if (typeof ka === "number") return (ka - kb) * dir;
      return String(ka).localeCompare(String(kb), "he") * dir;
    });

    return list;
  }

  // ---------- KPIs ----------
  function computeKPIs(list) {
    const total = list.length;
    const open = list.filter((t) => OPEN_STATUSES.includes(t.status)).length;
    const resolvedList = list.filter((t) => t.resolvedAt);
    const todayStart = new Date(NOW);
    todayStart.setHours(0, 0, 0, 0);
    const newToday = list.filter((t) => t.createdAt >= todayStart).length;

    const avgFirstResponse =
      list.filter((t) => t.firstResponseMinutes != null).reduce((s, t) => s + t.firstResponseMinutes, 0) /
      (list.filter((t) => t.firstResponseMinutes != null).length || 1);

    const avgResolution =
      resolvedList.reduce((s, t) => s + t.resolutionHours, 0) / (resolvedList.length || 1);

    const rated = list.filter((t) => t.satisfaction != null);
    const avgSat = rated.reduce((s, t) => s + t.satisfaction, 0) / (rated.length || 1);

    const slaEligible = list.filter((t) => t.resolvedAt || OPEN_STATUSES.includes(t.status));
    const slaBreachedCount = slaEligible.filter((t) => t.slaBreached).length;
    const slaCompliance = slaEligible.length ? 100 - (slaBreachedCount / slaEligible.length) * 100 : 100;

    return { total, open, newToday, avgFirstResponse, avgResolution, avgSat, slaCompliance };
  }

  function renderKPIs(list) {
    const k = computeKPIs(list);
    const grid = document.getElementById("kpiGrid");
    const cards = [
      { label: "סה\"כ פניות", value: k.total, sub: `${k.newToday} חדשות היום`, icon: "🎫" },
      { label: "פניות פתוחות", value: k.open, sub: `${((k.open / (k.total || 1)) * 100).toFixed(0)}% מהסה"כ`, icon: "📬" },
      { label: "זמן תגובה ממוצע", value: k.avgFirstResponse >= 60 ? `${(k.avgFirstResponse / 60).toFixed(1)} שע'` : `${Math.round(k.avgFirstResponse)} דק'`, sub: "מרגע פתיחת הפנייה", icon: "⚡" },
      { label: "זמן פתרון ממוצע", value: fmtHours(k.avgResolution), sub: "לפניות שנפתרו", icon: "✅" },
      { label: "שביעות רצון", value: `${k.avgSat.toFixed(1)} / 5`, sub: "דירוג ממוצע (CSAT)", icon: "⭐" },
      { label: "עמידה ב-SLA", value: `${k.slaCompliance.toFixed(0)}%`, sub: k.slaCompliance >= 90 ? "יעד הושג" : "מתחת ליעד (90%)", icon: "🎯", warn: k.slaCompliance < 90 },
    ];
    grid.innerHTML = cards
      .map(
        (c) => `
      <div class="kpi-card ${c.warn ? "kpi-warn" : ""}">
        <div class="kpi-icon">${c.icon}</div>
        <div class="kpi-body">
          <div class="kpi-value">${c.value}</div>
          <div class="kpi-label">${c.label}</div>
          <div class="kpi-sub">${c.sub}</div>
        </div>
      </div>`
      )
      .join("");
  }

  // ---------- טבלה ----------
  function renderTable(list) {
    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageItems = list.slice(start, start + state.pageSize);

    const tbody = document.getElementById("ticketsBody");
    if (!pageItems.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">לא נמצאו פניות התואמות את הסינון הנוכחי</td></tr>`;
    } else {
      tbody.innerHTML = pageItems
        .map(
          (t) => `
        <tr data-id="${t.id}" class="ticket-row">
          <td class="mono">${t.id}</td>
          <td class="subject-cell">
            <div class="subject-text">${t.subject}</div>
            <div class="customer-text">${t.customerName}</div>
          </td>
          <td><span class="tag" style="--tag-color:${t.categoryColor}">${t.categoryLabel}</span></td>
          <td><span class="badge ${PRIORITY_CLASS[t.priority]}">${t.priority}</span></td>
          <td><span class="badge ${STATUS_CLASS[t.status]}">${t.status}${t.slaBreached ? ' <span class="sla-flag" title="חריגת SLA">⚠</span>' : ""}</span></td>
          <td>
            <span class="agent-chip"><span class="agent-dot" style="background:${t.agentColor}"></span>${t.agentName}</span>
          </td>
          <td class="nowrap">${relDay(t.createdAt)}</td>
          <td class="nowrap">${t.satisfaction ? "⭐".repeat(t.satisfaction) : "—"}</td>
        </tr>`
        )
        .join("");
    }

    document.getElementById("resultsCount").textContent = `${list.length} פניות`;
    document.getElementById("pageInfo").textContent = `עמוד ${state.page} מתוך ${totalPages}`;
    document.getElementById("prevPage").disabled = state.page <= 1;
    document.getElementById("nextPage").disabled = state.page >= totalPages;

    tbody.querySelectorAll(".ticket-row").forEach((row) => {
      row.addEventListener("click", () => openTicketModal(row.dataset.id));
    });
  }

  // ---------- גרפים ----------
  function renderCharts(list) {
    // מגמה: 14 הימים האחרונים
    const days = 14;
    const labels = [];
    const createdCounts = [];
    const resolvedCounts = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(NOW);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      labels.push(`${dayStart.getDate()}/${dayStart.getMonth() + 1}`);
      createdCounts.push(TICKETS.filter((t) => t.createdAt >= dayStart && t.createdAt < dayEnd).length);
      resolvedCounts.push(
        TICKETS.filter((t) => t.resolvedAt && t.resolvedAt >= dayStart && t.resolvedAt < dayEnd).length
      );
    }
    window.Charts.renderLineChart(document.getElementById("trendChart"), {
      labels,
      series: [
        { label: "פניות חדשות", color: "#2563eb", points: createdCounts.map((y, x) => ({ x, y })) },
        { label: "פניות שנפתרו", color: "#16a34a", points: resolvedCounts.map((y, x) => ({ x, y })) },
      ],
    });

    // פילוח קטגוריות
    const catItems = CATEGORIES.map((c) => ({
      label: c.label,
      color: c.color,
      value: list.filter((t) => t.category === c.key).length,
    })).sort((a, b) => b.value - a.value);
    window.Charts.renderHBarChart(document.getElementById("categoryChart"), { items: catItems });

    // פילוח סטטוסים
    const statusColors = {
      "פתוחה": "#ef4444",
      "בטיפול": "#f59e0b",
      "ממתינה ללקוח": "#8b5cf6",
      "נפתרה": "#16a34a",
      "סגורה": "#64748b",
    };
    const statusItems = STATUSES.map((s) => ({
      label: s,
      color: statusColors[s],
      value: list.filter((t) => t.status === s).length,
    })).filter((i) => i.value > 0);
    window.Charts.renderDonutChart(document.getElementById("statusChart"), { items: statusItems });
  }

  // ---------- ביצועי נציגים ----------
  function renderAgentPerformance(list) {
    const rows = AGENTS.map((agent) => {
      const assigned = list.filter((t) => t.agentId === agent.id);
      const resolved = assigned.filter((t) => t.resolvedAt);
      const open = assigned.filter((t) => OPEN_STATUSES.includes(t.status));
      const avgRes = resolved.reduce((s, t) => s + t.resolutionHours, 0) / (resolved.length || 1);
      const rated = assigned.filter((t) => t.satisfaction != null);
      const avgSat = rated.reduce((s, t) => s + t.satisfaction, 0) / (rated.length || 1);
      const breaches = assigned.filter((t) => t.slaBreached).length;
      return {
        agent,
        assigned: assigned.length,
        resolved: resolved.length,
        open: open.length,
        avgRes,
        avgSat: rated.length ? avgSat : null,
        breaches,
      };
    }).sort((a, b) => b.resolved - a.resolved);

    const maxResolved = Math.max(1, ...rows.map((r) => r.resolved));

    const tbody = document.getElementById("agentsBody");
    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td><span class="agent-chip"><span class="agent-dot" style="background:${r.agent.color}"></span>${r.agent.name}</span></td>
        <td>${r.assigned}</td>
        <td>${r.open}</td>
        <td>
          <div class="mini-bar-track"><div class="mini-bar" style="width:${(r.resolved / maxResolved) * 100}%;background:${r.agent.color}"></div></div>
          <span class="mini-bar-value">${r.resolved}</span>
        </td>
        <td>${fmtHours(r.avgRes)}</td>
        <td>${r.avgSat ? `⭐ ${r.avgSat.toFixed(1)}` : "—"}</td>
        <td>${r.breaches > 0 ? `<span class="badge priority-high">${r.breaches}</span>` : "—"}</td>
      </tr>`
      )
      .join("");
  }

  // ---------- מודאל פרטי פנייה ----------
  function openTicketModal(id) {
    const t = TICKETS.find((x) => x.id === id);
    if (!t) return;
    const modal = document.getElementById("ticketModal");
    document.getElementById("modalBody").innerHTML = `
      <div class="modal-header-row">
        <h3>${t.subject}</h3>
        <span class="mono">${t.id}</span>
      </div>
      <div class="modal-badges">
        <span class="badge ${STATUS_CLASS[t.status]}">${t.status}</span>
        <span class="badge ${PRIORITY_CLASS[t.priority]}">עדיפות: ${t.priority}</span>
        <span class="tag" style="--tag-color:${t.categoryColor}">${t.categoryLabel}</span>
        ${t.slaBreached ? '<span class="badge priority-high">⚠ חריגת SLA</span>' : '<span class="badge status-resolved">בתוך SLA</span>'}
      </div>
      <div class="modal-grid">
        <div><span class="modal-label">לקוח</span><span>${t.customerName}</span></div>
        <div><span class="modal-label">אימייל</span><span>${t.customerEmail}</span></div>
        <div><span class="modal-label">ערוץ</span><span>${t.channel}</span></div>
        <div><span class="modal-label">נציג מטפל</span><span>${t.agentName}</span></div>
        <div><span class="modal-label">יעד SLA</span><span>${t.slaHours} שעות</span></div>
        <div><span class="modal-label">דירוג שביעות רצון</span><span>${t.satisfaction ? "⭐".repeat(t.satisfaction) : "טרם דורג"}</span></div>
      </div>
      <div class="modal-timeline">
        <div class="timeline-item"><span class="timeline-dot"></span><div><strong>נפתחה</strong><div class="timeline-date">${fmtDate(t.createdAt)}</div></div></div>
        <div class="timeline-item"><span class="timeline-dot ${t.firstResponseAt ? "done" : ""}"></span><div><strong>תגובה ראשונה</strong><div class="timeline-date">${t.firstResponseAt ? fmtDate(t.firstResponseAt) : "ממתין"}</div></div></div>
        <div class="timeline-item"><span class="timeline-dot ${t.resolvedAt ? "done" : ""}"></span><div><strong>נפתרה</strong><div class="timeline-date">${t.resolvedAt ? fmtDate(t.resolvedAt) : "טרם נפתרה"}</div></div></div>
      </div>
    `;
    modal.classList.add("open");
  }
  function closeModal() {
    document.getElementById("ticketModal").classList.remove("open");
  }

  // ---------- רינדור מלא ----------
  function renderAll() {
    const list = getFilteredTickets();
    renderKPIs(list);
    renderTable(list);
    renderCharts(list);
    renderAgentPerformance(list);
  }

  // ---------- אתחול פילטרים ----------
  function populateFilterOptions() {
    const catSel = document.getElementById("categoryFilter");
    CATEGORIES.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.key;
      opt.textContent = c.label;
      catSel.appendChild(opt);
    });
    const agentSel = document.getElementById("agentFilter");
    AGENTS.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      agentSel.appendChild(opt);
    });
    const statusSel = document.getElementById("statusFilter");
    STATUSES.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      statusSel.appendChild(opt);
    });
  }

  // ---------- אירועים ----------
  function wireEvents() {
    let searchTimer;
    document.getElementById("searchInput").addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value;
        state.page = 1;
        renderAll();
      }, 200);
    });

    document.getElementById("statusFilter").addEventListener("change", (e) => {
      state.status = e.target.value;
      state.page = 1;
      renderAll();
    });
    document.getElementById("priorityFilter").addEventListener("change", (e) => {
      state.priority = e.target.value;
      state.page = 1;
      renderAll();
    });
    document.getElementById("categoryFilter").addEventListener("change", (e) => {
      state.category = e.target.value;
      state.page = 1;
      renderAll();
    });
    document.getElementById("agentFilter").addEventListener("change", (e) => {
      state.agent = e.target.value;
      state.page = 1;
      renderAll();
    });

    document.querySelectorAll(".range-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.dateRange = btn.dataset.range;
        state.page = 1;
        renderAll();
      });
    });

    document.getElementById("resetFilters").addEventListener("click", () => {
      state.search = "";
      state.status = "all";
      state.priority = "all";
      state.category = "all";
      state.agent = "all";
      state.dateRange = "30";
      state.page = 1;
      document.getElementById("searchInput").value = "";
      document.getElementById("statusFilter").value = "all";
      document.getElementById("priorityFilter").value = "all";
      document.getElementById("categoryFilter").value = "all";
      document.getElementById("agentFilter").value = "all";
      document.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
      document.querySelector('.range-btn[data-range="30"]').classList.add("active");
      renderAll();
    });

    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "desc";
        }
        document.querySelectorAll("th[data-sort]").forEach((h) => h.classList.remove("sort-asc", "sort-desc"));
        th.classList.add(state.sortDir === "asc" ? "sort-asc" : "sort-desc");
        renderAll();
      });
    });

    document.getElementById("prevPage").addEventListener("click", () => {
      if (state.page > 1) {
        state.page--;
        renderAll();
      }
    });
    document.getElementById("nextPage").addEventListener("click", () => {
      state.page++;
      renderAll();
    });

    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("ticketModal").addEventListener("click", (e) => {
      if (e.target.id === "ticketModal") closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    // רענון בעת שינוי גודל חלון — הגרפים תלויים ברוחב הקונטיינר
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderCharts(getFilteredTickets()), 150);
    });
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("lastUpdated").textContent = fmtDate(NOW);
    populateFilterOptions();
    wireEvents();
    renderAll();
  });
})();
