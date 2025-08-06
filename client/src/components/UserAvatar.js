import React, { useState, useEffect } from 'react';
import { Avatar } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import ImageModal from './ImageModal';

const UserAvatar = ({ 
  user, 
  size = 40, 
  roleColor = 'grey', 
  showFallback = true,
  clickable = true
}) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const findUserPhoto = () => {
      // Reset state
      setImageError(false);
      setImageUrl(null);

      // First check if user has a photo_url (legacy support)
      if (user?.photo_url) {
        const url = user.photo_url.startsWith('http') 
          ? user.photo_url 
          : `/uploads/profile-photos/${user.photo_url}`;
        setImageUrl(url);
        return;
      }

      // If no photo_url, try to find photo by ID number
      if (user?.id_number) {
        // Try the most common extension first (jpg)
        const photoUrl = `/uploads/profile-photos/${user.id_number}.jpg`;
        setImageUrl(photoUrl);
        return;
      }
    };

    // Only try to find photo if user exists
    if (user) {
      findUserPhoto();
    }
  }, [user?.photo_url, user?.id_number]);

  const handleImageError = () => {
    // If we tried .jpg and it failed, try other extensions
    if (imageUrl && user?.id_number && imageUrl.includes('.jpg')) {
      const alternatives = ['jpeg', 'png', 'gif', 'webp'];
      for (const ext of alternatives) {
        const altUrl = `/uploads/profile-photos/${user.id_number}.${ext}`;
        if (altUrl !== imageUrl) {
          setImageUrl(altUrl);
          return;
        }
      }
    }
    
    // If all attempts failed, mark as error
    setImageError(true);
  };

  const shouldShowFallback = !imageUrl || imageError;

  const handleAvatarClick = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'מפתח': 'מפתח',
      'אדמין': 'אדמין',
      'פיקוד יחידה': 'פיקוד יחידה',
      'מפקד משל"ט': 'מפקד משל"ט',
      'מוקדן': 'מוקדן',
      'סייר': 'סייר',
      'admin': 'אדמין',
      'ADMIN': 'אדמין',
      'DISPATCHER': 'מוקדן',
      'dispatcher': 'מוקדן'
    };
    return roleMap[role] || role;
  };

  return (
    <>
      <Avatar
        src={!imageError ? imageUrl : undefined}
        sx={{
          bgcolor: shouldShowFallback ? `${roleColor}.main` : 'transparent',
          width: size,
          height: size,
          cursor: clickable ? 'pointer' : 'default',
          '&:hover': clickable ? {
            opacity: 0.8,
            transform: 'scale(1.05)',
            transition: 'all 0.2s ease-in-out'
          } : {}
        }}
        onError={handleImageError}
        onClick={clickable ? handleAvatarClick : undefined}
      >
        {shouldShowFallback && showFallback && <PersonIcon fontSize="small" />}
      </Avatar>
      
      {clickable && (
        <ImageModal
          open={modalOpen}
          onClose={handleModalClose}
          imageUrl={imageUrl}
          userName={user?.full_name || user?.username}
          userRole={getRoleDisplayName(user?.role)}
        />
      )}
    </>
  );
};

export default UserAvatar;
