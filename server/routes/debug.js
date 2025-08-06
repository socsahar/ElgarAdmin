const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authMiddleware: auth } = require('../middleware/auth');

/**
 * Debug endpoint to check user data
 * GET /api/debug/users
 */
router.get('/users', auth, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, full_name, id_number, photo_url, role')
      .limit(10);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
