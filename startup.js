// this is for starting express in order to test production code generated by 'npm run build'
const express = require('express')
const path = require('path')
const app = express()

let port = 3000

app.use(express.static(path.join(__dirname, 'dist')))

// app.get('/', (req, res) => res.send('Hello World!'))

app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

app.listen(port, () => console.log("Example app listening on port " + port))