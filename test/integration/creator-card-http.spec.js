const { expect } = require('chai');
const mongoose = require('mongoose');
const { createConnection } = require('@app-core/mongoose');
const createMockServer = require('@app-core/mock-server');
const CreatorCard = require('../../models/creator-card');

const { TEST_MONGODB_URI } = process.env;
const describeIntegration = TEST_MONGODB_URI ? describe : describe.skip;

describeIntegration('Creator Card HTTP integration', () => {
  let server;

  before(async () => {
    await createConnection({ uri: TEST_MONGODB_URI });
    await mongoose.connection.dropDatabase();

    await CreatorCard.init();

    server = createMockServer(['endpoints/creator-card']);
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('creates, retrieves, and deletes a persisted MongoDB card', async () => {
    const payload = {
      title: 'Integration Card',
      slug: 'integration-card',
      creator_reference: 'crt_8f2k1m9x4p7w3q5z',
      status: 'published',
    };

    const created = await server.post('/creator-cards', { body: payload });

    expect(created.statusCode).to.equal(200);
    expect(created.data.status).to.equal('success');
    expect(created.data.data).to.have.property('id');
    expect(created.data.data).not.to.have.property('_id');

    const retrieved = await server.get('/creator-cards/integration-card');

    expect(retrieved.statusCode).to.equal(200);
    expect(retrieved.data.data.id).to.equal(created.data.data.id);
    expect(retrieved.data.data).not.to.have.property('access_code');

    const deleted = await server.delete('/creator-cards/integration-card', {
      body: { creator_reference: payload.creator_reference },
    });

    expect(deleted.statusCode).to.equal(200);
    expect(deleted.data.data.deleted).to.be.a('number');

    const afterDelete = await server.get('/creator-cards/integration-card');

    expect(afterDelete.statusCode).to.equal(404);
    expect(afterDelete.data.code).to.equal('NF01');
  });

  it('enforces the unique slug index through the public endpoint', async () => {
    const payload = {
      title: 'Unique Card',
      slug: 'unique-card',
      creator_reference: 'crt_a1b2c3d4e5f6g7h8',
      status: 'published',
    };

    const first = await server.post('/creator-cards', { body: payload });
    const duplicate = await server.post('/creator-cards', {
      body: { ...payload, title: 'Duplicate Card' },
    });

    expect(first.statusCode).to.equal(200);
    expect(duplicate.statusCode).to.equal(400);
    expect(duplicate.data.code).to.equal('SL02');
  });
});
