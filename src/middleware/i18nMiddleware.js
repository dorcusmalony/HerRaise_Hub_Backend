const i18n = require('../config/i18n');

const i18nMiddleware = (req, res, next) => {
  // Set locale from query parameter, header, or default
  const locale = req.query.lang || req.headers['accept-language'] || 'en';
  
  // Validate locale
  const supportedLocales = ['en', 'ar'];
  const selectedLocale = supportedLocales.includes(locale) ? locale : 'en';
  
  i18n.setLocale(req, selectedLocale);
  
  // Add translation function to request
  req.t = (key, params) => i18n.__(key, params);
  
  next();
};

module.exports = i18nMiddleware;