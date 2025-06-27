import { getConfigValue } from "../../scripts/configs.js";
import { loadScript } from "../../scripts/aem.js";

export default async function decorate(block) {
  const buildBlock = (configs) => {
    const yotpoReviewsEl = document.createElement("div");
    configs?.forEach((config) => {
      yotpoReviewsEl.setAttribute(config.attr, config.value);
    });
    block.appendChild(yotpoReviewsEl);
  };

  const config = {
    baseUrl: "https://cdn-widgetsrepository.yotpo.com/v1/loader",
    endpoint: await getConfigValue("yotpo-config-url"),
    currency: await getConfigValue("commerce-base-currency-code"),
  };

  const yotpoInstanceId = await getConfigValue("yotpo-instance-id");

  const widgetConfig = [
    // To Do, To-Do. Remove hard-coded yotpo-instance-id. I requested this be added to the Admin UI for Yotpo Config Editor.
    { attr: "data-yotpo-instance-id", value: yotpoInstanceId },
    {
      attr: "data-yotpo-product-id",
      value: window.location.pathname.slice(
        window.location.pathname.lastIndexOf("/") + 1,
      ),
    },
    {
      attr: "data-yotpo-name",
      value: document.querySelector("div.pdp-header__title").innerText,
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

  console.log("test", widgetConfig);

  const addLoaderScript = ({ loaderScriptUrl }) => {
    loadScript(loaderScriptUrl);
    buildBlock(widgetConfig);
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
      config.loaderScriptUrl = `${config?.baseUrl}/${data?.config?.appKey}`;
      addLoaderScript(config);
    })
    .catch((error) => {
      console.error("Fetch error:", error);
    });
}
