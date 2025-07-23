const { createClient } = require('redis');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const keys = require('./keys');

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

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

//Redis Client
// const redisClient = require('redis');
// const redisClient = redis.createClient({
//     host: keys.redisHost,
//     port: keys.redisPort,
//     retry_strategy: () => 1000

// });

//RedisClient
const redisClient = createClient({
    url: `redis://${keys.redisHost}:${keys.redisPort}`
});
await redisClient.connect();

const redisPublisher = redisClient.duplicate();
await redisPublisher.connect();

// Express route handler
app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values');

    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    const values = await redisClient.hGetAll('values');
    res.send(values);
});

app.post('/values', async (req, res) => {
    const index = req.body.index;

    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high')
    }

    await redisClient.hSet('values', index, 'Nothing Yet');
    await redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({ working: true });
});

app.listen(5000, () => {
    console.log('Listening on port 5000');
});

}

// Start the app
startServer().catch((err) => console.error('Error starting server:', err));


