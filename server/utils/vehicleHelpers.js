const { supabaseAdmin } = require('../config/supabase');

/**
 * Create a vehicle entry for a user using the current flat schema
 * @param {Object} userData - User data including car information
 * @param {string} userId - The user's ID
 * @returns {Object} Created vehicle data or null if no car
 */
async function createUserVehicle(userData, userId) {
  // Since users may not have car information in the database,
  // we'll create a placeholder vehicle record that can be updated later
  try {
    // Check if user has proper car information
    if (!userData.license_plate || !userData.car_type || !userData.car_color) {
      console.log(`⚠️ User ${userData.username || userData.full_name} missing required car information`);
      return null;
    }

    // Check if vehicle already exists for this user or license plate
    const { data: existingVehicle, error: checkError } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate')
      .or(`user_id.eq.${userId},license_plate.eq.${userData.license_plate}`)
      .single();

    if (existingVehicle) {
      console.log(`⚠️ Vehicle already exists for user ${userData.username || userData.full_name} or license plate ${userData.license_plate}`);
      return existingVehicle;
    }

    console.log(`🚗 Creating vehicle for user ${userData.username || userData.full_name} with ID: ${userId}`);
    
    // Create vehicle record using user's actual car information
    const vehicleData = {
      license_plate: userData.license_plate, // Use actual license plate from user
      vehicle_type: userData.car_type,
      vehicle_model: 'לא צוין', // Can be updated later
      vehicle_color: userData.car_color,
      owner_name: userData.full_name || userData.username,
      owner_address: 'לא צוין', // Required field - can be updated later
      owner_phone: userData.phone_number || '050-0000000',
      vehicle_image_url: null, // Can be updated later
      owner_image_url: userData.photo_url || null, // Use user's profile photo
      user_id: userId, // Link to user
      created_by_id: userId
    };

    console.log(`📝 Inserting vehicle data:`, vehicleData);

    // Remove user_id to avoid foreign key constraint issues for now
    const { user_id, ...vehicleDataWithoutUserId } = vehicleData;

    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .insert(vehicleDataWithoutUserId)
      .select()
      .single();

    if (vehicleError) {
      console.error('Error creating vehicle:', vehicleError);
      throw vehicleError;
    }

    console.log(`✅ Created vehicle ${vehicle.license_plate} for user ${userData.full_name || userData.username}`);
    return vehicle;

  } catch (error) {
    console.error('Error in createUserVehicle:', error);
    throw error;
  }
}

/**
 * Update user vehicle when user information is updated using flat schema
 * @param {Object} userData - Updated user data
 * @param {string} userId - The user's ID
 * @returns {Object} Updated vehicle data or null
 */
async function updateUserVehicle(userData, userId) {
  try {
    // Find existing vehicle for this user
    const { data: existingVehicles, error: findError } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('user_id', userId);

    if (findError) {
      console.error('Error finding user vehicles:', findError);
      return null;
    }

    // If user no longer has a car, we DON'T delete the vehicle (per requirements)
    // Check for both old field names (has_car) and new field names
    const hasCarInfo = (userData.has_car && userData.car_type && userData.license_plate && userData.car_color) ||
                       (userData.car_model && userData.license_plate && userData.car_color);
    
    if (!hasCarInfo) {
      console.log(`ℹ️ User ${userData.full_name} no longer has complete car information, but keeping existing vehicle records`);
      return null;
    }

    // If user has a car but no existing vehicle, create one
    if (!existingVehicles || existingVehicles.length === 0) {
      return await createUserVehicle(userData, userId);
    }

    // Update existing vehicle information using correct schema
    const vehicle = existingVehicles[0]; // Update the first vehicle (primary vehicle)

    const vehicleUpdateData = {
      license_plate: userData.license_plate,
      vehicle_type: userData.car_type || vehicle.vehicle_type,
      vehicle_model: userData.car_model || vehicle.vehicle_model, 
      vehicle_color: userData.car_color,
      owner_name: userData.full_name,
      owner_phone: userData.phone_number,
      owner_image_url: userData.photo_url,
      updated_by_id: userId,
      updated_at: new Date().toISOString()
    };

    const { data: updatedVehicle, error: updateError } = await supabaseAdmin
      .from('vehicles')
      .update(vehicleUpdateData)
      .eq('id', vehicle.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating vehicle:', updateError);
      throw updateError;
    }

    console.log(`✅ Updated vehicle ${updatedVehicle.license_plate} for user ${userData.full_name}`);
    return updatedVehicle;

  } catch (error) {
    console.error('Error in updateUserVehicle:', error);
    throw error;
  }
}

module.exports = {
  createUserVehicle,
  updateUserVehicle
};
