/* Email Screenshot  ·  free from Unslop.email
 * Adds a button to the Gmail conversation toolbar that renders the open
 * email to an image and downloads it as a JPG.
 *
 *   click        → email body only
 *   shift+click  → include a header strip (subject / sender / date)
 *   alt+click    → copy the image to the clipboard instead of downloading
 */

(() => {
  "use strict";

  const BTN_ID = "e2p-btn";
  const STAGE_ID = "e2p-stage";
  const MAX_CANVAS_PX = 30000; // Chrome's hard limit is 32767 per side
  const JPEG_QUALITY = 0.92; // visually the same as PNG for emails, at a fraction of the size

  const ICON = `<svg class="e2p-logo" viewBox="40.1 40.6 287.4 287.4" aria-hidden="true"><path d="M106.596 199.055C106.847 194.455 107.39 180.362 107.976 171.329C108.561 162.255 109.857 153.765 110.15 144.691C110.443 135.575 110.401 126.082 109.648 116.673C108.896 107.305 106.805 97.4782 105.717 88.4036C104.63 79.2872 99.4447 66.2818 103.083 62.1418C106.763 57.96 118.807 62.8527 127.588 63.4381C136.37 64.0236 146.574 65.2363 155.774 65.6127C165.016 65.989 174.216 66.1981 182.997 65.78C191.737 65.3618 199.767 64.2745 208.381 63.1454C216.954 62.0581 225.359 60.1345 234.559 59.1309C243.801 58.169 258.061 53.109 263.581 57.3327C269.143 61.5145 266.968 74.9381 267.888 84.3472C268.85 93.7982 269.436 104.127 269.31 113.871C269.185 123.615 267.972 133.358 267.178 142.809C266.383 152.218 264.961 161 264.585 170.409C264.208 179.818 264.919 194.455 265.003 199.305"></path><path d="M154.686 102.412L155.689 114.958"></path><path d="M213.398 102.537L214.068 114.957"></path><path d="M152.344 138.166C154.811 140.926 161.795 151.255 167.064 154.893C172.291 158.49 178.313 159.828 183.875 159.828C189.478 159.828 195.333 158.406 200.476 154.851C205.662 151.255 212.52 141.051 214.946 138.291"></path><path d="M59.0892 177.977C59.2982 182.577 59.8837 197.13 60.4692 205.619C61.0964 214.108 62.2673 221.092 62.6437 228.912C63.0619 236.774 63.3964 244.343 62.9782 252.623C62.5182 260.861 60.7619 269.308 60.051 278.592C59.3401 287.834 54.6982 303.139 58.671 308.074C62.6019 313.05 74.5201 308.199 83.7201 308.241C92.9201 308.325 103.835 308.617 113.787 308.534C123.782 308.408 133.986 307.865 143.52 307.697C153.055 307.488 161.878 307.196 170.953 307.405C180.069 307.614 188.684 308.199 198.093 308.868C207.544 309.537 217.496 310.75 227.491 311.419C237.527 312.088 248.4 312.841 258.269 312.883C268.097 312.925 278.007 312.506 286.706 311.628C295.404 310.792 307.029 313.259 310.458 307.781C313.887 302.303 308.033 288.168 307.238 278.759C306.444 269.308 305.775 260.108 305.649 251.285C305.566 242.461 306.318 234.306 306.527 225.859C306.695 217.454 306.737 209.257 306.695 200.81C306.611 192.321 306.235 179.357 306.151 175.092"></path><path d="M56.1211 175.344C60.1356 177.351 71.6775 182.955 80.3338 187.387C88.9902 191.862 99.1938 196.755 108.143 202.024C117.092 207.293 125.623 213.273 133.987 219.044C142.35 224.815 150.003 231.046 158.325 236.691C166.647 242.378 175.094 253.042 184.043 253.084C192.95 253.084 202.778 242.253 211.978 236.858C221.178 231.464 230.712 225.86 239.201 220.716C247.648 215.615 255.301 210.806 262.745 206.122C270.188 201.438 276.336 197.675 283.863 192.656C291.39 187.638 303.936 178.731 307.95 175.929"></path><path d="M60.1758 173.044C63.8558 170.785 74.7703 163.969 82.214 159.536C89.6576 155.104 101.074 148.622 104.879 146.447"></path><path d="M265.629 146.113C269.351 148.246 280.558 154.351 287.918 158.826C295.32 163.301 306.234 170.577 309.914 172.961"></path></svg>`;

  /* ---------------------------------------------------------------- utils */

  function toast(message, ms = 2600) {
    let el = document.getElementById("e2p-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "e2p-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(() => el.classList.add("e2p-show"));
    clearTimeout(el._t);
    if (ms) el._t = setTimeout(() => el.classList.remove("e2p-show"), ms);
    return el;
  }

  function hideToast() {
    const el = document.getElementById("e2p-toast");
    if (el) el.classList.remove("e2p-show");
  }

  function slug(s, max = 60) {
    return (s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/g, "");
  }

  function fetchAsDataURL(url) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "fetchImage", url }, (res) => {
          if (chrome.runtime.lastError || !res || !res.ok) resolve(null);
          else resolve(res.data);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  /* ------------------------------------------------------- message lookup */

  function getOpenMessage() {
    const bodies = Array.prototype.slice
      .call(document.querySelectorAll(".a3s"))
      .filter((el) => el.offsetParent !== null && el.offsetHeight > 4);
    if (!bodies.length) return null;

    const body = bodies[bodies.length - 1];
    const card = body.closest(".adn.ads") || body.closest(".gs") || body;

    const subjectEl = document.querySelector("h2.hP") || document.querySelector(".hP");
    const nameEl = card.querySelector(".gD") || document.querySelector(".gD");
    const dateEl =
      card.querySelector(".g3[title], span.g3, .gK span[title]") ||
      document.querySelector(".g3[title]");

    const subject = subjectEl ? subjectEl.innerText.trim() : "email";
    const sender = nameEl ? nameEl.getAttribute("name") || nameEl.innerText.trim() : "";
    const address = nameEl ? nameEl.getAttribute("email") || "" : "";
    const dateText = dateEl
      ? (dateEl.getAttribute("title") || dateEl.innerText || "").trim()
      : "";

    let iso = "";
    const parsed = dateText ? new Date(dateText.replace(/^[^,]*,\s*/, "")) : null;
    if (parsed && !isNaN(parsed)) iso = parsed.toISOString().slice(0, 10);
    if (!iso) iso = new Date().toISOString().slice(0, 10);

    const brand = address.split("@")[1] ? address.split("@")[1].split(".")[0] : slug(sender);

    return { body, card, subject, sender, address, dateText, iso, brand };
  }

  function isClipped(card) {
    return /\[Message clipped\]|Message clipped/i.test(card.innerText || "");
  }

  /* ------------------------------------------------------------ rendering */

  async function inlineAssets(root) {
    // <img> elements
    const imgs = Array.prototype.slice.call(root.querySelectorAll("img"));
    await Promise.all(
      imgs.map(async (img) => {
        const src = img.getAttribute("src") || "";
        if (!src || src.startsWith("data:")) return;
        const abs = new URL(src, location.href).href;
        const data = await fetchAsDataURL(abs);
        if (data) {
          img.removeAttribute("srcset");
          img.removeAttribute("loading");
          img.setAttribute("src", data);
        }
      })
    );

    // CSS background images
    const nodes = Array.prototype.slice.call(root.querySelectorAll("*"));
    nodes.push(root);
    await Promise.all(
      nodes.map(async (el) => {
        let bg;
        try {
          bg = getComputedStyle(el).backgroundImage;
        } catch (e) {
          return;
        }
        if (!bg || bg === "none" || bg.indexOf("url(") === -1) return;
        const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (!m || m[1].startsWith("data:")) return;
        const data = await fetchAsDataURL(new URL(m[1], location.href).href);
        if (data) el.style.backgroundImage = `url("${data}")`;
      })
    );
  }

  function buildHeader(info, width) {
    const wrap = document.createElement("div");
    wrap.style.cssText = [
      "box-sizing:border-box",
      `width:${width}px`,
      "padding:20px 24px 18px",
      "background:#ffffff",
      "border-bottom:1px solid #e6e6e6",
      "font-family:Roboto,Arial,Helvetica,sans-serif",
      "color:#202124",
    ].join(";");

    const subject = document.createElement("div");
    subject.style.cssText = "font-size:20px;font-weight:500;margin-bottom:8px;letter-spacing:-0.01em;";
    subject.textContent = info.subject;

    const meta = document.createElement("div");
    meta.style.cssText = "font-size:13px;color:#5f6368;";
    const from = info.sender ? info.sender + (info.address ? ` <${info.address}>` : "") : info.address;
    meta.textContent = [from, info.dateText].filter(Boolean).join("  ·  ");

    wrap.appendChild(subject);
    wrap.appendChild(meta);
    return wrap;
  }

  async function renderToCanvas(info, withHeader) {
    const rect = info.body.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width) || 640);

    const stage = document.createElement("div");
    stage.id = STAGE_ID;
    stage.style.width = width + "px";

    if (withHeader) stage.appendChild(buildHeader(info, width));

    const clone = info.body.cloneNode(true);
    clone.style.width = width + "px";
    clone.style.maxWidth = "none";
    clone.style.overflow = "visible";
    clone.style.height = "auto";
    // Drop Gmail's own UI bits that sometimes live inside the body
    clone.querySelectorAll(".ajR, .adL .ajR, .gmail_signature_prefix").forEach((n) => n.remove());

    stage.appendChild(clone);
    document.body.appendChild(stage);

    try {
      await inlineAssets(stage);
      // give the browser a beat to lay out / decode the swapped-in images
      await new Promise((r) => setTimeout(r, 120));
      await Promise.all(
        Array.prototype.slice
          .call(stage.querySelectorAll("img"))
          .map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()))
      );

      const h = Math.max(stage.scrollHeight, stage.offsetHeight, 1);
      const w = Math.max(stage.scrollWidth, width, 1);
      const scale = Math.max(1, Math.min(2, MAX_CANVAS_PX / Math.max(h, w)));

      return await html2canvas(stage, {
        backgroundColor: "#ffffff",
        scale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 25000,
        width: w,
        height: h,
        windowWidth: w,
        scrollX: 0,
        scrollY: 0,
      });
    } finally {
      stage.remove();
    }
  }

  /* --------------------------------------------------- whitespace trimming */

  function trim(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return canvas;

    let data;
    try {
      data = canvas.getContext("2d").getImageData(0, 0, w, h).data;
    } catch (e) {
      return canvas; // tainted — return as-is
    }

    const at = (x, y) => {
      const i = (y * w + x) * 4;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };
    const bg = at(0, 0);
    const near = (p) =>
      Math.abs(p[0] - bg[0]) < 12 && Math.abs(p[1] - bg[1]) < 12 && Math.abs(p[2] - bg[2]) < 12;

    const stepY = Math.max(1, Math.floor(h / 1400));
    const stepX = Math.max(1, Math.floor(w / 1400));

    // A row or column counts as empty if almost every sampled pixel matches the
    // background. This skips stray anti-aliased pixels from the email's wrapper.
    const colBlank = (x) => {
      let off = 0, n = 0;
      for (let y = 0; y < h; y += stepY, n++) if (!near(at(x, y))) off++;
      return off <= Math.max(1, n * 0.004);
    };
    const rowBlank = (y) => {
      let off = 0, n = 0;
      for (let x = 0; x < w; x += stepX, n++) if (!near(at(x, y))) off++;
      return off <= Math.max(1, n * 0.004);
    };

    let left = 0, right = w - 1, top = 0, bottom = h - 1;
    while (left < right && colBlank(left)) left++;
    while (right > left && colBlank(right)) right--;
    while (top < bottom && rowBlank(top)) top++;
    while (bottom > top && rowBlank(bottom)) bottom--;


    const nw = right - left + 1;
    const nh = bottom - top + 1;
    if (nw < 40 || nh < 40) return canvas;
    if (nw === w && nh === h) return canvas;

    const out = document.createElement("canvas");
    out.width = nw;
    out.height = nh;
    const ctx = out.getContext("2d");
    ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    ctx.fillRect(0, 0, nw, nh);
    ctx.drawImage(canvas, left, top, nw, nh, 0, 0, nw, nh);
    return out;
  }

  /* ------------------------------------------------------------- delivery */

  function canvasToBlob(canvas, type = "image/jpeg") {
    return new Promise((resolve) =>
      canvas.toBlob(resolve, type, type === "image/jpeg" ? JPEG_QUALITY : undefined)
    );
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  function anchorDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.documentElement.appendChild(a);
    a.dispatchEvent(new MouseEvent("click", { bubbles: false }));
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 4000);
  }

  async function download(blob, filename) {
    try {
      const dataUrl = await blobToDataURL(blob);
      const res = await new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: "download", dataUrl, filename }, (r) => {
            resolve(chrome.runtime.lastError ? { ok: false } : r || { ok: false });
          });
        } catch (e) {
          resolve({ ok: false });
        }
      });
      if (res.ok) return;
    } catch (e) {}
    anchorDownload(blob, filename);
  }

  async function copyToClipboard(blob) {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  }

  /* --------------------------------------------------------------- action */

  let busy = false;

  async function onClick(ev) {
    if (busy) return;
    const btn = document.getElementById(BTN_ID);

    const info = getOpenMessage();
    if (!info) {
      toast("Open an email first.");
      return;
    }
    if (isClipped(info.card)) {
      toast("Gmail clipped this email. Click “View entire message” first, then try again.", 5000);
      return;
    }

    busy = true;
    if (btn) btn.classList.add("e2p-busy");
    toast("Rendering…", 0);

    try {
      const canvas = trim(await renderToCanvas(info, ev.shiftKey));
      // the clipboard only accepts PNG, downloads use JPG for smaller files
      const blob = await canvasToBlob(canvas, ev.altKey ? "image/png" : "image/jpeg");
      if (!blob) throw new Error("Could not encode the image.");

      if (ev.altKey) {
        await copyToClipboard(blob);
        toast("Copied to clipboard.");
      } else {
        const name = [slug(info.brand, 24), slug(info.subject, 70), info.iso]
          .filter(Boolean)
          .join("_");
        await download(blob, `${name || "email"}.jpg`);
        toast(`Saved · ${canvas.width}×${canvas.height}`);
      }
    } catch (e) {
      console.error("[Email Screenshot]", e);
      toast("Export failed: " + (e && e.message ? e.message : e), 5000);
    } finally {
      busy = false;
      if (btn) btn.classList.remove("e2p-busy");
      setTimeout(hideToast, 2600);
    }
  }


  /* ------------------------------------------------------------- batch */

  const EXPORT_ID = "e2p-export";
  let stopBatch = false;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(fn, timeout = 15000, step = 150) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (stopBatch) return null;
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }

  function listBase() {
    const parts = location.hash.replace(/^#/, "").split("?")[0].split("/");
    if (parts.length > 1 && /^p\d+$/.test(parts[parts.length - 1])) parts.pop();
    return "#" + parts.join("/");
  }

  function pageNumber() {
    const m = location.hash.match(/\/p(\d+)$/);
    return m ? parseInt(m[1], 10) : 1;
  }

  function visibleRows() {
    return Array.prototype.filter.call(
      document.querySelectorAll("tr.zA"),
      (r) => r.offsetParent !== null && r.getBoundingClientRect().height > 0
    );
  }

  function rowId(row) {
    const legacy = row.querySelector("[data-legacy-thread-id]");
    if (legacy) return legacy.getAttribute("data-legacy-thread-id");
    const t = row.querySelector("[data-thread-id]");
    const m = t && (t.getAttribute("data-thread-id") || "").match(/thread-f:(\d+)/);
    if (m && typeof BigInt === "function") return BigInt(m[1]).toString(16);
    return null;
  }

  function visibleBodies() {
    return Array.prototype.filter.call(document.querySelectorAll(".a3s"), (el) => {
      const r = el.getBoundingClientRect();
      return el.offsetParent !== null && r.width > 0 && r.height > 4;
    });
  }

  function csvCell(v) {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function panel() {
    let el = document.getElementById("e2p-panel");
    if (!el) {
      el = document.createElement("div");
      el.id = "e2p-panel";
      el.innerHTML =
        '<div class="e2p-p-title"></div><div class="e2p-p-line"></div><div class="e2p-p-sub"></div>' +
        '<div class="e2p-p-actions"><button type="button" class="e2p-p-stop">Stop</button></div>';
      el.querySelector(".e2p-p-stop").addEventListener("click", () => {
        if (el.dataset.done === "1") el.remove();
        else {
          stopBatch = true;
          el.querySelector(".e2p-p-stop").textContent = "Stopping…";
        }
      });
      document.body.appendChild(el);
    }
    return {
      el,
      set(title, line, sub) {
        el.querySelector(".e2p-p-title").textContent = title;
        el.querySelector(".e2p-p-line").textContent = line;
        el.querySelector(".e2p-p-sub").textContent = sub || "";
      },
      done() {
        el.dataset.done = "1";
        el.querySelector(".e2p-p-stop").textContent = "Close";
      },
    };
  }

  async function runBatch() {
    if (busy) return;
    busy = true;
    stopBatch = false;

    const base = listBase();
    const query = decodeURIComponent(base.replace(/^#/, "").split("/").slice(1).join(" ") || base.replace(/^#/, "")).replace(/\+/g, " ");
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10) + "-" + String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0");
    const folder = "Unslop export/" + (slug(query, 40) || "gmail") + "-" + stamp;
    const ui = panel();
    delete ui.el.dataset.done;
    ui.el.querySelector(".e2p-p-stop").textContent = "Stop";

    const seen = new Set();
    const rows = [];
    let saved = 0;
    let failed = 0;
    let clipped = 0;
    let page = pageNumber();

    try {
      while (!stopBatch) {
        const ids = visibleRows().map(rowId).filter((id) => id && !seen.has(id));
        if (!ids.length) break;

        for (const id of ids) {
          if (stopBatch) break;
          seen.add(id);
          ui.set("Exporting “" + query + "”", saved + " saved · page " + page, "Opening email " + seen.size + "…");

          const before = new Set(visibleBodies());
          const subjEl = document.querySelector("h2.hP");
          const beforeSubject = subjEl ? subjEl.innerText : "";
          location.hash = base + "/" + id;

          const opened = await waitFor(() => {
            if (!threadInUrl()) return null;
            const bodies = visibleBodies();
            if (!bodies.length) return null;
            const s = document.querySelector("h2.hP");
            const fresh = bodies.some((b) => !before.has(b)) || (s && s.innerText !== beforeSubject);
            return fresh ? bodies : null;
          });
          if (!opened) {
            failed++;
            rows.push({ file: "", brand: "", email: "", subject: "", date: "", clipped: "", link: location.origin + location.pathname + "#all/" + id, note: "Did not open" });
            continue;
          }
          await sleep(700);

          const info = getOpenMessage();
          if (!info) {
            failed++;
            continue;
          }
          const isCut = isClipped(info.card);
          if (isCut) clipped++;
          ui.set("Exporting “" + query + "”", saved + " saved · page " + page, info.subject);

          try {
            const canvas = trim(await renderToCanvas(info, false));
            const blob = await canvasToBlob(canvas, "image/jpeg");
            if (!blob) throw new Error("encode");
            const file = [String(seen.size).padStart(3, "0"), slug(info.brand, 24), info.iso, slug(info.subject, 60)].filter(Boolean).join("_") + ".jpg";
            await download(blob, folder + "/" + file);
            saved++;
            rows.push({
              file,
              brand: info.sender,
              email: info.address,
              subject: info.subject,
              date: info.iso,
              clipped: isCut ? "yes" : "",
              link: location.origin + location.pathname + "#all/" + id,
              note: "",
            });
          } catch (e) {
            failed++;
            rows.push({ file: "", brand: info.sender, email: info.address, subject: info.subject, date: info.iso, clipped: "", link: location.origin + location.pathname + "#all/" + id, note: "Render failed" });
          }
          await sleep(250);
        }
        if (stopBatch) break;

        // next page of results
        page++;
        ui.set("Exporting “" + query + "”", saved + " saved · page " + page, "Loading the next page…");
        location.hash = base + "/p" + page;
        const more = await waitFor(() => {
          if (threadInUrl()) return null;
          const ids = visibleRows().map(rowId).filter(Boolean);
          return ids.length && ids.some((x) => !seen.has(x)) ? ids : null;
        }, 12000);
        if (!more) break;
      }
    } finally {
      if (rows.length) {
        const head = ["file", "brand", "sender_email", "subject", "date", "clipped", "gmail_link", "note"];
        const csv = [head.join(",")]
          .concat(rows.map((r) => [r.file, r.brand, r.email, r.subject, r.date, r.clipped, r.link, r.note].map(csvCell).join(",")))
          .join("\n");
        await download(new Blob(["﻿" + csv], { type: "text/csv" }), folder + "/emails.csv");
      }
      location.hash = base;
      busy = false;
      const extra = [failed ? failed + " failed" : "", clipped ? clipped + " clipped by Gmail" : ""].filter(Boolean).join(" · ");
      ui.set(stopBatch ? "Export stopped" : "Export finished", saved + " saved to Downloads/" + folder, extra);
      ui.done();
    }
  }

  function makeExportButton() {
    const wrap = document.createElement("div");
    wrap.className = "G-Ni e2p-export-wrap";
    const btn = document.createElement("div");
    btn.id = EXPORT_ID;
    btn.className = "e2p-export";
    btn.setAttribute("role", "button");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("data-tooltip", "Save every email in this list as an image");
    btn.innerHTML = ICON + "<span>Export all</span>";
    btn.addEventListener("click", runBatch);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") runBatch();
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function injectExport() {
    const listToolbars = Array.prototype.filter.call(document.querySelectorAll('div[gh="mtb"]'), (tb) => {
      if (!tb.offsetParent || tb.offsetHeight === 0) return false;
      return !!tb.querySelector('div[role="checkbox"], span[role="checkbox"], .T-Jo-auh');
    });
    document.querySelectorAll(".e2p-export-wrap").forEach((n) => {
      if (!listToolbars.some((tb) => tb.contains(n))) n.remove();
    });
    listToolbars.forEach((tb) => {
      if (tb.querySelector("#" + EXPORT_ID)) return;
      // sit next to the refresh and "more" icons, not after the pagination
      const refresh = tb.querySelector('div[act="20"], div[data-tooltip="Refresh"], div[aria-label="Refresh"]');
      const group = refresh && refresh.closest(".G-Ni") ? refresh.closest(".G-Ni").parentElement : null;
      (group || tb).appendChild(makeExportButton());
    });
  }

  /* ------------------------------------------------------------ injection */

  function makeButton() {
    const wrap = document.createElement("div");
    wrap.className = "G-Ni e2p-wrap";

    const btn = document.createElement("div");
    btn.id = BTN_ID;
    btn.className = "T-I J-J5-Ji lS T-I-ax7 ar7 e2p-btn";
    btn.setAttribute("role", "button");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("data-tooltip", "Save as image  (shift: with header · alt: copy)");
    btn.setAttribute("aria-label", "Save email as an image");
    btn.innerHTML = ICON;
    btn.addEventListener("click", onClick);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") onClick(e);
    });

    wrap.appendChild(btn);
    return wrap;
  }

  // Gmail keeps hidden copies of earlier emails around in list and search views,
  // so the URL decides: an open thread always ends in its thread id,
  // e.g. #inbox/FMfcgz... or #search/im8/FMfcgz..., while #search/im8 is a list.
  function threadInUrl() {
    const parts = location.hash.replace(/^#/, "").split("?")[0].split("/");
    if (parts.length < 2) return false;
    const last = parts[parts.length - 1];
    return last.length >= 16 && /^[A-Za-z0-9]+$/.test(last);
  }

  function hasOpenEmail() {
    if (!threadInUrl()) return false;
    return Array.prototype.some.call(document.querySelectorAll(".a3s"), (el) => {
      const r = el.getBoundingClientRect();
      return el.offsetParent !== null && r.width > 0 && r.height > 4;
    });
  }

  function removeButtons() {
    document.querySelectorAll(".e2p-wrap").forEach((n) => n.remove());
  }

  function inject() {
    // only show the button while an email is open, never in the inbox list or search results
    if (!hasOpenEmail()) {
      removeButtons();
      if (!threadInUrl() && !busy) injectExport();
      return;
    }
    document.querySelectorAll(".e2p-export-wrap").forEach((n) => n.remove());
    const toolbars = document.querySelectorAll('div[gh="mtb"]');
    toolbars.forEach((tb) => {
      if (!tb.offsetParent || tb.offsetHeight === 0) return;
      if (tb.querySelector("#" + BTN_ID)) return;
      // skip list toolbars, which have a select-all checkbox
      if (tb.querySelector('div[role="checkbox"], span[role="checkbox"], .T-Jo-auh')) return;
      tb.appendChild(makeButton());
    });
  }

  function boot() {
    inject();
    const obs = new MutationObserver(() => {
      clearTimeout(boot._t);
      boot._t = setTimeout(inject, 200);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", () => setTimeout(inject, 300));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
