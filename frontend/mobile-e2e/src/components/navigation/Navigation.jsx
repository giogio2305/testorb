import { Link, useLocation } from 'react-router-dom';
import { FileCheck2, LayoutDashboard, Smartphone } from 'lucide-react';

const NavLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`max-w-sm inline-flex items-center font-medium ${
        isActive 
          ? 'text-emerald-600 hover:text-emerald-700' 
          : 'text-gray-800 hover:text-gray-600'
      }`}
    >
      <Icon className="size-4 mx-1.5" />
      {children}
    </Link>
  );
};

const Navigation = () => {
  return (
    <div className="flex space-x-8 items-center">
      <NavLink to="/" icon={LayoutDashboard}>
        Dashboard
      </NavLink>
      <NavLink to="/applications" icon={Smartphone}>
        Applications
      </NavLink>
      {/* Supprimer ce lien car Results est spécifique à une application */}
      {/* <NavLink to="/results" icon={FileCheck2}>
        Results
      </NavLink> */}
    </div>
  );
};

export default Navigation;