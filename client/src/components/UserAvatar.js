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

      // First check if user has a photo_url
      if (user?.photo_url) {
        // If it's already a full URL (Supabase), use it directly
        if (user.photo_url.startsWith('http')) {
          setImageUrl(user.photo_url);
          return;
        }
        // If it's a relative path or filename, try to construct full URL
        if (user.photo_url.includes('supabase.co')) {
          setImageUrl(user.photo_url);
          return;
        }
        // Legacy support for old local paths
        const url = `/uploads/profile-photos/${user.photo_url}`;
        setImageUrl(url);
        return;
      }

      // If no photo_url but we have id_number, try to find photo in Supabase
      if (user?.id_number) {
        // Construct Supabase URL - try common extensions
        const supabaseBaseUrl = 'https://smchvtbqzqssywlgshjj.supabase.co/storage/v1/object/public/uploads/profile-photos';
        const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        // Try the most common extension first (jpg)
        const photoUrl = `${supabaseBaseUrl}/${user.id_number}.jpg`;
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
    console.log('❌ Image load error for:', imageUrl);
    
    // If we tried a Supabase URL and it failed, try other extensions
    if (imageUrl && user?.id_number && imageUrl.includes('supabase.co')) {
      const supabaseBaseUrl = 'https://smchvtbqzqssywlgshjj.supabase.co/storage/v1/object/public/uploads/profile-photos';
      const alternatives = ['jpeg', 'png', 'gif', 'webp'];
      
      for (const ext of alternatives) {
        const altUrl = `${supabaseBaseUrl}/${user.id_number}.${ext}`;
        if (altUrl !== imageUrl) {
          console.log('🔄 Trying alternative URL:', altUrl);
          setImageUrl(altUrl);
          return;
        }
      }
    }
    
    // If we tried local paths and they failed, try other extensions
    if (imageUrl && user?.id_number && imageUrl.includes('/uploads/profile-photos/')) {
      const alternatives = ['jpeg', 'png', 'gif', 'webp'];
      for (const ext of alternatives) {
        const altUrl = `/uploads/profile-photos/${user.id_number}.${ext}`;
        if (altUrl !== imageUrl) {
          console.log('🔄 Trying local alternative:', altUrl);
          setImageUrl(altUrl);
          return;
        }
      }
    }
    
    // If all attempts failed, mark as error
    console.log('💥 All photo attempts failed for user:', user?.id_number);
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
