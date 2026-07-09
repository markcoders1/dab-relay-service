function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateBody(req, res, next) {
  if (req.method !== 'POST') {
    return next();
  }

  const path = req.path;

  if (path === '/api/insights') {
    if (!isNonEmptyString(req.body?.user_id)) {
      req.log?.warn({ path, reason: 'missing_user_id' }, 'Request validation failed');
      return res.status(400).json({ error: 'user_id is required and must be a non-empty string' });
    }
    req.userId = req.body.user_id;
    return next();
  }

  if (path === '/api/goals') {
    if (!isNonEmptyString(req.body?.user_id)) {
      req.log?.warn({ path, reason: 'missing_user_id' }, 'Request validation failed');
      return res.status(400).json({ error: 'user_id is required and must be a non-empty string' });
    }
    if (!req.body?.saved_goals || typeof req.body.saved_goals !== 'object' || Array.isArray(req.body.saved_goals)) {
      req.log?.warn({ path, reason: 'missing_saved_goals' }, 'Request validation failed');
      return res.status(400).json({ error: 'saved_goals is required and must be an object' });
    }
    req.userId = req.body.user_id;
    return next();
  }

  if (req.body?.user_id) {
    req.userId = req.body.user_id;
  }

  next();
}

module.exports = validateBody;
