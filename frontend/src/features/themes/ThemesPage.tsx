import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeGalleryModal } from '@/components/themes/ThemeGalleryModal';

export const ThemesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen">
      <ThemeGalleryModal
        isOpen={true}
        onClose={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/settings');
          }
        }}
      />
    </div>
  );
};

export default ThemesPage;
