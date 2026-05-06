import http from 'node:http'
import { Readable } from 'node:stream'
import app from '../dist/server/server.js'

const host = process.env.HOST ?? '0.0.0.0'
const port = Number(process.env.PORT ?? '3000')

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`)
    const request = new Request(url, {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Readable.toWeb(req),
      duplex: 'half',
    })

    const response = await app.fetch(request)

    res.statusCode = response.status
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value)
    }

    if (response.body) {
      Readable.fromWeb(response.body).pipe(res)
      return
    }

    res.end()
  } catch (error) {
    res.statusCode = 500
    res.end(error instanceof Error ? error.message : 'Internal Server Error')
  }
})

server.listen(port, host, () => {
  console.log(`Web server listening on http://${host}:${port}`)
})
