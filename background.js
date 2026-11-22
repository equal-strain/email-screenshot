// Fetches remote images on behalf of the content script.
// The service worker has host permissions, so it bypasses the CORS rules
// that would otherwise taint the canvas when rendering Gmail's proxied images.

async function blobToDataURL(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK));
  }
  const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";
  return `data:${type};base64,${btoa(bin)}`;
}

async function grab(url) {
  const modes = ["omit", "include"];
  let lastErr = "unknown";
  for (const credentials of modes) {
    try {
      const res = await fetch(url, { credentials, cache: "force-cache" });
      if (!res.ok) {
        lastErr = "HTTP " + res.status;
        continue;
      }
      const blob = await res.blob();
      if (blob.size === 0) {
        lastErr = "empty";
        continue;
      }
      return { ok: true, data: await blobToDataURL(blob) };
    } catch (e) {
      lastErr = String(e && e.message ? e.message : e);
    }
  }
  return { ok: false, error: lastErr };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "fetchImage" && typeof msg.url === "string") {
    grab(msg.url).then(sendResponse);
    return true; // keep the channel open for the async response
  }

  // Save through Chrome's own downloads, so Gmail's page can't swallow the click
  if (msg && msg.type === "download" && typeof msg.dataUrl === "string") {
    chrome.downloads.download(
      { url: msg.dataUrl, filename: msg.filename || "email.jpg", saveAs: false, conflictAction: "uniquify" },
      (id) => {
        if (chrome.runtime.lastError || !id) {
          sendResponse({ ok: false, error: chrome.runtime.lastError ? chrome.runtime.lastError.message : "failed" });
        } else {
          sendResponse({ ok: true });
        }
      }
    );
    return true;
  }
});
