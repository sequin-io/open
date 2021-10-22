const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

let count = 0;

pool.on("connect", (client) => {
  client.count = count++;
  console.log(`clients connected: ${count}`);
});

module.exports = {
  // query from pooled connection
  async query(text, params) {
    const start = Date.now(); // get starting time
    // connect to pool
    const client = await pool.connect();
    const res = await client.query(text, params);
    client.release();
    const duration = Date.now() - start; // get elapsed time

    // log results
    console.log("executed query", {
      /* text, params, */
      duration,
      rows: res.rowCount,
    });
    return res; // return results
  },
};
