import React from 'react';

const NotificationBadge = ({ count }) => {
  if (!count || count === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        borderRadius: '50%',
        minWidth: '22px',
        height: '22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: '700',
        border: '2px solid white',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
};

export default NotificationBadge;
