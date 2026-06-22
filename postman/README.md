# Postman Test Package

## Import

Import these files into Postman:

1. `Creator-Card-Microservice.postman_collection.json`
2. `Local.postman_environment.json`
3. `Deployed.postman_environment.json`

Select **Creator Card - Local** while the API is running on `http://localhost:8811`.

Select **Creator Card - Deployed** to test the live Render service. Its `base_url` is:

```text
https://creator-card-microservice-nj95.onrender.com
```

## Run order

Use Postman's collection runner and run the entire collection in its existing order.

The first request creates a timestamp-based `run_id`. Created slugs are stored as collection
variables and reused by later retrieval, duplicate, access-control, and deletion requests. This
makes the collection repeatable without manually deleting earlier test data.

The same collection can be run from the terminal while the local API is running:

```bash
npx --yes newman@6.2.1 run \
  postman/Creator-Card-Microservice.postman_collection.json \
  -e postman/Local.postman_environment.json
```

Validate the tracked files without making HTTP requests:

```bash
npm run postman:validate
```

## Coverage

The collection includes:

- all 16 assessment scenarios;
- exact custom error-code assertions;
- HTTP status and response-envelope assertions;
- checks that API responses expose `id`, never `_id`;
- checks that GET responses never expose `access_code`;
- malformed JSON handling;
- nested URL validation;
- integer amount validation.

The collection intentionally creates test records. Slugs include a timestamp so each run uses
independent data.

The verified local run executes 20 requests and 42 assertions.
