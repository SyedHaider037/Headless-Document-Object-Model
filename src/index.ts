import "reflect-metadata"
import "./container.ts"
import './db/index.ts'
import { app } from './app.ts'
import "dotenv/config"

const PORT = process.env.PORT || 7000

app.listen(PORT, () => {
    console.log(`app is listening on port ${PORT}`)
})