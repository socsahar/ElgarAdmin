const { supabaseAdmin } = require('../config/supabase');

/**
 * Create a vehicle entry for a user using the current flat schema
 * @param {Object} userData - User data including car information
 * @param {string} userId - The user's ID
 * @returns {Object} Created vehicle data or null if no car
 */
async function createUserVehicle(userData, userId) {
  // Only create vehicle if user has a car
  if (!userData.has_car || !userData.car_type || !userData.license_plate || !userData.car_color) {
    return null;
  }

  try {
    // Create the vehicle record directly with flat schema
    const vehicleData = {
      license_plate: userData.license_plate,
      vehicle_type: userData.car_type,
      vehicle_model: userData.car_type, // Using car_type as model for now
      vehicle_color: userData.car_color,
      owner_name: userData.full_name,
      owner_address: '', // Could be added to user schema later
      owner_phone: userData.phone_number,
      vehicle_image_url: null, // To be uploaded separately
      owner_image_url: userData.photo_url,
      user_id: userId, // Link to the system user
      created_by_id: userId,
      updated_by_id: userId
    };

    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .insert(vehicleData)
      .select()
      .single();

    if (vehicleError) {
      console.error('Error creating vehicle:', vehicleError);
      throw vehicleError;
    }

    console.log(`✅ Created vehicle ${vehicle.license_plate} for user ${userData.full_name}`);
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
    if (!userData.has_car) {
      console.log(`ℹ️ User ${userData.full_name} no longer has a car, but keeping existing vehicle records`);
      return null;
    }

    // If user has a car but no existing vehicle, create one
    if (!existingVehicles || existingVehicles.length === 0) {
      return await createUserVehicle(userData, userId);
    }

    // Update existing vehicle information
    const vehicle = existingVehicles[0]; // Update the first vehicle (primary vehicle)

    const vehicleUpdateData = {
      license_plate: userData.license_plate,
      vehicle_type: userData.car_type,
      vehicle_model: userData.car_type,
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
