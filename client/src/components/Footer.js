import React from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Copyright as CopyrightIcon } from '@mui/icons-material';

const Footer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: isMobile ? 2 : 1.5,
        px: isMobile ? 2 : 3,
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
        direction: 'rtl',
        textAlign: 'center',
      }}
    >
      <Typography
        variant={isMobile ? "caption" : "body2"}
        color="text.secondary"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          fontSize: isMobile ? '0.75rem' : '0.8rem',
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        <CopyrightIcon sx={{ fontSize: isMobile ? 14 : 16, mr: 0.5 }} />
        מערכת זו נבנתה ונכתבה על ידי סהר מלול - כל הזכויות שמורות
      </Typography>
      
      {/* Additional copyright line for legal protection */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{
          fontSize: isMobile ? '0.65rem' : '0.7rem',
          mt: 0.5,
          opacity: 0.8,
          fontStyle: 'italic',
        }}
      >
        © {new Date().getFullYear()} Sahar Malul. All Rights Reserved. Unauthorized reproduction prohibited.
      </Typography>
    </Box>
  );
};

export default Footer;
