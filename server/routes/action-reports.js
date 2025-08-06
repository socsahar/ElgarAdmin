const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware: auth } = require('../middleware/auth');

// Get all action reports (for inspectors only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user has permission to view all reports
    if (!['פיקוד יחידה', 'מפתח', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { data: reports, error } = await supabaseAdmin
      .from('action_reports')
      .select(`
        *,
        event:event_id(
          id,
          title,
          full_address,
          created_at
        ),
        volunteer:volunteer_id(
          id,
          full_name,
          phone_number,
          role
        ),
        reviewed_by:reviewed_by_id(
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching action reports:', error);
      return res.status(500).json({ error: 'Failed to fetch action reports' });
    }

    res.json(reports || []);
  } catch (err) {
    console.error('Error in get action reports:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's reports
router.get('/my-reports', auth, async (req, res) => {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from('action_reports')
      .select(`
        *,
        event:event_id(
          id,
          title,
          full_address,
          created_at
        ),
        reviewed_by:reviewed_by_id(
          id,
          full_name
        )
      `)
      .eq('volunteer_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my action reports:', error);
      return res.status(500).json({ error: 'Failed to fetch action reports' });
    }

    res.json(reports || []);
  } catch (err) {
    console.error('Error in get my action reports:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get events assigned to current user that need reports
router.get('/assigned-events', auth, async (req, res) => {
  try {
    console.log('Getting assigned events for user:', req.user.id, req.user.username);
    
    // Get events where user is assigned
    const { data: assignedEvents, error } = await supabaseAdmin
      .from('event_volunteer_assignments')
      .select(`
        event_id(
          id,
          title,
          full_address,
          created_at,
          event_status,
          closure_reason
        )
      `)
      .eq('volunteer_id', req.user.id);

    if (error) {
      console.error('Error fetching assigned events:', error);
      return res.status(500).json({ error: 'Failed to fetch assigned events' });
    }

    console.log('Found assigned events:', assignedEvents?.length || 0);
    
    // For testing: Show ALL assigned events temporarily
    // Later we'll filter for events that actually need reports
    const events = assignedEvents?.map(a => a.event_id).filter(Boolean) || [];
    
    console.log('Events after filtering:', events.length);
    
    const eventsWithoutReports = [];
    for (const event of events) {
      console.log(`Checking event ${event.id} (${event.title}) - Status: ${event.event_status}`);
      
      const { data: existingReport, error: reportError } = await supabaseAdmin
        .from('action_reports')
        .select('id')
        .eq('event_id', event.id)
        .eq('volunteer_id', req.user.id)
        .single();

      if (reportError && reportError.code === 'PGRST116') {
        // No report exists, this event needs a report
        console.log(`Event ${event.id} needs a report`);
        eventsWithoutReports.push(event);
      } else if (existingReport) {
        console.log(`Event ${event.id} already has a report`);
      } else {
        console.log(`Error checking report for event ${event.id}:`, reportError);
      }
    }

    console.log('Final events without reports:', eventsWithoutReports.length);
    res.json(eventsWithoutReports);
  } catch (err) {
    console.error('Error in get assigned events:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new action report
router.post('/', auth, async (req, res) => {
  try {
    const {
      event_id,
      has_partner,
      partner_name,
      partner_id_number,
      partner_phone,
      volunteer_role,
      full_report,
      digital_signature,
      status = 'הוגש'
    } = req.body;

    // Validate required fields
    if (!event_id || !full_report || !digital_signature) {
      return res.status(400).json({ 
        error: 'נדרשים: event_id, full_report, digital_signature' 
      });
    }

    // Get event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get user details
    const { data: volunteer, error: volunteerError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (volunteerError || !volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Check if report already exists
    const { data: existingReport, error: checkError } = await supabaseAdmin
      .from('action_reports')
      .select('id')
      .eq('event_id', event_id)
      .eq('volunteer_id', req.user.id)
      .single();

    if (existingReport) {
      return res.status(400).json({ error: 'Report already exists for this event' });
    }

    const now = new Date();
    const reportData = {
      event_id,
      volunteer_id: req.user.id,
      report_date: now.toISOString().split('T')[0],
      report_time: now.toTimeString().split(' ')[0],
      event_date: event.created_at.split('T')[0],
      event_time: event.created_at.split('T')[1].split('.')[0],
      volunteer_id_number: volunteer.id_number || '',
      volunteer_full_name: volunteer.full_name || volunteer.username,
      event_address: event.full_address,
      volunteer_phone: volunteer.phone_number || '',
      volunteer_role: volunteer_role || volunteer.role,
      has_partner: has_partner || false,
      partner_name: has_partner ? partner_name : null,
      partner_id_number: has_partner ? partner_id_number : null,
      partner_phone: has_partner ? partner_phone : null,
      full_report,
      digital_signature,
      signature_timestamp: digital_signature ? now.toISOString() : null,
      status
    };

    const { data: newReport, error } = await supabaseAdmin
      .from('action_reports')
      .insert([reportData])
      .select()
      .single();

    if (error) {
      console.error('Error creating action report:', error);
      return res.status(500).json({ error: 'Failed to create action report' });
    }

    res.status(201).json({
      message: 'Action report created successfully',
      report: newReport
    });
  } catch (err) {
    console.error('Error in create action report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update action report
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      has_partner,
      partner_name,
      partner_id_number,
      partner_phone,
      volunteer_role,
      full_report,
      digital_signature,
      status = 'הוגש'
    } = req.body;

    // Get existing report
    const { data: existingReport, error: fetchError } = await supabaseAdmin
      .from('action_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user owns this report or has permission to edit
    const hasEditPermission = ['מפתח', 'אדמין', 'פיקוד יחידה', 'מפקד משל"ט'].includes(req.user.role);
    if (existingReport.volunteer_id !== req.user.id && !hasEditPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Only allow editing if status is 'טיוטה' or 'נדחה'
    if (!['טיוטה', 'נדחה'].includes(existingReport.status)) {
      return res.status(400).json({ error: 'Cannot edit report in current status' });
    }

    const now = new Date();
    const updateData = {
      has_partner: has_partner || false,
      partner_name: has_partner ? partner_name : null,
      partner_id_number: has_partner ? partner_id_number : null,
      partner_phone: has_partner ? partner_phone : null,
      volunteer_role,
      full_report,
      digital_signature,
      signature_timestamp: digital_signature ? now.toISOString() : null,
      status,
      updated_at: now.toISOString()
    };

    // If report was previously rejected and is being resubmitted, clear review fields
    if (existingReport.status === 'נדחה' && status === 'הוגש') {
      updateData.reviewed_by_id = null;
      updateData.reviewed_at = null;
      updateData.review_notes = null;
    }

    const { data: updatedReport, error } = await supabaseAdmin
      .from('action_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating action report:', error);
      return res.status(500).json({ error: 'Failed to update action report' });
    }

    res.json({
      message: 'Action report updated successfully',
      report: updatedReport
    });
  } catch (err) {
    console.error('Error in update action report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Review action report (approve/reject)
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, review_notes } = req.body;

    // Check if user has permission to review
    const hasReviewPermission = ['מפתח', 'אדמין', 'פיקוד יחידה', 'מפקד משל"ט'].includes(req.user.role);
    if (!hasReviewPermission) {
      return res.status(403).json({ error: 'Insufficient permissions to review reports' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
    }

    const status = action === 'approve' ? 'אושר' : 'נדחה';
    const now = new Date();

    const { data: updatedReport, error } = await supabaseAdmin
      .from('action_reports')
      .update({
        status,
        reviewed_by_id: req.user.id,
        reviewed_at: now.toISOString(),
        review_notes: review_notes || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error reviewing action report:', error);
      return res.status(500).json({ error: 'Failed to review action report' });
    }

    res.json({
      message: `Report ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      report: updatedReport
    });
  } catch (err) {
    console.error('Error in review action report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single action report
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: report, error } = await supabaseAdmin
      .from('action_reports')
      .select(`
        *,
        event:event_id(
          id,
          title,
          full_address,
          created_at
        ),
        volunteer:volunteer_id(
          id,
          full_name,
          phone_number,
          role
        ),
        reviewed_by:reviewed_by_id(
          id,
          full_name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user has permission to view this report
    if (report.volunteer_id !== req.user.id && 
        !['פיקוד יחידה', 'מפתח', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(report);
  } catch (err) {
    console.error('Error in get action report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate printable report
router.get('/:id/print', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: report, error } = await supabaseAdmin
      .from('action_reports')
      .select(`
        *,
        event:event_id(
          id,
          title,
          full_address,
          created_at
        ),
        volunteer:volunteer_id(
          id,
          full_name,
          phone_number,
          role
        ),
        reviewed_by:reviewed_by_id(
          id,
          full_name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user has permission to print this report
    const hasPrintPermission = ['מפתח', 'אדמין', 'פיקוד יחידה', 'מפקד משל"ט'].includes(req.user.role);
    if (report.volunteer_id !== req.user.id && !hasPrintPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Generate HTML for printing
    const html = generatePrintableHTML(report);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Error in print action report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to generate printable HTML
function generatePrintableHTML(report) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const formatTime = (timeString) => {
    return timeString ? timeString.substring(0, 5) : '';
  };

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>דוח פעולה - יחידת אלג"ר</title>
    <style>
        @page {
            margin: 20mm;
            size: A4;
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            direction: rtl;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 10px;
            display: block;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
        }
        .subtitle {
            font-size: 16px;
            color: #666;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .info-table td {
            padding: 8px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        .info-table .label {
            background-color: #f5f5f5;
            font-weight: bold;
            width: 30%;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0 10px;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
        }
        .report-content {
            border: 1px solid #ddd;
            padding: 15px;
            min-height: 200px;
            white-space: pre-wrap;
            background-color: #fafafa;
        }
        .signature-section {
            margin-top: 30px;
            text-align: center;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="/img/logo.png" alt="לוגו יחידת אלג'ר" class="logo" />
        <div class="title">יחידת אלג"ר</div>
        <div class="subtitle">האירגון הארצי למניעת גניבות רכבים</div>
        <div style="margin-top: 15px; font-size: 14px;">
            מספר עמוד: 580772119 (ע"ר)
        </div>
    </div>

    <div class="title" style="text-align: center; margin-bottom: 20px;">
        דוח פעולה
    </div>

    <div class="section-title">פרטי האירוע</div>
    <table class="info-table">
        <tr>
            <td class="label">תאריך האירוע</td>
            <td>${formatDate(report.event_date)}</td>
            <td class="label">שעת האירוע</td>
            <td>${formatTime(report.event_time)}</td>
        </tr>
        <tr>
            <td class="label">תאריך כתיבת הדוח</td>
            <td>${formatDate(report.report_date)}</td>
            <td class="label">שעת כתיבת הדוח</td>
            <td>${formatTime(report.report_time)}</td>
        </tr>
        <tr>
            <td class="label">מקום האירוע</td>
            <td colspan="3">${report.event_address}</td>
        </tr>
    </table>

    <div class="section-title">פרטי המדווח</div>
    <table class="info-table">
        <tr>
            <td class="label">שם מלא</td>
            <td>${report.volunteer_full_name}</td>
            <td class="label">תעודת זהות</td>
            <td>${report.volunteer_id_number}</td>
        </tr>
        <tr>
            <td class="label">טלפון</td>
            <td>${report.volunteer_phone}</td>
            <td class="label">יחידה</td>
            <td>יחידת אלג"ר</td>
        </tr>
        <tr>
            <td class="label">תפקיד</td>
            <td colspan="3">${report.volunteer_role}</td>
        </tr>
    </table>

    ${report.has_partner ? `
    <div class="section-title">פרטי השותף</div>
    <table class="info-table">
        <tr>
            <td class="label">שם מלא</td>
            <td>${report.partner_name || ''}</td>
            <td class="label">תעודת זהות</td>
            <td>${report.partner_id_number || ''}</td>
        </tr>
        <tr>
            <td class="label">טלפון</td>
            <td colspan="3">${report.partner_phone || ''}</td>
        </tr>
    </table>
    ` : ''}

    <div class="section-title">פירוט האירוע</div>
    <div class="report-content">${report.full_report}</div>

    <div class="signature-section">
        <p><strong>חתימה דיגיטלית:</strong> ${report.digital_signature ? '✓ חתום דיגיטלית' : '✗ לא חתום'}</p>
        ${report.signature_timestamp ? `<p><strong>תאריך חתימה:</strong> ${new Date(report.signature_timestamp).toLocaleString('he-IL')}</p>` : ''}
        ${report.reviewed_by ? `<p><strong>נבדק ואושר על ידי:</strong> ${report.reviewed_by.full_name}</p>` : ''}
        ${report.reviewed_at ? `<p><strong>תאריך אישור:</strong> ${new Date(report.reviewed_at).toLocaleString('he-IL')}</p>` : ''}
    </div>
</body>
</html>`;
}

module.exports = router;
