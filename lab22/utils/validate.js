'use strict';
const GROUP_RE = /^ББМО-\d{2}-\d{2}$/;

class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.code = 'VALIDATION_ERROR';
    this.status = 400;
    this.details = details;
  }
}

function validateStudent(data, partial = false) {
  const errors = [];

  if (!partial || data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push('name обязательно');
    } else {
      const n = data.name.trim().length;
      if (n < 2) errors.push('name слишком короткое (мин. 2 символа)');
      if (n > 100) errors.push('name слишком длинное (макс. 100 символов)');
    }
  }

  if (!partial || data.group_name !== undefined) {
    if (typeof data.group_name !== 'string' || data.group_name === '') {
      errors.push('group_name обязательно');
    } else if (!GROUP_RE.test(data.group_name)) {
      errors.push('group_name не соответствует формату ББМО-XX-XX');
    }
  }

  if (!partial || data.course !== undefined) {
    if (!Number.isInteger(data.course) || data.course < 1 || data.course > 4) {
      errors.push('course должно быть целым от 1 до 4');
    }
  }

  if (data.grade !== undefined && data.grade !== null) {
    const g = Number(data.grade);
    if (Number.isNaN(g) || g < 0 || g > 5) {
      errors.push('grade должно быть от 0 до 5 или NULL');
    }
  }

  if (errors.length) throw new ValidationError(errors[0], errors);
}

function validateGroup(data) {
  const errors = [];
  if (typeof data.code !== 'string' || !GROUP_RE.test(data.code)) {
    errors.push('code не соответствует формату ББМО-XX-XX');
  }
  if (typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('name обязательно (мин. 2 символа)');
  }
  if (errors.length) throw new ValidationError(errors[0], errors);
}

module.exports = { validateStudent, validateGroup, ValidationError };