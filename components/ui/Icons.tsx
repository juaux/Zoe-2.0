// Ícones otimizados - imports centralizados
import { 
  FaUserAlt, 
  FaChalkboardTeacher, 
  FaBookOpen, 
  FaUserCog, 
  FaHome,
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaTimes,
  FaUsers,
  FaChartLine,
  FaToggleOn,
  FaToggleOff,
  FaEyeSlash
} from 'react-icons/fa';

// Exportações individuais para compatibilidade
export {
  FaUserAlt,
  FaChalkboardTeacher,
  FaBookOpen,
  FaUserCog,
  FaHome,
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaTimes,
  FaUsers,
  FaChartLine,
  FaToggleOn,
  FaToggleOff,
  FaEyeSlash,
};

// Exportações organizadas por categoria
export const NavigationIcons = {
  Home: FaHome,
  User: FaUserAlt,
  Teacher: FaChalkboardTeacher,
  Course: FaBookOpen,
  Settings: FaUserCog,
};

export const ActionIcons = {
  Search: FaSearch,
  Add: FaPlus,
  Edit: FaEdit,
  Delete: FaTrash,
  View: FaEye,
  Close: FaTimes,
  ToggleOn: FaToggleOn,
  ToggleOff: FaToggleOff,
  EyeSlash: FaEyeSlash,
};

export const DashboardIcons = {
  Users: FaUsers,
  Chart: FaChartLine,
}; 