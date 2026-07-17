import { createServer } from 'node:http';
import { DB_PACKAGE_VERSION } from '@eduai/db';

const port = Number(process.env.PORT ?? 3002);

const server = createServer((_request, response) => {
  if (_request.url !== '/health') {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(
    JSON.stringify({ status: 'ok', service: 'docgen', dbPackage: DB_PACKAGE_VERSION }),
  );
});

server.listen(port, () => {
  console.log(`docgen listening on http://localhost:${port}`);
});
