export default defineContentScript({
  matches: [
    "*://www.toshin.com/*",
    "*://archive.toshin.com/*",
    "*://www.toshin-kakomon.com/*",
  ],
  main() {
    console.log("東進過去問ダウンローダー開始");

    // UIを作成してページに追加
    createDownloadUI();
  },
});

// 教科名のマッピング
const SUBJECTS = {
  英語: /^英語(\s*\(\d+\))?([Ａ-ＺⅢⅠⅡ一二三]|\s*)?$/,
  国語: /^国語(\s*\(\d+\))?([Ａ-ＺⅢⅠⅡ一二三]|\s*)?$/,
  数学: /^数学(\s*\(\d+\))?([Ａ-ＺⅢⅠⅡ一二三]|\s*)?$/,
  物理: /^物理(\s*\(\d+\))?([Ａ-ＺⅢⅠⅡ一二三]|\s*)?$/,
  化学: /^化学(\s*\(\d+\))?([Ａ-ＺⅢⅠⅡ一二三]|\s*)?$/,
  生物: /^生物(\s*\(\d+\))?([Ａ-ＺⅢⅠⅡ一二三]|\s*)?$/,
  日本史: /^日本史(\s*\(\d+\))?([Ａ-ＺⅢⅠⅡ一二三]|\s*)?$/,
  世界史: /^世界史(\s*\(\d+\))?([Ａ-ＺⅢⅠⅡ一二三]|\s*)?$/,
  政治経済: /^政治[・･]?経済(\s*\(\d+\))?([Ａ-ＺⅢⅠⅡ一二三]|\s*)?$/,
};

function createDownloadUI() {
  // 既存のUIがあれば削除
  const existingUI = document.getElementById("toshin-download-ui");
  if (existingUI) existingUI.remove();

  // UIコンテナを作成
  const uiContainer = document.createElement("div");
  uiContainer.id = "toshin-download-ui";
  uiContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 320px;
    background: white;
    border: 2px solid #0066cc;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
  `;

  uiContainer.innerHTML = `
    <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
      <h3 style="margin: 0 0 5px 0; color: #0066cc; font-size: 16px;">📚 東進過去問ダウンローダー</h3>
      <p style="margin: 0; font-size: 12px; color: #666;">教科を選択してまとめてダウンロード</p>
    </div>
    
    <div style="margin-bottom: 15px;">
      <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">📖 対象教科:</label>
      <div style="margin-bottom: 8px;">
        <button id="select-all" style="padding: 3px 8px; margin-right: 5px; background: #e6f3ff; border: 1px solid #0066cc; border-radius: 3px; cursor: pointer; font-size: 11px;">全選択</button>
        <button id="deselect-all" style="padding: 3px 8px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; font-size: 11px;">全解除</button>
      </div>
      <div id="subject-checkboxes" style="max-height: 140px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #fafafa;">
        ${Object.keys(SUBJECTS)
          .map(
            (subject) => `
          <label style="display: flex; align-items: center; margin-bottom: 6px; cursor: pointer; padding: 2px; border-radius: 3px;" 
                 onmouseover="this.style.background='#e6f3ff'" onmouseout="this.style.background='transparent'">
            <input type="checkbox" value="${subject}" style="margin-right: 8px; transform: scale(1.1);" checked>
            <span style="font-size: 13px;">${subject}</span>
          </label>
        `
          )
          .join("")}
      </div>
    </div>
    
    <!-- 保存フォルダ名の入力は一時的に無効化 -->
    <div style="display:none; margin-bottom: 15px;" aria-hidden="true">
      <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">📁 保存フォルダ名:</label>
      <input type="text" id="folder-name" value="東進過去問" 
             style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" 
             placeholder="フォルダ名を入力">
      <div style="font-size: 11px; color: #666; margin-top: 3px;">※ブラウザのダウンロードフォルダ内に作成されます</div>
      <label style="display: block; margin-top:8px; font-size:12px; color:#666;">
        <input type="checkbox" id="debug-log" style="margin-right:6px;"> デバッグログ(コンソールに詳細出力)
      </label>
    </div>
    
    <div style="margin-bottom: 15px;">
      <button id="start-download" 
              style="width: 100%; padding: 12px; background: linear-gradient(135deg, #0066cc, #004499); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">
        🚀 ダウンロード開始
      </button>
    </div>
    
    <div id="progress-info" style="display: none; margin-bottom: 15px;">
      <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px;">
        <div id="progress-text" style="font-size: 13px; color: #495057; margin-bottom: 8px; font-weight: 500;"></div>
        <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
          <div id="progress-bar" style="background: linear-gradient(90deg, #28a745, #20c997); height: 100%; border-radius: 4px; width: 0%; transition: width 0.5s ease;"></div>
        </div>
        <div id="progress-details" style="font-size: 11px; color: #6c757d; margin-top: 4px;"></div>
      </div>
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 11px; color: #999;">v1.0</div>
      <button id="close-ui" 
              style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; transition: background 0.3s;">
        ✕ 閉じる
      </button>
    </div>
  `;

  // ページに追加
  document.body.appendChild(uiContainer);

  // イベントリスナーを設定
  setupEventListeners(uiContainer);
}

function setupEventListeners(container: HTMLElement) {
  const startButton = container.querySelector(
    "#start-download"
  ) as HTMLButtonElement;
  const closeButton = container.querySelector("#close-ui") as HTMLButtonElement;
  const selectAllButton = container.querySelector(
    "#select-all"
  ) as HTMLButtonElement;
  const deselectAllButton = container.querySelector(
    "#deselect-all"
  ) as HTMLButtonElement;

  // 全選択ボタン
  selectAllButton.addEventListener("click", () => {
    const checkboxes = container.querySelectorAll(
      '#subject-checkboxes input[type="checkbox"]'
    ) as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => (checkbox.checked = true));
  });

  // 全解除ボタン
  deselectAllButton.addEventListener("click", () => {
    const checkboxes = container.querySelectorAll(
      '#subject-checkboxes input[type="checkbox"]'
    ) as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((checkbox) => (checkbox.checked = false));
  });

  startButton.addEventListener("click", async () => {
    const selectedSubjects = Array.from(
      container.querySelectorAll("#subject-checkboxes input:checked")
    ).map((input) => (input as HTMLInputElement).value);

    // folder-name input is hidden/disabled; get safely with fallback
    const folderInput = container.querySelector(
      "#folder-name"
    ) as HTMLInputElement | null;
    const folderName = folderInput?.value?.trim() || "東進過去問";

    if (selectedSubjects.length === 0) {
      alert("少なくとも1つの教科を選択してください。");
      return;
    }

    startButton.disabled = true;
    startButton.textContent = "⏳ ダウンロード中...";
    startButton.style.background = "#6c757d";

    const debug =
      (container.querySelector("#debug-log") as HTMLInputElement)?.checked ===
      true;
    if (debug) console.log("[TDL] デバッグモード ON");
    try {
      await downloadToshinPapers(
        selectedSubjects,
        folderName,
        container,
        debug
      );
    } catch (error) {
      console.error("ダウンロードエラー:", error);
      alert(
        "ダウンロード中にエラーが発生しました。コンソールを確認してください。"
      );
    } finally {
      startButton.disabled = false;
      startButton.textContent = "🚀 ダウンロード開始";
      startButton.style.background =
        "linear-gradient(135deg, #0066cc, #004499)";
    }
  });

  closeButton.addEventListener("click", () => {
    container.remove();
  });

  // ホバー効果
  startButton.addEventListener("mouseenter", () => {
    if (!startButton.disabled) {
      startButton.style.background =
        "linear-gradient(135deg, #0052a3, #003366)";
    }
  });

  startButton.addEventListener("mouseleave", () => {
    if (!startButton.disabled) {
      startButton.style.background =
        "linear-gradient(135deg, #0066cc, #004499)";
    }
  });

  closeButton.addEventListener("mouseenter", () => {
    closeButton.style.background = "#5a6268";
  });

  closeButton.addEventListener("mouseleave", () => {
    closeButton.style.background = "#6c757d";
  });
}

async function downloadToshinPapers(
  selectedSubjects: string[],
  folderName: string,
  uiContainer: HTMLElement,
  debug: boolean = false
) {
  const progressInfo = uiContainer.querySelector(
    "#progress-info"
  ) as HTMLElement;
  const progressText = uiContainer.querySelector(
    "#progress-text"
  ) as HTMLElement;
  const progressBar = uiContainer.querySelector("#progress-bar") as HTMLElement;

  progressInfo.style.display = "block";
  progressText.textContent = "問題を検索中...";
  progressBar.style.width = "0%";

  const yearMatch = document.title.match(/(\d{4})年度/);
  const year = yearMatch ? yearMatch[1] : "XXXX";

  // 全aタグ抽出
  const aTags = Array.from(document.querySelectorAll("a"));
  const results: any[] = [];
  const candidates: any[] = [];

  aTags.forEach((a) => {
    // 緩やかなマッチ: テキストに「問題PDF」または「問題」含む、hrefにquestionや/ebwを含む
    const text = a.textContent || "";
    const href = a.href || "";
    const looksLikeQuestion =
      /問題\s*PDF|問題/.test(text) ||
      /question\/?$/i.test(href) ||
      /\/ebw\//.test(href);
    if (looksLikeQuestion) {
      // collect context for debugging
      const contextNearestCell = (a.closest &&
        (a.closest("td") || a.closest("th"))) as Element | null;
      const contextTr = (a.closest && a.closest("tr")) as Element | null;
      const parent = a.parentElement;
      const contextSiblings = parent
        ? Array.from(parent.children)
            .slice(0, 5)
            .map((el) => el.textContent?.trim() || "")
        : [];
      const contextHeadings: string[] = [];
      {
        let node: Element | null = a as Element;
        while ((node = node.parentElement)) {
          const hs = Array.from(
            node.querySelectorAll("h2,h3,.exam-block-title")
          ).map((h) => h.textContent?.trim() || "");
          if (hs.length) {
            contextHeadings.push(...hs);
            break;
          }
        }
      }
      candidates.push({
        href,
        text,
        nearestCellText: contextNearestCell?.textContent?.trim(),
        trTexts: contextTr
          ? Array.from(contextTr.querySelectorAll("td,th")).map(
              (x) => x.textContent?.trim() || ""
            )
          : [],
        siblings: contextSiblings,
        headings: contextHeadings,
        anchorHtml: a.outerHTML,
      });
      // subject: 選択された教科にマッチするかチェック
      // subject推定: まず直近のtd/thセル, 次に行全体, 次に前後の兄弟要素, 最後に祖先の見出し(h2/h3)
      let subject = "";
      const tryFindInTexts = (texts: string[]) => {
        for (const selectedSubject of selectedSubjects) {
          const regex = SUBJECTS[selectedSubject as keyof typeof SUBJECTS];
          if (texts.some((t) => regex.test((t || "").trim())))
            return selectedSubject;
        }
        return "";
      };

      // 1) 直近のセル(td/th)
      const nearestCell = (a.closest &&
        (a.closest("td") || a.closest("th"))) as Element | null;
      if (nearestCell) {
        const t =
          nearestCell.textContent
            ?.split(/\n|\/|\\|：|:|\(|\)/)
            .map((s) => s.trim()) || [];
        subject = tryFindInTexts(t);
      }

      // 2) 行全体のセル: 列インデックス→テーブルのヘッダ(row of th)から教科を試す
      if (!subject) {
        const tr = (a.closest && a.closest("tr")) as HTMLTableRowElement | null;
        if (tr) {
          const cells = Array.from(tr.querySelectorAll("td,th"));
          // find index of the cell that contains the anchor
          const idx = cells.findIndex((cell) => cell.contains(a));
          // try to find header row in the same table
          const table = tr.closest && tr.closest("table");
          let headerTexts: string[] = [];
          if (table) {
            // prefer thead > tr
            let headerRow = table.querySelector("thead tr");
            if (!headerRow) {
              // fallback: find first previous sibling tr that contains th
              const rows = Array.from(table.querySelectorAll("tr"));
              headerRow =
                rows.find((r) => r.querySelectorAll("th").length > 0) || null;
            }
            if (headerRow) {
              headerTexts = Array.from(headerRow.querySelectorAll("th,td")).map(
                (h) => h.textContent?.trim() || ""
              );
            }
          }
          // if headerTexts available and idx valid, test that header text
          if (headerTexts.length && idx >= 0 && idx < headerTexts.length) {
            const candidate = tryFindInTexts([headerTexts[idx]]);
            if (candidate) subject = candidate;
          }
          // fallback: try all cell texts in the row
          if (!subject) {
            const cellTexts = cells.map((x) => x.textContent?.trim() || "");
            subject = tryFindInTexts(cellTexts);
          }
        }
      }

      // 3) 近傍の兄弟要素(前後2要素)
      if (!subject) {
        const parent = a.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children)
            .slice(0, 10)
            .map((el) => el.textContent?.trim() || "");
          subject = tryFindInTexts(siblings);
        }
      }

      // 4) 祖先の見出し(h2,h3,.exam-block-title)
      if (!subject) {
        let node: Element | null = a as Element;
        while ((node = node.parentElement) && !subject) {
          const headings = Array.from(
            node.querySelectorAll("h2,h3,.exam-block-title")
          ).map((h) => h.textContent?.trim() || "");
          subject = tryFindInTexts(headings);
        }
      }

      // 5) 最後の手段: リンクテキスト自体を教科名に変換 (英語->英語など)
      if (!subject) {
        for (const s of selectedSubjects) {
          if ((a.textContent || "").indexOf(s) !== -1) {
            subject = s;
            break;
          }
        }
      }

      // 選択された教科に含まれない場合はスキップ
      if (!subject) return;

      // 学部/方式推定
      let faculty = "";
      let w: Element | null = a as Element;
      while (w && !faculty) {
        const prev: Element | null = w.previousElementSibling;
        if (
          prev &&
          (/^H[1234]$/.test(prev.tagName) ||
            prev.classList.contains("exam-block-title"))
        ) {
          faculty = prev.textContent?.trim() || "";
        }
        w = prev;
      }

      if (!faculty) {
        let node: Element | null = a as Element;
        while ((node = node.parentElement) && !faculty) {
          const h = node.querySelector("h3,h2,.exam-block-title");
          if (h) faculty = h.textContent?.trim() || "";
        }
      }
      if (!faculty) faculty = "unknown";

      results.push({
        year,
        faculty,
        subject,
        pdf: a.href,
        answer: a.href.replace("/question/", "/answer/"),
        originalText: a.textContent,
      });
    }
  });

  // 重複排除
  const uniq: { [key: string]: boolean } = {};
  const uniqResults = results.filter((r) => {
    const key = r.pdf + "-" + r.subject + "-" + r.faculty;
    return uniq[key] ? false : (uniq[key] = true);
  });

  if (uniqResults.length === 0) {
    progressText.textContent = "選択した教科の問題が見つかりませんでした。";
    if (debug) {
      console.log(
        "[TDL] uniqResults empty. scanned links count=",
        aTags.length
      );
      console.log("[TDL] selectedSubjects=", selectedSubjects);
      console.log(
        "[TDL] sample candidate anchors (up to 10):",
        candidates.slice(0, 10)
      );
    }
    return;
  }

  progressText.textContent = `${uniqResults.length}件の問題を発見しました。ダウンロード開始...`;

  for (let i = 0; i < uniqResults.length; i++) {
    const { year, faculty, subject, pdf, answer } = uniqResults[i];
    const progress = ((i + 1) / uniqResults.length) * 100;

    progressText.textContent = `${i + 1}/${
      uniqResults.length
    }: ${subject} - ${faculty}`;
    progressBar.style.width = `${progress}%`;

    // 詳細情報を表示
    const progressDetails = uiContainer.querySelector(
      "#progress-details"
    ) as HTMLElement;
    progressDetails.textContent = `問題PDF・解答画像をダウンロード中...`;

    // 問題PDF保存
    try {
      const res = await fetch(pdf);
      const blob = await res.blob();
      const baseName = `${year}-${faculty.replace(
        /[\\/:*?"<>|]+/g,
        "_"
      )}-${subject.replace(/[\\/:*?"<>|]+/g, "_")}-問題.pdf`;
      // サブフォルダ機能を一時的に無効化: フラットなファイル名で保存する
      const fullName = baseName; // was: `${folderName}/${baseName}`
      await downloadFile(blob, fullName, debug);
      progressDetails.textContent = `✓ 問題PDF完了 - 解答画像取得中...`;
    } catch (e) {
      console.warn("PDF DL失敗:", pdf, e);
      if (debug) console.log("[TDL] PDF fetch failed for", pdf, e);
      progressDetails.textContent = `⚠ 問題PDF失敗 - 解答画像取得中...`;
    }

    // 解答画像取得・保存
    await downloadAnswerImages(
      answer,
      year,
      faculty,
      subject,
      folderName,
      progressDetails,
      debug
    );

    progressDetails.textContent = `✓ ${subject} - ${faculty} 完了`;

    // レート制限
    await new Promise((r) => setTimeout(r, 450));
  }

  progressText.textContent = `🎉 完了！${uniqResults.length}件の問題をダウンロードしました`;
  progressBar.style.width = "100%";

  const progressDetails = uiContainer.querySelector(
    "#progress-details"
  ) as HTMLElement;
  progressDetails.textContent = `すべてのファイルがダウンロードフォルダに保存されました`;

  setTimeout(() => {
    alert(
      `🎉 ダウンロード完了！\n\n📊 処理結果:\n・対象教科: ${Array.from(
        new Set(uniqResults.map((r) => r.subject))
      ).join(", ")}\n・ダウンロード件数: ${
        uniqResults.length
      }件\n・保存先: ダウンロードフォルダ\n\nファイル形式:\n・問題: PDF\n・解答: GIF画像`
    );
  }, 500);
}

async function downloadAnswerImages(
  answerUrl: string,
  year: string,
  faculty: string,
  subject: string,
  folderName: string,
  progressDetails?: HTMLElement,
  debug: boolean = false
) {
  let gifUrls: string[] = [];

  try {
    const html = await (await fetch(answerUrl)).text();
    const reg = /<img[^>]+src\s*=\s*"([^"]+\.gif)"/g;
    const set = new Set<string>();
    let m;
    while ((m = reg.exec(html))) {
      const url = m[1].startsWith("http") ? m[1] : location.origin + m[1];
      set.add(url);
    }
    gifUrls = [...set];
    if (debug)
      console.log(
        "[TDL] parsed answer page HTML length=",
        (html || "").length,
        "gifUrls=",
        gifUrls
      );
  } catch (e) {
    console.warn("解答ページフェッチ失敗:", answerUrl, e);
    if (debug)
      console.log("[TDL] Answer page HTML fetch failed for", answerUrl, e);
  }

  // iframeでの再取得は現在のセキュリティ制限により難しいため、
  // HTMLパースでの取得に集中

  if (gifUrls.length) {
    for (let i = 0; i < gifUrls.length; i++) {
      const gifUrl = gifUrls[i];
      if (progressDetails) {
        progressDetails.textContent = `解答画像 ${i + 1}/${
          gifUrls.length
        } をダウンロード中...`;
      }
      try {
        const imgBlob = await fetch(gifUrl).then((r) => r.blob());
        const baseNameImg = `${year}-${faculty.replace(
          /[\\/:*?"<>|]+/g,
          "_"
        )}-${subject.replace(/[\\/:*?"<>|]+/g, "_")}-解答${
          gifUrls.length > 1 ? "-" + (i + 1) : ""
        }.gif`;
        // サブフォルダ機能を一時的に無効化: フラットなファイル名で保存する
        const fullNameImg = baseNameImg; // was: `${folderName}/${baseNameImg}`
        await downloadFile(imgBlob, fullNameImg, debug);
      } catch (e) {
        console.warn("解答GIF DL失敗:", gifUrl, e);
      }
    }
  } else {
    console.warn("解答GIFなし:", answerUrl);
    if (progressDetails) {
      progressDetails.textContent = "解答画像が見つかりませんでした";
    }
    if (debug) {
      console.debug(
        "No GIF URLs parsed from answer page. Attempting iframe fallback failed or skipped due to CORS. URL:",
        answerUrl
      );
    }
  }
}

function downloadFile(
  blob: Blob,
  filename: string,
  debug: boolean = false
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // anchor ダウンロードのみを使うシンプルな実装に変更
      // 拡張フォルダ名の指定を filename に含めているため、
      // セキュアにファイル名を整形して扱う
      const safeName = filename.replace(/[\\/:*?"<>|]+/g, "_");
      // フォルダ名を含む場合は区切り文字で置換して単一ファイル名にする
      const finalName = safeName.includes("/")
        ? safeName.replace(/\/+/, " - ")
        : safeName;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = finalName;
      // append -> click -> cleanup
      document.body.appendChild(a);
      a.click();
      a.remove();
      // 少し遅らせてから revoke
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      if (debug) console.log("[TDL] anchor download started for", finalName);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}
