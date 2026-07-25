(() => {
  const BAND_LABEL = { hs: "High school", college: "College" };

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

  function renderIntro(site) {
    document.getElementById("intro-title").textContent = site.intro.headline;
    document.getElementById("intro-body").textContent = site.intro.body;
  }

  function renderPeers(site) {
    const ch = site.chapters;
    document.getElementById("peers-title").textContent = ch.headline;
    document.getElementById("peers-lead").textContent = ch.lead;

    const root = document.getElementById("peers-bands");
    root.innerHTML = ch.bands
      .map((band) => {
        const rows = band.orgs
          .map((org) => {
            const ig = org.instagram
              ? `<a href="${igUrl(org.instagram)}" rel="noopener noreferrer">${igLabel(org.instagram)}</a>`
              : "—";
            const siteLink = org.url
              ? ` · <a href="${escapeHtml(org.url)}" rel="noopener noreferrer">Website</a>`
              : "";
            return `<tr>
              <td><strong>${escapeHtml(org.name)}</strong></td>
              <td>${escapeHtml(org.school || "")}</td>
              <td>${ig}${siteLink}</td>
            </tr>`;
          })
          .join("");

        let adjacent = "";
        if (band.adjacent && band.adjacent.length) {
          adjacent = `<div class="adjacent">
            <h4 class="adjacent-title">Campus-adjacent</h4>
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

        return `<div class="band-block" id="peers-${escapeHtml(band.id)}">
          <h3 class="band-heading">${escapeHtml(band.label)}</h3>
          ${band.note ? `<p class="band-note">${escapeHtml(band.note)}</p>` : ""}
          <div class="table-wrap">
            <table class="peer-table">
              <thead>
                <tr><th>Club</th><th>School</th><th>Instagram</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${adjacent}
        </div>`;
      })
      .join("");
  }

  function renderOpportunities(site) {
    const op = site.opportunities;
    document.getElementById("opps-title").textContent = op.headline;
    document.getElementById("opps-lead").textContent = op.lead;

    const root = document.getElementById("opps-groups");
    root.innerHTML = op.groups
      .map((group) => {
        const orgLink = group.orgUrl
          ? `<a href="${escapeHtml(group.orgUrl)}" rel="noopener noreferrer">${escapeHtml(group.org)}</a>`
          : escapeHtml(group.org);
        const ig = group.instagram
          ? ` · <a href="${igUrl(group.instagram)}" rel="noopener noreferrer">${igLabel(group.instagram)}</a>`
          : "";
        const note = group.note
          ? `<p class="group-note">${escapeHtml(group.note)}</p>`
          : "";

        const items = group.items
          .map((item) => {
            const link = item.url
              ? `<p class="opp-link"><a href="${escapeHtml(item.url)}" rel="noopener noreferrer">${escapeHtml(item.urlLabel || item.url)}</a></p>`
              : "";
            const highlight = item.highlight
              ? `<div class="opp-highlight">
                  <p class="opp-highlight-label">${escapeHtml(item.highlight.label)} ${bandPills(item.highlight.bands)}</p>
                  <p>${escapeHtml(item.highlight.text)}</p>
                </div>`
              : "";
            const plugs = (item.plugIn || [])
              .map(
                (p) =>
                  `<li><span class="plug-kind">${escapeHtml(p.kind)}</span> ${escapeHtml(p.text)}</li>`
              )
              .join("");

            return `<article class="opp-item">
              <header class="opp-item-head">
                <h4 class="opp-name">${escapeHtml(item.name)}</h4>
                ${bandPills(item.bands)}
              </header>
              <p class="opp-when">${escapeHtml(item.when || "")}</p>
              <p class="opp-about">${escapeHtml(item.about || "")}</p>
              ${highlight}
              ${link}
              <ul class="plug-list">${plugs}</ul>
            </article>`;
          })
          .join("");

        const also =
          group.also && group.also.length
            ? `<div class="also-block">
                <h4 class="also-title">Also from ${escapeHtml(group.org)}</h4>
                <ul class="also-list">
                  ${group.also
                    .map(
                      (a) =>
                        `<li><strong>${escapeHtml(a.name)}</strong> — ${escapeHtml(a.text)}</li>`
                    )
                    .join("")}
                </ul>
              </div>`
            : "";

        return `<div class="opp-group" id="opps-${escapeHtml(group.id)}">
          <h3 class="opp-org">${orgLink}${ig}</h3>
          ${note}
          <div class="opp-items">${items}</div>
          ${also}
        </div>`;
      })
      .join("");
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

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible.length) return;
        const id = visible[0].target.id;
        links.forEach((a) => a.classList.remove("is-active"));
        if (byId[id]) byId[id].classList.add("is-active");
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.4, 0.7] }
    );
    sections.forEach((s) => io.observe(s));
  }

  async function main() {
    initNav();
    const site = await loadJson("data/site.json");
    document.title = `${site.title} — Greater Sacramento`;
    renderHero(site);
    renderIntro(site);
    renderPeers(site);
    renderOpportunities(site);
    renderComing(site);
    renderContact(site);
    initTocSpy();
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
