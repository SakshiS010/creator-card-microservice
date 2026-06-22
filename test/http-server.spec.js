const EventEmitter = require('events');
const { expect } = require('chai');
const httpMocker = require('node-mocks-http');
const { createServer, handleJsonParseError } = require('@app-core/server');
const { throwAppError } = require('@app-core/errors');

function createTestServer() {
  const server = createServer();

  server.addHandler({
    path: '/success',
    method: 'get',
    middlewares: [],
    async handler() {
      return {
        status: 200,
        message: 'Request completed.',
        data: { ready: true },
      };
    },
  });

  server.addHandler({
    path: '/business-error',
    method: 'get',
    middlewares: [],
    async handler() {
      throwAppError('Invalid access code', 'AC04');
    },
  });

  return server;
}

function simulateRequest(server, { method = 'GET', url = '/', body = {} }) {
  return new Promise((resolve, reject) => {
    const { req, res } = httpMocker.createMocks(
      {
        method,
        url,
        body,
        headers: { 'x-client-ip': '127.0.0.1' },
      },
      { eventEmitter: EventEmitter }
    );

    res.on('end', () => {
      resolve({
        statusCode: res.statusCode,
        body: res._getJSONData(),
      });
    });
    res.on('error', reject);

    server.executeRequest(req, res, reject);
  });
}

describe('HTTP server contract', () => {
  it('returns the template success envelope', async () => {
    const response = await simulateRequest(createTestServer(), {
      method: 'GET',
      url: '/success',
    });

    expect(response.statusCode).to.equal(200);
    expect(response.body).to.deep.equal({
      status: 'success',
      message: 'Request completed.',
      data: { ready: true },
    });
  });

  it('returns business error codes in the error envelope', async () => {
    const response = await simulateRequest(createTestServer(), {
      method: 'GET',
      url: '/business-error',
    });

    expect(response.statusCode).to.equal(403);
    expect(response.body).to.deep.equal({
      status: 'error',
      message: 'Invalid access code',
      code: 'AC04',
    });
  });

  it('returns HTTP 400 for malformed JSON without crashing', () => {
    const syntaxError = new SyntaxError('Unexpected end of JSON input');
    syntaxError.status = 400;
    syntaxError.body = '{"title":';

    const { req, res } = httpMocker.createMocks();
    let nextCalled = false;

    handleJsonParseError(syntaxError, req, res, () => {
      nextCalled = true;
    });

    expect(res.statusCode).to.equal(400);
    expect(res._getJSONData()).to.deep.equal({
      status: 'error',
      code: 'ERR',
      message: 'Error encountered in parsing request payload. Please check payload and try again',
    });
    expect(nextCalled).to.equal(false);
  });
});
