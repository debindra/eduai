import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 3003);

const server = createServer((_request, response) => {
  if (_request.url !== '/health') {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ status: 'ok', service: 'jobs' }));
});

server.listen(port, () => {
  console.log(`jobs listening on http://localhost:${port}`);
});
