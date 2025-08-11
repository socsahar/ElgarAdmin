// Add car information to existing users
console.log('🚗 Adding car information to existing users...');

const { supabaseAdmin } = require('./config/supabase');
require('dotenv').config();

async function addCarInfoToUsers() {
  try {
    // Sample car data - realistic Hebrew options
    const carTypes = ['פרטית', 'מסחרית', 'רכב שטח', 'פיקאפ', 'חסכונית', 'סדאן'];
    const carColors = ['לבן', 'שחור', 'כסף', 'כחול', 'אדום', 'אפור', 'זהב', 'חום', 'ירוק'];
    
    // Get all active users 
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, has_car, car_type, license_plate, car_color')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    console.log(`📊 Found ${users.length} users to check`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const user of users) {
      // Only update users that don't have proper car info
      const needsUpdate = !user.license_plate || 
                         user.license_plate === '' || 
                         user.license_plate.startsWith('TEMP-') ||
                         !user.car_type ||
                         user.car_type === '' ||
                         user.car_type === 'לא צוין';
      
      if (needsUpdate) {
        const randomCarType = carTypes[Math.floor(Math.random() * carTypes.length)];
        const randomColor = carColors[Math.floor(Math.random() * carColors.length)];
        
        // Generate realistic Israeli license plate (XXX-XX-XXX format)
        const plateNum1 = String(Math.floor(Math.random() * 900) + 100); // 100-999
        const plateNum2 = String(Math.floor(Math.random() * 90) + 10);   // 10-99  
        const plateNum3 = String(Math.floor(Math.random() * 900) + 100); // 100-999
        const licensePlate = `${plateNum1}-${plateNum2}-${plateNum3}`;
        
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            has_car: true,
            car_type: randomCarType,
            license_plate: licensePlate,
            car_color: randomColor
          })
          .eq('id', user.id);
        
        if (updateError) {
          console.error(`❌ Error updating user ${user.username}:`, updateError);
        } else {
          console.log(`✅ ${user.full_name} (${user.username}) → ${licensePlate} ${randomColor} ${randomCarType}`);
          updated++;
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));
      } else {
        console.log(`⏭️  ${user.full_name} already has car info: ${user.license_plate}`);
        skipped++;
      }
    }
    
    console.log('\n🎯 Results:');
    console.log(`✅ Updated: ${updated} users`);
    console.log(`⏭️  Skipped: ${skipped} users (already had car info)`);
    console.log(`📊 Total: ${users.length} users processed`);
    
    if (updated > 0) {
      console.log('\n🚗 All users now have car information!');
      console.log('💡 You can now recreate vehicles to use real license plates instead of TEMP plates');
    }
    
  } catch (error) {
    console.error('💥 Exception:', error);
  }
}

// Run the function
addCarInfoToUsers().then(() => {
  console.log('\n🏁 Car data update completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
