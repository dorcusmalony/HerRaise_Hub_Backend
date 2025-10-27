// Real-world scholarship, internship, and conference examples
const sampleOpportunities = [
  // SCHOLARSHIPS
  {
    title: 'Mastercard Foundation Scholars Program 2024',
    organization: 'Mastercard Foundation',
    type: 'scholarship',
    description: 'Full scholarship for African students to pursue undergraduate and graduate studies at partner universities worldwide. Covers tuition, accommodation, books, and living expenses.',
    applicationLink: 'https://mastercardfdn.org/scholars/',
    applicationDeadline: new Date('2024-03-15'),
    location: 'Global',
    amount: '$50,000 per year',
    eligibility: 'African citizens, demonstrated financial need, academic excellence',
    requirements: ['Academic transcripts', 'Personal statement', 'Two recommendation letters', 'Proof of citizenship'],
    isFeatured: true,
    isActive: true,
    tags: ['full-scholarship', 'african-students', 'undergraduate', 'graduate']
  },
  {
    title: 'AAUW International Fellowships 2024',
    organization: 'American Association of University Women',
    type: 'scholarship', 
    description: 'Fellowships for women pursuing full-time graduate or postdoctoral study in the United States who are not U.S. citizens or permanent residents.',
    applicationLink: 'https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/international/',
    applicationDeadline: new Date('2024-12-01'),
    location: 'United States',
    amount: '$18,000 - $30,000',
    eligibility: 'Women, non-U.S. citizens, graduate/postdoctoral study',
    requirements: ['Application form', 'Academic records', 'Three references', 'English proficiency'],
    isFeatured: true,
    isActive: true,
    tags: ['women-only', 'graduate', 'postdoctoral', 'usa']
  },

  // INTERNSHIPS
  {
    title: 'UN Women Internship Programme 2024',
    organization: 'UN Women',
    type: 'internship',
    description: "Internship opportunities at UN Women headquarters and field offices worldwide. Gain experience in gender equality and women's empowerment programs.",
    applicationLink: 'https://www.unwomen.org/en/about-us/employment/internship-programme',
    applicationDeadline: new Date('2024-02-28'),
    location: 'Global (New York, Geneva, Regional Offices)',
    duration: '2-6 months',
    eligibility: 'Graduate students or recent graduates, fluency in English',
    requirements: ['CV', 'Cover letter', 'Academic transcripts', 'Two references'],
    isFeatured: true,
    isActive: true,
    tags: ['un-women', 'gender-equality', 'international', 'unpaid']
  },
  {
    title: 'World Bank Group Internship Program',
    organization: 'World Bank Group',
    type: 'internship',
    description: 'Summer internship program offering hands-on experience in development work. Open to students pursuing degrees in development-related fields.',
    applicationLink: 'https://www.worldbank.org/en/about/careers/programs-and-internships/internship',
    applicationDeadline: new Date('2024-01-31'),
    location: 'Washington DC, Country Offices',
    duration: '10-12 weeks (Summer)',
    stipend: '$1,500/month',
    eligibility: 'Graduate students, development-related studies',
    requirements: ['Online application', 'CV', 'Cover letter', 'Academic transcripts', 'Two references'],
    isFeatured: true,
    isActive: true,
    tags: ['world-bank', 'development', 'paid', 'summer']
  },

  // CONFERENCES & COMPETITIONS
  {
    title: 'TechWomen Program 2024',
    organization: 'U.S. Department of State',
    type: 'competition',
    description: 'Professional exchange program for emerging women leaders in STEM from Africa, Central Asia, and the Middle East to participate in mentorship and networking in Silicon Valley.',
    applicationLink: 'https://www.techwomen.org/',
    applicationDeadline: new Date('2024-02-15'),
    location: 'San Francisco Bay Area, USA',
    duration: '5 weeks',
    eligibility: 'Women in STEM, 2+ years experience, from eligible countries',
    requirements: ['Online application', 'CV', 'Essays', 'Two professional references', 'English proficiency'],
    isFeatured: true,
    isActive: true,
    tags: ['techwomen', 'stem', 'mentorship', 'usa', 'women-only']
  },
  {
    title: 'Mandela Washington Fellowship 2024',
    organization: 'U.S. Department of State',
    type: 'competition',
    description: 'Leadership program for young African leaders aged 25-35. Six-week academic and leadership institute in the United States followed by networking and professional development.',
    applicationLink: 'https://yali.state.gov/mwf/',
    applicationDeadline: new Date('2024-10-26'),
    location: 'United States (Various Universities)',
    duration: '6 weeks + follow-up',
    eligibility: 'African citizens, 25-35 years, demonstrated leadership',
    requirements: ['Online application', 'Essays', 'CV', 'Two references', 'English proficiency'],
    isFeatured: true,
    isActive: true,
    tags: ['mandela-washington', 'leadership', 'african-leaders', 'yali']
  }
];

module.exports = sampleOpportunities;