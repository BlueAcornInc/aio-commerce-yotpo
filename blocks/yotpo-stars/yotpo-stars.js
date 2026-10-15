/**
 * Resolves `getConfigValue` from whichever config module the consuming storefront provides:
 * the Adobe Commerce drop-in tools (kai-da) or the boilerplate's scripts/configs.js.
 * Dynamic so a storefront without `@dropins/tools` still loads the block.
 */
const resolveGetConfigValue = async () => {
  try {
    const mod = await import("@dropins/tools/lib/aem/configs.js");
    if (typeof mod.getConfigValue === "function") return mod.getConfigValue;
  } catch (e) {
    // not installed — try the boilerplate module below
  }
  try {
    const mod = await import("../../scripts/configs.js");
    if (typeof mod.getConfigValue === "function") return mod.getConfigValue;
  } catch (e) {
    // neither available
  }
  return async () => undefined;
};

/**
 * Adds the storefront's store view code to the config endpoint, so the app
 * returns that store view's settings (App Management scopes). Reads the code
 * from either the drop-in config-service key or the legacy configs.json key.
 */
const withStoreCode = async (endpoint, getConfigValue) => {
  if (!endpoint) return endpoint;
  let storeCode;
  try {
    storeCode =
      (await getConfigValue("headers.cs.Magento-Store-View-Code")) ||
      (await getConfigValue("commerce.headers.cs.Magento-Store-View-Code"));
  } catch (e) {
    storeCode = undefined;
  }
  if (!storeCode) return endpoint;
  const url = new URL(endpoint);
  url.searchParams.set("storeCode", storeCode);
  return url.toString();
};

export default async function decorate(block) {
  const getConfigValue = await resolveGetConfigValue();
  const cfg = {
    endpoint: await withStoreCode(
      await getConfigValue("yotpo-config-url"),
      getConfigValue,
    ),
  };

  let observerTimer = null;
  let activeTileObserver = null;
  const processingTiles = new WeakSet();
  const ratingsCache = new Map();

  /**
   * Resolves the storefront-specific SKU/entity-id helpers.
   *
   * `getEntityIdsBySku`/`getProductSku` (scripts/commerce.js) and `parseProductPath`
   * (scripts/product-route.js) are kai-da-specific additions, not guaranteed to exist in
   * every consuming repo this package is installed into. Import them dynamically; callers
   * fall back to using the raw SKU as the Yotpo product id, and to last-path-segment href
   * parsing, when they are unavailable.
   */
  const resolveCommerceHelpers = async () => {
    try {
      const commerce = await import("../../scripts/commerce.js");
      return {
        getProductSku:
          typeof commerce.getProductSku === "function"
            ? commerce.getProductSku
            : null,
        getEntityIdsBySku:
          typeof commerce.getEntityIdsBySku === "function"
            ? commerce.getEntityIdsBySku
            : null,
      };
    } catch (e) {
      return { getProductSku: null, getEntityIdsBySku: null };
    }
  };

  const resolveParseProductPath = async () => {
    try {
      const productRoute = await import("../../scripts/product-route.js");
      if (typeof productRoute.parseProductPath === "function")
        return productRoute.parseProductPath;
    } catch (e) {
      // not present in this storefront — fall through to the default below
    }
    return (pathname) => {
      const parts = pathname.split("/").filter(Boolean);
      return { sku: parts[parts.length - 1] || null };
    };
  };

  const {
    getProductSku: getProductSkuImpl,
    getEntityIdsBySku: getEntityIdsBySkuImpl,
  } = await resolveCommerceHelpers();
  const parseProductPath = await resolveParseProductPath();

  const getProductSku = () => {
    if (getProductSkuImpl) return getProductSkuImpl();
    // Without the commerce helper, a query param is an actual SKU when present; the current
    // path is only tried as a last resort (see parseProductPath's own fallback default above).
    const qpSku =
      new URLSearchParams(window.location.search).get("sku") ||
      new URLSearchParams(window.location.search).get("productId") ||
      new URLSearchParams(window.location.search).get("id");
    if (qpSku) return qpSku;
    const { sku } = parseProductPath(window.location.pathname) || {};
    return sku || null;
  };

  const getEntityIdsBySku = async (skus) => {
    if (getEntityIdsBySkuImpl) return getEntityIdsBySkuImpl(skus);
    return new Map(skus.map((sku) => [sku, sku]));
  };

  /**
   * Fetches Yotpo star ratings for a product from the public CDN API.
   * Returns the `bottomline` object ({ averageScore, totalReviews }) or null on error.
   */
  const fetchRatings = async (appKey, productId) => {
    const cacheKey = `${appKey}:${productId}`;
    if (ratingsCache.has(cacheKey)) {
      return ratingsCache.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const url = `https://api-cdn.yotpo.com/v3/storefront/store/${appKey}/product/${productId}/ratings`;
        const resp = await fetch(url);
        if (!resp.ok) {
          ratingsCache.delete(cacheKey);
          return null;
        }
        const json = await resp.json();
        return json?.bottomline || null;
      } catch (e) {
        ratingsCache.delete(cacheKey);
        return null;
      }
    })();

    ratingsCache.set(cacheKey, requestPromise);
    return requestPromise;
  };

  /**
   * Fetches the Q&A question/answer counts for a product from the public CDN API.
   * Returns `{ questions, answers }` or null on error/absence (mirrors the PDP
   * header's v2 `QABottomLine`, which v3 has no equivalent widget for).
   */
  const fetchQnaCounts = async (appKey, productId) => {
    try {
      const url = `https://api-cdn.yotpo.com/v1/widget/${appKey}/products/${productId}/questions.json?per_page=1`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const json = await resp.json();
      return json?.response?.pagination?.total || null;
    } catch (e) {
      return null;
    }
  };

  const QNA_TAB_SELECTOR = '.yotpo-main-widget-tabs [role="tab"]';

  /**
   * The Q&A surface on the page, in order of preference:
   *  - the second tab of the reviews widget (Yotpo "Q&A placement: Second tab of Reviews
   *    Widget", as on the PaaS PDP);
   *  - the embedded Q&A panel itself, when the reviews widget shows it without tabs;
   *  - the standalone widget container mounted by `blocks/yotpo/yotpo.js` (fallback).
   */
  const getQnaTab = () =>
    document.querySelectorAll(QNA_TAB_SELECTOR)[1] || null;
  const getQnaSurface = () =>
    getQnaTab() ||
    document.getElementById("yotpo-tabs-main-widget-tab-panel-1") ||
    document.getElementById("yotpo-qna-widget");

  /**
   * Resolves true as soon as the Q&A surface exists, false if it still doesn't after
   * `timeoutMs`. Observes the DOM instead of polling on a short timer, because the surface
   * only appears once the (lazily loaded) reviews block and Yotpo's own scripts have run,
   * which can take longer than any fixed short wait on a slow connection.
   *
   * The public counts API used by the caller reflects whether Q&A *content* exists for a
   * product, not whether the account currently has a published v3 Q&A widget to display it
   * in — those can disagree (e.g. content exists but the widget was unpublished since). Only
   * show the header link once there is somewhere for it to lead, so it never points at nothing.
   */
  const waitForQnaSurface = (timeoutMs = 10000) =>
    new Promise((resolve) => {
      if (getQnaSurface()) {
        resolve(true);
        return;
      }
      let timer;
      const observer = new MutationObserver(() => {
        if (!getQnaSurface()) return;
        observer.disconnect();
        clearTimeout(timer);
        resolve(true);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      timer = setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, timeoutMs);
    });

  /**
   * Activates the tab at `index` (0 = Reviews, 1 = Q&A) of the reviews widget, moves focus to it
   * and scrolls the tab strip to the top of the viewport (the strip has a scroll-margin for the
   * fixed header, see yotpo.css). Returns false when the widget has no such tab, so callers can
   * fall back.
   */
  const openTab = (index) => {
    const tabAt = () => document.querySelectorAll(QNA_TAB_SELECTOR)[index];
    if (!tabAt()) return false;
    if (tabAt().getAttribute("aria-selected") !== "true") tabAt().click();
    // Re-query: the widget may re-render its tab buttons on activation. Focus moves to the tab
    // like a direct activation (screen readers announce "Q&A, tab, selected"); preventScroll so
    // the scroll below is the only one that happens.
    const tab = tabAt();
    tab.focus({ preventScroll: true });
    (tab.closest(".yotpo-main-widget-tabs") || tab).scrollIntoView({
      block: "start",
    });
    return true;
  };

  /** Opens the Q&A tab (or scrolls to the standalone Q&A widget). */
  const openQna = () => {
    if (openTab(1)) return;
    getQnaSurface()?.scrollIntoView();
  };

  /**
   * Adds the Q&A link to the header summary, like the v2 PDP header's QABottomLine:
   * "N Questions \ N Answers", or "Ask a question" when there are none yet.
   */
  const appendQnaLink = (wrap, total) => {
    const hasQuestions = total.questions > 0;
    const qnaLink = document.createElement("a");
    qnaLink.className = hasQuestions
      ? "yotpo-stars-summary__qna-count"
      : "yotpo-stars-summary__qna-ask";
    qnaLink.href = "#";
    qnaLink.textContent = hasQuestions
      ? `${total.questions} Questions \\ ${total.answers || 0} Answers`
      : "Ask a question";
    qnaLink.addEventListener("click", (e) => {
      e.preventDefault();
      openQna();
    });
    wrap.appendChild(qnaLink);
  };

  /**
   * Builds 5 star SVG polygon elements and appends them to `container`.
   * `filledCount` controls how many stars are filled vs outlined.
   */
  const appendStarSvgs = (container, filledCount) => {
    const starColor = "#b38a2b";
    const starPts =
      "12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26";
    for (let i = 0; i < 5; i += 1) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "15");
      svg.setAttribute("height", "15");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      const poly = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "polygon",
      );
      poly.setAttribute("points", starPts);
      poly.setAttribute("fill", i < filledCount ? starColor : "none");
      poly.setAttribute("stroke", starColor);
      poly.setAttribute("stroke-width", "1.5");
      svg.appendChild(poly);
      container.appendChild(svg);
    }
  };

  /**
   * Renders the PDP star-rating summary ourselves from Yotpo's public ratings API.
   *
   * Why not the native widget: the ReviewsStarRatingsWidget (v0.34.x) has a reactive
   * track/trigger key mismatch in its bundled petite-vue, so bottomline data fetched
   * after mount never reaches the v-if directive and the widget stays hidden in EDS
   * (it only renders on Magento PaaS, which injects the data server-side at mount).
   * The public ratings endpoint is stable across widget v2/v3, so self-rendering is
   * version-proof. The full reviews widget below (blocks/yotpo/yotpo.js) is unaffected.
   */
  const renderStarSummary = async (targetBlock, appKey, productId) => {
    try {
      if (!appKey || !productId) return;
      const hasExistingBlockSummary = Array.from(targetBlock.children).some(
        (child) =>
          child.classList?.contains("yotpo-stars-summary") &&
          !child.classList.contains("yotpo-stars-summary--card"),
      );
      if (
        document.querySelector(".pdp-header .yotpo-stars-summary") ||
        hasExistingBlockSummary
      )
        return;
      const bl = await fetchRatings(appKey, productId);
      if (!bl) return;

      const avg = Number(bl.averageScore) || 0;
      const total = Number(bl.totalReviews) || 0;
      const filledCount = Math.round(avg);

      const starsSpan = document.createElement("span");
      starsSpan.className = "yotpo-stars-summary__stars";
      appendStarSvgs(starsSpan, filledCount);

      const link = document.createElement("a");
      link.className = "yotpo-stars-summary__count";
      link.href = "#yotpo-reviews-main-widget";
      link.textContent = `${total} Reviews`;
      link.addEventListener("click", (e) => {
        // With the "Reviews | Q&A" tabs, make sure the Reviews tab is the active one — the
        // visitor may have Q&A open — then scroll to the tabs; otherwise scroll to the widget.
        if (openTab(0)) {
          e.preventDefault();
          return;
        }
        const t = document.getElementById("yotpo-reviews-main-widget");
        if (t) {
          e.preventDefault();
          t.scrollIntoView();
        }
      });

      // Only the stars are the "image": the wrapper also holds links (reviews / Q&A), and the
      // children of a role="img" element are presentational, so labelling the wrapper would
      // hide those links from assistive tech.
      starsSpan.setAttribute("role", "img");
      starsSpan.setAttribute(
        "aria-label",
        total > 0
          ? `Rated ${avg} out of 5 based on ${total} reviews`
          : "Rated 0 out of 5 based on 0 reviews",
      );

      const wrap = document.createElement("div");
      wrap.className = "yotpo-stars-summary";
      wrap.appendChild(starsSpan);
      wrap.appendChild(link);

      // Relocate the summary directly below the product title (matching the PaaS
      // layout) regardless of where the .yotpo-stars block is authored. Falls back
      // to the block itself if the PDP header isn't present.
      const title = document.querySelector(".pdp-header__title");
      const sku = document.querySelector(".pdp-header__sku");
      const anchor = sku || title;
      if (anchor?.parentElement) {
        anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
      } else {
        targetBlock.appendChild(wrap);
      }

      // Q&A link next to the reviews count. Deliberately not awaited: the Q&A surface can take
      // a while to appear (or never does, e.g. no Q&A widget published for the account), and
      // that must not delay this block finishing loading. The link is added if and when the
      // surface shows up; otherwise it is omitted — no dangling link.
      fetchQnaCounts(appKey, productId).then((qnaTotal) => {
        if (!qnaTotal) return undefined;
        return waitForQnaSurface().then((found) => {
          if (found) appendQnaLink(wrap, qnaTotal);
        });
      }).catch(() => {
        // best-effort enhancement — never surface an unhandled rejection
      });
    } catch (e) {
      // silent degradation — no star summary rather than a broken one
    }
  };

  /**
   * Renders SVG star ratings directly inside a product card tile (PLP / recommendations).
   *
   * Uses the same public ratings API as renderStarSummary, bypassing the broken
   * ReviewsStarRatingsWidget V3 instance which has a petite-vue scheduler bug that
   * prevents it from rendering in EDS. This self-rendering approach is version-proof
   * and works for any card that contains a /products/ link.
   *
   * Stars are inserted before the card's add-to-cart action area so they appear
   * between the product name/price and the purchase actions, matching PaaS layout.
   */
  const renderStarsForTile = async (tile, appKey, productId) => {
    if (processingTiles.has(tile)) return;
    processingTiles.add(tile);
    try {
      if (!appKey || !productId) return;
      if (tile.querySelector(".yotpo-stars-summary")) return; // already injected

      const bl = await fetchRatings(appKey, productId);
      if (!bl) return;

      const avg = Number(bl.averageScore) || 0;
      const total = Number(bl.totalReviews) || 0;
      const filledCount = Math.round(avg);

      const starsSpan = document.createElement("span");
      starsSpan.className = "yotpo-stars-summary__stars";
      appendStarSvgs(starsSpan, filledCount);

      const wrap = document.createElement("div");
      wrap.className = "yotpo-stars-summary yotpo-stars-summary--card";
      wrap.setAttribute("role", "img");
      wrap.setAttribute(
        "aria-label",
        total > 0
          ? `Rated ${avg} out of 5 based on ${total} reviews`
          : "Rated 0 out of 5 based on 0 reviews",
      );
      wrap.appendChild(starsSpan);

      // Insert before the add-to-cart action area.
      // - Recommendations dropin:  .dropin-product-item-card__action  (direct child of tile)
      // - Product Discovery (PLP): .product-discovery-product-actions (inside inner card div)
      // Falls back to appending to the content container or the tile itself.
      const action = tile.querySelector(
        ".dropin-product-item-card__action, .product-discovery-product-actions",
      );
      const content = tile.querySelector(
        ".dropin-product-item-card__content, .product-discovery-product-card",
      );
      const parent = action?.parentElement || content || tile;
      if (action) {
        parent.prepend(wrap);
      } else {
        parent.appendChild(wrap);
      }
    } catch (e) {
      // silent degradation
    } finally {
      processingTiles.delete(tile);
    }
  };

  /**
   * Extracts the product SKU from an anchor's href.
   * The canonical product route is /products/{url-key} and carries no SKU (ADR 0011),
   * so only a query parameter or a legacy /products/{url-key}/{sku} link yields one.
   */
  const extractSkuFromHref = (href) => {
    try {
      const url = new URL(href, window.location.origin);
      const qpSku =
        url.searchParams.get("sku") ||
        url.searchParams.get("productId") ||
        url.searchParams.get("id");
      if (qpSku) return qpSku;
      return parseProductPath(url.pathname)?.sku || null;
    } catch (e) {
      return null;
    }
  };

  /**
   * Extracts the product SKU from a tile element.
   * Checks data attributes first, then falls back to the product link href.
   */
  const getTileSku = (tile) => {
    const fromData =
      tile?.dataset?.sku ||
      tile?.dataset?.productSku ||
      tile?.dataset?.productId;
    if (fromData) return fromData;
    // Product Discovery cards carry the full product payload; the product route
    // no longer carries the SKU, so this is the primary source for a tile.
    try {
      const sku =
        tile?.dataset?.productData && JSON.parse(tile.dataset.productData).sku;
      if (sku) return sku;
    } catch (e) {
      // fall through to the link
    }
    const link = tile?.querySelector("a[href*='/products/']");
    return link ? extractSkuFromHref(link.href) : null;
  };

  /**
   * Collects all product card tile elements currently in the DOM.
   * Covers: Product Discovery dropin (PLP), Recommendations dropin, legacy ds-sdk PLP.
   * Note: .dropin-product-item-card is used as the outer wrapper by both PLP and
   * Recommendations dropins. .ds-sdk-product-item covers older PLP dropin versions.
   */
  const collectProductTiles = () =>
    Array.from(
      document.querySelectorAll(
        ".dropin-product-item-card, .ds-sdk-product-item, .ds-sdk-product-card",
      ),
    );

  /**
   * Processes a list of product tile elements in parallel — fetches and injects
   * star ratings into each tile that does not already have a star summary.
   *
   * Yotpo's catalog was synced using the Adobe Commerce PaaS entity id, not the sku, so
   * the tile SKUs are resolved (batched, in a single GraphQL call) to entity ids before
   * calling the Yotpo ratings API. Falls back to the sku itself if resolution fails.
   */
  const processTiles = async (tiles, appKey) => {
    const unprocessed = tiles.filter(
      (tile) => !tile.querySelector(".yotpo-stars-summary"),
    );
    const skus = unprocessed.map((tile) => getTileSku(tile)).filter(Boolean);
    const entityIdBySku = await getEntityIdsBySku(skus);

    return Promise.all(
      unprocessed.map((tile) => {
        const sku = getTileSku(tile);
        if (!sku) return Promise.resolve();
        const productId = entityIdBySku.get(sku) || sku;
        return renderStarsForTile(tile, appKey, productId);
      }),
    );
  };

  /**
   * Sets up a MutationObserver on the page to detect newly added product tiles
   * and inject star ratings into them.
   * Handles async-loaded recommendations, infinite scroll, and tab-switching.
   */
  const setupTileObserver = (appKey, status) => {
    if (status === "off") return;

    if (activeTileObserver) {
      activeTileObserver.disconnect();
      activeTileObserver = null;
    }

    // Prefer the most specific containers; fall back to main / body.
    const target =
      document.querySelector(
        ".recommendations-product-list, .product-discovery-product-list, " +
          ".product-list-page-container, .product-list-page-wrapper, main",
      ) || document.body;

    const observer = new MutationObserver((mutations) => {
      let hasNewTiles = false;

      mutations.forEach((m) => {
        if (!m.addedNodes?.length) return;
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (
            node.classList?.contains("dropin-product-item-card") ||
            node.classList?.contains("ds-sdk-product-item") ||
            node.classList?.contains("ds-sdk-product-card") ||
            node.querySelector?.(".dropin-product-item-card") ||
            node.querySelector?.(".ds-sdk-product-item") ||
            node.querySelector?.(".ds-sdk-product-card")
          ) {
            hasNewTiles = true;
          }
        });
      });

      if (!hasNewTiles) return;
      if (observerTimer) clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        const tiles = collectProductTiles();
        processTiles(tiles, appKey);
      }, 300);
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
    });

    activeTileObserver = observer;
  };

  try {
    const resp = await fetch(cfg.endpoint);
    if (!resp.ok)
      throw new Error(`config.endpoint response: ${resp.statusText}`);
    const data = await resp.json();

    const { appKey, status } = data;
    if (status === "off") return;

    // Set up observer FIRST so tiles that render during the awaits below are caught.
    setupTileObserver(appKey, status);

    // Process any product tiles already in the DOM (PLP / pre-rendered recommendations).
    const existingTiles = collectProductTiles();
    if (existingTiles.length) {
      await processTiles(existingTiles, appKey);
    }

    // PDP: render star summary near the product title.
    // Runs when the URL is a product detail page (/products/{url-key}).
    // Also covers PDPs where recommendations have already rendered by this point.
    if (/^\/products\//.test(window.location.pathname)) {
      const sku = getProductSku() || "";
      const productId = (await getEntityIdsBySku([sku])).get(sku) || sku;
      await renderStarSummary(block, appKey, productId);
    }
  } catch (error) {
    console.error("Yotpo Stars init error:", error);
  } finally {
    if (activeTileObserver || observerTimer) {
      window.addEventListener(
        "beforeunload",
        () => {
          if (observerTimer) clearTimeout(observerTimer);
          if (activeTileObserver) activeTileObserver.disconnect();
          activeTileObserver = null;
        },
        { once: true },
      );
    }
  }
}
