import { getConfigValue } from "../../scripts/configs.js";
import { loadScript } from "../../scripts/aem.js";

export default async function decorate(block) {
  // Shared config state
  const cfg = {
    baseUrl: "https://cdn-widgetsrepository.yotpo.com/v1/loader",
    endpoint: await getConfigValue("yotpo-config-url"),
    currency: await getConfigValue("commerce-base-currency-code"),
  };

  // Runtime state for throttling
  let refreshTimer = null;
  let lastRefreshAt = 0;
  let didInitialRefresh = false;
  let observerTimer = null;

  // Utilities
  const waitForYotpoReady = (timeoutMs = 8000, intervalMs = 150) =>
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (window.yotpo && typeof window.yotpo.refreshWidgets === "function")
          return resolve(true);
        if (Date.now() - start >= timeoutMs) return resolve(false);
        setTimeout(check, intervalMs);
      };
      check();
    });

  const scheduleClassicRefresh = (reason = "unspecified") => {
    const doRefresh = () => {
      try {
        window.yotpo.refreshWidgets();
        lastRefreshAt = Date.now();
      } catch (e) {
        // ignore
      }
    };
    const enqueue = () => {
      const now = Date.now();
      const minGap = 2000; // throttle: at most one refresh per 2s
      const since = now - lastRefreshAt;
      const delay = since >= minGap ? 200 : minGap - since;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(doRefresh, delay);
    };
    if (window.yotpo && typeof window.yotpo.refreshWidgets === "function") {
      enqueue();
    } else {
      waitForYotpoReady().then((ready) => {
        if (ready) enqueue();
      });
    }
  };

  const ensureClassicLoader = async (appKey) => {
    try {
      const url = `https://staticw2.yotpo.com/${appKey}/widget.js`;

      await loadScript(url);

      const ready = await waitForYotpoReady();
    } catch (e) {}
  };

  const ensureLoader = async (loaderScriptUrl) => {
    try {
      await loadScript(loaderScriptUrl);
    } catch (e) {}
  };

  const initWidgetsSafe = () => {
    if (
      window.yotpoWidgetsContainer &&
      typeof window.yotpoWidgetsContainer.initWidgets === "function"
    ) {
      window.yotpoWidgetsContainer.initWidgets();
    } else {
    }
  };

  const createWidgetEl = (attrs = [], extraClasses = []) => {
    const el = document.createElement("div");
    attrs.forEach((a) => el.setAttribute(a.attr, a.value));
    el.classList.add("yotpo-widget-instance");
    extraClasses.forEach((c) => c && el.classList.add(c));
    return el;
  };

  const createBottomLineEl = (productId, productUrl) => {
    const el = document.createElement("div");
    el.className = "yotpo bottomLine";
    el.setAttribute("data-product-id", productId || "");
    // Use absolute product URL as-is; classic widget can handle canonical matching
    el.setAttribute("data-url", productUrl || "");
    return el;
  };

  const extractSkuFromHref = (href) => {
    try {
      const url = new URL(href, window.location.origin);
      // Prefer explicit query parameters if present
      const qpSku =
        url.searchParams.get("sku") ||
        url.searchParams.get("productId") ||
        url.searchParams.get("id");
      if (qpSku) return qpSku;
      const parts = url.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || null;
    } catch (e) {
      return null;
    }
  };

  const getProductId = (anchor, tile) => {
    // Try common data attributes on tile or anchor first
    const fromData =
      tile?.dataset?.sku ||
      tile?.dataset?.productSku ||
      tile?.dataset?.productId ||
      anchor?.dataset?.sku ||
      anchor?.dataset?.productId;
    if (fromData) return fromData;
    // Fallback to URL parsing
    const fromHref = extractSkuFromHref(anchor?.href || "");
    return fromHref;
  };

  const getTileRoot = (anchor) => {
    // Strict: require a recognized product tile container; do not fallback to arbitrary parent
    const tile = anchor.closest(
      ".ds-sdk-product-item, .ds-sdk-product-card, .ds-sdk-product-list_item, .ds-sdk-product, .product-teaser, .product-card, .card, [data-testid=product-card]"
    );
    return tile || null;
  };

  const getPlacementTarget = (tile) => {
    if (!tile) return null;
    // Preferred dedicated slot from search widgets grid
    let target = tile.querySelector(".product-ratings");
    // Next, near product info
    if (!target) target = tile.querySelector(".ds-sdk-product-item__info");
    if (!target) target = tile.querySelector(".product-details");
    if (!target)
      target = tile.querySelector(
        ".ds-sdk-product-card__info, .product-info, .product-content"
      );
    // Last resort: use tile itself but guard against footer/header
    if (!target) target = tile;
    return target;
  };

  const findAddToCartNode = (tile) => {
    if (!tile) return null;
    const sel = [
      ".ds-sdk-product-item__actions",
      ".ds-sdk-product-item__cta",
      ".product-actions",
      ".product-cta",
      ".add-to-cart",
      '[data-testid="add-to-cart"]',
      'button[name="add-to-cart"]',
      'button[data-action="add-to-cart"]',
      'button[type="submit"]',
      'form[action*="cart"]',
      'form[action*="checkout"]',
    ].join(",");
    const atc = tile.querySelector(sel);
    return atc || null;
  };

  const buildAttrsForAnchor = (a, instanceId) => {
    const sku = extractSkuFromHref(a.href);
    const tile = getTileRoot(a);
    // For PLP star rating, only instance and product id are required
    const attrs = [
      { attr: "data-yotpo-instance-id", value: instanceId },
      { attr: "data-yotpo-product-id", value: sku || "" },
    ];
    return attrs;
  };

  const injectForAnchors = (
    anchors,
    instanceId,
    status,
    variant = "classic"
  ) => {
    if (status === "off") {
      return;
    }

    let injected = 0;
    let updatedExisting = 0;
    anchors.forEach((a) => {
      const tile = getTileRoot(a);
      if (!tile) {
        return;
      }
      // Prefer the main product link inside the tile
      const mainLink = tile.querySelector('a[href*="/products/"]') || a;
      const href = mainLink?.href || a.href;
      // Sanitize URL for Yotpo matching: origin + pathname (no query/hash)
      let cleanUrl = href;
      try {
        const u = new URL(href, window.location.origin);
        cleanUrl = `${u.origin}${u.pathname}`;
      } catch (e) {
        // leave as-is
      }
      // Determine product id (SKU)
      const sku = getProductId(mainLink, tile);
      if (!sku) {
        return;
      }
      // Determine placement and desired position (before add-to-cart if available)
      const placement = getPlacementTarget(tile);
      const atc = findAddToCartNode(tile);
      if (!placement) {
        return;
      }

      // If a matching bottomLine already exists for this SKU, skip; otherwise, remove stale Yotpo nodes
      const existingMatch =
        (atc ? atc.parentElement : placement)?.querySelector(
          `.yotpo.bottomLine[data-product-id="${sku}"]`
        ) ||
        placement.querySelector(`.yotpo.bottomLine[data-product-id="${sku}"]`);
      if (existingMatch) {
        const currentUrl = existingMatch.getAttribute("data-url") || "";
        const targetUrl = cleanUrl || "";
        if (currentUrl !== targetUrl) {
          existingMatch.setAttribute("data-url", targetUrl);
          updatedExisting += 1;
        }
        // Ensure it sits above the add-to-cart node if available
        if (
          atc &&
          atc.parentElement &&
          existingMatch !== atc &&
          existingMatch.nextElementSibling !== atc
        ) {
          try {
            atc.parentElement.insertBefore(existingMatch, atc);

            updatedExisting += 1;
          } catch (e) {
            /* noop */
          }
        } else if (!atc) {
        } else {
        }
        return;
      }
      // Remove stale nodes anywhere within the tile (but none should match current SKU due to early return)
      const staleNodes = tile.querySelectorAll(
        ".yotpo.bottomLine, .yotpo-widget-instance"
      );
      if (staleNodes.length) {
        staleNodes.forEach((n) => n.remove());
      }
      // Create appropriate widget element
      const el =
        variant === "classic"
          ? createBottomLineEl(sku, cleanUrl)
          : createWidgetEl(buildAttrsForAnchor(mainLink, instanceId));
      if (atc && atc.parentElement) {
        atc.parentElement.insertBefore(el, atc);
      } else {
        placement.appendChild(el);
      }
      injected += 1;
    });

    const hasAnyBottomLines =
      document.querySelector(".yotpo.bottomLine") !== null;
    if (variant === "classic") {
      if (injected > 0 || updatedExisting > 0) {
        scheduleClassicRefresh(injected > 0 ? "injected" : "updated");
      } else if (!didInitialRefresh && hasAnyBottomLines) {
        didInitialRefresh = true;
        scheduleClassicRefresh("initial-pass-existing");
      }
    } else if (injected > 0 || updatedExisting > 0) {
      initWidgetsSafe();
    }
  };

  const collectProductAnchors = (root = document) => {
    // Global search to avoid scoping issues across sections
    const primary = Array.from(
      document.querySelectorAll(".ds-sdk-product-item a[href]")
    );
    if (primary.length) {
      return primary;
    }
    const alt = Array.from(
      document.querySelectorAll(
        ".ds-sdk-product-list a[href], .ds-widgets_results a[href]"
      )
    );
    if (alt.length) {
      return alt;
    }
    const fallback = Array.from(
      document.querySelectorAll('a[href*="/products/"]')
    );

    return fallback;
  };

  const enableObserver = (instanceId, status, variant = "classic") => {
    const target =
      document.querySelector(
        ".ds-sdk-product-list, .ds-widgets_results, .product-list-page-container, .product-list-page-wrapper"
      ) ||
      document.querySelector("main") ||
      document.body;

    const observer = new MutationObserver((mutations) => {
      let needsProcess = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          needsProcess = true;
          break;
        }
      }
      if (!needsProcess) return;
      if (observerTimer) clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        const anchors = collectProductAnchors(target);
        injectForAnchors(anchors, instanceId, status, variant);
      }, 250);
    });
    observer.observe(target, { childList: true, subtree: true });
  };

  // Fetch Yotpo config and wire up PLP injection
  try {
    const resp = await fetch(cfg.endpoint);
    if (!resp.ok)
      throw new Error(`config.endpoint response: ${resp.statusText}`);
    const data = await resp.json();
    cfg.data = data?.config;
    cfg.loaderScriptUrl = `${cfg.baseUrl}/${data?.appKey}`;

    // Determine if PLP and choose appropriate loader
    const plpAnchors = collectProductAnchors(document);
    const isPLP =
      !!document.querySelector(".ds-sdk-product-item") ||
      !!document.querySelector(".ds-widgets_results") ||
      !!document.querySelector(".product-list-page-container");

    if (plpAnchors.length || isPLP) {
      await ensureClassicLoader(data?.appKey);
    } else {
      await ensureLoader(cfg.loaderScriptUrl);
    }
    if (plpAnchors.length) {
      // PLP mode: inject a widget container per product tile

      injectForAnchors(plpAnchors, data?.instanceId, data?.status, "classic");
      enableObserver(data?.instanceId, data?.status, "classic");
    } else if (isPLP) {
      // PLP page but content may not be mounted yet; set observer and wait

      enableObserver(data?.instanceId, data?.status, "classic");
    } else {
      // Fallback: PDP mode (single widget in this block)

      const pdpAttrs = [
        { attr: "data-yotpo-instance-id", value: data?.instanceId },
        {
          attr: "data-yotpo-product-id",
          value: window.location.pathname.slice(
            window.location.pathname.lastIndexOf("/") + 1
          ),
        },
        {
          attr: "data-yotpo-name",
          value:
            document.querySelector("div.pdp-header__title")?.innerText ||
            "Product",
        },
        { attr: "data-yotpo-url", value: window.location.toString() },
        {
          attr: "data-yotpo-image-url",
          value: `https:${
            document
              .querySelector(".pdp-carousel__slide>img")
              ?.getAttribute("src") || ""
          }`,
        },
        {
          attr: "data-yotpo-price",
          value:
            document.querySelector(".dropin-price")?.innerText?.slice(1) || "",
        },
        { attr: "data-yotpo-currency", value: cfg.currency || "" },
      ];
      if (data?.status !== "off") {
        block.appendChild(createWidgetEl(pdpAttrs));

        initWidgetsSafe();
      } else {
      }
    }
  } catch (error) {}
}
