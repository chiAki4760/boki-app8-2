/**
 * custom-importer.js
 * テーマ着せ替え窓 ＆ 全5ステージ一括取り込み窓 を自動注入するスクリプト（完全強化版）
 */
(function () {
  const STORAGE_KEY_THEME = "boki_custom_theme_data";

  function applySavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved) {
        const theme = JSON.parse(saved);
        const root = document.documentElement;

        // 1. Webフォント読み込み
        if (theme.fontUrl) {
          let fontLink = document.getElementById("theme-font-link");
          if (!fontLink) {
            fontLink = document.createElement("link");
            fontLink.id = "theme-font-link";
            fontLink.rel = "stylesheet";
            document.head.appendChild(fontLink);
          }
          fontLink.href = theme.fontUrl;
        }

        // 2. フォントファミリのみ安全に注入（文字色は壊さない）
        if (theme.fontMain) {
          let styleOverride = document.getElementById("theme-font-override");
          if (!styleOverride) {
            styleOverride = document.createElement("style");
            styleOverride.id = "theme-font-override";
            document.head.appendChild(styleOverride);
          }
          styleOverride.textContent = `
            body, button, input, textarea, select, .story-text, .side-title, .question-label, .card, .container, .stage-btn, .nav-btn {
              font-family: ${theme.fontMain} !important;
            }
            .logo-title, .btn-submit {
              font-family: ${theme.fontTitle || theme.fontMain} !important;
            }
          `;
        }

        // 3. カラー変数・グラデーション・発光の一括注入
        if (theme.colors) {
          Object.entries(theme.colors).forEach(([k, v]) => root.style.setProperty(k, v));
        }

        // 4. 透かし刻印・透かし色
        if (theme.cardWatermark) {
          root.style.setProperty("--card-watermark", `"${theme.cardWatermark}"`);
        }
        if (theme.watermarkColor) {
          root.style.setProperty("--watermark-color", theme.watermarkColor);
        }

        // 5. テキスト・ロゴ・ボタン
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
      console.error("Failed to load custom theme", e);
    }
  }

  function injectCustomUI() {
    const details = document.querySelector("details");
    if (!details) return;

    // --- 窓1: テーマ着せ替えブロック ---
    const themeBlock = document.createElement("div");
    themeBlock.style.marginTop = "16px";
    themeBlock.style.paddingTop = "12px";
    themeBlock.style.borderTop = "1px dashed var(--border)";
    themeBlock.innerHTML = `
      <div style="font-size:0.8rem; font-weight:bold; margin-bottom:6px;">
        🎨 テーマ設定を取り込む (JSON)
      </div>
      <textarea id="theme-json-input" placeholder="AIで生成したtheme.js（または設定JSON）を貼り付けてください" style="width:100%; height:80px; padding:10px; border:1px solid var(--border); border-radius:8px; font-family:monospace; font-size:0.8rem; box-sizing:border-box;"></textarea>
      <button type="button" id="load-theme-btn" class="load-btn" style="width:100%; margin-top:6px; padding:9px; background:var(--primary); color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">テーマを適用</button>
      <button type="button" id="reset-theme-btn" style="width:100%; margin-top:4px; padding:4px; background:none; border:none; color:inherit; opacity:0.7; font-size:0.75rem; cursor:pointer; text-decoration:underline;">テーマ設定のみ初期値に戻す</button>
    `;
    details.appendChild(themeBlock);

    // --- 窓2: 全ステージ一括問題更新ブロック ---
    const allStagesBlock = document.createElement("div");
    allStagesBlock.style.marginTop = "16px";
    allStagesBlock.style.paddingTop = "12px";
    allStagesBlock.style.borderTop = "1px dashed var(--border)";
    allStagesBlock.innerHTML = `
      <div style="font-size:0.8rem; font-weight:bold; margin-bottom:6px;">
        📦 全ステージ問題一括取り込み (Stage 1〜5)
      </div>
      <textarea id="all-stages-input" placeholder="AIで生成した問題JSON（[ で始まり ] で終わる配列、または const STAGES = [...]）を丸ごと貼り付けてください" style="width:100%; height:90px; padding:10px; border:1px solid var(--border); border-radius:8px; font-family:monospace; font-size:0.8rem; box-sizing:border-box;"></textarea>
      <button type="button" id="load-all-stages-btn" class="load-btn" style="width:100%; margin-top:6px; padding:9px; background:var(--primary); color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">全5ステージの問題を一括更新</button>
    `;
    details.appendChild(allStagesBlock);

    // テーマ適用の処理
    document.getElementById("load-theme-btn").addEventListener("click", () => {
      const val = document.getElementById("theme-json-input").value.trim();
      if (!val) return alert("テーマデータを入力してください。");
      try {
        const clean = val.replace(/^(const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*/, "").replace(/;$/, "");
        const parsed = JSON.parse(clean);
        localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(parsed));
        localStorage.setItem("boki_user_theme", JSON.stringify(parsed));
        alert("🎨 テーマ設定を取り込みました！");
        location.reload();
      } catch (e) {
        alert("⚠️ テーマJSONの形式を確認してください。");
      }
    });

    document.getElementById("reset-theme-btn").addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY_THEME);
      localStorage.removeItem("boki_user_theme");
      alert("テーマ設定を初期値に戻しました。");
      location.reload();
    });

    // 全ステージ一括問題更新の処理
    document.getElementById("load-all-stages-btn").addEventListener("click", () => {
      const val = document.getElementById("all-stages-input").value.trim();
      if (!val) return alert("問題データを入力してください。");
      try {
        let clean = val.replace(/^(const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*/, "").replace(/;$/, "");
        const parsed = JSON.parse(clean);

        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();

        localStorage.setItem("boki_user_stages", JSON.stringify(parsed));

        for (let i = 0; i < 10; i++) {
          localStorage.removeItem(`boki_user_st${i}_data`);
        }

        alert("📦 全ステージ（Level 1〜5）の問題を一括更新しました！");
        location.reload();
      } catch (e) {
        alert("⚠️ 問題データの形式を確認してください。配列形式 [ ... ] を貼り付けてください。");
      }
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    applySavedTheme();
    injectCustomUI();
  });
})();
