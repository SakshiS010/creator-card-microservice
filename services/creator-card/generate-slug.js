/* eslint-disable no-await-in-loop */
const crypto = require('crypto');

const ALPHANUMERIC_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_SLUG_LENGTH = 50;
const SUFFIX_LENGTH = 6;
const MAX_COLLISION_CHECKS = 5;

function randomAlphanumeric(length = SUFFIX_LENGTH) {
  let result = '';

  while (result.length < length) {
    const randomBytes = crypto.randomBytes(length - result.length);

    for (let index = 0; index < randomBytes.length; index += 1) {
      const byte = randomBytes[index];

      // Avoid modulo bias by discarding values outside the largest even range.
      if (byte < 248) {
        result += ALPHANUMERIC_CHARACTERS[byte % ALPHANUMERIC_CHARACTERS.length];
      }

      if (result.length === length) {
        break;
      }
    }
  }

  return result;
}

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, MAX_SLUG_LENGTH);
}

function appendRandomSuffix(slug) {
  const suffix = randomAlphanumeric();
  const maxBaseLength = MAX_SLUG_LENGTH - suffix.length - 1;

  return `${slug.slice(0, maxBaseLength)}-${suffix}`;
}

async function generateUniqueSlug(title, slugExists) {
  const baseSlug = slugifyTitle(title);
  let slug = baseSlug;

  if (slug.length < 5 || (await slugExists(slug))) {
    slug = appendRandomSuffix(slug);
  }

  let collisionChecks = 0;
  while (collisionChecks < MAX_COLLISION_CHECKS && (await slugExists(slug))) {
    slug = appendRandomSuffix(baseSlug);
    collisionChecks += 1;
  }

  return slug;
}

module.exports = {
  appendRandomSuffix,
  generateUniqueSlug,
  slugifyTitle,
};
