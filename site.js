(() => {
  const BAND_LABEL = { hs: "High school", college: "College" };
  const ACTION_LABEL = {
    attend: "Attend",
    perform: "Perform",
    volunteer: "Volunteer",
    apply: "Apply",
  };
  const ACTION_ORDER = ["attend", "perform", "volunteer", "apply"];

  async function loadJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  }

  function igUrl(handle) {
    const h = String(handle || "").replace(/^@/, "");
    return `https://www.instagram.com/${h}/`;
  }

  function igLabel(handle) {
    const h = String(handle || "").replace(/^@/, "");
    return `@${h}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function bandPills(bands) {
    if (!bands || !bands.length) return "";
    return `<span class="band-pills">${bands
      .map(
        (b) =>
          `<span class="band-pill band-pill-${escapeHtml(b)}">${escapeHtml(
            BAND_LABEL[b] || b
          )}</span>`
      )
      .join("")}</span>`;
  }

  function orgLine(item) {
    if (!item.org) return "";
    if (item.orgUrl) {
      return `<p class="activity-org"><a href="${escapeHtml(item.orgUrl)}" rel="noopener noreferrer">${escapeHtml(item.org)}</a></p>`;
    }
    return `<p class="activity-org">${escapeHtml(item.org)}</p>`;
  }

  /** Local calendar day from YYYY-MM-DD (avoids UTC shift). */
  function parseDay(iso) {
    if (!iso || typeof iso !== "string") return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function todayStart() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function itemEndDay(item) {
    return parseDay(item.dateEnd || item.date);
  }

  function itemStartMs(item) {
    const d = parseDay(item.date);
    return d ? d.getTime() : Number.POSITIVE_INFINITY;
  }

  function isPastItem(item, today) {
    const end = itemEndDay(item);
    if (!end) return false;
    return end < today;
  }

  /**
   * Upcoming by date (soonest first); undated after dated upcoming;
   * past items rotated to the end (soonest-past first among past).
   */
  function sortByTimeline(items) {
    if (!items || !items.length) return [];
    const today = todayStart();
    const tagged = items.map((item, index) => ({ item, index, past: isPastItem(item, today) }));
    const cmp = (a, b) => {
      const da = itemStartMs(a.item);
      const db = itemStartMs(b.item);
      if (da !== db) return da - db;
      return a.index - b.index;
    };
    const upcoming = tagged.filter((t) => !t.past).sort(cmp);
    const past = tagged.filter((t) => t.past).sort(cmp);
    return [...upcoming, ...past].map((t) => t.item);
  }

  function sortedActions(actions) {
    if (!actions || !actions.length) return [];
    return [...actions].sort((a, b) => {
      const ia = ACTION_ORDER.indexOf(a.type);
      const ib = ACTION_ORDER.indexOf(b.type);
      const sa = ia === -1 ? 99 : ia;
      const sb = ib === -1 ? 99 : ib;
      return sa - sb;
    });
  }

  function mailtoHref(email, subject) {
    let href = `mailto:${email}`;
    if (subject) href += `?subject=${encodeURIComponent(subject)}`;
    return href;
  }

  /** Link [label](url) markdown, emails (mailto + optional action.subject), bare domains, and @handles. */
  function formatActionDetail(act) {
    const subject = act.subject || "";
    const raw = String(act.detail || "");
    const tokenRe =
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+|forms\.gle\/[^\s)]+|[\w.-]+\.[a-z]{2,}(?:\/[^\s)]*)?)\)|\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
    const chunks = [];
    let last = 0;
    let match;
    while ((match = tokenRe.exec(raw)) !== null) {
      if (match.index > last) {
        chunks.push({ type: "text", value: raw.slice(last, match.index) });
      }
      if (match[1] != null) {
        let href = match[2];
        if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
        chunks.push({ type: "md", label: match[1], href });
      } else {
        chunks.push({ type: "email", value: match[3] });
      }
      last = match.index + match[0].length;
    }
    if (last < raw.length) chunks.push({ type: "text", value: raw.slice(last) });

    return chunks
      .map((chunk) => {
        if (chunk.type === "md") {
          return `<a href="${escapeHtml(chunk.href)}" rel="noopener noreferrer">${escapeHtml(chunk.label)}</a>`;
        }
        if (chunk.type === "email") {
          return `<a href="${escapeHtml(mailtoHref(chunk.value, subject))}">${escapeHtml(chunk.value)}</a>`;
        }
        return escapeHtml(chunk.value)
          .replace(
            /\b((?:https?:\/\/)?(?:[\w-]+\.)+(?:com|org|edu|net|ee|gle|me|io)(?:\/[\w./-]*)?)\b/gi,
            (m) => {
              const href = /^https?:\/\//i.test(m) ? m : `https://${m}`;
              return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(m)}</a>`;
            }
          )
          .replace(/@([A-Za-z0-9._]+)/g, (_, handle) => {
            return `<a href="${escapeHtml(igUrl(handle))}" rel="noopener noreferrer">@${escapeHtml(handle)}</a>`;
          });
      })
      .join("");
  }

  function actionsBlock(item) {
    const actions = sortedActions(item.actions);
    if (!actions.length) {
      if (item.action) {
        return `<p class="activity-action"><span class="activity-action-label">Next step</span> ${escapeHtml(item.action)}</p>`;
      }
      return "";
    }
    return `<ul class="action-list">${actions
      .map((act) => {
        const label = act.label || ACTION_LABEL[act.type] || act.type;
        return `<li class="action-row action-${escapeHtml(act.type || "other")}">
          <span class="action-type">${escapeHtml(label)}</span>
          <span class="action-detail">${formatActionDetail(act)}</span>
        </li>`;
      })
      .join("")}</ul>`;
  }

  function renderActivityCards(items) {
    return `<div class="activity-cards">${sortByTimeline(items)
      .map((item) => {
        const bands = (item.bands || []).join(" ");
        return `<article class="activity-card${isPastItem(item, todayStart()) ? " is-past" : ""}" data-bands="${escapeHtml(bands)}">
          <header class="activity-card-head">
            ${bandPills(item.bands)}
            <h3 class="activity-card-title">${escapeHtml(item.name)}</h3>
          </header>
          ${orgLine(item)}
          ${item.when ? `<p class="activity-when">${escapeHtml(item.when)}</p>` : ""}
          <p class="activity-about">${escapeHtml(item.about || "")}</p>
          ${actionsBlock(item)}
        </article>`;
      })
      .join("")}</div>`;
  }

  function renderHero(site) {
    const h = site.hero;
    document.getElementById("hero-kicker").textContent = h.kicker;
    document.getElementById("hero-brand").textContent = site.brand;
    document.getElementById("hero-headline").textContent = h.headline;
    document.getElementById("hero-body").textContent = h.body;
    const cta = document.getElementById("hero-cta");
    cta.innerHTML = `
      <a class="btn btn-primary" href="${escapeHtml(h.ctaPrimary.href)}">${escapeHtml(h.ctaPrimary.label)}</a>
      <a class="btn btn-ghost" href="${escapeHtml(h.ctaSecondary.href)}">${escapeHtml(h.ctaSecondary.label)}</a>
    `;
  }

  function renderPeers(site) {
    const ch = site.chapters;
    document.getElementById("who-title").textContent = ch.headline;
    document.getElementById("who-lead").textContent = ch.lead;

    const root = document.getElementById("who-bands");
    root.innerHTML = ch.bands
      .map((band) => {
        const cards = band.orgs
          .map((org) => {
            const links = [];
            if (org.instagram) {
              links.push(
                `<a href="${igUrl(org.instagram)}" rel="noopener noreferrer">${igLabel(org.instagram)}</a>`
              );
            }
            if (org.url) {
              links.push(
                `<a href="${escapeHtml(org.url)}" rel="noopener noreferrer">Website</a>`
              );
            }
            return `<article class="peer-card">
              <h4 class="peer-card-name">${escapeHtml(org.name)}</h4>
              ${org.school ? `<p class="peer-card-school">${escapeHtml(org.school)}</p>` : ""}
              ${links.length ? `<p class="peer-card-links">${links.join('<span class="peer-card-sep" aria-hidden="true"> · </span>')}</p>` : ""}
            </article>`;
          })
          .join("");

        let adjacent = "";
        if (band.adjacent && band.adjacent.length) {
          adjacent = `<div class="adjacent">
            <h4 class="adjacent-title">Also on campus</h4>
            <ul class="adjacent-list">
              ${band.adjacent
                .map((a) => {
                  const ig = a.instagram
                    ? `<a href="${igUrl(a.instagram)}" rel="noopener noreferrer">${igLabel(a.instagram)}</a>`
                    : "";
                  return `<li><strong>${escapeHtml(a.name)}</strong> — ${escapeHtml(a.note || "")}${ig ? ` · ${ig}` : ""}</li>`;
                })
                .join("")}
            </ul>
          </div>`;
        }

        return `<div class="band-block" id="who-${escapeHtml(band.id)}">
          <h3 class="band-heading">${escapeHtml(band.label)}</h3>
          ${band.note ? `<p class="band-note">${escapeHtml(band.note)}</p>` : ""}
          <div class="peer-cards">${cards}</div>
          ${adjacent}
        </div>`;
      })
      .join("");
  }

  function renderLane(sectionKey, site) {
    const section = site[sectionKey];
    if (!section) return;
    const titleEl = document.getElementById(`${sectionKey}-title`);
    const leadEl = document.getElementById(`${sectionKey}-lead`);
    const listEl = document.getElementById(`${sectionKey}-list`);
    if (titleEl) titleEl.textContent = section.headline;
    if (leadEl) leadEl.textContent = section.lead;
    if (listEl) listEl.innerHTML = renderActivityCards(section.items);
  }

  function renderComing(site) {
    document.getElementById("coming-title").textContent = site.coming.headline;
    document.getElementById("coming-body").textContent = site.coming.body;
  }

  function renderContact(site) {
    const c = site.contact;
    document.getElementById("contact-title").textContent = c.headline;
    document.getElementById("contact-body").textContent = c.body;
    const a = document.getElementById("contact-mailto");
    a.href = `mailto:${c.email}`;
    a.textContent = `Email ${c.email}`;
  }

  function initNav() {
    const toggle = document.getElementById("nav-toggle");
    const nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
      document.body.classList.toggle("nav-open", !open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        document.body.classList.remove("nav-open");
      });
    });

    const hero = document.querySelector(".hero");
    if (hero) {
      const io = new IntersectionObserver(
        ([entry]) => {
          document.body.classList.toggle("is-past-hero", !entry.isIntersecting);
        },
        { threshold: 0.05 }
      );
      io.observe(hero);
    }
  }

  function initTocSpy() {
    const links = [...document.querySelectorAll("[data-toc-target]")];
    const sections = [...document.querySelectorAll("[data-doc-section]")];
    if (!links.length || !sections.length) return;

    const byId = Object.fromEntries(
      links.map((a) => [a.getAttribute("data-toc-target"), a])
    );

    function updateActive() {
      // Prefer the section that currently owns a line near the top of the viewport.
      // (Tall sections like Events never fully fit, so intersection-ratio spies skip them.)
      const marker = Math.min(140, Math.round(window.innerHeight * 0.2));
      let activeId = sections[0].id;
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= marker && rect.bottom > marker) {
          activeId = section.id;
          break;
        }
        if (rect.top <= marker) {
          activeId = section.id;
        }
      }
      links.forEach((a) => a.classList.remove("is-active"));
      if (byId[activeId]) byId[activeId].classList.add("is-active");
    }

    let raf = 0;
    function onScroll() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateActive();
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("scrollend", updateActive, { passive: true });
    links.forEach((a) => {
      a.addEventListener("click", () => {
        requestAnimationFrame(() => requestAnimationFrame(updateActive));
        window.setTimeout(updateActive, 400);
      });
    });
    updateActive();
  }

  function initBandFab() {
    const fab = document.getElementById("band-fab");
    const slot = document.getElementById("toc-fab-slot");
    const home = fab && fab.parentElement;
    if (!fab || !slot || !home) return;

    let activeBand = null;
    const buttons = [...fab.querySelectorAll("[data-band]")];
    const filterRoots = ["#events-list", "#resources-list"]
      .map((sel) => document.querySelector(sel))
      .filter(Boolean);
    const wideMq = window.matchMedia("(min-width: 1100px)");

    function applyFilter() {
      buttons.forEach((btn) => {
        const on = btn.getAttribute("data-band") === activeBand;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", String(on));
      });
      filterRoots.forEach((root) => {
        root.querySelectorAll(".activity-card[data-bands]").forEach((card) => {
          if (!activeBand) {
            card.hidden = false;
            return;
          }
          const bands = (card.getAttribute("data-bands") || "")
            .split(/\s+/)
            .filter(Boolean);
          card.hidden = !bands.includes(activeBand);
        });
      });
    }

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const band = btn.getAttribute("data-band");
        activeBand = activeBand === band ? null : band;
        applyFilter();
      });
    });

    function placeFab() {
      if (wideMq.matches) {
        slot.appendChild(fab);
        fab.classList.add("is-docked");
      } else {
        home.appendChild(fab);
        fab.classList.remove("is-docked");
      }
    }

    const sectionIds = ["events", "resources"];
    const inView = Object.fromEntries(sectionIds.map((id) => [id, false]));

    function syncFabVisibility() {
      const show = sectionIds.some((id) => inView[id]);
      fab.hidden = !show;
      fab.classList.toggle("is-visible", show);
      document.body.classList.toggle("band-fab-open", show);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          inView[entry.target.id] = entry.isIntersecting;
        });
        syncFabVisibility();
      },
      { rootMargin: "0px 0px 0px 0px", threshold: [0, 0.01, 0.1] }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });

    if (typeof wideMq.addEventListener === "function") {
      wideMq.addEventListener("change", placeFab);
    } else {
      wideMq.addListener(placeFab);
    }
    placeFab();
    applyFilter();
  }

  async function main() {
    initNav();
    const site = await loadJson("data/site.json");
    document.title = `${site.brand || site.title} — Greater Sacramento`;
    renderHero(site);
    renderPeers(site);
    renderLane("events", site);
    renderLane("resources", site);
    renderComing(site);
    renderContact(site);
    initTocSpy();
    initBandFab();
  }

  main().catch((err) => {
    console.error(err);
    const mainEl = document.getElementById("main");
    if (mainEl) {
      const p = document.createElement("p");
      p.className = "load-error";
      p.textContent = "Could not load guide data. Try refreshing.";
      mainEl.prepend(p);
    }
  });
})();
