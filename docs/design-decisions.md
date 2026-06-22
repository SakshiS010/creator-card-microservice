# Design Decisions

This document explains the implementation choices that are not obvious from the endpoint
contract.

## Template-first architecture

The assessment explicitly requires the supplied backend template, so the implementation follows
its established layers:

```text
Endpoint → Service → Repository → Model
```

Endpoints remain thin. VSL validation and business decisions live in services. Database access
goes through the template repository factory, and response shaping is handled by a serializer.

## VSL validation and business errors

The template VSL validator handles field-level rules such as:

- required and optional fields;
- primitive types;
- string lengths;
- enums;
- nested objects and arrays;
- HTTP URL, slug, alphanumeric, and integer constraints.

Conditional and persistence-dependent rules use the template `throwAppError` utility:

- private card without an access code (`AC01`);
- access code supplied for a public card (`AC05`);
- duplicate client-provided slug (`SL02`);
- public retrieval and access-control failures.

This separation preserves the validator's normal error response while keeping assessment
business codes exact.

## ULID identifiers and serialization

MongoDB stores each identifier in `_id`, generated as a ULID by the template repository. API
consumers receive the same value as `id`.

A dedicated serializer:

- copies `_id` to `id`;
- removes `_id` and Mongoose's `__v`;
- removes `access_code` unless a create/delete response explicitly requires it.

Keeping this logic in one place reduces the risk of protected fields leaking from a new endpoint.

## Slug generation and uniqueness

When a client omits `slug`, the title is:

1. converted to lowercase;
2. stripped of unsupported characters;
3. changed from whitespace to hyphens;
4. limited to 50 characters.

If the result is shorter than five characters or already exists, a cryptographically random
six-character alphanumeric suffix is appended.

The service checks availability for a friendly response, but the MongoDB unique index is the
authoritative concurrency guarantee. Auto-generated collisions are retried. A duplicate explicit
slug always returns `SL02` and is never silently changed.

Soft-deleted slugs remain reserved because uniqueness applies across all stored cards.

## Retrieval rule order

Public retrieval deliberately applies checks in the assessment's required order:

1. missing or deleted → `NF01`;
2. draft → `NF02`;
3. private without code → `AC03`;
4. private with incorrect code → `AC04`;
5. otherwise return the serialized card.

The order matters because one card can satisfy several conditions, but the public contract
requires a deterministic error.

## Soft deletion and concurrent deletes

Deletion sets `deleted` and `updated` to the current Unix epoch time rather than removing the
document.

Retrieval filters on `deleted: null`, so deleted cards behave as missing. The update query also
requires `deleted: null`; if two delete requests race, only one can succeed.

Soft deletion preserves audit history and allows the deleted record to be returned in the
successful response.

## Access codes

The create and delete responses include `access_code` because the assessment requires those
creator-facing responses to contain the full card. Public GET responses always omit it.

For the assessment, access codes are stored as supplied so they can be compared directly. In a
larger production system, they should be hashed, rate-limited, and verified using constant-time
comparison. Access attempts should also be monitored.

## Creator reference and authorization

The delete endpoint checks that the submitted `creator_reference` matches the stored card. The
assessment explicitly requires no authentication, so this reference acts only as the required
ownership check.

In a production product, deletion should require authenticated creator identity and authorization;
knowing a creator reference alone should not grant destructive access.

## Dependency and deployment discipline

- Node.js 22 is pinned through `engines` and `.nvmrc`.
- `package-lock.json` is committed for reproducible installs.
- The unused Redis/Bull queue dependency from the template was removed.
- Unit tests do not require a database.
- Integration tests require an explicit `TEST_MONGODB_URI` and use a disposable database.
- Production and development dependency audits are kept at zero known vulnerabilities.
