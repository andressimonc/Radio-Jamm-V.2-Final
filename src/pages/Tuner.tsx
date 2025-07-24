
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import Tuner from '../components/Tuner';

function TunerPage() {
  const navigate = useNavigate();

  // Handle back button press with smooth transition
  const handleBack = async () => {
    // Wait for fade-out animation to complete before navigating
    await new Promise(resolve => setTimeout(resolve, 200));
    // Navigate to home with menu shown
    navigate('/', { state: { showMenu: true } });
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Simple fade transition
  const pageTransition = {
    duration: 0.3
  };

  return (
    <motion.div 
      className="page-container"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      <motion.button 
        className="back-button fixed top-4 left-4 z-50 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full shadow-lg"
        onClick={handleBack}
        whileTap={{ scale: 0.9 }}
      >
        <FiArrowLeft size={24} />
      </motion.button>

      <div className="content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="tuner-page-content"
        >
          <Tuner />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default TunerPage;
