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
    test("should return 400 if required fields are missing in payload", async () => {
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
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Missing field for request",
        params,
      );
    });

    test("should successfully save configuration and return 200", async () => {
      const mockPayload = {
        appKey: "somekey",
        apiSecret: "THISISVERYSECRET",
        status: "enabled",
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
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe("Saved Yotpo config");
      expect(body.savedConfig).toEqual(mockPayload);
      expect(mockWriteConfiguration).toHaveBeenCalledWith(
        mockPayload,
        "yotpo",
        params,
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test("should return 500 if writeConfiguration fails", async () => {
      const mockPayload = {
        appKey: "somekey",
        apiSecret: "THISISVERYSECRET",
        status: "enabled",
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
      expect(body.config).toEqual(mockLoadedConfig);
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
