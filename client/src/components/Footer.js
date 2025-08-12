import React from 'react';
import { Box, Typography, useTheme, useMediaQuery, Divider } from '@mui/material';
import { Copyright as CopyrightIcon } from '@mui/icons-material';

const Footer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        pt: 3,
        pb: 2,
        px: isMobile ? 2 : 4,
        backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
        borderTop: `1px solid ${theme.palette.divider}`,
        direction: 'rtl',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)`,
        }
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          textAlign: 'center',
        }}
      >
        {/* Main copyright text */}
        <Typography
          variant={isMobile ? "body2" : "body1"}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.5,
            mb: 1,
          }}
        >
          <CopyrightIcon 
            sx={{ 
              fontSize: isMobile ? 18 : 20, 
              color: 'primary.main',
            }} 
          />
          מערכת זו נבנתה ונכתבה על ידי סהר מלול - כל הזכויות שמורות
        </Typography>
        
        <Divider 
          sx={{ 
            my: 1.5, 
            maxWidth: 300, 
            mx: 'auto',
            opacity: 0.3,
          }} 
        />
        
        {/* Legal protection text */}
        <Typography
          variant="caption"
          sx={{
            fontSize: isMobile ? '0.75rem' : '0.8rem',
            color: 'text.secondary',
            fontStyle: 'italic',
            opacity: 0.8,
            letterSpacing: 0.3,
          }}
        >
          © {new Date().getFullYear()} Sahar Malul • All Rights Reserved • Unauthorized reproduction prohibited
        </Typography>
        
        {/* Subtle branding */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 1,
            fontSize: '0.7rem',
            color: 'text.disabled',
            opacity: 0.6,
          }}
        >
          Elgar Admin System
        </Typography>
      </Box>
    </Box>
  );
};

export default Footer;
