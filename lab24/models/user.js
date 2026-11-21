const { ObjectId } = require('mongodb');
const { log } = require('../utils/log');

const GROUP_RE = /^ББМО-\d{2}-\d{2}$/;
let col = null;

class User {
  static async init(db) {
    col = db.collection('users');
    await col.createIndex({ email: 1 }, { unique: true });
    await col.createIndex({ name: 'text', email: 'text' }, { default_language: 'ru' });
  }

  static validate(data) {
    const errors = [];
    if (typeof data.name !== 'string' || data.name.trim().length < 2) {
      errors.push({ field: 'name', message: 'обязательное поле, минимум 2 символа' });
    }
    if (typeof data.email !== 'string' || !data.email.includes('@')) {
      errors.push({ field: 'email', message: 'обязательное поле, формат email' });
    }
    if (typeof data.group_name !== 'string' || !GROUP_RE.test(data.group_name)) {
      errors.push({ field: 'group_name', message: 'формат ББМО-XX-XX' });
    }
    if (errors.length) {
      const err = new Error('Model validation failed');
      err.status = 400;
      err.details = errors;
      throw err;
    }
  }

  static toId(id) {
    return ObjectId.isValid(id) ? new ObjectId(id) : null;
  }

  static async findAll(options = {}) {
    log('MODEL', 'find');
    let cursor = col.find(options.filter || {});
    if (options.sort) cursor = cursor.sort(options.sort);
    if (options.skip) cursor = cursor.skip(options.skip);
    if (options.limit) cursor = cursor.limit(options.limit);
    if (options.projection) cursor = cursor.project(options.projection);
    return cursor.toArray();
  }

  static async findById(id) {
    log('MODEL', 'findOne by id');
    const _id = User.toId(id);
    if (!_id) return null;
    return col.findOne({ _id });
  }

  static async findByEmail(email) {
    log('MODEL', 'findOne by email');
    return col.findOne({ email });
  }

  static async count(filter = {}) {
    log('MODEL', 'countDocuments');
    return col.countDocuments(filter);
  }

  static async aggregate(pipeline) {
    log('MODEL', 'aggregate');
    return col.aggregate(pipeline).toArray();
  }

  static async textSearch(q) {
    log('MODEL', 'textSearch');
    return col.find(
      { $text: { $search: q } },
      { projection: { name: 1, email: 1, group_name: 1, age: 1, course: 1, score: { $meta: 'textScore' } } }
    ).sort({ score: { $meta: 'textScore' } }).toArray();
  }

  static async create(data) {
    User.validate(data);
    log('MODEL', 'insertOne');
    const doc = { ...data, created_at: new Date() };
    const result = await col.insertOne(doc);
    return { _id: result.insertedId, ...doc };
  }

  static async update(id, data) {
    User.validate(data);
    const _id = User.toId(id);
    if (!_id) return null;
    log('MODEL', 'findOneAndUpdate');
    return col.findOneAndUpdate({ _id }, { $set: data }, { returnDocument: 'after' });
  }

  static async delete(id) {
    const _id = User.toId(id);
    if (!_id) return 0;
    log('MODEL', 'deleteOne');
    const result = await col.deleteOne({ _id });
    return result.deletedCount;
  }
}

module.exports = { User };