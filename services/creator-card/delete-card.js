const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const CreatorCard = require('@app/repository/creator-card');
const { CreatorCardMessages } = require('@app/messages');
const { deleteCardSpec } = require('./specs');
const serializeCreatorCard = require('./serialize-creator-card');

async function deleteCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, deleteCardSpec);
  const repository = options.repository || CreatorCard;
  const card = await repository.findOne({
    query: {
      slug: data.slug,
      deleted: null,
    },
  });

  if (!card || card.creator_reference !== data.creator_reference) {
    throwAppError(CreatorCardMessages.NOT_FOUND, ERROR_CODE.CREATOR_CARD_NOT_FOUND);
  }

  // The deleted:null condition prevents two concurrent deletes from both succeeding.
  const timestamp = Date.now();
  const deleteResult = await repository.updateOne({
    query: {
      _id: card._id,
      deleted: null,
    },
    updateValues: {
      deleted: timestamp,
      updated: timestamp,
    },
  });

  if (!deleteResult.modifiedCount) {
    throwAppError(CreatorCardMessages.NOT_FOUND, ERROR_CODE.CREATOR_CARD_NOT_FOUND);
  }

  const deletedCard = await repository.findOne({
    query: {
      _id: card._id,
      deleted: timestamp,
    },
  });

  const result = serializeCreatorCard(deletedCard, { includeAccessCode: true });

  return result;
}

module.exports = deleteCard;
