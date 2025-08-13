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
        response_type,
        departure_time,
        arrival_time,
        completion_time,
        departure_latitude,
        departure_longitude,
        arrival_latitude,
        arrival_longitude,
        completion_latitude,
        completion_longitude,
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

    // Transform the data to flatten event information and include tracking times
    const transformedData = assignments.map(assignment => ({
      ...assignment.event,
      assigned_at: assignment.assigned_at,
      assignment_status: assignment.status,
      assignment_notes: assignment.notes,
      assignment_id: assignment.id,
      response_type: assignment.response_type,
      departure_time: assignment.departure_time,
      arrival_time: assignment.arrival_time,
      completion_time: assignment.completion_time,
      departure_latitude: assignment.departure_latitude,
      departure_longitude: assignment.departure_longitude,
      arrival_latitude: assignment.arrival_latitude,
      arrival_longitude: assignment.arrival_longitude,
      completion_latitude: assignment.completion_latitude,
      completion_longitude: assignment.completion_longitude
    }));

    res.json(transformedData);
  } catch (error) {
    console.error('Error in user summary endpoint:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ***** TRACKING ROUTES ENABLED *****

/**
 * @swagger
 * /api/volunteer-assignments/{id}/tracking-status:
 *   put:
 *     summary: Update assignment tracking status (יציאה/מקום/סיום)
 *     tags: [Volunteer Assignments]
 */
router.put('/:id/tracking-status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, latitude, longitude, notes } = req.body;
    
    console.log('PUT /volunteer-assignments/:id/tracking-status - Assignment ID:', id, 'Status:', status);
    
    // Validate status
    const validTrackingStatuses = ['departure', 'arrived_at_scene', 'task_completed'];
    if (!status || !validTrackingStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validTrackingStatuses.join(', ')}` 
      });
    }

    // Get current assignment to check permissions
    const { data: currentAssignment, error: fetchError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        id,
        event_id,
        volunteer_id,
        assigned_by_id,
        response_type,
        departure_time,
        arrival_time,
        completion_time
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentAssignment) {
      console.error('Assignment not found:', fetchError);
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check permissions - only the assigned volunteer can update tracking status
    if (currentAssignment.volunteer_id !== req.user.id) {
      return res.status(403).json({ 
        error: 'Only the assigned volunteer can update tracking status' 
      });
    }

    // Prepare update data
    const updates = {
      response_type: status,
      updated_at: new Date().toISOString()
    };

    // Add timestamp based on status
    const currentTime = new Date().toISOString();
    switch (status) {
      case 'departure':
        if (currentAssignment.departure_time) {
          return res.status(400).json({ error: 'Departure already recorded' });
        }
        updates.departure_time = currentTime;
        break;
      case 'arrived_at_scene':
        if (!currentAssignment.departure_time) {
          return res.status(400).json({ error: 'Must record departure before arrival' });
        }
        if (currentAssignment.arrival_time) {
          return res.status(400).json({ error: 'Arrival already recorded' });
        }
        updates.arrival_time = currentTime;
        break;
      case 'task_completed':
        if (!currentAssignment.arrival_time) {
          return res.status(400).json({ error: 'Must record arrival before completion' });
        }
        if (currentAssignment.completion_time) {
          return res.status(400).json({ error: 'Completion already recorded' });
        }
        updates.completion_time = currentTime;
        break;
    }

    // Add GPS coordinates if provided
    if (latitude && longitude) {
      // Validate coordinates
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Invalid GPS coordinates' });
      }

      switch (status) {
        case 'departure':
          updates.departure_latitude = lat;
          updates.departure_longitude = lng;
          break;
        case 'arrived_at_scene':
          updates.arrival_latitude = lat;
          updates.arrival_longitude = lng;
          break;
        case 'task_completed':
          updates.completion_latitude = lat;
          updates.completion_longitude = lng;
          break;
      }
    }

    // Add notes if provided
    if (notes) {
      const currentNotes = currentAssignment.notes || '';
      const timestamp = new Date().toLocaleString('he-IL');
      const newNote = `[${timestamp}] ${status}: ${notes}`;
      updates.notes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;
    }

    // Update the assignment
    const { data: updatedAssignment, error: updateError } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .update(updates)
      .eq('id', id)
      .select(`
        id,
        event_id,
        volunteer_id,
        response_type,
        departure_time,
        arrival_time,
        completion_time,
        departure_latitude,
        departure_longitude,
        arrival_latitude,
        arrival_longitude,
        completion_latitude,
        completion_longitude,
        notes,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('Error updating tracking status:', updateError);
      return res.status(500).json({ error: 'Failed to update tracking status' });
    }

    console.log('PUT /volunteer-assignments/:id/tracking-status - Success');
    res.json({
      success: true,
      message: `Status updated to ${status}`,
      assignment: updatedAssignment
    });
  } catch (err) {
    console.error('Error in update tracking status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/volunteer-assignments/{id}/tracking-info:
 *   get:
 *     summary: Get tracking information for an assignment
 *     tags: [Volunteer Assignments]
 */
router.get('/:id/tracking-info', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('GET /volunteer-assignments/:id/tracking-info - Assignment ID:', id);
    
    const { data: assignment, error } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        id,
        event_id,
        volunteer_id,
        response_type,
        departure_time,
        arrival_time,
        completion_time,
        departure_latitude,
        departure_longitude,
        arrival_latitude,
        arrival_longitude,
        completion_latitude,
        completion_longitude,
        notes,
        volunteer:volunteer_id(
          id,
          username,
          full_name,
          phone_number
        ),
        event:event_id(
          id,
          title,
          full_address
        )
      `)
      .eq('id', id)
      .single();

    if (error || !assignment) {
      console.error('Assignment not found:', error);
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check permissions - volunteers can only see their own, specific command roles can see all
    const allowedCommandRoles = ['מוקדן', 'מפקד משל"ט', 'פיקוד יחידה', 'אדמין', 'מפתח'];
    const hasPermission = 
      assignment.volunteer_id === req.user.id ||
      allowedCommandRoles.includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Calculate response times if available
    const trackingInfo = {
      ...assignment,
      response_times: {}
    };

    if (assignment.departure_time && assignment.arrival_time) {
      const departureTime = new Date(assignment.departure_time);
      const arrivalTime = new Date(assignment.arrival_time);
      trackingInfo.response_times.travel_time_minutes = 
        Math.round((arrivalTime - departureTime) / (1000 * 60));
    }

    if (assignment.arrival_time && assignment.completion_time) {
      const arrivalTime = new Date(assignment.arrival_time);
      const completionTime = new Date(assignment.completion_time);
      trackingInfo.response_times.on_scene_time_minutes = 
        Math.round((completionTime - arrivalTime) / (1000 * 60));
    }

    if (assignment.departure_time && assignment.completion_time) {
      const departureTime = new Date(assignment.departure_time);
      const completionTime = new Date(assignment.completion_time);
      trackingInfo.response_times.total_response_time_minutes = 
        Math.round((completionTime - departureTime) / (1000 * 60));
    }

    res.json(trackingInfo);
  } catch (err) {
    console.error('Error in get tracking info:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/volunteer-assignments/active-tracking:
 *   get:
 *     summary: Get all assignments with active tracking for live map
 *     tags: [Volunteer Assignments]
 */
router.get('/active-tracking', auth, async (req, res) => {
  try {
    console.log('GET /volunteer-assignments/active-tracking');
    
    // Only allow specific command and control roles to see active tracking
    const allowedRoles = ['מוקדן', 'מפקד משל"ט', 'פיקוד יחידה', 'אדמין', 'מפתח'];
    const hasPermission = allowedRoles.includes(req.user.role);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `מעקב חי זמין רק עבור: ${allowedRoles.join(', ')}`
      });
    }

    // Get assignments that are actively being tracked (have departure but not completion)
    const { data: assignments, error } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        id,
        event_id,
        volunteer_id,
        response_type,
        departure_time,
        arrival_time,
        completion_time,
        departure_latitude,
        departure_longitude,
        arrival_latitude,
        arrival_longitude,
        completion_latitude,
        completion_longitude,
        updated_at,
        volunteer:volunteer_id(
          id,
          username,
          full_name,
          phone_number,
          photo_url
        ),
        event:event_id(
          id,
          title,
          full_address,
          event_status,
          created_at
        )
      `)
      .not('departure_time', 'is', null)
      .is('completion_time', null)
      .order('departure_time', { ascending: false });

    if (error) {
      console.error('Error fetching active tracking:', error);
      return res.status(500).json({ error: 'Failed to fetch active tracking' });
    }

    // Format data for live map display
    const activeTracking = assignments.map(assignment => {
      const trackingData = {
        assignment_id: assignment.id,
        event: assignment.event,
        event_status: assignment.event?.event_status,
        volunteer: assignment.volunteer,
        volunteer_id: assignment.volunteer_id,
        volunteer_name: assignment.volunteer?.full_name || assignment.volunteer?.username,
        volunteer_role: assignment.volunteer?.role,
        volunteer_photo_url: assignment.volunteer?.photo_url,
        event_title: assignment.event?.title,
        event_address: assignment.event?.full_address,
        status: assignment.response_type,
        departure_time: assignment.departure_time,
        arrival_time: assignment.arrival_time,
        last_update: assignment.updated_at,
        locations: []
      };

      // Add current location coordinates for map display
      if (assignment.arrival_latitude && assignment.arrival_longitude) {
        // If they've arrived, use arrival coordinates as current position
        trackingData.current_latitude = assignment.arrival_latitude;
        trackingData.current_longitude = assignment.arrival_longitude;
      } else if (assignment.departure_latitude && assignment.departure_longitude) {
        // If only departed, use departure coordinates as current position
        trackingData.current_latitude = assignment.departure_latitude;
        trackingData.current_longitude = assignment.departure_longitude;
      }

      // Add location points
      if (assignment.departure_latitude && assignment.departure_longitude) {
        trackingData.locations.push({
          type: 'departure',
          latitude: assignment.departure_latitude,
          longitude: assignment.departure_longitude,
          timestamp: assignment.departure_time
        });
      }

      if (assignment.arrival_latitude && assignment.arrival_longitude) {
        trackingData.locations.push({
          type: 'arrival',
          latitude: assignment.arrival_latitude,
          longitude: assignment.arrival_longitude,
          timestamp: assignment.arrival_time
        });
      }

      return trackingData;
    });

    res.json(activeTracking);
  } catch (err) {
    console.error('Error in get active tracking:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/volunteer-assignments/analytics:
 *   get:
 *     summary: Get tracking analytics including average response times
 *     tags: [Volunteer Assignments]
 */
router.get('/analytics', auth, async (req, res) => {
  try {
    console.log('GET /volunteer-assignments/analytics');
    
    // Only allow specific command and control roles to see analytics
    const allowedRoles = ['מוקדן', 'מפקד משל"ט', 'פיקוד יחידה', 'אדמין', 'מפתח'];
    const hasPermission = allowedRoles.includes(req.user.role);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `אנליטיקת מעקב זמינה רק עבור: ${allowedRoles.join(', ')}`
      });
    }

    // Get all assignments with tracking data from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: assignments, error } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        id,
        event_id,
        volunteer_id,
        assigned_at,
        departure_time,
        arrival_time,
        completion_time,
        departure_latitude,
        departure_longitude,
        arrival_latitude,
        arrival_longitude,
        completion_latitude,
        completion_longitude,
        response_type,
        volunteer:volunteer_id(
          id,
          username,
          full_name,
          phone_number
        ),
        event:event_id(
          id,
          title,
          full_address,
          created_at
        )
      `)
      .gte('assigned_at', thirtyDaysAgo.toISOString())
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch analytics data' });
    }

    // Calculate analytics
    const analytics = {
      totalAssignments: assignments.length,
      activeAssignments: assignments.filter(a => a.departure_time && !a.completion_time).length,
      completedAssignments: assignments.filter(a => a.completion_time).length,
      averageResponseTime: 0,
      averageTravelTime: 0,
      averageOnSceneTime: 0,
      responseTimes: [],
      recentCompletions: [],
      activeTracking: []
    };

    // Calculate response times for completed assignments
    const responseTimes = [];
    const travelTimes = [];
    const onSceneTimes = [];

    assignments.forEach(assignment => {
      // Response time: from assigned to departure
      if (assignment.assigned_at && assignment.departure_time) {
        const assignedTime = new Date(assignment.assigned_at);
        const departureTime = new Date(assignment.departure_time);
        const responseMinutes = Math.round((departureTime - assignedTime) / (1000 * 60));
        if (responseMinutes >= 0 && responseMinutes <= 300) { // Reasonable range (0-5 hours)
          responseTimes.push(responseMinutes);
        }
      }

      // Travel time: from departure to arrival
      if (assignment.departure_time && assignment.arrival_time) {
        const departureTime = new Date(assignment.departure_time);
        const arrivalTime = new Date(assignment.arrival_time);
        const travelMinutes = Math.round((arrivalTime - departureTime) / (1000 * 60));
        if (travelMinutes >= 0 && travelMinutes <= 180) { // Reasonable range (0-3 hours)
          travelTimes.push(travelMinutes);
        }
      }

      // On-scene time: from arrival to completion
      if (assignment.arrival_time && assignment.completion_time) {
        const arrivalTime = new Date(assignment.arrival_time);
        const completionTime = new Date(assignment.completion_time);
        const onSceneMinutes = Math.round((completionTime - arrivalTime) / (1000 * 60));
        if (onSceneMinutes >= 0 && onSceneMinutes <= 480) { // Reasonable range (0-8 hours)
          onSceneTimes.push(onSceneMinutes);
        }
      }
    });

    // Calculate averages
    analytics.averageResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
      : 0;

    analytics.averageTravelTime = travelTimes.length > 0
      ? Math.round(travelTimes.reduce((sum, time) => sum + time, 0) / travelTimes.length)
      : 0;

    analytics.averageOnSceneTime = onSceneTimes.length > 0
      ? Math.round(onSceneTimes.reduce((sum, time) => sum + time, 0) / onSceneTimes.length)
      : 0;

    // Recent completions (last 10)
    analytics.recentCompletions = assignments
      .filter(a => a.completion_time)
      .slice(0, 10)
      .map(assignment => ({
        id: assignment.id,
        volunteerName: assignment.volunteer?.full_name || assignment.volunteer?.username || 'משתמש לא ידוע',
        eventTitle: assignment.event?.title || 'אירוע לא ידוע',
        completedAt: assignment.completion_time,
        responseTime: assignment.assigned_at && assignment.departure_time 
          ? Math.round((new Date(assignment.departure_time) - new Date(assignment.assigned_at)) / (1000 * 60))
          : null
      }));

    // Active tracking (assignments with departure but no completion)
    analytics.activeTracking = assignments
      .filter(a => a.departure_time && !a.completion_time)
      .map(assignment => ({
        id: assignment.id,
        volunteerName: assignment.volunteer?.full_name || assignment.volunteer?.username || 'משתמש לא ידוע',
        eventTitle: assignment.event?.title || 'אירוע לא ידוע',
        status: assignment.response_type || 'departure',
        departureTime: assignment.departure_time,
        arrivalTime: assignment.arrival_time,
        currentLocation: {
          latitude: assignment.arrival_latitude || assignment.departure_latitude,
          longitude: assignment.arrival_longitude || assignment.departure_longitude
        }
      }));

    console.log('Analytics calculated:', {
      totalAssignments: analytics.totalAssignments,
      averageResponseTime: analytics.averageResponseTime,
      activeTracking: analytics.activeTracking.length
    });

    res.json(analytics);
  } catch (err) {
    console.error('Error in get analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
