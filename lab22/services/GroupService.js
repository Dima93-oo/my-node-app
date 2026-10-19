'use strict';
const M = require('../models/GroupModel');
const { validateGroup } = require('../utils/validate');

async function create(db, data) { validateGroup(data); return M.create(db, data); }
async function list(db) { return M.findAll(db); }
async function students(db, id) { return M.studentsOf(db, Number(id)); }

module.exports = { create, list, students };