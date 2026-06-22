function serializeCreatorCard(card, options = {}) {
  if (!card) {
    return card;
  }

  const source = typeof card.toObject === 'function' ? card.toObject() : card;
  const serialized = {
    ...source,
    id: `${source._id}`,
  };

  // MongoDB naming is kept internal; public responses expose only id.
  delete serialized._id;
  delete serialized.__v;

  if (!options.includeAccessCode) {
    delete serialized.access_code;
  }

  return serialized;
}

module.exports = serializeCreatorCard;
