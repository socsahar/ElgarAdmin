require('dotenv').config();
const { supabase } = require('./config/supabase');

(async () => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id_number, photo_url')
      .not('photo_url', 'is', null);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Current photo URLs in database:');
    users.forEach(u => console.log(`${u.id_number}: ${u.photo_url}`));
    
    // Find users with just filenames (not full URLs)
    const problematicUsers = users.filter(u => 
      u.photo_url && 
      !u.photo_url.startsWith('http') && 
      !u.photo_url.includes('supabase.co')
    );
    
    if (problematicUsers.length > 0) {
      console.log('\n❌ Users with filename-only photo URLs:');
      problematicUsers.forEach(u => console.log(`${u.id_number}: ${u.photo_url}`));
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
})();
