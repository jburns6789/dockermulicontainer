const { createClient } = require('redis');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const keys = require('./keys');

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

console.log('[SERVER] Starting application...');

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());


//Postgres Client Setup
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
  ssl:
    process.env.NODE_ENV !== 'production'
      ? false
      : { rejectUnauthorized: false },
});

pgClient.on('connect', (client) => {
  client
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.error(err));
});

pgClient.on('error', () => console.error('[SERVER] Lost PG connection'));
console.log('[SERVER] Postgres client configured.');



// --- Redis Client Setup ---
const redisClient = createClient({
    url: `redis://${keys.redisHost}:${keys.redisPort}`,
    socket: {
        connectTimeout: 50000,
        reconnectStrategy: retries => Math.min(retries * 50, 1000)
    }
});
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
await redisClient.connect();
console.log('[SERVER] Redis client connected.');

const redisPublisher = redisClient.duplicate();
redisPublisher.on('error', (err) => console.error('Redis Publisher Error:', err));
await redisPublisher.connect();
console.log('[SERVER] Redis publisher connected.');

console.log('[SERVER] Express app configured.');

//RedisClient
// const redisClient = createClient({
//     url: `redis://${keys.redisHost}:${keys.redisPort}`
// });
// redisClient.on('error', (err) => {
//     console.error('Redis Client Error', err);
// });
// await redisClient.connect();

// redisClient.on('error', (err) => console.error('[SERVER] Redis Client Error', err));
// console.log('[SERVER] Redis client configured.');

// const redisPublisher = redisClient.duplicate();
// redisPublisher.on('error', (err) => {
//     console.error('Redis Publisher Error', err);
// });
// await redisPublisher.connect();

// redisPublisher.on('error', (err) => {
//     console.error('Redis Publisher Error', err);
//   });

// console.log('[SERVER] Express app configured.');

// --- Express Route Handlers ---
app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    try {
        const values = await pgClient.query('SELECT * FROM values');
        res.send(values.rows);
    } catch (err) {
        console.error('Error fetching all values from Postgres:', err);
        res.status(500).send('Postgres error');
    }
});

app.get('/values/current', async (req, res) => {
    try {
        const values = await redisClient.hGetAll('values');
        res.send(values);
    } catch (err) {
        console.error('Error fetching current values from Redis:', err);
        res.status(500).send('Redis error');
    }
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (!index || parseInt(index) > 40) {
        return res.status(422).send('Index too high or invalid');
    }

    try {
        await redisClient.hSet('values', index, 'Nothing Yet!');
        await redisPublisher.publish('insert', index);
        await pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
        res.send({ working: true });
    } catch (err) {
        console.error('Error processing post to /values:', err);
        res.status(500).send('Error storing value');
    }
});

// --- Start Listening for Requests ---
app.listen(5000, '0.0.0.0', () => {
    console.log('[SERVER] Successfully started and listening on port 5000');
});
}

// --- Start the Application ---
startServer().catch((err) => {
console.error('Failed to start server:', err);
process.exit(1);
});

// Express route handler
// app.get('/', (req, res) => {
//     res.send('Hi');
// });

// app.get('/values/all', async (req, res) => {
//     try {
//     const values = await pgClient.query('SELECT * from values');
//     res.send(values.rows);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send("Postgres error");
//     }
// });

// app.get('/values/current', async (req, res) => {
//     const values = await redisClient.hGetAll('values');
//     res.send(values);
// });

// app.post('/values', async (req, res) => {
//     const index = req.body.index;

//     if (parseInt(index) > 40) {
//         return res.status(422).send('Index too high')
//     }

//     await redisClient.hSet('values', index, 'Nothing Yet');
//     await redisPublisher.publish('insert', index);
//     pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

//     res.send({ working: true });
// });

// app.listen(5000, '0.0.0.0', () => {
//     console.log('Listening on port 5000');
//     if (err) {
//         console.error('[SERVER] Failed to start listening:', err);
//         return;
// });
// console.log('[SERVER] Successfully started and listening on port 5000');
// }

// // Start the app
// startServer().catch((err) => console.error('Error starting server:', err));


