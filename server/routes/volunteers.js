const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

// Get all volunteers (using users table with volunteer roles)
router.get('/', async (req, res) => {
  try {
    
    // First, let's see what users exist and their roles
    const { data: allUsers, error: allUsersError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, role, phone_number, is_active')
      .order('created_at', { ascending: false });
    
    // Now fetch volunteers with Hebrew roles only
    const { data: volunteers, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .in('role', [
        // Hebrew roles only (matching ENUM values)
        'סייר', 'מוקדן', 'מפקד משל"ט', 'פיקוד יחידה', 'אדמין', 'מפתח'
      ])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching volunteers:', error);
      return res.status(500).json({ error: 'Failed to fetch volunteers' });
    }

    // Remove password_hash from response
    const safeVolunteers = (volunteers || []).map(({ password_hash, ...volunteer }) => volunteer);

    res.json(safeVolunteers);
  } catch (err) {
    console.error('Error in get volunteers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single volunteer by ID
router.get('/:id', async (req, res) => {
  try {
    const { data: volunteer, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .in('role', ['VOLUNTEER', 'volunteer', 'UNIT_COMMANDER', 'unit_commander'])
      .single();

    if (error || !volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Remove password_hash from response
    const { password_hash, ...safeVolunteer } = volunteer;
    res.json(safeVolunteer);
  } catch (err) {
    console.error('Error in get volunteer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new volunteer (same as creating a user with volunteer role)
router.post('/', async (req, res) => {
  try {
    const { username, password, role = 'VOLUNTEER', is_active = true } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create volunteer user
    const { data: newVolunteer, error } = await supabaseAdmin
      .from('users')
      .insert([{
        username,
        password_hash,
        role: role.toUpperCase(),
        is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating volunteer:', error);
      return res.status(500).json({ error: 'Failed to create volunteer' });
    }

    // Remove password_hash from response
    const { password_hash: _, ...safeVolunteer } = newVolunteer;
    res.status(201).json(safeVolunteer);
  } catch (err) {
    console.error('Error in create volunteer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update volunteer
router.put('/:id', async (req, res) => {
  try {
    const { username, role, is_active, password } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (username !== undefined) updateData.username = username;
    if (role !== undefined) updateData.role = role.toUpperCase();
    if (is_active !== undefined) updateData.is_active = is_active;

    // Hash new password if provided
    if (password) {
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      updateData.password_hash = await bcrypt.hash(password, saltRounds);
    }

    const { data: updatedVolunteer, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .in('role', ['VOLUNTEER', 'volunteer', 'UNIT_COMMANDER', 'unit_commander'])
      .select()
      .single();

    if (error) {
      console.error('Error updating volunteer:', error);
      return res.status(500).json({ error: 'Failed to update volunteer' });
    }

    if (!updatedVolunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Remove password_hash from response
    const { password_hash: _, ...safeVolunteer } = updatedVolunteer;
    res.json(safeVolunteer);
  } catch (err) {
    console.error('Error in update volunteer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete volunteer
router.delete('/:id', async (req, res) => {
  try {
    const { data: deletedVolunteer, error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', req.params.id)
      .in('role', ['VOLUNTEER', 'volunteer', 'UNIT_COMMANDER', 'unit_commander'])
      .select()
      .single();

    if (error) {
      console.error('Error deleting volunteer:', error);
      return res.status(500).json({ error: 'Failed to delete volunteer' });
    }

    if (!deletedVolunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    res.json({ message: 'Volunteer deleted successfully' });
  } catch (err) {
    console.error('Error in delete volunteer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get volunteer statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { data: volunteers, error } = await supabaseAdmin
      .from('users')
      .select('role, is_active, created_at')
      .in('role', ['VOLUNTEER', 'volunteer', 'UNIT_COMMANDER', 'unit_commander']);

    if (error) {
      console.error('Error fetching volunteer stats:', error);
      return res.status(500).json({ error: 'Failed to fetch volunteer stats' });
    }

    const totalVolunteers = volunteers.length;
    const activeVolunteers = volunteers.filter(v => v.is_active).length;
    
    const volunteersByRole = volunteers.reduce((acc, volunteer) => {
      const role = volunteer.role || 'UNKNOWN';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const recentVolunteers = volunteers
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    res.json({
      totalVolunteers,
      activeVolunteers,
      inactiveVolunteers: totalVolunteers - activeVolunteers,
      volunteersByRole,
      recentVolunteers
    });
  } catch (err) {
    console.error('Error in get volunteer stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
