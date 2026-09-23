// ============================================================
// charts.js — גרפי SVG קלים, ללא תלות בספריות חיצוניות.
// כל פונקציה מקבלת אלמנט container ומחזירה כלום — מציירת ישירות.
// ============================================================

(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function clear(container) {
    container.innerHTML = "";
  }

  // ---- גרף קווי/שטח: מגמת פניות לאורך זמן ----
  // series: [{label, color, points: [{x:index, y:value}]}]
  function renderLineChart(container, { labels, series, height = 220 }) {
    clear(container);
    const width = container.clientWidth || 600;
    const padding = { top: 16, right: 16, bottom: 28, left: 34 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const allValues = series.flatMap((s) => s.points.map((p) => p.y));
    const maxY = Math.max(4, ...allValues);

    const svg = el("svg", { width, height, viewBox: `0 0 ${width} ${height}`, class: "chart-svg" });

    const xStep = labels.length > 1 ? innerW / (labels.length - 1) : innerW;

    // רשת אופקית + תוויות ציר Y
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (innerH * i) / gridLines;
      const val = Math.round(maxY - (maxY * i) / gridLines);
      svg.appendChild(
        el("line", {
          x1: padding.left, x2: width - padding.right, y1: y, y2: y,
          class: "chart-grid-line",
        })
      );
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", padding.left - 8);
      t.setAttribute("y", y + 4);
      t.setAttribute("text-anchor", "end");
      t.setAttribute("class", "chart-axis-label");
      t.textContent = val;
      svg.appendChild(t);
    }

    // תוויות ציר X (כל כמה תווית כדי לא להצטופף)
    const xLabelStep = Math.ceil(labels.length / 8);
    labels.forEach((lab, i) => {
      if (i % xLabelStep !== 0 && i !== labels.length - 1) return;
      const x = padding.left + xStep * i;
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", x);
      t.setAttribute("y", height - 6);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("class", "chart-axis-label");
      t.textContent = lab;
      svg.appendChild(t);
    });

    series.forEach((s) => {
      const points = s.points.map((p, i) => {
        const x = padding.left + xStep * i;
        const y = padding.top + innerH - (p.y / maxY) * innerH;
        return [x, y];
      });

      // אזור מתחת לקו
      const areaPath =
        `M ${points[0][0]},${padding.top + innerH} ` +
        points.map(([x, y]) => `L ${x},${y}`).join(" ") +
        ` L ${points[points.length - 1][0]},${padding.top + innerH} Z`;
      svg.appendChild(el("path", { d: areaPath, fill: s.color, opacity: 0.12, stroke: "none" }));

      // הקו עצמו
      const linePath = "M " + points.map(([x, y]) => `${x},${y}`).join(" L ");
      svg.appendChild(el("path", { d: linePath, fill: "none", stroke: s.color, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }));

      // נקודות
      points.forEach(([x, y], i) => {
        const c = el("circle", { cx: x, cy: y, r: 3, fill: s.color, class: "chart-point" });
        const titleEl = document.createElementNS(SVG_NS, "title");
        titleEl.textContent = `${s.label} · ${labels[i]}: ${s.points[i].y}`;
        c.appendChild(titleEl);
        svg.appendChild(c);
      });
    });

    container.appendChild(svg);
  }

  // ---- גרף עמודות אופקי: פילוח לפי קטגוריה ----
  // items: [{label, value, color}]
  function renderHBarChart(container, { items, height }) {
    clear(container);
    const max = Math.max(1, ...items.map((i) => i.value));
    const rowH = 34;
    const h = height || items.length * rowH + 16;
    const width = container.clientWidth || 500;
    const labelW = 130;
    const valueW = 40;
    const barAreaW = width - labelW - valueW - 16;

    const wrap = document.createElement("div");
    wrap.className = "hbar-chart";
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "hbar-row";

      const label = document.createElement("div");
      label.className = "hbar-label";
      label.textContent = it.label;
      label.style.width = labelW + "px";

      const track = document.createElement("div");
      track.className = "hbar-track";
      track.style.width = barAreaW + "px";

      const bar = document.createElement("div");
      bar.className = "hbar-bar";
      const pct = Math.max(2, (it.value / max) * 100);
      bar.style.width = pct + "%";
      bar.style.background = it.color;
      track.appendChild(bar);

      const value = document.createElement("div");
      value.className = "hbar-value";
      value.textContent = it.value;

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);
      wrap.appendChild(row);
    });
    container.appendChild(wrap);
  }

  // ---- גרף דונאט: פילוח לפי סטטוס ----
  // items: [{label, value, color}]
  function renderDonutChart(container, { items, size = 200, strokeWidth = 28 }) {
    clear(container);
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    const radius = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * radius;

    const holder = document.createElement("div");
    holder.className = "donut-holder";

    const svg = el("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, class: "chart-svg" });

    svg.appendChild(
      el("circle", {
        cx, cy, r: radius, fill: "none", stroke: "var(--border)", "stroke-width": strokeWidth,
      })
    );

    let offset = 0;
    items.forEach((it) => {
      const frac = it.value / total;
      const dash = frac * circumference;
      const circle = el("circle", {
        cx, cy, r: radius, fill: "none", stroke: it.color,
        "stroke-width": strokeWidth,
        "stroke-dasharray": `${dash} ${circumference - dash}`,
        "stroke-dashoffset": -offset,
        transform: `rotate(-90 ${cx} ${cy})`,
        class: "donut-segment",
      });
      const titleEl = document.createElementNS(SVG_NS, "title");
      titleEl.textContent = `${it.label}: ${it.value} (${Math.round(frac * 100)}%)`;
      circle.appendChild(titleEl);
      svg.appendChild(circle);
      offset += dash;
    });

    const centerText = document.createElementNS(SVG_NS, "text");
    centerText.setAttribute("x", cx);
    centerText.setAttribute("y", cy - 4);
    centerText.setAttribute("text-anchor", "middle");
    centerText.setAttribute("class", "donut-center-value");
    centerText.textContent = total;
    svg.appendChild(centerText);
    const centerLabel = document.createElementNS(SVG_NS, "text");
    centerLabel.setAttribute("x", cx);
    centerLabel.setAttribute("y", cy + 16);
    centerLabel.setAttribute("text-anchor", "middle");
    centerLabel.setAttribute("class", "donut-center-label");
    centerLabel.textContent = "סה\"כ";
    svg.appendChild(centerLabel);

    holder.appendChild(svg);

    const legend = document.createElement("div");
    legend.className = "donut-legend";
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "legend-row";
      row.innerHTML = `<span class="legend-dot" style="background:${it.color}"></span><span>${it.label}</span><span class="legend-value">${it.value}</span>`;
      legend.appendChild(row);
    });
    holder.appendChild(legend);

    container.appendChild(holder);
  }

  window.Charts = { renderLineChart, renderHBarChart, renderDonutChart };
})();
