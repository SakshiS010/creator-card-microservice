const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const CreatorCard = require('@app/repository/creator-card');
const { CreatorCardMessages } = require('@app/messages');
const { getCardSpec } = require('./specs');
const serializeCreatorCard = require('./serialize-creator-card');

async function getCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, getCardSpec);
  const repository = options.repository || CreatorCard;
  const card = await repository.findOne({
    query: {
      slug: data.slug,
      deleted: null,
    },
  });

  // These checks intentionally mirror the assessment's required precedence.
  if (!card) {
    throwAppError(CreatorCardMessages.NOT_FOUND, ERROR_CODE.CREATOR_CARD_NOT_FOUND);
  }

  if (card.status === 'draft') {
    throwAppError(CreatorCardMessages.NOT_FOUND, ERROR_CODE.CREATOR_CARD_DRAFT);
  }

  if (card.access_type === 'private' && typeof data.access_code === 'undefined') {
    throwAppError(
      CreatorCardMessages.PRIVATE_ACCESS_REQUIRED,
      ERROR_CODE.CREATOR_CARD_PRIVATE_ACCESS_REQUIRED
    );
  }

  if (card.access_type === 'private' && data.access_code !== card.access_code) {
    throwAppError(
      CreatorCardMessages.INVALID_ACCESS_CODE,
      ERROR_CODE.CREATOR_CARD_INVALID_ACCESS_CODE
    );
  }

  const result = serializeCreatorCard(card);

  return result;
}

module.exports = getCard;
