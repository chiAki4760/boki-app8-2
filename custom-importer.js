/**
 * custom-importer.js
 * テーマ着せ替え窓 ＆ 全5ステージ一括取り込み窓 を自動注入するスクリプト
 */
(function () {
  const STORAGE_KEY_THEME = "boki_custom_theme_data";

  // 1. 保存されたカスタムテーマを即時適用
  function applySavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved) {
        const theme = JSON.parse(saved);
        if (theme.colors) {
          const root = document.documentElement;
          Object.entries(theme.colors).forEach(([k, v]) => root.style.setProperty(k, v));
        }
        if (theme.appTitle) {
          const t = document.getElementById("app-title");
          if (t) t.textContent = theme.appTitle;
          document.title = theme.appTitle;
        }
        if (theme.appLogo) {
          const l = document.getElementById("app-logo");
          if (l) l.textContent = theme.appLogo;
        }
        if (theme.submitBtnText) {
          const b = document.getElementById("submit-btn");
          if (b) b.textContent = theme.submitBtnText;
        }
        if (theme.risingSymbols && typeof THEME !== "undefined") {
          THEME.risingSymbols = theme.risingSymbols;
        }
      }
    } catch (e) {
      console.error("Failed to load saved custom theme", e);
    }
  }

  // 2. detailsエリアに拡張UI（テーマ取り込み ＆ 全ステージ一括取り込み）を注入
  function injectCustomUI() {
    const details = document.querySelector("details");
    if (!details) return;

    // --- テーマ着せ替えブロック ---
    const themeBlock = document.createElement("div");
    themeBlock.style.marginTop = "16px";
    themeBlock.style.paddingTop = "12px";
    themeBlock.style.borderTop = "1px dashed var(--border)";
    themeBlock.innerHTML = `
      <div style="font-size:0.8rem; color:var(--text-muted); font-weight:bold; margin-bottom:6px;">
        🎨 テーマ設定を取り込む (JSON)
      </div>
      <textarea id="theme-json-input" placeholder="AIで生成したtheme.js（または設定JSON）を貼り付けてください" style="width:100%; height:80px; padding:10px; border:1px solid var(--border); border-radius:8px; font-family:monospace; font-size:0.8rem; box-sizing:border-box;"></textarea>
      <button type="button" id="load-theme-btn" class="load-btn" style="width:100%; margin-top:6px; padding:8px; background:var(--primary); color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">テーマを適用</button>
      <button type="button" id="reset-theme-btn" style="width:100%; margin-top:4px; padding:4px; background:none; border:none; color:var(--text-muted); font-size:0.75rem; cursor:pointer; text-decoration:underline;">テーマ設定のみ初期値に戻す</button>
    `;
    details.appendChild(themeBlock);

    // --- 全ステージ（1〜5）一括上書きブロック ---
    const allStagesBlock = document.createElement("div");
    allStagesBlock.style.marginTop = "16px";
    allStagesBlock.style.paddingTop = "12px";
    allStagesBlock.style.borderTop = "1px dashed var(--border)";
    allStagesBlock.innerHTML = `
      <div style="font-size:0.8rem; color:var(--text-muted); font-weight:bold; margin-bottom:6px;">
        📦 全ステージ問題一括取り込み (Stage 1〜5)
      </div>
      <textarea id="all-stages-input" placeholder="AIで生成したquestions.js（const STAGES = [ ... ]）を丸ごと貼り付けてください" style="width:100%; height:90px; padding:10px; border:1px solid var(--border); border-radius:8px; font-family:monospace; font-size:0.8rem; box-sizing:border-box;"></textarea>
      <button type="button" id="load-all-stages-btn" class="load-btn" style="width:100%; margin-top:6px; padding:8px; background:var(--primary); color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">全5ステージの問題を一括更新</button>
    `;
    details.appendChild(allStagesBlock);

    // テーマ適用の処理
    document.getElementById("load-theme-btn").addEventListener("click", () => {
      const val = document.getElementById("theme-json-input").value.trim();
      if (!val) return alert("テーマデータを入力してください。");
      try {
        const clean = val.replace(/^const\s+THEME\s*=\s*/, "").replace(/;$/, "");
        const parsed = JSON.parse(clean);
        localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(parsed));
        alert("テーマを適用しました！");
        location.reload();
      } catch (e) {
        alert("⚠️ テーマJSONの形式を確認してください。");
      }
    });

    document.getElementById("reset-theme-btn").addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY_THEME);
      alert("テーマ設定を初期値に戻しました。");
      location.reload();
    });

    // 全ステージ一括更新の処理（app.jsと連携するように修正）
    document.getElementById("load-all-stages-btn").addEventListener("click", () => {
      const val = document.getElementById("all-stages-input").value.trim();
      if (!val) return alert("問題データを入力してください。");
      try {
        const clean = val.replace(/^const\s+STAGES\s*=\s*/, "").replace(/;$/, "");
        const parsed = JSON.parse(clean);

        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();

        // app.js が読み込むキー「boki_user_stages」に直接保存
        localStorage.setItem("boki_user_stages", JSON.stringify(parsed));

        // 過去の個別ステージキャッシュが邪魔しないようクリア
        for (let i = 0; i < 10; i++) {
          localStorage.removeItem(`boki_user_st${i}_data`);
        }

        alert("全ステージ（Level 1〜5）の問題を一括更新しました！");
        location.reload();
      } catch (e) {
        alert("⚠️ 問題データの形式を確認してください。STAGES配列のコードを貼り付けてください。");
      }
    });
  }
    
    

  window.addEventListener("DOMContentLoaded", () => {
    applySavedTheme();
    injectCustomUI();
  });
})();
