// Simple database test endpoint
router.get('/test-database', auth, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 STARTING DATABASE TEST...');
    
    // Test 1: Count all users
    const { count: userCount, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    console.log('👥 Total users count:', userCount);
    if (countError) console.error('❌ Count error:', countError);

    // Test 2: Get first 3 users with full details
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, is_active, created_at')
      .limit(3);
      
    console.log('📋 First 3 users:', users);
    if (usersError) console.error('❌ Users error:', usersError);

    // Test 3: Check if a specific user exists by trying to get it directly
    if (users && users.length > 0) {
      const testUserId = users[0].id;
      console.log(`🔍 Testing specific user: ${testUserId}`);
      
      const { data: singleUser, error: singleError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();
        
      console.log('👤 Single user lookup result:', singleUser);
      if (singleError) console.error('❌ Single user error:', singleError);

      // Test 4: Try to create a test vehicle for this user
      console.log('🧪 Testing vehicle creation...');
      try {
        const { data: testVehicle, error: vehicleError } = await supabaseAdmin
          .from('vehicles')
          .insert({
            user_id: testUserId,
            license_plate: 'DIAGNOSE-TEST',
            brand: 'Test Brand',
            model: 'Test Model',
            year: 2023,
            status: 'active'
          })
          .select()
          .single();
          
        if (vehicleError) {
          console.error('❌ Test vehicle creation failed:', vehicleError);
        } else {
          console.log('✅ Test vehicle created successfully!', testVehicle);
          
          // Clean up - delete the test vehicle
          const { error: deleteError } = await supabaseAdmin
            .from('vehicles')
            .delete()
            .eq('id', testVehicle.id);
            
          if (deleteError) {
            console.error('⚠️ Failed to clean up test vehicle:', deleteError);
          } else {
            console.log('🧹 Test vehicle cleaned up');
          }
        }
      } catch (error) {
        console.error('❌ Vehicle test exception:', error);
      }
    }

    // Test 5: Check current database schema info
    console.log('🗄️ Checking database info...');
    const { data: dbInfo, error: dbError } = await supabaseAdmin
      .from('pg_stat_user_tables')
      .select('schemaname, relname, n_tup_ins, n_tup_upd, n_tup_del')
      .in('relname', ['users', 'vehicles']);
      
    console.log('📊 Database table stats:', dbInfo);
    if (dbError) console.error('❌ DB info error:', dbError);

    res.json({
      success: true,
      results: {
        userCount,
        sampleUsers: users,
        dbInfo,
        message: 'Database test completed - check server logs for details'
      }
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});
