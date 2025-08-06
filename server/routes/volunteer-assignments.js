const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware: auth } = require('../middleware/auth');

/**
 * @swagger
 * /api/volunteer-assignments/event/{eventId}:
 *   get:
 *     summary: Get all volunteer assignments for an event
 *     tags: [Volunteer Assignments]
 */
router.get('/event/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const { data: assignments, error } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        id,
        event_id,
        volunteer_id,
        assigned_by_id,
        assigned_at,
        status,
        notes,
        created_at,
        updated_at,
        volunteer:volunteer_id(
          id,
          username,
          full_name,
          phone_number,
          role,
          is_active,
          photo_url,
          id_number
        ),
        assigned_by:assigned_by_id(
          id,
          username,
          full_name
        )
      `)
      .eq('event_id', eventId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching event assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }

    res.json(assignments || []);
  } catch (err) {
    console.error('Error in get event assignments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/volunteer-assignments/volunteer/{volunteerId}:
 *   get:
 *     summary: Get all assignments for a volunteer
 *     tags: [Volunteer Assignments]
 */
router.get('/volunteer/:volunteerId', auth, async (req, res) => {
  try {
    const { volunteerId } = req.params;
    
    // Only log if this is a new request (not repeated within 5 seconds)
    const now = Date.now();
    const cacheKey = `volunteer_${volunteerId}`;
    if (!router.lastRequests) router.lastRequests = new Map();
    
    const lastRequest = router.lastRequests.get(cacheKey);
    const shouldLog = !lastRequest || (now - lastRequest) > 5000; // 5 seconds
    
    if (shouldLog) {
      console.log('GET /volunteer-assignments/volunteer/:volunteerId - Volunteer ID:', volunteerId);
      router.lastRequests.set(cacheKey, now);
      
      // Clean up old entries every 100 requests
      if (router.lastRequests.size > 100) {
        const cutoff = now - 60000; // 1 minute
        for (const [key, timestamp] of router.lastRequests.entries()) {
          if (timestamp < cutoff) {
            router.lastRequests.delete(key);
          }
        }
      }
    }
    
    const { data: assignments, error } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        id,
        event_id,
        volunteer_id,
        assigned_by_id,
        assigned_at,
        status,
        notes,
        created_at,
        updated_at,
        event:event_id(
          id,
          title,
          full_address,
          event_status,
          created_at
        ),
        assigned_by:assigned_by_id(
          id,
          username,
          full_name
        )
      `)
      .eq('volunteer_id', volunteerId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching volunteer assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }

    res.json(assignments || []);
  } catch (err) {
    console.error('Error in get volunteer assignments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/volunteer-assignments:
 *   post:
 *     summary: Assign volunteers to an event
 *     tags: [Volunteer Assignments]
 */
router.post('/', auth, async (req, res) => {
  try {
    const { event_id, volunteer_ids, notes } = req.body;
    const assigned_by_id = req.user.id;
    
    // Validate input
    if (!event_id || !volunteer_ids || !Array.isArray(volunteer_ids)) {
      return res.status(400).json({ error: 'event_id and volunteer_ids array are required' });
    }

    // Verify event exists and user has permission
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, created_by_id, title')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      console.error('Event not found:', eventError);
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user has permission (event creator, admin, developer, unit command, or controller commander, or dispatcher)
    const hasPermission = 
      event.created_by_id === assigned_by_id ||
      ['אדמין', 'admin', 'מפתח', 'פיקוד יחידה', 'מפקד משל"ט', 'מוקדן'].includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions to assign volunteers' });
    }

    // Create assignments
    const assignments = volunteer_ids.map(volunteer_id => ({
      event_id,
      volunteer_id,
      assigned_by_id,
      notes: notes || null,
      status: 'assigned'
    }));

    const { data: createdAssignments, error: assignmentError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .upsert(assignments, { 
        onConflict: 'event_id,volunteer_id',
        ignoreDuplicates: false 
      })
      .select(`
        id,
        event_id,
        volunteer_id,
        assigned_by_id,
        assigned_at,
        status,
        notes,
        volunteer:volunteer_id(
          id,
          username,
          full_name,
          phone_number,
          role,
          is_active,
          photo_url,
          id_number
        )
      `);

    if (assignmentError) {
      console.error('Error creating assignments:', assignmentError);
      return res.status(500).json({ error: 'Failed to create assignments' });
    }

    res.status(201).json({
      success: true,
      message: `Successfully assigned ${createdAssignments?.length || 0} volunteers`,
      assignments: createdAssignments
    });
  } catch (err) {
    console.error('Error in create assignments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/volunteer-assignments/{id}:
 *   put:
 *     summary: Update a volunteer assignment
 *     tags: [Volunteer Assignments]
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    console.log('PUT /volunteer-assignments/:id - Assignment ID:', id, 'Updates:', { status, notes });
    
    // Validate status if provided
    const validStatuses = ['assigned', 'accepted', 'declined', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Get current assignment to check permissions
    const { data: currentAssignment, error: fetchError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        id,
        event_id,
        volunteer_id,
        assigned_by_id,
        event:event_id(created_by_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentAssignment) {
      console.error('Assignment not found:', fetchError);
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check permissions
    const hasPermission = 
      currentAssignment.assigned_by_id === req.user.id ||
      currentAssignment.volunteer_id === req.user.id ||
      currentAssignment.event.created_by_id === req.user.id ||
      ['אדמין', 'admin', 'מפתח', 'פיקוד יחידה', 'מפקד משל"ט', 'מוקדן'].includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions to update this assignment' });
    }

    // Update assignment
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    updates.updated_at = new Date().toISOString();

    const { data: updatedAssignment, error: updateError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        event_id,
        volunteer_id,
        assigned_by_id,
        assigned_at,
        status,
        notes,
        created_at,
        updated_at,
        volunteer:volunteer_id(
          id,
          username,
          full_name,
          phone_number,
          role,
          is_active,
          photo_url,
          id_number
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating assignment:', updateError);
      return res.status(500).json({ error: 'Failed to update assignment' });
    }

    console.log('PUT /volunteer-assignments/:id - Success');
    res.json(updatedAssignment);
  } catch (err) {
    console.error('Error in update assignment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/volunteer-assignments/{id}:
 *   delete:
 *     summary: Remove a volunteer assignment
 *     tags: [Volunteer Assignments]
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('DELETE /volunteer-assignments/:id - Assignment ID:', id);
    
    // Get current assignment to check permissions
    const { data: currentAssignment, error: fetchError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        id,
        event_id,
        volunteer_id,
        assigned_by_id,
        event:event_id(created_by_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentAssignment) {
      console.error('Assignment not found:', fetchError);
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check permissions
    const hasPermission = 
      currentAssignment.assigned_by_id === req.user.id ||
      currentAssignment.event.created_by_id === req.user.id ||
      ['אדמין', 'admin', 'מפתח', 'פיקוד יחידה', 'מפקד משל"ט', 'מוקדן'].includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions to delete this assignment' });
    }

    // Delete assignment
    const { error: deleteError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting assignment:', deleteError);
      return res.status(500).json({ error: 'Failed to delete assignment' });
    }

    console.log('DELETE /volunteer-assignments/:id - Success');
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (err) {
    console.error('Error in delete assignment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/volunteer-assignments/user-summary:
 *   get:
 *     summary: Get user summary with events in date range
 *     tags: [Volunteer Assignments]
 */
router.get('/user-summary', auth, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get all events assigned to this user in the date range
    const { data: assignments, error } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        id,
        event_id,
        volunteer_id,
        assigned_by_id,
        assigned_at,
        status,
        notes,
        created_at,
        updated_at,
        event:event_id(
          id,
          title,
          full_address,
          license_plate,
          car_model,
          car_color,
          car_status,
          details,
          event_status,
          created_at,
          updated_at
        )
      `)
      .eq('volunteer_id', userId)
      .gte('assigned_at', startDate + 'T00:00:00.000Z')
      .lte('assigned_at', endDate + 'T23:59:59.999Z')
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user summary:', error);
      return res.status(500).json({ error: 'Failed to fetch user summary' });
    }

    // Transform the data to flatten event information
    const transformedData = assignments.map(assignment => ({
      ...assignment.event,
      assigned_at: assignment.assigned_at,
      assignment_status: assignment.status,
      assignment_notes: assignment.notes,
      assignment_id: assignment.id
    }));

    res.json(transformedData);
  } catch (error) {
    console.error('Error in user summary endpoint:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
