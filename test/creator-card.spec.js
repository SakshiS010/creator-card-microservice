const { expect } = require('chai');
const { ulid } = require('ulid');
const createCard = require('../services/creator-card/create-card');
const getCard = require('../services/creator-card/get-card');
const deleteCard = require('../services/creator-card/delete-card');

const CREATOR_REFERENCE = 'crt_8f2k1m9x4p7w3q5z';

function createInMemoryRepository() {
  const records = [];

  function matches(record, query) {
    return Object.entries(query).every(([key, value]) => record[key] === value);
  }

  return {
    records,
    async create(data) {
      if (records.some((record) => record.slug === data.slug)) {
        const error = new Error('Duplicate slug');
        error.errorCode = 'DUPLICATE_RECORD';
        throw error;
      }

      const timestamp = Date.now();
      const record = {
        ...data,
        _id: ulid(),
        created: timestamp,
        updated: timestamp,
      };

      records.push(record);
      return { ...record };
    },
    async findOne({ query }) {
      const record = records.find((entry) => matches(entry, query));
      return record ? { ...record } : null;
    },
    async updateOne({ query, updateValues }) {
      const record = records.find((entry) => matches(entry, query));

      if (!record) {
        return { acknowledged: true, modifiedCount: 0 };
      }

      Object.assign(record, updateValues);
      return { acknowledged: true, modifiedCount: 1 };
    },
  };
}

function publicCardPayload(overrides = {}) {
  return {
    title: 'George Cooks',
    slug: 'george-cooks',
    creator_reference: CREATOR_REFERENCE,
    status: 'published',
    ...overrides,
  };
}

async function expectAppError(promise, errorCode, message) {
  let thrownError;

  try {
    await promise;
  } catch (error) {
    thrownError = error;
  }

  expect(thrownError).not.to.equal(undefined);
  expect(thrownError.isApplicationError).to.equal(true);
  expect(thrownError.errorCode).to.equal(errorCode);
  if (message) {
    expect(thrownError.message).to.equal(message);
  }
}

describe('Creator Card assessment cases', () => {
  it('01 creates a complete public card', async () => {
    const repository = createInMemoryRepository();
    const card = await createCard(
      publicCardPayload({
        description: 'Weekly cooking podcast',
        links: [{ title: 'YouTube', url: 'https://youtube.com/@georgecooks' }],
        service_rates: {
          currency: 'NGN',
          rates: [
            {
              name: 'IG Story Post',
              description: 'One story mention',
              amount: 5000000,
            },
          ],
        },
      }),
      { repository }
    );

    expect(card.id).to.have.length(26);
    expect(card).not.to.have.property('_id');
    expect(card.access_type).to.equal('public');
    expect(card.access_code).to.equal(null);
    expect(card.deleted).to.equal(null);
  });

  it('02 auto-generates a slug from the title', async () => {
    const repository = createInMemoryRepository();
    const card = await createCard(
      {
        title: 'Ada Designs Things',
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
        status: 'published',
      },
      { repository }
    );

    expect(card.slug).to.equal('ada-designs-things');
  });

  it('03 creates a private card and returns its access code', async () => {
    const repository = createInMemoryRepository();
    const card = await createCard(
      publicCardPayload({
        title: 'VIP Rate Card',
        slug: 'vip-rate-card',
        access_type: 'private',
        access_code: 'A1B2C3',
      }),
      { repository }
    );

    expect(card.access_type).to.equal('private');
    expect(card.access_code).to.equal('A1B2C3');
  });

  it('04 retrieves a public published card without leaking protected fields', async () => {
    const repository = createInMemoryRepository();
    const created = await createCard(publicCardPayload(), { repository });
    const retrieved = await getCard({ slug: created.slug }, { repository });

    expect(retrieved.id).to.equal(created.id);
    expect(retrieved).not.to.have.property('_id');
    expect(retrieved).not.to.have.property('access_code');
  });

  it('05 retrieves a private card with the correct access code', async () => {
    const repository = createInMemoryRepository();
    const created = await createCard(
      publicCardPayload({
        title: 'VIP Rate Card',
        slug: 'vip-rate-card',
        access_type: 'private',
        access_code: 'A1B2C3',
      }),
      { repository }
    );
    const retrieved = await getCard({ slug: created.slug, access_code: 'A1B2C3' }, { repository });

    expect(retrieved.id).to.equal(created.id);
    expect(retrieved).not.to.have.property('access_code');
  });

  it('06 deletes a card and returns the soft-deleted record', async () => {
    const repository = createInMemoryRepository();
    const created = await createCard(
      publicCardPayload({
        title: 'Ada Designs Things',
        slug: 'ada-designs-things',
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
      }),
      { repository }
    );
    const deleted = await deleteCard(
      {
        slug: created.slug,
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
      },
      { repository }
    );

    expect(deleted.id).to.equal(created.id);
    expect(deleted.deleted).to.be.a('number');
    expect(deleted).not.to.have.property('_id');
  });

  it('07 returns SL02 for a duplicate client-provided slug', async () => {
    const repository = createInMemoryRepository();
    await createCard(publicCardPayload(), { repository });

    await expectAppError(
      createCard(publicCardPayload({ title: 'Another George' }), { repository }),
      'SL02',
      'Slug is already taken'
    );
  });

  it('08 returns AC01 when a private card has no access code', async () => {
    const repository = createInMemoryRepository();

    await expectAppError(
      createCard(publicCardPayload({ access_type: 'private' }), { repository }),
      'AC01',
      'access_code is required when access_type is private'
    );
  });

  it('09 returns AC05 when a public card supplies an access code', async () => {
    const repository = createInMemoryRepository();

    await expectAppError(
      createCard(
        publicCardPayload({
          access_type: 'public',
          access_code: 'A1B2C3',
        }),
        { repository }
      ),
      'AC05',
      'access_code can only be set on private cards'
    );
  });

  it('10 rejects an unsupported status through VSL validation', async () => {
    const repository = createInMemoryRepository();

    await expectAppError(
      createCard(publicCardPayload({ status: 'archived' }), { repository }),
      'SPCL_VALIDATION'
    );
  });

  it('11 returns NF01 when retrieving a card that does not exist', async () => {
    const repository = createInMemoryRepository();

    await expectAppError(
      getCard({ slug: 'does-not-exist-123' }, { repository }),
      'NF01',
      'Creator card not found'
    );
  });

  it('12 returns NF02 when retrieving a draft card', async () => {
    const repository = createInMemoryRepository();
    const draft = await createCard(
      publicCardPayload({
        title: 'My Draft Card',
        slug: 'my-draft-card',
        status: 'draft',
      }),
      { repository }
    );

    await expectAppError(
      getCard({ slug: draft.slug }, { repository }),
      'NF02',
      'Creator card not found'
    );
  });

  it('13 returns AC03 when a private card is requested without a code', async () => {
    const repository = createInMemoryRepository();
    const card = await createCard(
      publicCardPayload({
        title: 'VIP Rate Card',
        slug: 'vip-rate-card',
        access_type: 'private',
        access_code: 'A1B2C3',
      }),
      { repository }
    );

    await expectAppError(
      getCard({ slug: card.slug }, { repository }),
      'AC03',
      'This card is private. An access code is required'
    );
  });

  it('14 returns AC04 when a private card receives the wrong code', async () => {
    const repository = createInMemoryRepository();
    const card = await createCard(
      publicCardPayload({
        title: 'VIP Rate Card',
        slug: 'vip-rate-card',
        access_type: 'private',
        access_code: 'A1B2C3',
      }),
      { repository }
    );

    await expectAppError(
      getCard({ slug: card.slug, access_code: 'WRONG1' }, { repository }),
      'AC04',
      'Invalid access code'
    );
  });

  it('15 returns NF01 when deleting a card that does not exist', async () => {
    const repository = createInMemoryRepository();

    await expectAppError(
      deleteCard(
        {
          slug: 'does-not-exist-123',
          creator_reference: CREATOR_REFERENCE,
        },
        { repository }
      ),
      'NF01',
      'Creator card not found'
    );
  });

  it('16 returns NF01 when retrieving a deleted card', async () => {
    const repository = createInMemoryRepository();
    const card = await createCard(
      publicCardPayload({
        title: 'Ada Designs Things',
        slug: 'ada-designs-things',
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
      }),
      { repository }
    );

    await deleteCard(
      {
        slug: card.slug,
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
      },
      { repository }
    );

    await expectAppError(
      getCard({ slug: card.slug }, { repository }),
      'NF01',
      'Creator card not found'
    );
  });

  it('validates nested URLs, integer amounts, and access-code format with VSL', async () => {
    const repository = createInMemoryRepository();

    await expectAppError(
      createCard(
        publicCardPayload({
          links: [{ title: 'Bad', url: 'ftp://example.com' }],
        }),
        { repository }
      ),
      'SPCL_VALIDATION'
    );

    await expectAppError(
      createCard(
        publicCardPayload({
          service_rates: {
            currency: 'USD',
            rates: [{ name: 'Consulting', description: 'One call', amount: 1.5 }],
          },
        }),
        { repository }
      ),
      'SPCL_VALIDATION'
    );

    await expectAppError(
      createCard(
        publicCardPayload({
          access_type: 'private',
          access_code: 'BAD-1!',
        }),
        { repository }
      ),
      'SPCL_VALIDATION'
    );
  });
});
