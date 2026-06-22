const { createHandler } = require('@app-core/server');
const createCard = require('@app/services/creator-card/create-card');

module.exports = createHandler({
  path: '/creator-cards',
  method: 'post',
  middlewares: [],
  async handler(rc, helpers) {
    const response = await createCard(rc.body);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Created Successfully.',
      data: response,
    };
  },
});
