import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on homepage and main pages
  const hiddenPaths = ['/', '/menu', '/about', '/contact'];
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:left-12 z-40">
      <button
        onClick={handleBack}
        className="flex items-center text-sm font-semibold text-white bg-black/40 backdrop-blur-md hover:bg-black/60 px-4 py-2 rounded-full transition-all border border-white/20 shadow-lg"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>
    </div>
  );
}
