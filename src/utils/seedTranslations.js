const systemTranslations = [
  // Navigation & Menu
  { key: 'nav.home', en: 'Home', ar: 'الرئيسية', category: 'navigation' },
  { key: 'nav.forum', en: 'Forum', ar: 'المنتدى', category: 'navigation' },
  { key: 'nav.opportunities', en: 'Opportunities', ar: 'الفرص', category: 'navigation' },
  { key: 'nav.resources', en: 'Resources', ar: 'الموارد', category: 'navigation' },
  { key: 'nav.sharezone', en: 'ShareZone', ar: 'منطقة المشاركة', category: 'navigation' },
  { key: 'nav.profile', en: 'Profile', ar: 'الملف الشخصي', category: 'navigation' },

  // Forum Categories
  { key: 'forum.mental-health', en: 'Mental Health', ar: 'الصحة النفسية', category: 'forum' },
  { key: 'forum.leadership', en: 'Leadership', ar: 'القيادة', category: 'forum' },
  { key: 'forum.education-study', en: 'Education & Study', ar: 'التعليم والدراسة', category: 'forum' },
  { key: 'forum.equality-rights', en: 'Equality & Rights', ar: 'المساواة والحقوق', category: 'forum' },
  { key: 'forum.career-skills', en: 'Career & Skills', ar: 'المهنة والمهارات', category: 'forum' },
  { key: 'forum.womens-health', en: 'Women\'s Health', ar: 'صحة المرأة', category: 'forum' },

  // ShareZone Categories
  { key: 'sharezone.essays', en: 'Essays', ar: 'المقالات', category: 'sharezone' },
  { key: 'sharezone.projects', en: 'Projects', ar: 'المشاريع', category: 'sharezone' },
  { key: 'sharezone.videos', en: 'Videos', ar: 'الفيديوهات', category: 'sharezone' },
  { key: 'sharezone.resumes', en: 'Resumes', ar: 'السير الذاتية', category: 'sharezone' },
  { key: 'sharezone.cover-letters', en: 'Cover Letters', ar: 'خطابات التغطية', category: 'sharezone' },

  // Opportunity Types
  { key: 'opportunity.internship', en: 'Internship', ar: 'تدريب', category: 'opportunities' },
  { key: 'opportunity.scholarship', en: 'Scholarship', ar: 'منحة دراسية', category: 'opportunities' },
  { key: 'opportunity.event', en: 'Event', ar: 'حدث', category: 'opportunities' },
  { key: 'opportunity.job', en: 'Job', ar: 'وظيفة', category: 'opportunities' },
  { key: 'opportunity.workshop', en: 'Workshop', ar: 'ورشة عمل', category: 'opportunities' },
  { key: 'opportunity.competition', en: 'Competition', ar: 'مسابقة', category: 'opportunities' },

  // Common Actions
  { key: 'action.save', en: 'Save', ar: 'حفظ', category: 'actions' },
  { key: 'action.cancel', en: 'Cancel', ar: 'إلغاء', category: 'actions' },
  { key: 'action.edit', en: 'Edit', ar: 'تعديل', category: 'actions' },
  { key: 'action.delete', en: 'Delete', ar: 'حذف', category: 'actions' },
  { key: 'action.submit', en: 'Submit', ar: 'إرسال', category: 'actions' },
  { key: 'action.search', en: 'Search', ar: 'بحث', category: 'actions' }
];

const seedTranslations = async (SystemTranslation) => {
  try {
    for (const translation of systemTranslations) {
      await SystemTranslation.findOrCreate({
        where: { key: translation.key },
        defaults: translation
      });
    }
    console.log(' System translations seeded successfully');
  } catch (error) {
    console.error(' Error seeding translations:', error);
  }
};

module.exports = { systemTranslations, seedTranslations };