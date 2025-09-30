export default defineBackground(() => {
  console.log("東進過去問ダウンローダー Background Script", {
    id: browser.runtime.id,
  });

  // ダウンロード処理をバックグラウンドで処理
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "DOWNLOAD_FILE") {
      const { buffer, filename, mime, url } = message as any;

      // buffer があればそれを Blob にして objectURL を生成。なければ url を使う。
      if (buffer) {
        try {
          const blob = new Blob([new Uint8Array(buffer)], {
            type: mime || "application/octet-stream",
          });
          const objectUrl = URL.createObjectURL(blob);
          console.log("background: created objectUrl for", filename, objectUrl);

          browser.downloads
            .download({
              url: objectUrl,
              filename: filename,
              conflictAction: "uniquify",
            })
            .then((downloadId) => {
              console.log("ダウンロード開始:", filename, downloadId);
              // objectUrl はダウンロードが開始されたら解放して問題ない
              URL.revokeObjectURL(objectUrl);
              sendResponse({ success: true, downloadId });
            })
            .catch((error) => {
              console.error("ダウンロードエラー:", error);
              URL.revokeObjectURL(objectUrl);
              sendResponse({ success: false, error: error.message });
            });
        } catch (e: any) {
          console.error("background: buffer handling failed", e);
          sendResponse({ success: false, error: e?.message || String(e) });
        }
      } else if (url) {
        // 従来の dataURL や外部URLを受け取ったケース
        browser.downloads
          .download({
            url: url,
            filename: filename,
            conflictAction: "uniquify",
          })
          .then((downloadId) => {
            console.log("ダウンロード開始 (url):", filename, downloadId);
            sendResponse({ success: true, downloadId });
          })
          .catch((error) => {
            console.error("ダウンロードエラー (url):", error);
            sendResponse({ success: false, error: error.message });
          });
      } else {
        sendResponse({ success: false, error: "no data provided" });
      }

      return true; // 非同期レスポンスを示す
    }
  });
});
