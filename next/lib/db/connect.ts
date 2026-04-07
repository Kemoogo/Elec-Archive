import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI && process.env.NODE_ENV === "production") {
  throw new Error("MONGODB_URI environment variable is required in production");
}

if (!MONGODB_URI) {
  console.warn("MONGODB_URI not set — falling back to mongodb://localhost:27017/elec-archive");
}

const RESOLVED_URI = MONGODB_URI ?? "mongodb://localhost:27017/elec-archive";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  listenersAttached: boolean;
  shutdownRegistered: boolean;
}

const globalWithMongoose = global as typeof global & { mongoose?: MongooseCache };

const cached: MongooseCache = globalWithMongoose.mongoose ?? {
  conn: null,
  promise: null,
  listenersAttached: false,
  shutdownRegistered: false,
};

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = cached;
}

function attachConnectionListeners(): void {
  if (cached.listenersAttached) return;
  cached.listenersAttached = true;

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Will reconnect on next request.");
    cached.conn = null;
    cached.promise = null;
  });
}

function registerGracefulShutdown(): void {
  if (cached.shutdownRegistered) return;
  cached.shutdownRegistered = true;

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Closing MongoDB connection...`);
    await disconnectFromDatabase();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(RESOLVED_URI, opts).then((m) => {
      attachConnectionListeners();
      registerGracefulShutdown();
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    if (cached.conn.connection.readyState !== 1) {
      cached.conn = null;
      cached.promise = null;
      throw new Error("Database connection lost");
    }
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
