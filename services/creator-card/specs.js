const validator = require('@app-core/validator');

const createCardSpec = validator.parse(`root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50|isSlug>
  creator_reference string<length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200|isHttpUrl>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description string<trim|maxLength:250>
      amount number<integer|min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string
}`);

const accessCodeSpec = validator.parse(`root {
  access_code string<length:6|isAlphanumeric>
}`);

const getCardSpec = validator.parse(`root {
  slug string<lengthBetween:5,50|isSlug>
  access_code? string
}`);

const deleteCardSpec = validator.parse(`root {
  slug string<lengthBetween:5,50|isSlug>
  creator_reference string<length:20>
}`);

module.exports = {
  createCardSpec,
  accessCodeSpec,
  getCardSpec,
  deleteCardSpec,
};
