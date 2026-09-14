let currentStageIndex = 0;
let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongList = [];
let answeredSet = new Set();
let isReviewMode = false;

// テーマ適用（フォント・カラー・タイトル・質感・透かし刻印）
function applyTheme() {
  if (typeof THEME === "undefined") return;

  // 1. Google Fontsなどの外部フォント動的読み込み
  if (THEME.fontUrl) {
    let fontLink = document.getElementById("theme-font-link");
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.id = "theme-font-link";
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
    }
    fontLink.href = THEME.fontUrl;
  }

  // 2. 画面全体のフォントを強制上書きするスタイルタグを注入
  if (THEME.fontMain) {
    let styleOverride = document.getElementById("theme-font-override");
    if (!styleOverride) {
      styleOverride = document.createElement("style");
      styleOverride.id = "theme-font-override";
      document.head.appendChild(styleOverride);
    }
    styleOverride.textContent = `
      body, button, input, textarea, select, .story-text, .side-title, .logo-title, .question-label, .card, .container {
        font-family: ${THEME.fontMain} !important;
      }
    `;
  }

  const root = document.documentElement;

  // 3. カラー変数の適用
  if (THEME.colors) {
    Object.entries(THEME.colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  // 4. カードの透かし刻印とカラーの適用
  if (THEME.cardWatermark) {
    root.style.setProperty("--card-watermark", `"${THEME.cardWatermark}"`);
  }
  if (THEME.watermarkColor) {
    root.style.setProperty("--watermark-color", THEME.watermarkColor);
  }

  // 5. テキスト・ロゴ等の適用
  const appTitleEl = document.getElementById("app-title");
  const appLogoEl = document.getElementById("app-logo");
  const submitBtnEl = document.getElementById("submit-btn");
  const pageTitleEl = document.getElementById("page-title");

  if (appTitleEl && THEME.appTitle) appTitleEl.textContent = THEME.appTitle;
  if (pageTitleEl && THEME.appTitle) pageTitleEl.textContent = THEME.appTitle;
  if (appLogoEl && THEME.appLogo) appLogoEl.textContent = THEME.appLogo;
  if (submitBtnEl && THEME.submitBtnText) submitBtnEl.textContent = THEME.submitBtnText;
}

// 初期化（保存されたカスタムテーマ・問題を復元）
function init() {
  // 1. 保存済みテーマがあれば復元
  try {
    const savedTheme = localStorage.getItem("boki_custom_theme_data") || localStorage.getItem("boki_user_theme");
    if (savedTheme) {
      THEME = JSON.parse(savedTheme);
    }
  } catch (e) {}

  applyTheme();

  // 2. 保存済み問題データ（全ステージ）があれば復元
  try {
    const savedStages = localStorage.getItem("boki_user_stages");
    if (savedStages) {
      const parsed = JSON.parse(savedStages);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((stage, idx) => {
          if (STAGES[idx]) {
            if (stage.title) STAGES[idx].title = stage.title;
            if (stage.questions) STAGES[idx].questions = stage.questions;
          } else {
            STAGES.push(stage);
          }
        });
      }
    }
  } catch (e) {}

  // 3. 進行中のステージ番号を復元
  const savedStage = localStorage.getItem("boki_user_current_stage");
  currentStageIndex = savedStage ? parseInt(savedStage, 10) : 0;
  if (currentStageIndex < 0 || currentStageIndex >= STAGES.length) currentStageIndex = 0;

  loadStage(currentStageIndex);
}

function switchStage(stageIdx) {
  if (stageIdx === currentStageIndex && !isReviewMode) return;
  loadStage(stageIdx);
}

function loadStage(stageIdx) {
  currentStageIndex = stageIdx;
  localStorage.setItem("boki_user_current_stage", currentStageIndex);

  for (let i = 0; i < STAGES.length; i++) {
    const btn = document.getElementById(`tab-${i}`);
    if (btn) {
      if (i === stageIdx) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  }

  const stageObj = STAGES[stageIdx];
  const badgeEl = document.getElementById("stage-badge-text");
  const subTitleEl = document.getElementById("sub-title");
  if (badgeEl) badgeEl.textContent = stageObj.title;
  if (subTitleEl) subTitleEl.textContent = `〜 ${stageObj.title} 〜`;

  // 個別ステージの保存データがあれば優先
  let stageData = stageObj.questions;
  try {
    const customSingleStage = localStorage.getItem(`boki_user_st${stageIdx}_data`);
    if (customSingleStage) {
      const parsed = JSON.parse(customSingleStage);
      if (Array.isArray(parsed) && parsed.length > 0) stageData = parsed;
    }
  } catch (e) {}

  currentQuestions = [...stageData];
  currentIndex = 0;
  correctCount = 0;
  wrongList = [];
  isReviewMode = false;
  answeredSet.clear();

  const quizArea = document.getElementById("quiz-area");
  const clearArea = document.getElementById("clear-area");
  if (quizArea) quizArea.style.display = "block";
  if (clearArea) clearArea.style.display = "none";

  loadQuestion(0);
}

function createRowHTML(account = "", amount = "") {
  const div = document.createElement("div");
  div.className = "entry-row";
  div.innerHTML = `
    <input type="text" placeholder="科目" value="${account}">
    <input type="number" placeholder="金額" value="${amount}">
    <button type="button" class="btn-remove" onclick="removeRow(this)">✕</button>
  `;
  return div;
}

function addRow(side) {
  const container = document.getElementById(`${side}-rows`);
  if (container) container.appendChild(createRowHTML());
}

function removeRow(btn) {
  const row = btn.closest(".entry-row");
  if (row && row.parentElement && row.parentElement.children.length > 1) {
    row.remove();
  } else {
    alert("最低1行は必要です。");
  }
}

function loadQuestion(index) {
  if (!currentQuestions || currentQuestions.length === 0) return;
  if (index < 0 || index >= currentQuestions.length) index = 0;
  currentIndex = index;

  const tag = document.getElementById("status-tag");
  if (tag) {
    if (isReviewMode) {
      tag.textContent = "復習モード";
      tag.className = "status-badge review";
    } else {
      tag.textContent = "演習中";
      tag.className = "status-badge";
    }
  }

  const prefix = isReviewMode ? "復習" : `Stage ${currentStageIndex + 1}`;
  const qNumEl = document.getElementById("q-number");
  const storyEl = document.getElementById("story-display");
  if (qNumEl) qNumEl.textContent = `${prefix} // ${index + 1} / ${currentQuestions.length}`;
  if (storyEl) storyEl.textContent = currentQuestions[index].story;

  const debitRows = document.getElementById("debit-rows");
  const creditRows = document.getElementById("credit-rows");
  if (debitRows) debitRows.innerHTML = "";
  if (creditRows) creditRows.innerHTML = "";
  addRow("debit");
  addRow("credit");

  const res = document.getElementById("result-display");
  if (res) {
    res.style.display = "none";
    res.className = "result-box";
  }
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.style.display = "block";

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) {
    nextBtn.textContent = (currentIndex === currentQuestions.length - 1) ? "結果を見る" : "次へ ▶";
  }

  const percent = Math.round(((index + 1) / currentQuestions.length) * 100);
  const fillEl = document.getElementById("progress-fill");
  const textEl = document.getElementById("progress-text");
  if (fillEl) fillEl.style.width = percent + "%";
  if (textEl) textEl.textContent = `${index + 1} / ${currentQuestions.length} 問 (${percent}%)`;

  const firstDebitInput = document.querySelector("#debit-rows input[type='text']");
  if (firstDebitInput) firstDebitInput.focus();
}

function getEntries(side) {
  const container = document.getElementById(`${side}-rows`);
  if (!container) return [];
  const rows = container.children;
  const entries = [];
  for (let row of rows) {
    const inputs = row.querySelectorAll("input");
    if (inputs.length >= 2) {
      const account = inputs[0].value.trim();
      const amount = parseInt(inputs[1].value, 10);
      if (account && !isNaN(amount)) entries.push({ account, amount });
    }
  }
  return entries;
}

function spawnRisingMagic() {
  const symbols = (typeof THEME !== "undefined" && THEME.risingSymbols) ? THEME.risingSymbols : ["✨", "⭕", "🎉"];
  const totalItems = 25;
  for (let i = 0; i < totalItems; i++) {
    const item = document.createElement("div");
    item.className = "rising-item";
    item.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    item.style.left = (Math.random() * 92 + 4) + "vw";
    
    const driftX = (Math.random() * 80 - 40) + "px";
    item.style.setProperty("--drift", driftX);

    const size = Math.random() * 16 + 20;
    const duration = Math.random() * 1.5 + 2.0;
    const delay = Math.random() * 0.4;

    item.style.fontSize = size + "px";
    item.style.animationDuration = duration + "s";
    item.style.animationDelay = delay + "s";

    document.body.appendChild(item);
    setTimeout(() => { item.remove(); }, (duration + delay) * 1000);
  }
}

function triggerShake() {
  const container = document.getElementById("mainContainer");
  if (!container) return;
  container.classList.remove("shake-animation");
  void container.offsetWidth;
  container.classList.add("shake-animation");
  setTimeout(() => { container.classList.remove("shake-animation"); }, 500);
}

function checkAnswer() {
  const q = currentQuestions[currentIndex];
  const userDebit = getEntries("debit");
  const userCredit = getEntries("credit");

  const normalize = d => Array.isArray(d) ? d : [d];
  const cDebit = normalize(q.debit);
  const cCredit = normalize(q.credit);

  const matchSide = (u, c) => {
    if (u.length !== c.length) return false;
    const sU = [...u].sort((a,b) => a.account.localeCompare(b.account) || a.amount - b.amount);
    const sC = [...c].sort((a,b) => a.account.localeCompare(b.account) || a.amount - b.amount);
    return sU.every((v, i) => v.account === sC[i].account && v.amount === sC[i].amount);
  };

  const isOk = matchSide(userDebit, cDebit) && matchSide(userCredit, cCredit);
  const res = document.getElementById("result-display");
  if (res) res.style.display = "block";

  if (isOk) {
    spawnRisingMagic();
    if (res) {
      res.className = "result-box correct";
      res.innerHTML = `<strong>正解！</strong><br>${q.explanation}`;
    }
    if (!answeredSet.has(currentIndex)) {
      correctCount++;
      if (isReviewMode) wrongList = wrongList.filter(item => item.story !== q.story);
      answeredSet.add(currentIndex);
    }
  } else {
    triggerShake();
    if (res) {
      res.className = "result-box wrong";
      const dStr = cDebit.map(d => `(${d.account}: ${d.amount.toLocaleString()}円)`).join(" ");
      const cStr = cCredit.map(c => `(${c.account}: ${c.amount.toLocaleString()}円)`).join(" ");
      res.innerHTML = `<strong>不正解</strong><br>正解 借方: ${dStr}<br>正解 貸方: ${cStr}<br><br>${q.explanation}`;
    }
    if (!answeredSet.has(currentIndex)) {
      if (!wrongList.some(item => item.story === q.story)) wrongList.push(q);
      answeredSet.add(currentIndex);
    }
  }
}

function prevQuestion() { if (currentIndex > 0) loadQuestion(currentIndex - 1); }
function nextQuestion() {
  if (currentIndex < currentQuestions.length - 1) loadQuestion(currentIndex + 1);
  else showClearScreen();
}

function showClearScreen() {
  const quizArea = document.getElementById("quiz-area");
  const clearArea = document.getElementById("clear-area");
  if (quizArea) quizArea.style.display = "none";
  if (clearArea) clearArea.style.display = "block";

  const total = currentQuestions.length;
  const badgeArea = document.getElementById("complete-badge-area");
  const scoreText = document.getElementById("score-text");
  const revArea = document.getElementById("review-btn-area");

  if (badgeArea) badgeArea.innerHTML = "";
  if (revArea) revArea.innerHTML = "";

  if (wrongList.length === 0) {
    spawnRisingMagic();
    if (badgeArea) badgeArea.innerHTML = `<div style="display:inline-block; padding:6px 14px; background:#dcfce7; border:1px solid #86efac; border-radius:6px; font-weight:bold; color:#166534; margin-bottom:12px;">全問正解達成！</div>`;
    if (scoreText) scoreText.innerHTML = `おめでとうございます！全問正解です。 (${total}/${total})`;
  } else {
    if (scoreText) scoreText.innerHTML = `${total} 問中 ${correctCount} 問 正解。<br>間違えた問題が ${wrongList.length} 問 あります。`;
    const btn = document.createElement("button");
    btn.className = "btn-review";
    btn.textContent = `間違えた問題だけ復習する (${wrongList.length}問)`;
    btn.onclick = () => {
      isReviewMode = true;
      currentQuestions = [...wrongList];
      currentIndex = 0;
      correctCount = 0;
      answeredSet.clear();
      if (quizArea) quizArea.style.display = "block";
      if (clearArea) clearArea.style.display = "none";
      loadQuestion(0);
    };
    if (revArea) revArea.appendChild(btn);
  }
}

function startFreshStage() {
  loadStage(currentStageIndex);
}

function forceReset() {
  if (confirm("取り込んだテーマと問題をすべて初期化し、配布時の基本状態に戻しますか？")) {
    localStorage.clear();
    location.reload();
  }
}

// 🎨 テーマ設定を取り込む
function loadCustomTheme() {
  const input = document.getElementById("theme-input") || document.getElementById("json-theme-input");
  if (!input || !input.value.trim()) {
    alert("テーマJSONデータを貼り付けてください。");
    return;
  }
  try {
    const data = JSON.parse(input.value.trim());
    THEME = data;
    localStorage.setItem("boki_user_theme", JSON.stringify(data));
    localStorage.setItem("boki_custom_theme_data", JSON.stringify(data));
    applyTheme();
    alert("🎨 テーマ設定を取り込みました！ホーム画面から開いてもこのテーマが維持されます。");
  } catch (e) {
    alert("⚠️ テーマJSONの形式を確認してください。");
  }
}

// 📦 問題データを取り込む
function loadCustomData() {
  const input = document.getElementById("json-input");
  if (!input || !input.value.trim()) {
    alert("問題JSONデータを貼り付けてください。");
    return;
  }
  try {
    const data = JSON.parse(input.value.trim());
    if (Array.isArray(data) && data.length > 0) {
      if (data[0].questions) {
        window.STAGES = data;
        localStorage.setItem("boki_user_stages", JSON.stringify(data));
        loadStage(0);
        alert(`📦 全${data.length}ステージの問題を取り込みました！`);
      } else {
        STAGES[currentStageIndex].questions = data;
        localStorage.setItem(`boki_user_st${currentStageIndex}_data`, JSON.stringify(data));
        loadStage(currentStageIndex);
        alert(`📦 Stage ${currentStageIndex + 1} の問題を更新しました！`);
      }
    } else {
      throw new Error();
    }
  } catch (e) {
    alert("⚠️ 問題JSONの形式を確認してください。");
  }
}

window.addEventListener("DOMContentLoaded", init);

document.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  const clearArea = document.getElementById("clear-area");
  if (clearArea && clearArea.style.display === "block") return;

  if (e.key === "ArrowRight") {
    nextQuestion();
  } else if (e.key === "ArrowLeft") {
    prevQuestion();
  }
});
