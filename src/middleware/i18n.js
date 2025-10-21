module.exports = (req, res, next) => {
  // Priority: query param > header > user profile > default
  req.lang =
    req.query.lang ||
    req.headers['accept-language']?.split(',')[0] ||
    (req.user && req.user.language) ||
    'en';
  next();
};
