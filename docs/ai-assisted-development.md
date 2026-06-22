# AI-Assisted Development and Verification

AI tooling was used to accelerate repository inspection, implementation, test generation, and
documentation. It was treated as an engineering assistant rather than as a substitute for
verification.

## Human-owned decisions

The final implementation was reviewed against the assessment contract for:

- exact endpoint paths and HTTP methods;
- template folder, validator, repository, and error conventions;
- custom business error codes and status mappings;
- retrieval rule precedence;
- `_id` to `id` serialization;
- access-code privacy;
- slug uniqueness and collision behavior;
- soft-deletion behavior.

## Verification performed

The generated and edited code was checked through:

- named tests for all 16 assessment cases;
- HTTP response-envelope tests;
- malformed JSON handling tests;
- nested VSL validation tests;
- real MongoDB integration tests;
- unique-index verification;
- ESLint and Prettier checks;
- full npm dependency audit;
- manual local API requests.

## Interview-ready ownership

The important measure is not whether AI was used; it is whether the submitted system is
understood and can be defended. The implementation owner should be able to explain:

- the request flow from endpoint to MongoDB and back;
- why validation and business rules are separated;
- why the unique index is required despite service-level checks;
- why retrieval access checks must run in a fixed order;
- why serializers prevent `_id` and `access_code` leakage;
- how soft deletion and concurrent deletes work;
- which security controls would be added for a production product.
