const express = require('express');
const router = express.Router();

// Get available languages
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    languages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
    ],
    currentLanguage: req.query.lang || 'en'
  });
});

// Get translations for specific language
router.get('/translations/:lang', (req, res) => {
  const { lang } = req.params;
  const supportedLangs = ['en', 'ar'];
  
  if (!supportedLangs.includes(lang)) {
    return res.status(400).json({
      success: false,
      message: 'Unsupported language'
    });
  }

  try {
    const translations = require(`../locales/${lang}.json`);
    res.json({
      success: true,
      language: lang,
      translations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Translation file not found'
    });
  }
});

module.exports = router;