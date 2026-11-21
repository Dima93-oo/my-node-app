const Joi = require('joi');

const numMsg = {
  'number.base': 'должно быть числом',
  'number.integer': 'должно быть целым',
  'number.min': 'должно быть не меньше {{#limit}}',
  'number.max': 'должно быть не больше {{#limit}}',
};

const userSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.base': 'обязательное поле, строка',
    'string.empty': 'обязательное поле',
    'any.required': 'обязательное поле',
    'string.min': 'минимум {{#limit}} символа',
    'string.max': 'максимум {{#limit}} символов',
  }),
  email: Joi.string().email().required().messages({
    'string.base': 'обязательное поле, строка',
    'string.empty': 'обязательное поле',
    'any.required': 'обязательное поле',
    'string.email': 'неверный формат',
  }),
  group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/).required().messages({
    'string.empty': 'обязательное поле',
    'any.required': 'обязательное поле',
    'string.pattern.base': 'формат ББМО-XX-XX',
  }),
  age: Joi.number().integer().min(16).max(100).messages(numMsg),
  course: Joi.number().integer().min(1).max(4).messages(numMsg),
}).options({ allowUnknown: true });

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'должно быть целым',
    'number.integer': 'должно быть целым',
    'number.min': 'должно быть больше 0',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'должно быть целым',
    'number.integer': 'должно быть целым',
    'number.min': 'должно быть больше 0',
    'number.max': 'максимум 100',
  }),
  sort: Joi.string().valid('name', '-name', 'age', '-age', 'created_at', '-created_at').messages({
    'any.only': 'поле вне белого списка',
  }),
  group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/).messages({
    'string.pattern.base': 'формат ББМО-XX-XX',
  }),
  course: Joi.number().integer().min(1).max(4).messages(numMsg),
  age_min: Joi.number().integer().min(16).max(100).messages(numMsg),
  age_max: Joi.number().integer().min(16).max(100).messages(numMsg),
  search: Joi.string().min(1),
});

const searchSchema = Joi.object({
  q: Joi.string().min(1).required().messages({
    'string.empty': 'обязательное поле',
    'any.required': 'обязательное поле',
    'string.min': 'минимум 1 символ',
  }),
});

function fail400(error) {
  const err = new Error('Validation failed');
  err.status = 400;
  err.details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
  return err;
}

function validate(schema) {
  return async (ctx, next) => {
    const { error, value } = schema.validate(ctx.request.body || {}, { abortEarly: false });
    if (error) throw fail400(error);
    ctx.state.validated = value;
    await next();
  };
}

function validateQuery(schema) {
  return async (ctx, next) => {
    const { error, value } = schema.validate(ctx.query, { abortEarly: false });
    if (error) throw fail400(error);
    ctx.state.query = value;
    await next();
  };
}

module.exports = { userSchema, querySchema, searchSchema, validate, validateQuery };