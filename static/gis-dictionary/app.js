(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const categoryNames = {
    "foundations": ["基础概念", "Foundations"],
    "data-models": ["数据与格式", "Data & Formats"],
    "spatial-reference": ["空间参考", "Spatial Reference"],
    "data-integration": ["数据定位", "Data Integration"],
    "spatial-analysis": ["空间分析", "Spatial Analysis"],
    "web-gis": ["Web GIS", "Web GIS"],
    "cartography": ["地图制图", "Cartography"],
    "remote-sensing": ["遥感与高程", "Remote Sensing"],
    "data-quality": ["数据质量", "Data Quality"]
  };
  const fields = [
    { key: "definition", zh: "专业定义", en: "Definition", number: "01", css: "definition" },
    { key: "plain", zh: "讲人话", en: "In plain language", number: "02", css: "plain", focus: true },
    { key: "example", zh: "实际案例", en: "In practice", number: "03", css: "example" },
    { key: "why_it_matters", zh: "所以呢？", en: "Why it matters", number: "04", css: "why" },
    { key: "misconception", zh: "常见误区", en: "A common misconception", number: "05", css: "misconception" },
    { key: "translation_note", zh: "翻译笔记", en: "Translation note", number: "06", css: "translation" },
    { key: "scope_note", zh: "适用范围", en: "Scope note", number: "07", css: "scope" }
  ];

  const state = {
    data: [],
    sources: new Map(),
    lang: readPref("gisdict-lang", "bilingual"),
    category: "all",
    query: "",
    onlyFavorites: false,
    onlyFresh: false,
    favorites: new Set(readPref("gisdict-favorites", [])),
    selected: "gis:gis"
  };

  function readPref(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function storePref(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  const norm = (value) => String(value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const slug = (concept) => concept.id.substring(4);
  const link = (concept) => "#/concept/" + encodeURIComponent(slug(concept));
  const term = (concept, language) => concept.terms?.[language]?.preferred || "";
  const categoryLabel = (category) => categoryNames[category]?.[state.lang === "en" ? 1 : 0] || category;

  function currentIdFromHash() {
    const match = location.hash.match(/^#\/concept\/([^/?#]+)/);
    if (!match) {
      return null;
    }
    try {
      return "gis:" + decodeURIComponent(match[1]);
    } catch (_) {
      return null;
    }
  }

  function searchableText(concept) {
    return [
      concept.id,
      ...["en", "zh-Hans"].flatMap((language) => [
        concept.terms?.[language]?.preferred || "",
        ...(concept.terms?.[language]?.aliases || [])
      ]),
      ...["definition", "plain", "essence"].flatMap((key) => [
        concept.content?.[key]?.en || "",
        concept.content?.[key]?.["zh-Hans"] || ""
      ])
    ].join(" ");
  }

  function relevance(concept, query) {
    if (!query) {
      return 1;
    }
    const names = [
      term(concept, "en"),
      term(concept, "zh-Hans"),
      ...(concept.terms.en.aliases || []),
      ...(concept.terms["zh-Hans"].aliases || [])
    ].map(norm);
    if (names.some((name) => name === query)) {
      return 5;
    }
    if (names.some((name) => name.startsWith(query))) {
      return 4;
    }
    if (names.some((name) => name.includes(query))) {
      return 3;
    }
    const text = norm(searchableText(concept));
    if (text.includes(query)) {
      return 2;
    }
    const pieces = query.split(" ").filter(Boolean);
    return pieces.length > 1 && pieces.every((piece) => text.includes(piece)) ? 1 : 0;
  }

  function filtered() {
    const query = norm(state.query);
    return state.data
      .map((concept) => ({ concept, score: relevance(concept, query) }))
      .filter(({ concept, score }) =>
        score > 0 &&
        (state.category === "all" || concept.category === state.category) &&
        (!state.onlyFavorites || state.favorites.has(concept.id)) &&
        (!state.onlyFresh || Boolean(concept.content?.fresh_take?.["zh-Hans"]?.trim()))
      )
      .sort((a, b) => query ? b.score - a.score || compareTerms(a.concept, b.concept) : compareTerms(a.concept, b.concept))
      .map(({ concept }) => concept);
  }

  function compareTerms(a, b) {
    return term(a, "en").localeCompare(term(b, "en"), "en", { sensitivity: "base" });
  }

  function activeConcept() {
    return state.data.find((concept) => concept.id === state.selected) || state.data[0] || null;
  }

  function showResults() {
    const matched = filtered();
    $("#result-count").textContent = state.lang === "en"
      ? matched.length + " concepts"
      : matched.length + " 个匹配概念";
    $("#total-count").textContent = state.data.length;
    $("#results").innerHTML = matched.length
      ? matched.map((concept) => {
        const active = concept.id === state.selected;
        const liked = state.favorites.has(concept.id);
        return '<a class="result" href="' + link(concept) + '" aria-current="' + (active ? "true" : "false") +
          '" data-concept="' + escapeHtml(concept.id) + '">' +
          '<div class="result-top"><span class="result-en">' + escapeHtml(term(concept, "en")) + '</span>' +
          '<span class="result-star ' + (liked ? "is-starred" : "") + '" aria-hidden="true">' + (liked ? "★" : "·") + '</span></div>' +
          '<div class="result-zh">' + escapeHtml(term(concept, "zh-Hans")) + '</div>' +
          (state.onlyFresh ? '<div class="result-fresh-preview">' +
            escapeHtml(state.lang === "en" ? concept.content.fresh_take.en : concept.content.fresh_take["zh-Hans"]) +
            '</div>' : "") + '</a>';
      }).join("")
      : '<div class="no-results">' + (state.lang === "en"
        ? "No matching concepts. Try a different term or clear the filters."
        : "没有找到对应术语。可以换一种说法，或清除筛选条件。") + '</div>';
  }

  function showLanguagePair(value, key) {
    if (!value || typeof value !== "object") {
      return "";
    }
    const chosen = state.lang === "bilingual" ? ["zh-Hans", "en"] : [state.lang];
    const blocks = chosen.filter((lang) => String(value[lang] || "").trim()).map((lang) =>
      '<div class="lang-block"><div class="lang-label">' + (lang === "en" ? "ENGLISH" : "中文") +
      '</div><p>' + escapeHtml(value[lang]) + '</p></div>'
    );
    if (!blocks.length) {
      return "";
    }
    return '<div class="lang-pair ' + (blocks.length === 1 ? "is-single" : "") + '">' + blocks.join("") + '</div>';
  }

  function sectionMarkup(concept, item) {
    const value = concept.content?.[item.key];
    const body = showLanguagePair(value, item.key);
    if (!body) {
      return "";
    }
    return '<section class="entry-section ' + item.css + (item.focus ? ' focus-panel' : '') + '">' +
      '<div class="section-heading"><span class="section-index">' + item.number + '</span>' +
      '<h3>' + (state.lang === "en" ? item.en : item.zh) + '</h3>' +
      (state.lang === "bilingual" ? '<span class="section-hint">' + item.en + '</span>' : "") +
      '</div>' + body + '</section>';
  }

  function freshMarkup(concept) {
    const take = concept.content?.fresh_take;
    if (!take || (!take.en?.trim() && !take["zh-Hans"]?.trim())) {
      return "";
    }
    const showZh = state.lang !== "en" && take["zh-Hans"]?.trim();
    const showEn = state.lang !== "zh-Hans" && take.en?.trim();
    return '<section class="entry-section fresh-panel">' +
      '<div class="section-heading"><span class="fresh-tag">✦</span><h3>' +
      (state.lang === "en" ? "A fresh take" : "GIS 新解") + '</h3>' +
      (state.lang === "bilingual" ? '<span class="section-hint">A fresh take</span>' : "") +
      '</div>' +
      (showZh ? '<p class="fresh-quote">“' + escapeHtml(take["zh-Hans"]) + '”</p>' : "") +
      (showEn ? '<p class="fresh-quote-en">“' + escapeHtml(take.en) + '”</p>' : "") +
      '<p class="fresh-disclaimer">' + (state.lang === "en"
        ? "An original learning metaphor, not a formal definition."
        : "原创教学隐喻，帮助理解和记忆，不是正式定义。") + '</p></section>';
  }

  function relatedMarkup(concept) {
    const related = (concept.related || [])
      .map((relationship) => state.data.find((entry) => entry.id === relationship.id))
      .filter(Boolean);
    if (!related.length) {
      return "";
    }
    return '<section class="entry-section related-section"><div class="section-heading">' +
      '<h3>' + (state.lang === "en" ? "Connected concepts" : "关联概念") + '</h3>' +
      (state.lang === "bilingual" ? '<span class="section-hint">Keep exploring</span>' : "") +
      '</div><div class="related-list">' + related.map((target) =>
        '<a class="related-link" href="' + link(target) + '">' +
        escapeHtml(state.lang === "zh-Hans" ? term(target, "zh-Hans") : term(target, "en")) +
        (state.lang === "bilingual" ? '<span>' + escapeHtml(term(target, "zh-Hans")) + '</span>' : "") +
        '</a>'
      ).join("") + '</div></section>';
  }

  function safeUrl(raw) {
    try {
      const value = new URL(raw);
      return ["https:", "http:"].includes(value.protocol) ? value.href : null;
    } catch (_) {
      return null;
    }
  }

  function sourcesMarkup(concept) {
    const verified = new Set(concept.editorial?.source_audit?.directly_checked_source_ids || []);
    const sources = (concept.source_ids || []).map((id) => ({
      id,
      source: state.sources.get(id)
    })).filter(({ source }) => Boolean(source));
    if (!sources.length) {
      return "";
    }
    const renderLinks = (list) => list.map(({ source }) => {
      const url = safeUrl(source.url);
      return url ? '<a class="source-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(source.title) + ' ↗</a>' : "";
    }).join("");
    const direct = sources.filter(({ id }) => verified.has(id));
    const contextual = sources.filter(({ id }) => !verified.has(id));
    const directTitle = state.lang === "en" ? "Term-relevant references checked" : "本术语已核对的参考";
    const contextTitle = state.lang === "en" ? "Contextual reading · term-level verification pending" : "延伸阅读 · 尚待逐条核验";
    const group = (label, list) => list.length
      ? '<div class="source-group"><p class="source-group-title">' + label + '</p>' +
        '<div class="source-list">' + renderLinks(list) + '</div></div>'
      : "";
    return '<section class="entry-section"><div class="section-heading"><h3>' +
      (state.lang === "en" ? "References and review status" : "参考来源与核验状态") +
      '</h3></div>' + group(directTitle, direct) + group(contextTitle, contextual) +
      '<p class="source-note">' + (state.lang === "en"
        ? "Checked means a relevant source passage was inspected for this concept, not a formal standard certification. All descriptions are original educational writing."
        : "「已核对」仅代表查阅过与本概念相关的技术说明，不代表标准认证或逐句审核。所有解释为独立编写的教育性内容。") +
      '</p></section>';
  }

  function showDetail() {
    const concept = activeConcept();
    if (!concept) {
      $("#detail").innerHTML = '<p>词典尚无词条。</p>';
      return;
    }
    const aliases = [
      ...(concept.terms.en.aliases || []),
      ...(concept.terms["zh-Hans"].aliases || [])
    ].filter((value, index, all) => value && all.indexOf(value) === index);
    const liked = state.favorites.has(concept.id);
    const nameEn = term(concept, "en");
    const nameZh = term(concept, "zh-Hans");
    const essence = showLanguagePair(concept.content?.essence, "essence");
    const title = state.lang === "zh-Hans" ? nameZh : nameEn;
    const subtitle = state.lang === "zh-Hans" ? nameEn : nameZh;
    $("#detail").innerHTML =
      '<div class="detail-topline"><div class="breadcrumb">GIS Dictionary <span>›</span> ' +
      escapeHtml(categoryLabel(concept.category)) + '</div><div class="detail-actions">' +
      '<button type="button" id="favorite-action" class="icon-action" aria-pressed="' + liked + '">' +
      (liked ? "★ " : "☆ ") + (state.lang === "en" ? "Save" : "收藏") + '</button>' +
      '<button type="button" id="share-action" class="icon-action">' +
      (state.lang === "en" ? "Share ↗" : "分享 ↗") + '</button></div></div>' +
      '<span class="category-tag">' + escapeHtml(categoryLabel(concept.category)) + '</span>' +
      '<div style="height:17px"></div>' +
      '<h2 class="entry-title">' + escapeHtml(title) + '</h2>' +
      '<p class="entry-chinese">' + escapeHtml(subtitle) + '</p>' +
      (aliases.length ? '<p class="entry-aliases">' + (state.lang === "en" ? "Also known as: " : "又称 / 缩写：") +
        escapeHtml(aliases.join(" · ")) + '</p>' : "") +
      (essence ? '<div class="entry-short">' + essence + '</div>' : "") +
      '<hr class="entry-divider">' +
      fields.map((item) => sectionMarkup(concept, item)).join("") +
      freshMarkup(concept) +
      relatedMarkup(concept) +
      sourcesMarkup(concept) +
      '<div class="editorial-note"><span class="editorial-dot"></span><span>' +
      (state.lang === "en"
        ? "Editorial draft · Professional definitions and Chinese translations require subject-matter review. Visual explanations are planned for a later phase."
        : "编辑初稿 · 专业定义和中文译名仍需领域专家逐条审核；图解作为后续扩展，当前不以空白占位。") +
      '</span></div>';

    document.title = nameEn + " · " + nameZh + " — GIS Dictionary";
    $("#favorite-action").addEventListener("click", toggleCurrentFavorite);
    $("#share-action").addEventListener("click", shareCurrent);
  }

  function toggleCurrentFavorite() {
    if (state.favorites.has(state.selected)) {
      state.favorites.delete(state.selected);
    } else {
      state.favorites.add(state.selected);
    }
    storePref("gisdict-favorites", [...state.favorites]);
    showResults();
    showDetail();
  }

  async function shareCurrent() {
    const concept = activeConcept();
    const hash = concept ? link(concept) : "#/";
    const url = new URL(location.href);
    url.hash = hash;
    const button = $("#share-action");
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(url.href);
      button.textContent = state.lang === "en" ? "Copied ✓" : "已复制 ✓";
    } catch (_) {
      window.prompt(state.lang === "en" ? "Copy link" : "复制词条链接", url.href);
    }
  }

  function navigate(id, scrollOnMobile) {
    if (!state.data.some((concept) => concept.id === id)) {
      return;
    }
    state.selected = id;
    showResults();
    showDetail();
    if (scrollOnMobile && window.matchMedia("(max-width: 720px)").matches) {
      const top = $("#detail").getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  function routeFromHash(scrollOnMobile = false) {
    const hashId = currentIdFromHash();
    if (hashId) {
      navigate(hashId, scrollOnMobile);
    }
  }

  function bindControls() {
    $("#term-search").addEventListener("input", (event) => {
      state.query = event.target.value;
      showResults();
    });
    $("#term-search").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const first = filtered()[0];
        if (first) {
          location.hash = link(first);
          routeFromHash(true);
        }
      }
    });
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const editing = target instanceof HTMLElement &&
        (target.matches("input,textarea,select") || target.isContentEditable);
      if ((!editing && event.key === "/") || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        $("#term-search").focus();
        $("#term-search").select();
      }
      if (event.key === "Escape" && document.activeElement === $("#term-search")) {
        $("#term-search").value = "";
        state.query = "";
        showResults();
      }
    });
    $("#results").addEventListener("click", (event) => {
      const anchor = event.target.closest("a[data-concept]");
      if (anchor) {
        navigate(anchor.dataset.concept, true);
      }
    });
    $("#detail").addEventListener("click", (event) => {
      const anchor = event.target.closest('a[href^="#/concept/"]');
      if (anchor) {
        const path = anchor.getAttribute("href").match(/^#\/concept\/([^/?#]+)/);
        if (path) {
          navigate("gis:" + decodeURIComponent(path[1]), true);
        }
      }
    });
    $("#category-select").addEventListener("change", (event) => {
      state.category = event.target.value;
      showResults();
    });
    $("#favorites-toggle").addEventListener("click", () => {
      state.onlyFavorites = !state.onlyFavorites;
      $("#favorites-toggle").setAttribute("aria-pressed", String(state.onlyFavorites));
      showResults();
    });
    $("#new-takes-toggle").addEventListener("click", () => {
      state.onlyFresh = !state.onlyFresh;
      $("#new-takes-toggle").setAttribute("aria-pressed", String(state.onlyFresh));
      showResults();
    });
    $("#language-select").addEventListener("change", (event) => {
      state.lang = event.target.value;
      storePref("gisdict-lang", state.lang);
      populateCategories();
      showResults();
      showDetail();
    });
    window.addEventListener("hashchange", () => routeFromHash(false));
  }

  function populateCategories() {
    const select = $("#category-select");
    const counts = new Map();
    state.data.forEach((concept) => counts.set(concept.category, (counts.get(concept.category) || 0) + 1));
    const names = [["all", state.lang === "en" ? "All subjects" : "全部领域"]];
    Object.keys(categoryNames).forEach((id) => {
      if (counts.has(id)) {
        names.push([id, categoryLabel(id) + " · " + counts.get(id)]);
      }
    });
    select.innerHTML = names.map(([id, name]) => '<option value="' + escapeHtml(id) + '">' +
      escapeHtml(name) + '</option>').join("");
    select.value = state.category;
  }

  async function initialize() {
    $("#language-select").value = ["en", "zh-Hans", "bilingual"].includes(state.lang) ? state.lang : "bilingual";
    bindControls();
    try {
      const [conceptsResponse, sourcesResponse] = await Promise.all([
        fetch("./data/concepts.json"),
        fetch("./data/sources.json")
      ]);
      if (!conceptsResponse.ok || !sourcesResponse.ok) {
        throw new Error("Could not load data files");
      }
      const concepts = await conceptsResponse.json();
      const sources = await sourcesResponse.json();
      if (!Array.isArray(concepts.concepts) || !Array.isArray(sources.sources)) {
        throw new Error("Invalid dictionary data");
      }
      state.data = concepts.concepts;
      state.sources = new Map(sources.sources.map((source) => [source.id, source]));
      const chosen = currentIdFromHash();
      if (chosen && state.data.some((concept) => concept.id === chosen)) {
        state.selected = chosen;
      }
      populateCategories();
      showResults();
      showDetail();
    } catch (error) {
      $("#result-count").textContent = "数据加载失败";
      $("#detail").innerHTML =
        '<div class="loading-state"><span class="loading-glyph">!</span>' +
        '<p>无法加载词典数据。请使用本地 HTTP 服务器运行本项目（例如 python3 -m http.server 8000）。</p></div>';
      console.error("GIS Dictionary:", error);
    }
  }

  initialize();
})();