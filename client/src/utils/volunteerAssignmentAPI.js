import api from './api';

// Volunteer Assignment API functions
export const volunteerAssignmentAPI = {
  // Get assignments for an event
  getEventAssignments: async (eventId) => {
    const response = await api.get(`/api/volunteer-assignments/event/${eventId}`);
    return response.data;
  },

  // Get assignments for a volunteer
  getVolunteerAssignments: async (volunteerId) => {
    const response = await api.get(`/api/volunteer-assignments/volunteer/${volunteerId}`);
    return response.data;
  },

  // Assign volunteers to an event
  assignVolunteers: async (eventId, volunteerIds, notes = null) => {
    const response = await api.post('/api/volunteer-assignments', {
      event_id: eventId,
      volunteer_ids: volunteerIds,
      notes
    });
    return response.data;
  },

  // Update assignment status
  updateAssignment: async (assignmentId, updates) => {
    const response = await api.put(`/api/volunteer-assignments/${assignmentId}`, updates);
    return response.data;
  },

  // Remove assignment
  removeAssignment: async (assignmentId) => {
    const response = await api.delete(`/api/volunteer-assignments/${assignmentId}`);
    return response.data;
  }
};

export default volunteerAssignmentAPI;
