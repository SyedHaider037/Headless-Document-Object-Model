import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
})

pool
.connect()
.then((client) => {
    console.log(`Database connected successfully`);
    client.release()
})
.catch((err) => {
    console.log(`Failed to connect to database`, err);
})


export const db = drizzle(pool)
