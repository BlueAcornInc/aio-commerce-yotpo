import { getConfigValue } from "../../scripts/configs.js";
import { loadScript } from "../../scripts/aem.js";

export default async function decorate(block) {
  const buildBlock = (configs, status) => {
    const yotpoReviewsEl = document.createElement("div");
    configs?.forEach((config) => {
      yotpoReviewsEl.setAttribute(config.attr, config.value);
    });

    if (status !== "off") {
      block.appendChild(yotpoReviewsEl);
      if (
        window.yotpoWidgetsContainer &&
        typeof window.yotpoWidgetsContainer.initWidgets === "function"
      ) {
        window.yotpoWidgetsContainer.initWidgets();
      } else {
        console.warn("yotpoWidgetsContainer.initWidgets is not available");
      }
    } else {
      console.log(
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

  fetch(config?.endpoint)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`config.endpoint response: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      config.data = data?.config;
      config.loaderScriptUrl = `${config?.baseUrl}/${data?.appKey}`;
      // Add instanceId to widgetConfig and then buildBlock
      widgetConfig.unshift({
        attr: "data-yotpo-instance-id",
        value: data?.instanceId,
      });
      addLoaderScript(config);
      buildBlock(widgetConfig, data?.status);
      console.log("Yotpo config data:", data);
      console.log("Updated widgetConfig:", JSON.stringify(widgetConfig));
    })
    .catch((error) => {
      console.error("Fetch error:", error);
    });
}
