
import { useEffect } from 'react';

type AlertType = 'success' | 'error' | 'warning';

export default function AlertBanner({
  message,
  onClose,
  type = 'success',
}: {
  message: string;
  onClose: () => void;
  type?: AlertType;
}) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 4000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return '#f44336'; // red
      case 'warning':
        return '#ff9800'; // orange/yellow
      case 'success':
      default:
        return '#4CAF50';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: getBackgroundColor(),
        color: 'white',
        padding: '10px 20px',
        borderRadius: '8px',
        zIndex: 9999,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
        fontWeight: 'bold',
        minWidth: '300px',
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  );
}
