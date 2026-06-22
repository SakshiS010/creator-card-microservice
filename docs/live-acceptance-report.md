# Live Acceptance Report

## Deployment

- Date: June 22, 2026
- Base URL: `https://creator-card-microservice-nj95.onrender.com`
- Runtime: Render Free web service
- Database: MongoDB Atlas

## Automated acceptance run

The tracked Postman collection was executed against the deployed environment with Newman.

```text
Requests:   20 executed, 0 failed
Assertions: 42 executed, 0 failed
Duration:   4.1 seconds
Average:    188 ms
```

The run covered all 16 assessment scenarios plus malformed JSON, nested URL validation, and
integer amount validation.

## Verified invariants

- All required success and error HTTP statuses matched.
- Business codes `SL02`, `AC01`, `AC05`, `NF01`, `NF02`, `AC03`, and `AC04` matched.
- API responses exposed `id`, never `_id`.
- Public GET responses never exposed `access_code`.
- Create responses included `access_code` as required.
- Soft-deleted cards returned `NF01` on later retrieval.
- Render connected successfully to MongoDB Atlas.
- GitHub pushes triggered successful Render auto-deployments.
- Data persisted across a Render redeployment.

## Reproduction

```bash
npx --yes newman@6.2.1 run \
  postman/Creator-Card-Microservice.postman_collection.json \
  -e postman/Deployed.postman_environment.json
```
