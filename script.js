
const resources = ["muscle", "agility", "tech", "intellect", "spirit"];
const resourceLabels = { muscle:"筋", agility:"敏", tech:"技", intellect:"知", spirit:"精" };
const hintDiscount = {0:0, 1:0.5, 2:0.6, 3:0.7, 4:0.8, 5:0.9};

const state = {
  hints: {},
  obtained: new Set()
};

function baseName(name) {
  return name.replace(/[○◎]$/, "");
}
function suffixOf(name) {
  const m = name.match(/[○◎]$/);
  return m ? m[0] : "";
}
function renderName(name) {
  const suffix = suffixOf(name);
  if (!suffix) return escapeHtml(name);
  return `<span class="skill-name">${escapeHtml(name.slice(0, -1))}<span class="suffix">${suffix}</span></span>`;
}
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function getHint(skill) {
  return Number(state.hints[baseName(skill.name)] || 0);
}
function discountedCost(skill) {
  const lv = getHint(skill);
  const factor = 1 - (hintDiscount[lv] || 0);
  const out = {};
  for (const r of resources) out[r] = Math.floor(skill.cost[r] * factor);
  return out;
}
function costSum(cost) {
  return resources.reduce((a,r)=>a + Number(cost[r] || 0), 0);
}
function canAfford(cost, points) {
  return resources.every(r => cost[r] <= points[r]);
}
function subtract(cost, points) {
  for (const r of resources) points[r] -= cost[r];
}
function addCost(cost, points) {
  for (const r of resources) points[r] += cost[r];
}
function pointsFromInputs() {
  const p = {};
  for (const r of resources) p[r] = Math.max(0, Number(document.getElementById(r).value || 0));
  return p;
}

function renderTable() {
  const tbody = document.querySelector("#skillTable tbody");
  const q = document.getElementById("search").value.trim();
  tbody.innerHTML = "";
  for (const skill of SKILLS) {
    if (q && !skill.name.includes(q)) continue;
    const tr = document.createElement("tr");
    const cost = discountedCost(skill);
    const appraisal = skill.appraisal === null ? `<span class="appraisal-none">${escapeHtml(skill.appraisalLabel || "調査中")}</span>` : skill.appraisal;
    tr.innerHTML = `
      <td>${skill.no}</td>
      <td>${renderName(skill.name)}</td>
      <td>${skill.requires ? renderName(skill.requires) : "-"}</td>
      <td>
        <select class="hint-select" data-base="${escapeHtml(baseName(skill.name))}">
          ${[0,1,2,3,4,5].map(lv => `<option value="${lv}" ${getHint(skill)==lv?"selected":""}>Lv${lv}</option>`).join("")}
        </select>
      </td>
      <td><input type="checkbox" class="obtained-check" data-name="${escapeHtml(skill.name)}" ${state.obtained.has(skill.name)?"checked":""}></td>
      ${resources.map(r => `<td class="${cost[r]===0?"cost-zero":""}">${cost[r]}</td>`).join("")}
      <td>${appraisal}</td>
    `;
    tbody.appendChild(tr);
  }
}

function syncHint(base, lv) {
  state.hints[base] = Number(lv);
  renderTable();
}
function toggleObtained(name, checked) {
  if (checked) state.obtained.add(name); else state.obtained.delete(name);
  renderTable();
}

function calculateGreedy() {
  const points = pointsFromInputs();
  const remaining = {...points};
  const selected = new Set(state.obtained);
  const plan = [];
  let totalAppraisal = 0;

  // Greedy with prerequisites. Repeat while a useful affordable skill exists.
  while (true) {
    let best = null;
    for (const skill of SKILLS) {
      if (selected.has(skill.name)) continue;
      if (skill.appraisal === null || Number(skill.appraisal) <= 0) continue;
      if (skill.requires && !selected.has(skill.requires)) continue;
      const cost = discountedCost(skill);
      if (!canAfford(cost, remaining)) continue;
      const sum = Math.max(1, costSum(cost));
      const score = Number(skill.appraisal) / sum;
      if (!best || score > best.score || (score === best.score && skill.no < best.skill.no)) {
        best = {skill, cost, sum, score};
      }
    }
    if (!best) break;
    selected.add(best.skill.name);
    subtract(best.cost, remaining);
    totalAppraisal += Number(best.skill.appraisal);
    plan.push(best);
  }
  renderResult(plan, points, remaining, totalAppraisal);
}

function renderResult(plan, start, remaining, totalAppraisal) {
  const summary = document.getElementById("summary");
  const result = document.getElementById("result");
  const spent = {};
  for (const r of resources) spent[r] = start[r] - remaining[r];

  summary.innerHTML = `
    <b>合計査定：</b>${totalAppraisal}
    <br><b>使用経験点：</b>${resources.map(r => `${resourceLabels[r]}${spent[r]}`).join(" / ")}
    <br><b>残り経験点：</b>${resources.map(r => `${resourceLabels[r]}${remaining[r]}`).join(" / ")}
    <br><span class="hint">※現在は高速に使える貪欲計算です。査定値や仕様が固まったら、より厳密な最適化に差し替え可能です。</span>
  `;

  if (plan.length === 0) {
    result.innerHTML = `<p class="hint">取得候補がありません。経験点・コツLv・取得済み能力を確認してください。</p>`;
    return;
  }

  result.innerHTML = `<div class="result-list">` + plan.map((item, i) => {
    const costText = resources.map(r => `${resourceLabels[r]}${item.cost[r]}`).join(" / ");
    return `
      <div class="result-item">
        <div>
          <b>${i+1}. ${renderName(item.skill.name)}</b>
          <div class="meta">必要：${costText} / 査定：${item.skill.appraisal} / 効率：${item.score.toFixed(3)}</div>
        </div>
        <span class="badge">+${item.skill.appraisal}</span>
      </div>
    `;
  }).join("") + `</div>`;
}

function resetInputs() {
  for (const r of resources) document.getElementById(r).value = 0;
  state.obtained.clear();
  state.hints = {};
  renderTable();
  document.getElementById("summary").textContent = "経験点を入力して「計算する」を押してください。";
  document.getElementById("result").innerHTML = "";
}

document.addEventListener("change", (e) => {
  if (e.target.classList.contains("hint-select")) syncHint(e.target.dataset.base, e.target.value);
  if (e.target.classList.contains("obtained-check")) toggleObtained(e.target.dataset.name, e.target.checked);
});
document.getElementById("search").addEventListener("input", renderTable);
document.getElementById("calcBtn").addEventListener("click", calculateGreedy);
document.getElementById("resetBtn").addEventListener("click", resetInputs);

renderTable();
