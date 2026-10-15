/* eslint-disable semi */
// 1. Declare the 'let' variables at the very top.
let mockReadConfiguration;
let mockWriteConfiguration;

// Mock the @adobe/aio-sdk Core.Logger
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

// 2. Mock the configurationHelper, making its factory *return* new jest.fn() instances.
jest.mock("../../../shared/configurationHelper", () => ({
  readConfiguration: jest.fn(), // Jest creates a mock function here
  writeConfiguration: jest.fn(), // Jest creates another mock function here
}));

// 3. AFTER the jest.mock call, require the mocked module
// and assign the returned mock functions to your top-level 'let' variables.
const configHelpers = require("../../../shared/configurationHelper");
// eslint-disable-next-line prefer-const
mockReadConfiguration = configHelpers.readConfiguration;
// eslint-disable-next-line prefer-const
mockWriteConfiguration = configHelpers.writeConfiguration;

// Now, require your main action (this needs to be after the mocks are fully set up)
const { main } = require("./index"); // Adjust path if your main action is elsewhere

describe("Admin Main Action", () => {
  // Clear all mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks(); // Clears call history for all mocks
    // Important: Also reset the mock implementations if they were modified in a test.
    // mockResolvedValueOnce / mockRejectedValueOnce are cleared by clearAllMocks,
    // but if you used .mockImplementation(), you'd want .mockRestore() or .mockReset().
    // For this specific case, clearAllMocks is often sufficient as we use Once methods.
  });

  // --- POST Request Tests ---
  describe("POST requests", () => {
    test("should return 400 listing only the missing field names", async () => {
      const params = {
        __ow_method: "post",
        payload: {
          appKey: "somekey",
        },
      };

      const response = await main(params);

      expect(response.statusCode).toBe(400);
      expect(response.headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(response.body);
      expect(body.error).toContain("Missing required fields");
      expect(body.error).toContain("instanceId");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Missing required fields: status, instanceId",
      );
    });

    test("should never echo or log action params on a bad request", async () => {
      // Distinctive marker values, so a leak anywhere is easy to detect.
      const marker = (name) => `${name}-must-not-leak`;
      const params = {
        __ow_method: "post",
        __ow_headers: { authorization: `Bearer ${marker("ims")}` },
        ENCRYPTION_KEY: marker("key"),
        ENCRYPTION_IV: marker("iv"),
        payload: { apiSecret: marker("secret") },
      };

      const response = await main(params);

      expect(response.statusCode).toBe(400);
      const logged = JSON.stringify(
        Object.values(mockLogger).flatMap((fn) => fn.mock.calls),
      );
      ["ims", "key", "iv", "secret"].map(marker).forEach((value) => {
        expect(response.body).not.toContain(value);
        expect(logged).not.toContain(value);
      });
      expect(JSON.parse(response.body).receivedParams).toBeUndefined();
    });

    test("should successfully save configuration and return 200", async () => {
      const mockPayload = {
        appKey: "somekey",
        apiSecret: "THISISVERYSECRET",
        status: "enabled",
        instanceId: "test-instance-123",
      };
      const params = {
        __ow_method: "post",
        payload: mockPayload,
      };

      // Mock the writeConfiguration to resolve successfully
      mockWriteConfiguration.mockResolvedValueOnce();

      const response = await main(params);

      expect(response.statusCode).toBe(200);
      expect(response.headers["Content-Type"]).toBe("application/json");
      expect(response.body).not.toContain("THISISVERYSECRET");
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Saved Yotpo config");
      expect(body.savedConfig).toEqual({
        appKey: "somekey",
        status: "enabled",
        instanceId: "test-instance-123",
        hasApiSecret: true,
      });
      expect(mockWriteConfiguration).toHaveBeenCalledWith(
        mockPayload,
        "yotpo",
        params,
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test("should keep the stored API secret when the payload leaves it blank", async () => {
      const params = {
        __ow_method: "post",
        payload: {
          appKey: "somekey",
          apiSecret: "",
          status: "enabled",
          instanceId: "test-instance-123",
        },
      };
      mockReadConfiguration.mockResolvedValueOnce({
        appKey: "oldkey",
        apiSecret: "STORED-SECRET",
        status: "enabled",
        instanceId: "old-instance",
      });
      mockWriteConfiguration.mockResolvedValueOnce();

      const response = await main(params);

      expect(response.statusCode).toBe(200);
      expect(response.body).not.toContain("STORED-SECRET");
      expect(mockWriteConfiguration).toHaveBeenCalledWith(
        {
          appKey: "somekey",
          apiSecret: "STORED-SECRET",
          status: "enabled",
          instanceId: "test-instance-123",
        },
        "yotpo",
        params,
      );
    });

    test("should save without a secret when none is stored yet", async () => {
      const params = {
        __ow_method: "post",
        payload: {
          appKey: "somekey",
          status: "enabled",
          instanceId: "test-instance-123",
        },
      };
      mockReadConfiguration.mockRejectedValueOnce(
        Object.assign(new Error("not found"), {
          code: "ERROR_FILE_NOT_EXISTS",
        }),
      );
      mockWriteConfiguration.mockResolvedValueOnce();

      const response = await main(params);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).savedConfig.hasApiSecret).toBe(false);
    });

    test("should return 500 if writeConfiguration fails", async () => {
      const mockPayload = {
        appKey: "somekey",
        apiSecret: "THISISVERYSECRET",
        status: "enabled",
        instanceId: "test-instance-123",
      };
      const params = {
        __ow_method: "post",
        payload: mockPayload,
      };
      const writeError = new Error("Failed to write config");

      // Mock the writeConfiguration to reject
      mockWriteConfiguration.mockRejectedValueOnce(writeError);

      const response = await main(params);

      expect(response.statusCode).toBe(500);
      expect(response.headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Error while saving configuration");
      expect(mockLogger.error).toHaveBeenCalledWith(writeError);
    });
  });

  // --- GET Request Tests ---
  describe("GET requests", () => {
    test("should successfully load configuration and return 200", async () => {
      const mockLoadedConfig = {
        appKey: "somekey",
        apiSecret: "THISISVERYSECRET",
        status: "enabled",
        instanceId: "test-instance-123",
      };
      const params = {
        __ow_method: "get",
      };

      // Mock the readConfiguration to resolve with data
      mockReadConfiguration.mockResolvedValueOnce(mockLoadedConfig);

      const response = await main(params);

      expect(response.statusCode).toBe(200);
      expect(response.headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Loaded Yotpo config");
      expect(response.body).not.toContain("THISISVERYSECRET");
      expect(body.config).toEqual({
        appKey: "somekey",
        status: "enabled",
        instanceId: "test-instance-123",
        hasApiSecret: true,
      });
      expect(mockReadConfiguration).toHaveBeenCalledWith(params, "yotpo");
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test("should return 500 if readConfiguration fails", async () => {
      const params = {
        __ow_method: "get",
      };
      const readError = new Error("Failed to read config");

      // Mock the readConfiguration to reject
      mockReadConfiguration.mockRejectedValueOnce(readError);

      const response = await main(params);

      expect(response.statusCode).toBe(500);
      expect(response.headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Error while loading configuration");
      expect(mockLogger.error).toHaveBeenCalledWith(readError);
    });
  });

  // --- Unsupported Method Test ---
  test("should return 405 for unsupported HTTP methods", async () => {
    const params = {
      __ow_method: "put", // Or 'delete', etc.
    };

    const response = await main(params);

    expect(response.statusCode).toBe(405);
    expect(response.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Method Not Allowed");
    expect(body.allowedMethods).toEqual(["GET", "POST"]);
  });
});
