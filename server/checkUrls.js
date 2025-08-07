require('dotenv').config();
const { supabase } = require('./config/supabase');

(async () => {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id_number, photo_url')
      .not('photo_url', 'is', null);
    
    console.log('📸 Current photo URLs in database:');
    users.forEach(u => {
      console.log(`${u.id_number}: ${u.photo_url}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
})();
