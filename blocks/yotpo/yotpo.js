import { loadScript } from "../../scripts/aem.js";

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
  const waitForYotpoInitWidgets = (timeoutMs = 8000, intervalMs = 150) =>
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (
          window.yotpoWidgetsContainer &&
          typeof window.yotpoWidgetsContainer.initWidgets === "function"
        ) {
          return resolve(true);
        }
        if (Date.now() - start >= timeoutMs) {
          return resolve(false);
        }
        setTimeout(check, intervalMs);
        return undefined;
      };
      check();
    });

  const config = {
    endpoint: await withStoreCode(
      await getConfigValue("yotpo-config-url"),
      getConfigValue,
    ),
    currency: await getConfigValue("commerce-base-currency-code"),
  };

  /**
   * Looks up the ReviewsMainWidget instance ID from the V3 loader config.
   *
   * Why: The App Builder endpoint returns the ReviewsStarRatingsWidget instance ID, but that
   * widget (v0.34.0+) has a fatal petite-vue scheduler bug that permanently prevents rendering.
   * The ReviewsMainWidget (same type used by working EDS sites) does not have this bug.
   * We resolve the correct instance dynamically so no hardcoding is needed.
   */
  const getMainWidgetInstanceId = (appKey) => {
    try {
      const widgets =
        window.yotpoWidgetsContainer?.guids?.[appKey]?.config?.widgets;
      if (!widgets) return null;
      // An account can carry stale duplicate instances (e.g. left over from a widget
      // migration); the newest one (highest id) is the one edited in the Yotpo admin.
      const mainWidget = Object.values(widgets)
        .filter((w) => w?.className === "ReviewsMainWidget")
        .sort((a, b) => Number(b.instanceId) - Number(a.instanceId))[0];
      return mainWidget?.instanceId || null;
    } catch (e) {
      return null;
    }
  };

  // Generalised lookup: Q&A is a separate widget instance (className QuestionsAndAnswers),
  // resolved the same way as the reviews widget above.
  const getWidgetByClass = (appKey, className) => {
    try {
      const widgets =
        window.yotpoWidgetsContainer?.guids?.[appKey]?.config?.widgets;
      if (!widgets) return null;
      // Newest instance wins, as for the reviews widget: stale duplicates can linger after a
      // widget migration.
      return (
        Object.values(widgets)
          .filter((w) => w?.className === className)
          .sort((a, b) => Number(b.instanceId) - Number(a.instanceId))[0] ||
        null
      );
    } catch (e) {
      return null;
    }
  };

  /**
   * Best-effort SKU/id extraction for storefronts without the kai-da commerce helpers below.
   * A query parameter (?sku=/?productId=/?id=) is an actual SKU when present. The last path
   * segment is only a real SKU on legacy `/products/{url-key}/{sku}` routes — on the canonical
   * `/products/{url-key}` route (no SKU in the URL) it is the url-key, which will not match the
   * Yotpo catalog. It is still tried last, as it is the only signal left.
   */
  const fallbackProductIdFromUrl = () => {
    const url = new URL(window.location.href);
    const qpSku =
      url.searchParams.get("sku") ||
      url.searchParams.get("productId") ||
      url.searchParams.get("id");
    if (qpSku) return qpSku;
    return url.pathname.split("/").filter(Boolean).pop() || "";
  };

  /**
   * Resolves the Yotpo product id (Adobe Commerce PaaS entity id) for the current PDP.
   *
   * `getEntityIdsBySku`/`getProductSku` are a kai-da-specific addition to scripts/commerce.js
   * (not part of a generic AEM Commerce storefront) and are not guaranteed to exist in every
   * consuming repo this package is installed into. Import them dynamically and fall back to
   * the URL-derived SKU — used directly as the Yotpo product id — when the module or those
   * exports are unavailable, so the block still renders instead of throwing on install.
   */
  const resolveProductId = async () => {
    const fallbackSku = fallbackProductIdFromUrl();
    try {
      const commerce = await import("../../scripts/commerce.js");
      if (
        typeof commerce.getProductSku !== "function" ||
        typeof commerce.getEntityIdsBySku !== "function"
      ) {
        return fallbackSku;
      }
      const sku = commerce.getProductSku() || fallbackSku;
      return (await commerce.getEntityIdsBySku([sku])).get(sku) || sku;
    } catch (e) {
      return fallbackSku;
    }
  };

  fetch(config?.endpoint)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`config.endpoint response: ${response.statusText}`);
      }
      return response.json();
    })
    .then(async (data) => {
      if (data?.status === "off") return;
      // Touchpoint switches from App Management. Missing means on, so older
      // config endpoints keep working.
      const showReviews = data?.showReviews !== false;
      const showQna = data?.showQna !== false;
      if (!showReviews && !showQna) return;

      const productId = await resolveProductId();

      // Load the v3 container (sets up yotpoWidgetsContainer + performV3Logic).
      // Must be fully initialised before v2enforce runs, or the performV3Logic check fails.
      const cdnUrl = `https://cdn-widgetsrepository.yotpo.com/v1/loader/${data?.appKey}`;
      const v2Url = `https://staticw2.yotpo.com/${data?.appKey}/widget.js?v2enforce=true`;

      try {
        await loadScript(cdnUrl);
      } catch (e) {
        /* silent */
      }

      // Wait for yotpoWidgetsContainer.initWidgets to confirm cdn is fully set up
      // (including yotpoV3.performV3Logic) before the v2enforce script loads.
      // This also handles the aem.js loadScript dedup race: a concurrent block may have
      // received an immediate resolve on cdnUrl while cdn was still in-flight.
      if (!(await waitForYotpoInitWidgets())) {
        console.warn(
          "Yotpo V3 initWidgets did not complete within timeout; reviews may not display.",
        );
        return;
      }

      // Load v2enforce now — yotpoWidgetsContainer.yotpoV3.performV3Logic is guaranteed
      // to exist, so the script end-check calls performV3Logic via Yotpo.ready (1ms timeout).
      try {
        await loadScript(v2Url);
      } catch (e) {
        /* silent */
      }

      // Yield to the macrotask queue so the 1ms Yotpo.ready/performV3Logic callback fires.
      await new Promise((r) => {
        setTimeout(r, 10);
      });

      // yotpoWidgetsContainer is now fully set up with the correct rendering path.
      // `data?.instanceId` (from public-config) is the StarRatings instance, not Reviews — never
      // use it as a fallback here. If no ReviewsMainWidget instance is published for this account,
      // skip mounting rather than render a widget pointed at the wrong id.
      const mainWidgetInstanceId = showReviews
        ? getMainWidgetInstanceId(data?.appKey)
        : null;
      let yotpoEl = null;
      if (mainWidgetInstanceId) {
        yotpoEl = document.createElement("div");
        yotpoEl.id = "yotpo-reviews-main-widget";
        yotpoEl.className = "yotpo-widget-instance main-reviews";
        yotpoEl.setAttribute("data-yotpo-instance-id", mainWidgetInstanceId);
        yotpoEl.setAttribute("data-yotpo-product-id", productId);
        yotpoEl.setAttribute(
          "data-yotpo-name",
          document.querySelector("div.pdp-header__title")?.innerText ||
            "Product",
        );
        yotpoEl.setAttribute("data-yotpo-url", window.location.toString());
        const pdpImgSrc = document
          .querySelector(".pdp-carousel__slide > img")
          ?.getAttribute("src");
        yotpoEl.setAttribute(
          "data-yotpo-image-url",
          pdpImgSrc ? `https:${pdpImgSrc}` : "",
        );
        yotpoEl.setAttribute(
          "data-yotpo-price",
          document.querySelector(".dropin-price")?.innerText?.slice(1) || "",
        );
        yotpoEl.setAttribute("data-yotpo-currency", config.currency || "");

        block.appendChild(yotpoEl);
      }

      // Q&A is a separate widget instance in Yotpo v3. When its "Q&A placement" is set to
      // "Second tab of Reviews Widget" in the Yotpo admin (customization
      // `qna-embedded-mode-enabled: embedded`), the reviews widget embeds it as a
      // "Reviews | Q&A" tab itself, exactly like the PaaS PDP — mounting a second instance
      // would duplicate it. Otherwise (or when there is no reviews widget to host the tab)
      // mount it after the reviews. Accounts without a published Q&A widget resolve to null
      // and simply render nothing.
      const qnaWidget = getWidgetByClass(data?.appKey, "QuestionsAndAnswers");
      const qnaInstanceId = qnaWidget?.instanceId || null;
      const qnaEmbedded =
        qnaWidget?.customizations?.["qna-embedded-mode-enabled"] === "embedded";
      if (showQna && qnaInstanceId && !(qnaEmbedded && mainWidgetInstanceId)) {
        const qnaEl = document.createElement("div");
        qnaEl.id = "yotpo-qna-widget";
        qnaEl.className = "yotpo-widget-instance yotpo-qna";
        qnaEl.setAttribute("data-yotpo-instance-id", qnaInstanceId);
        qnaEl.setAttribute("data-yotpo-product-id", productId);
        qnaEl.setAttribute(
          "data-yotpo-name",
          yotpoEl?.getAttribute("data-yotpo-name") ||
            document.querySelector("div.pdp-header__title")?.innerText ||
            "Product",
        );
        qnaEl.setAttribute("data-yotpo-url", window.location.toString());
        qnaEl.setAttribute(
          "data-yotpo-image-url",
          yotpoEl?.getAttribute("data-yotpo-image-url") || "",
        );
        block.appendChild(qnaEl);
      }

      if (mainWidgetInstanceId || qnaInstanceId) {
        await window.yotpoWidgetsContainer.initWidgets();
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
    });
}
