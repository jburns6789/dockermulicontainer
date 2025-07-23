const { createClient } = require('redis');
const keys = require('./keys');

// Plain recursive fib for demo purposes
function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

(async () => {
  // Create Redis clients for commands and subscriptions
  const redisClient = createClient({
    url: `redis://${keys.redisHost}:${keys.redisPort}`,
  });
  const sub = redisClient.duplicate();

  // Connect both clients
  await redisClient.connect();
  await sub.connect();

  // Subscribe to the "insert" channel
  await sub.subscribe('insert', async (message) => {
    const index = parseInt(message);
    const result = fib(index);
    console.log(`Calculating fib(${index}) = ${result}`);
    await redisClient.hSet('values', index, result);
  });
})();
