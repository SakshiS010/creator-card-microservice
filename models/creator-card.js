const mongoose = require('mongoose');
const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creatorCards';

const linkSchema = new mongoose.Schema(
  {
    title: { type: SchemaTypes.String },
    url: { type: SchemaTypes.String },
  },
  { _id: false }
);

const rateSchema = new mongoose.Schema(
  {
    name: { type: SchemaTypes.String },
    description: { type: SchemaTypes.String },
    amount: { type: SchemaTypes.Number },
  },
  { _id: false }
);

const serviceRatesSchema = new mongoose.Schema(
  {
    currency: { type: SchemaTypes.String },
    rates: { type: [rateSchema], default: undefined },
  },
  { _id: false }
);

const schemaConfig = {
  _id: { type: SchemaTypes.ULID },
  title: { type: SchemaTypes.String },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String, unique: true, index: true },
  creator_reference: { type: SchemaTypes.String, index: true },
  links: { type: [linkSchema], default: undefined },
  service_rates: { type: serviceRatesSchema },
  status: { type: SchemaTypes.String, index: true },
  access_type: { type: SchemaTypes.String, default: 'public' },
  access_code: { type: SchemaTypes.String, default: null },
  created: { type: SchemaTypes.Number },
  updated: { type: SchemaTypes.Number },
  deleted: { type: SchemaTypes.Number, default: null, index: true },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });

module.exports = DatabaseModel.model(modelName, modelSchema);
