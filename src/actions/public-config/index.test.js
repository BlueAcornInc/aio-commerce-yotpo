const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
jest.mock("@adobe/aio-sdk", () => ({
  Core: {
    Logger: jest.fn(() => mockLogger),
  },
}));
jest.mock("@adobe/aio-commerce-lib-config", () => ({
  initialize: jest.fn(),
  getConfigurationByKey: jest.fn(),
  byCodeAndLevel: jest.fn((code, level) => ({ code, level })),
}));

const libConfig = require("@adobe/aio-commerce-lib-config");
const { main } = require("./index");

/**
 * Make getConfigurationByKey resolve from a plain object of field values.
 *
 * @param {object} values Field values by name
 */
function storedConfig(values) {
  libConfig.getConfigurationByKey.mockImplementation(async (name) => ({
    config: { name, value: values[name] },
  }));
}

describe("Yotpo public storefront config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns only the public fields for the requested store view", async () => {
    storedConfig({
      status: "on",
      appKey: "store-app-key",
      instanceId: "123",
      unexpectedField: "not-public",
    });

    const response = await main({ storeCode: "kershaw_us" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "on",
      appKey: "store-app-key",
      instanceId: "123",
    });
    expect(libConfig.byCodeAndLevel).toHaveBeenCalledWith(
      "kershaw_us",
      "store_view",
    );
  });

  test("defaults to the default store view", async () => {
    storedConfig({ status: "on", appKey: "store-app-key" });

    await main({});

    expect(libConfig.byCodeAndLevel).toHaveBeenCalledWith(
      "default",
      "store_view",
    );
  });

  test("reports off when disabled or missing an app key", async () => {
    storedConfig({ status: "off", appKey: "store-app-key" });
    expect((await main({})).body).toEqual({ status: "off" });

    storedConfig({ status: "on" });
    expect((await main({})).body).toEqual({ status: "off" });
  });

  test("rejects a malformed store code without reading config", async () => {
    const response = await main({ storeCode: "../../etc" });

    expect(response.statusCode).toBe(400);
    expect(libConfig.getConfigurationByKey).not.toHaveBeenCalled();
  });

  test("never logs or returns params on failure", async () => {
    const marker = (name) => `${name}-must-not-leak`;
    libConfig.getConfigurationByKey.mockRejectedValue(new Error("boom"));

    const response = await main({
      __ow_headers: { authorization: `Bearer ${marker("ims")}` },
      AIO_COMMERCE_CONFIG_ENCRYPTION_KEY: marker("key"),
    });

    expect(response.statusCode).toBe(500);
    const logged = JSON.stringify(
      Object.values(mockLogger).flatMap((fn) => fn.mock.calls),
    );
    ["ims", "key"].map(marker).forEach((value) => {
      expect(JSON.stringify(response.body)).not.toContain(value);
      expect(logged).not.toContain(value);
    });
  });
});
