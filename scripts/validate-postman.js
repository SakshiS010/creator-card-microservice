const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const collectionPath = path.join(
  projectRoot,
  'postman',
  'Creator-Card-Microservice.postman_collection.json'
);
const environmentPaths = [
  path.join(projectRoot, 'postman', 'Local.postman_environment.json'),
  path.join(projectRoot, 'postman', 'Deployed.postman_environment.json'),
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenItems(items, result = []) {
  items.forEach((item) => {
    if (Array.isArray(item.item)) {
      flattenItems(item.item, result);
    } else {
      result.push(item);
    }
  });

  return result;
}

function extractCreatorReferences(rawBody = '') {
  const matches = rawBody.matchAll(/"creator_reference"\s*:\s*"([^"]+)"/g);
  return Array.from(matches, (match) => match[1]);
}

const collection = readJson(collectionPath);
const requests = flattenItems(collection.item || []);
const requestNames = requests.map((item) => item.name);
const requiredScenarioPrefixes = Array.from({ length: 16 }, (_, index) =>
  String(index + 1).padStart(2, '0')
);

if (
  collection.info?.schema !== 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
) {
  throw new Error('Collection must use the Postman v2.1 schema');
}

requiredScenarioPrefixes.forEach((prefix) => {
  if (!requestNames.some((name) => name.startsWith(prefix))) {
    throw new Error(`Missing assessment scenario ${prefix}`);
  }
});

requests.forEach((item) => {
  if (!item.request?.url?.raw?.includes('{{base_url}}')) {
    throw new Error(`${item.name} does not use the base_url environment variable`);
  }

  extractCreatorReferences(item.request?.body?.raw).forEach((creatorReference) => {
    if (creatorReference.length !== 20) {
      throw new Error(`${item.name} has an invalid creator_reference length`);
    }
  });
});

environmentPaths.forEach((environmentPath) => {
  const environment = readJson(environmentPath);
  const baseUrl = environment.values?.find((entry) => entry.key === 'base_url');

  if (!baseUrl?.value) {
    throw new Error(`${path.basename(environmentPath)} is missing base_url`);
  }
});

console.log(`Postman package valid: ${requests.length} requests, 16 assessment scenarios`);
