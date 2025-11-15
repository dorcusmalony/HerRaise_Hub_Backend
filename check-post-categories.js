const { connectDB } = require('./src/config/database');

async function checkPostCategories() {
  try {
    await connectDB();
    const { models } = require('./src/config/database');
    
    // Get all posts with their categories
    const posts = await models.ForumPost.findAll({
      attributes: ['id', 'title', 'category', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`\n📊 Found ${posts.length} forum posts:`);
    console.log('='.repeat(50));
    
    const categoryCount = {};
    
    posts.forEach((post, index) => {
      const category = post.category || 'NULL';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
      
      console.log(`${index + 1}. ${post.title.substring(0, 40)}...`);
      console.log(`   Category: ${category}`);
      console.log(`   Created: ${post.createdAt}`);
      console.log('');
    });
    
    console.log('\n📈 Category Distribution:');
    console.log('='.repeat(30));
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`${category}: ${count} posts`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPostCategories();