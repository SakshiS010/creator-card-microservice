/* eslint-disable no-await-in-loop */
const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const CreatorCard = require('@app/repository/creator-card');
const { CreatorCardMessages } = require('@app/messages');
const { createCardSpec, accessCodeSpec } = require('./specs');
const { appendRandomSuffix, generateUniqueSlug, slugifyTitle } = require('./generate-slug');
const serializeCreatorCard = require('./serialize-creator-card');

const MAX_CREATE_ATTEMPTS = 5;

function isDuplicateRecordError(error) {
  return error?.errorCode === 'DUPLICATE_RECORD' || Number(error?.code) === 11000;
}

async function createCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, createCardSpec);
  const repository = options.repository || CreatorCard;
  const clientProvidedSlug = typeof data.slug !== 'undefined';
  let result;

  data.access_type = data.access_type || 'public';

  // Keep conditional access errors distinct from field-level VSL failures.
  if (data.access_type === 'private' && typeof data.access_code === 'undefined') {
    throwAppError(
      CreatorCardMessages.ACCESS_CODE_REQUIRED,
      ERROR_CODE.CREATOR_CARD_ACCESS_CODE_REQUIRED
    );
  }

  if (data.access_type === 'public' && typeof data.access_code !== 'undefined') {
    throwAppError(
      CreatorCardMessages.ACCESS_CODE_PRIVATE_ONLY,
      ERROR_CODE.CREATOR_CARD_ACCESS_CODE_PRIVATE_ONLY
    );
  }

  if (data.access_type === 'private') {
    data.access_code = validator.validate(
      { access_code: data.access_code },
      accessCodeSpec
    ).access_code;
  } else {
    data.access_code = null;
  }

  const slugExists = async (slug) => {
    const existingCard = await repository.findOne({ query: { slug } });
    return !!existingCard;
  };

  if (clientProvidedSlug) {
    if (await slugExists(data.slug)) {
      throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.CREATOR_CARD_SLUG_TAKEN);
    }
  } else {
    data.slug = await generateUniqueSlug(data.title, slugExists);
  }

  data.deleted = null;

  // The unique index is authoritative; retries also cover concurrent auto-slug requests.
  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
    try {
      const card = await repository.create(data);
      result = serializeCreatorCard(card, { includeAccessCode: true });
      break;
    } catch (error) {
      if (!isDuplicateRecordError(error)) {
        throw error;
      }

      if (clientProvidedSlug || attempt === MAX_CREATE_ATTEMPTS) {
        throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.CREATOR_CARD_SLUG_TAKEN);
      }

      data.slug = appendRandomSuffix(slugifyTitle(data.title));
    }
  }

  return result;
}

module.exports = createCard;
