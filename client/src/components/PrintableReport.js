import React from 'react';
import { Box, Typography, Paper, Grid, Divider } from '@mui/material';

const PrintableReport = ({ report }) => {
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 4, 
        maxWidth: 'A4',
        mx: 'auto',
        backgroundColor: 'white',
        color: 'black',
        direction: 'rtl',
        '@media print': {
          boxShadow: 'none',
          p: 2,
        }
      }}
    >
      {/* Header with Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/img/logo.png" 
            alt="לוגו אלגר" 
            style={{ 
              height: '80px', 
              width: 'auto',
              marginLeft: '16px'
            }}
          />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              יחידת אלג"ר
            </Typography>
            <Typography variant="h6" color="text.secondary">
              דוח פעולה
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="body2" color="text.secondary">
            תאריך יצירת הדוח: {new Date().toLocaleDateString('he-IL')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            שעת יצירה: {new Date().toLocaleTimeString('he-IL')}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Report Information */}
      <Grid container spacing={3}>
        <Grid item xs={6}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
            פרטי הדוח
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">מספר דוח:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {report?.id || 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">תאריך האירוע:</Typography>
            <Typography variant="body1">
              {report?.eventDate || 'לא צוין'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">שעת האירוע:</Typography>
            <Typography variant="body1">
              {report?.eventTime || 'לא צוין'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">סטטוס:</Typography>
            <Typography variant="body1" sx={{ 
              color: report?.status === 'approved' ? 'success.main' : 
                     report?.status === 'pending' ? 'warning.main' : 'error.main'
            }}>
              {report?.status === 'approved' ? 'מאושר' : 
               report?.status === 'pending' ? 'ממתין לאישור' : 'נדחה'}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
            פרטי הכותב
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">שם מלא:</Typography>
            <Typography variant="body1">
              {report?.writerName || 'לא צוין'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">תעודת זהות:</Typography>
            <Typography variant="body1">
              {report?.writerId || 'לא צוין'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">תפקיד:</Typography>
            <Typography variant="body1">
              {report?.writerRole || 'לא צוין'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">יחידה:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              יחידת אלג"ר
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Event Location */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          מיקום האירוע
        </Typography>
        <Typography variant="body1">
          {report?.eventLocation || 'לא צוין'}
        </Typography>
      </Box>

      {/* Phone Number */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          מספר טלפון
        </Typography>
        <Typography variant="body1">
          {report?.phoneNumber || 'לא צוין'}
        </Typography>
      </Box>

      {/* Partner Information */}
      {report?.hasPartner && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
            פרטי שותף
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">שם השותף:</Typography>
              <Typography variant="body1">
                {report?.partnerName || 'לא צוין'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">תעודת זהות שותף:</Typography>
              <Typography variant="body1">
                {report?.partnerId || 'לא צוין'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Report Content */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
          תיאור מפורט של האירוע
        </Typography>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            backgroundColor: 'grey.50',
            minHeight: '150px',
            whiteSpace: 'pre-wrap'
          }}
        >
          <Typography variant="body1">
            {report?.reportContent || 'לא צוין תיאור לאירוע'}
          </Typography>
        </Paper>
      </Box>

      {/* Digital Signature */}
      <Box sx={{ 
        border: '1px solid', 
        borderColor: 'grey.300',
        p: 2, 
        backgroundColor: 'grey.50',
        textAlign: 'center'
      }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
          חתימה דיגיטלית
        </Typography>
        <Typography variant="body2">
          "בסימון על תיבה זו אני חותם דיגיטלית בשמי ומצהיר כי כל הכתוב בדוח נכון ואמת בלבד"
        </Typography>
        {report?.digitalSignature && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
              ✓ נחתם דיגיטלית על ידי: {report?.writerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              תאריך חתימה: {report?.signatureDate ? new Date(report.signatureDate).toLocaleDateString('he-IL') : 'לא זמין'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ 
        mt: 4, 
        pt: 2, 
        borderTop: '1px solid', 
        borderColor: 'grey.300',
        textAlign: 'center'
      }}>
        <Typography variant="body2" color="text.secondary">
          דוח זה הופק אוטומטית ממערכת ניהול אלג"ר
        </Typography>
        <Typography variant="body2" color="text.secondary">
          יחידת אלג"ר - מערכת חירום ומתנדבים
        </Typography>
      </Box>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            body { 
              font-family: 'Arial', sans-serif !important; 
              direction: rtl !important;
            }
            @page { 
              margin: 2cm; 
              size: A4;
            }
            .MuiPaper-root { 
              box-shadow: none !important; 
              padding: 0 !important;
            }
          }
        `}
      </style>
    </Paper>
  );
};

export default PrintableReport;
