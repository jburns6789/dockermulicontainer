const { createClient } = require('redis');
const keys = require('./keys');

// Plain recursive Fibonacci for demo purposes
function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

(async () => {
  // Main Redis client for normal commands
  const redisClient = createClient({
    url: `rediss://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    pingInterval: 10000 // Keepalive to avoid idle disconnects
  });

  // Duplicate client for subscription
  const sub = redisClient.duplicate();

  // Handle client errors so the process doesn't crash
  redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
  });

  sub.on('error', (err) => {
    console.error('Redis Subscription Error', err);
  });

  try {
    // Connect both clients
    await redisClient.connect();
    await sub.connect();

    console.log('Worker connected to Redis');

    // Subscribe to the "insert" channel
    await sub.subscribe('insert', async (message) => {
      const index = parseInt(message, 10);

      if (isNaN(index)) {
        console.warn(`Received non-numeric message: ${message}`);
        return;
      }

      const result = fib(index);
      console.log(`Calculating fib(${index}) = ${result}`);

      try {
        await redisClient.hSet('values', index.toString(), result.toString());
      } catch (err) {
        console.error('Error storing value in Redis:', err);
      }
    });

    console.log('Worker is now listening for insert events...');
  } catch (err) {
    console.error('Failed to initialize Redis worker:', err);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down Redis worker...');
    try {
      await sub.unsubscribe('insert');
    } catch (e) {}

    try {
      await sub.quit();
    } catch (e) {}

    try {
      await redisClient.quit();
    } catch (e) {}

    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();

// const { createClient } = require('redis');
// const keys = require('./keys');

// // Plain recursive fib for demo purposes
// function fib(index) {
//   if (index < 2) return 1;
//   return fib(index - 1) + fib(index - 2);
// }

// (async () => {
//   // Create Redis clients for commands and subscriptions
//   const redisClient = createClient({
//     url: `redis://redis:6379`,
//     pingInterval: 10000, // keepalive to avoid idle disconnects
//   });
//   const sub = redisClient.duplicate();

//   // Connect both clients
//   await redisClient.connect();
//   await sub.connect();

//   // Subscribe to the "insert" channel
//   await sub.subscribe('insert', async (message) => {
//     const index = parseInt(message);
//     const result = fib(index);
//     console.log(`Calculating fib(${index}) = ${result}`);
//     await redisClient.hSet('values', index, result);
//   });
// })();
