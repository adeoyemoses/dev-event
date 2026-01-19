jest.mock("mongoose", () => {
  const mongoose = {
    connect: jest.fn(),
  };

  return {
    __esModule: true,
    default: mongoose,
  };
});

describe("connectDB", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();

    // Clone env so per-test changes don't leak
    process.env = { ...ORIGINAL_ENV };

    // Reset global cache used by lib/mongodb.ts
    (global as any).mongoose = undefined;

    // Reset the mocked connect function (new instance after resetModules)
    const mockedMongoose = require("mongoose").default;
    mockedMongoose.connect.mockReset();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws an error if MONGODB_URI is not defined", async () => {
    delete process.env.MONGODB_URI;

    const connectDB = (await import("../lib/mongodb")).default;

    await expect(connectDB()).rejects.toThrow(
      /Please define the MONGODB_URI environment variable/i,
    );
  });

  it("successfully establishes a connection with valid MONGODB_URI", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";

    const mockedMongoose = require("mongoose").default;
    mockedMongoose.connect.mockResolvedValue(mockedMongoose);

    const connectDB = (await import("../lib/mongodb")).default;

    const conn = await connectDB();

    expect(mockedMongoose.connect).toHaveBeenCalledTimes(1);
    expect(mockedMongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
    expect(conn).toBe(mockedMongoose);
  });

  it("caches the connection after the first call to prevent multiple connections", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";

    const mockedMongoose = require("mongoose").default;
    mockedMongoose.connect.mockResolvedValue(mockedMongoose);

    const connectDB = (await import("../lib/mongodb")).default;

    await connectDB();
    await connectDB();

    expect(mockedMongoose.connect).toHaveBeenCalledTimes(1);
  });

  it("returns the cached connection on subsequent calls", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";

    const mockedMongoose = require("mongoose").default;
    mockedMongoose.connect.mockResolvedValue(mockedMongoose);

    const connectDB = (await import("../lib/mongodb")).default;

    const first = await connectDB();
    const second = await connectDB();

    expect(second).toBe(first);
  });
});
