import { getConfigValue } from "../../scripts/configs.js";
import { loadScript } from "../../scripts/aem.js";

export default async function decorate(block) {
  // Utilities for product card star injection
  const extractSkuFromHref = (href) => {
    try {
      const url = new URL(href, window.location.origin);
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

  const createBottomLineEl = (productId, productUrl) => {
    const el = document.createElement("div");
    el.className = "yotpo bottomLine";
    el.setAttribute("data-product-id", productId || "");
    el.setAttribute("data-url", productUrl || "");
    return el;
  };

  const waitForYotpoReady = (timeoutMs = 8000, intervalMs = 150) =>
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (window.yotpo && typeof window.yotpo.refreshWidgets === "function") {
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

  const scheduleClassicRefresh = () => {
    const doRefresh = () => {
      try {
        window.yotpo.refreshWidgets();
      } catch (e) {
        // ignore
      }
    };
    if (window.yotpo && typeof window.yotpo.refreshWidgets === "function") {
      setTimeout(doRefresh, 200);
    } else {
      waitForYotpoReady().then((ready) => {
        if (ready) setTimeout(doRefresh, 200);
      });
    }
  };

  const addStarsToProductCards = (instanceId, status) => {
    if (status === "off") return;

    // Find all product cards on the page
    const productCards = document.querySelectorAll(".product-card");

    productCards.forEach((card) => {
      // Find the product link in the card
      const productLink = card.querySelector('a[href*="/products/"]');
      if (!productLink) return;

      // Extract product ID from the link
      const productId = extractSkuFromHref(productLink.href);
      if (!productId) return;

      // Check if stars already exist for this product
      const existingStars = card.querySelector(
        `.yotpo.bottomLine[data-product-id="${productId}"]`,
      );
      if (existingStars) return;

      // Find the best place to insert stars (in product-card-content, after product-name)
      const productContent = card.querySelector(".product-card-content");
      const productName = card.querySelector(".product-name");

      if (productContent && productName) {
        // Create star element
        const cleanUrl = `${window.location.origin}${new URL(productLink.href).pathname}`;
        const starsEl = createBottomLineEl(productId, cleanUrl);

        // Insert stars after product name
        productName.parentNode.insertBefore(starsEl, productName.nextSibling);
      }
    });

    // Refresh Yotpo widgets to render the new stars
    scheduleClassicRefresh();
  };

  const buildBlock = (configs, status) => {
    const yotpoReviewsEl = document.createElement("div");
    configs?.forEach((config) => {
      yotpoReviewsEl.setAttribute(config.attr, config.value);
    });

    if (status !== "off") {
      yotpoReviewsEl.classList.add("main-reviews");
      block.appendChild(yotpoReviewsEl);

      // Add review stars under pdp-header__title
      const titleElement = document.querySelector("div.pdp-header__title");
      if (titleElement) {
        const reviewStarsEl = document.createElement("div");
        const productId =
          configs.find((c) => c.attr === "data-yotpo-product-id")?.value || "";
        const instanceId =
          configs.find((c) => c.attr === "data-yotpo-instance-id")?.value || "";

        reviewStarsEl.setAttribute("data-yotpo-product-id", productId);
        reviewStarsEl.setAttribute("data-yotpo-instance-id", instanceId);
        reviewStarsEl.setAttribute("class", "yotpo bottomLine");
        reviewStarsEl.setAttribute("data-product-id", productId);
        reviewStarsEl.setAttribute("data-url", window.location.href);

        // Insert after the title element
        titleElement.parentNode.insertBefore(
          reviewStarsEl,
          titleElement.nextSibling,
        );
      }

      // Add stars to product cards on the page
      const instanceId = configs.find(
        (c) => c.attr === "data-yotpo-instance-id",
      )?.value;
      if (instanceId) {
        // Wait a bit for the page to fully load, then add stars to product cards
        setTimeout(() => {
          addStarsToProductCards(instanceId, status);
        }, 1000);

        // Also observe for dynamically loaded product cards
        const observer = new MutationObserver((mutations) => {
          let hasNewCards = false;
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (
                node.nodeType === 1 &&
                (node.classList?.contains("product-card") ||
                  node.querySelector?.(".product-card"))
              ) {
                hasNewCards = true;
              }
            });
          });

          if (hasNewCards) {
            setTimeout(() => {
              addStarsToProductCards(instanceId, status);
            }, 500);
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      }

      if (
        window.yotpoWidgetsContainer &&
        typeof window.yotpoWidgetsContainer.initWidgets === "function"
      ) {
        window.yotpoWidgetsContainer.initWidgets();
      } else {
        console.debug("yotpoWidgetsContainer.initWidgets is not available");
      }
    } else {
      console.debug(
        "Yotpo widget status is off, skipping block append and widget init.",
      );
    }
  };
  const config = {
    baseUrl: "https://cdn-widgetsrepository.yotpo.com/v1/loader",
    endpoint: await getConfigValue("yotpo-config-url"),
    currency: await getConfigValue("commerce-base-currency-code"),
  };

  const widgetConfig = [
    {
      attr: "data-yotpo-product-id",
      value: window.location.pathname.slice(
        window.location.pathname.lastIndexOf("/") + 1,
      ),
    },
    {
      attr: "data-yotpo-name",
      value:
        document.querySelector("div.pdp-header__title")?.innerText || "Product",
    },
    { attr: "data-yotpo-url", value: window.location.toString() },
    {
      attr: "data-yotpo-image-url",
      value: `https:${document.querySelector(".pdp-carousel__slide>img")?.getAttribute("src")}`,
    },
    {
      attr: "data-yotpo-price",
      value: document.querySelector(".dropin-price")?.innerText?.slice(1),
    },
    { attr: "data-yotpo-currency", value: config.currency },
    { attr: "class", value: "yotpo-widget-instance" },
  ];

  const addLoaderScript = ({ loaderScriptUrl }) => {
    loadScript(loaderScriptUrl);
  };

  const ensureClassicLoader = async (appKey) => {
    try {
      const url = `https://staticw2.yotpo.com/${appKey}/widget.js`;
      await loadScript(url);
      await waitForYotpoReady();
    } catch (e) {
      console.debug("Failed to load Yotpo classic loader:", e);
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
      config.data = data?.config;
      config.loaderScriptUrl = `${config?.baseUrl}/${data?.appKey}`;

      // Add instanceId to widgetConfig and then buildBlock
      widgetConfig.unshift({
        attr: "data-yotpo-instance-id",
        value: data?.instanceId,
      });

      // Load both the new widget loader and classic loader for star ratings
      addLoaderScript(config);

      // Also load classic loader for product card stars
      if (data?.appKey) {
        await ensureClassicLoader(data?.appKey);
      }

      buildBlock(widgetConfig, data?.status);
      console.debug("Yotpo config data:", data);
      console.debug("Updated widgetConfig:", JSON.stringify(widgetConfig));
    })
    .catch((error) => {
      console.error("Fetch error:", error);
    });
}
