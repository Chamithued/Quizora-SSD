// frontend\src\components\common\Layout.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Bell, Settings, Search, Menu, X, ChevronDown, User, 
  LogOut, Shield, Activity, Database, Wifi, Clock,
  Home, Users, FileText, Calendar, BarChart3, HelpCircle,
  Zap, Globe, Lock, Cpu, Target
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState({
    online: true,
    dbConnected: true,
    apiResponse: 120,
    uptime: '99.9%'
  });
  const [notifications] = useState([
    { id: 1, type: 'info', message: 'System update completed successfully', time: '2m ago' },
    { id: 2, type: 'warning', message: 'Quiz ending in 15 minutes', time: '5m ago' },
    { id: 3, type: 'success', message: 'New students enrolled', time: '1h ago' }
  ]);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowProfileDropdown(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutError('Logout could not be completed. Please try again.');
    }
  };

  const getNavItems = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { 
            label: 'Dashboard', 
            path: '/admin/dashboard', 
            icon: Home,
            badge: null
          },
          { 
            label: 'User Management', 
            path: '/admin/users', 
            icon: Users,
            badge: null
          }
        ];
      case 'lecturer':
        return [
          { 
            label: 'Dashboard', 
            path: '/lecturer/dashboard', 
            icon: Home,
            badge: null
          },
          { 
            label: 'Question Bank', 
            path: '/lecturer/questions', 
            icon: FileText,
            badge: null
          },
          { 
            label: 'Quiz Management', 
            path: '/lecturer/quizzes', 
            icon: Calendar,
            badge: null
          },
          { 
            label: 'Manual Grading', 
            path: '/lecturer/grading', 
            icon: Users,
            badge: null
          },
          { 
            label: 'Rubrics', 
            path: '/lecturer/rubrics', 
            icon: Target,
            badge: null
          },
          { 
            label: 'Analytics', 
            path: '/lecturer/analytics', 
            icon: BarChart3,
            badge: null
          }
        ];
      case 'student':
        return [
          { 
            label: 'Dashboard', 
            path: '/student/dashboard', 
            icon: Home,
            badge: null
          }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'lecturer':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGreetingByTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed width and positioning */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        flex flex-col
      `}>
        {/* Logo Section */}
        <div className="flex items-center justify-center h-16 bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-2">
              <span className="text-blue-600 text-xl font-bold">Q</span>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">Quizora</h1>
              <p className="text-blue-100 text-xs">Assessment Platform</p>
            </div>
          </div>
        </div>

        {/* System Status Bar */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                <span className="text-gray-600">System</span>
              </div>
              <div className="flex items-center">
                <Database className="w-3 h-3 text-blue-500 mr-1" />
                <span className="text-gray-600">DB</span>
              </div>
            </div>
            <span className="text-gray-500">Uptime: {systemStatus.uptime}</span>
          </div>
        </div>

        {/* User Info Section */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div className="relative">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {user?.firstName?.charAt(0)?.toUpperCase()}{user?.lastName?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-600 truncate">{user?.email}</p>
              <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(user?.role)}`}>
                {user?.role?.charAt(0)?.toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                onClick={() => setIsSidebarOpen(false)}
              >
                <div className="flex items-center min-w-0">
                  <Icon className={`
                    w-5 h-5 mr-3 flex-shrink-0 transition-colors duration-200
                    ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                  `} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="space-y-1">
            <button className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help & Support
            </button>
            <button className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors">
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Left side */}
              <div className="flex items-center">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
                >
                  <span className="sr-only">Open sidebar</span>
                  {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
                
                <div className="hidden lg:flex lg:items-center lg:ml-6">
                  <span className="text-sm text-gray-500">
                    {getGreetingByTime()}, {user?.firstName}!
                  </span>
                  <span className="mx-2 text-gray-300">|</span>
                  <div className="flex items-center text-sm text-gray-600">
                    <Activity className="w-4 h-4 mr-1 text-green-500" />
                    System Online
                  </div>
                </div>
              </div>
              
              {/* Center - Search */}
              <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-end">
                <div className="max-w-lg w-full lg:max-w-xs">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search anything..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              {/* Right side */}
              <div className="flex items-center space-x-4">
                {/* System Metrics - Hidden on mobile */}
                <div className="hidden xl:flex items-center space-x-3 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Cpu className="w-3 h-3 mr-1 text-blue-500" />
                    <span>CPU: 23%</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                    <span>Load: 1.2</span>
                  </div>
                </div>

                {/* Time Display */}
                <div className="hidden sm:flex items-center text-sm">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  <div className="text-right">
                    <div className="font-mono font-bold text-gray-900 text-xs">
                      {formatTime(currentTime)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="relative dropdown-container">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-400 hover:text-gray-500 relative"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">{notifications.length}</span>
                      </div>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                      <div className="p-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div key={notification.id} className="p-4 border-b border-gray-50 hover:bg-gray-50">
                            <div className="flex items-start">
                              <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                                notification.type === 'warning' ? 'bg-yellow-500' :
                                notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                              }`}></div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {user?.firstName?.charAt(0)?.toUpperCase()}{user?.lastName?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </div>
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
                  </button>

                  {showProfileDropdown && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                          <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user?.role)}`}>
                            {user?.role?.charAt(0)?.toUpperCase() + user?.role?.slice(1)}
                          </span>
                        </div>
                        
                        <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                          <User className="mr-3 h-4 w-4 text-gray-400" />
                          Your Profile
                        </button>
                        
                        <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                          <Settings className="mr-3 h-4 w-4 text-gray-400" />
                          Settings
                        </button>
                        
                        <div className="border-t border-gray-100">
                          <button
                            onClick={() => {
                              setShowProfileDropdown(false);
                              handleLogout();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                          >
                            <LogOut className="mr-3 h-4 w-4 text-red-400" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          {logoutError && (
            <div role="alert" className="m-4 rounded border border-red-300 bg-red-50 p-3 text-red-800">
              {logoutError}
            </div>
          )}
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p className="text-sm text-gray-500">
                © 2024 Quizora. All rights reserved.
              </p>
              <div className="flex space-x-4 mt-2 sm:mt-0">
                <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Privacy</a>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Terms</a>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Support</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
