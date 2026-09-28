// frontend/src/pages/admin/UsersPage.jsx

import { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import UserModal from '../../components/admin/UserModal';
import PendingApprovals from '../../components/admin/PendingApprovals';
import { Users, UserPlus, Search, Filter, Eye, Edit, Trash2, Crown, GraduationCap, BookOpen } from 'lucide-react';

const UsersPage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    role: 'all', // Keep role filter for UI
    page: 1,
    limit: 100
  });
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [activeTab, setActiveTab] = useState('staff');

  useEffect(() => {
    fetchUsers();
    fetchDegreeOptions();
  }, [filters.search, filters.limit]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await userService.getUsers({
        search: filters.search,
        page: filters.page,
        limit: filters.limit,
        role: 'all'
      });
      setAllUsers(response.users || []);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDegreeOptions = async () => {
    try {
      const response = await userService.getDegreeOptions();
      setDegreeOptions(response.degrees || []);
    } catch (err) {
      console.error('Error fetching degrees:', err);
    }
  };

  const getDegreeTitle = (code) => {
    if (!code) return 'N/A';
    const degree = degreeOptions.find(d => d.code === code);
    return degree ? `${degree.code}: ${degree.title}` : code;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleDeleteUser = async (user) => {
    const confirmMessage = `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setIsDeleting(true);
        await userService.deleteUser(user._id);
        await fetchUsers();
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleModalClose = (shouldRefresh = false) => {
    setShowModal(false);
    setSelectedUser(null);
    if (shouldRefresh) {
      fetchUsers();
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg';
      case 'lecturer':
        return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg';
      case 'student':
        return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (isActive) => {
    return isActive 
      ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-sm' 
      : 'bg-gradient-to-r from-red-400 to-red-500 text-white shadow-sm';
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'lecturer':
        return <BookOpen className="w-4 h-4" />;
      case 'student':
        return <GraduationCap className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  // Apply filters
  let filteredUsers = allUsers.filter(user => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = (
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.role?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Role filter
    if (filters.role !== 'all') {
      if (user.role !== filters.role) return false;
    }

    return true;
  });

  // Split filtered users into staff and students
  const staffUsers = filteredUsers.filter(user => user.role === 'admin' || user.role === 'lecturer');
  const studentUsers = filteredUsers.filter(user => user.role === 'student');

  // Get current tab users
  const currentTabUsers = activeTab === 'staff' ? staffUsers : studentUsers;

  const UserActionsCell = ({ user }) => (
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <div className="flex items-center justify-end space-x-2">
        <button
          onClick={() => handleEditUser(user)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
        >
          <Edit className="w-3 h-3 mr-1" />
          Edit
        </button>
        <button
          onClick={() => handleDeleteUser(user)}
          disabled={isDeleting}
          className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </td>
  );

  const UserRow = ({ user }) => (
    <tr key={user._id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-sm font-bold text-white">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </span>
          </div>
          <div className="ml-4">
            <div className="text-sm font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(user.role)}`}>
          {getRoleIcon(user.role)}
          <span className="ml-1 capitalize">{user.role}</span>
        </span>
      </td>
      {user.role === 'student' ? (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="bg-green-50 p-2 rounded-lg border border-green-200">
            <div className="font-medium text-green-800">{getDegreeTitle(user.degreeTitle)}</div>
            {user.academicYear && user.semester && (
              <div className="text-green-600 text-xs">Year {user.academicYear}, Semester {user.semester}</div>
            )}
          </div>
        </td>
      ) : (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
            <div className="font-medium text-blue-800">
              {user.role === 'admin' ? 'System Administration' : 'Academic Staff'}
            </div>
            <div className="text-blue-600 text-xs">
              {user.role === 'admin' ? 'Full System Access' : 'Teaching & Assessment'}
            </div>
          </div>
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${getStatusBadgeColor(user.isActive)}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-white' : 'bg-white'}`}></div>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="bg-gray-50 p-2 rounded-lg">
          <div className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</div>
          <div className="text-xs text-gray-400">{new Date(user.createdAt).toLocaleTimeString()}</div>
        </div>
      </td>
      <UserActionsCell user={user} />
    </tr>
  );

  const EmptyState = ({ type }) => (
    <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg">
      <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No {type} found</h3>
      <p className="text-gray-500 mb-4">
        {filters.search || filters.role !== 'all' 
          ? 'Try adjusting your search or filter criteria.' 
          : `No ${type} have been created yet.`}
      </p>
      {!filters.search && filters.role === 'all' && (
        <button
          onClick={handleCreateUser}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Create First User
        </button>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-300 text-red-800 px-6 py-4 rounded-lg shadow-lg">
        <div className="flex items-center">
          <div className="bg-red-500 rounded-full p-1 mr-3">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">Error Loading Users</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen p-6">
      <PendingApprovals onApproved={fetchUsers} />
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-white">
              <h1 className="text-3xl font-bold flex items-center">
                <Users className="w-8 h-8 mr-3" />
                User Management
              </h1>
              <p className="text-blue-100 mt-2">Manage administrators, lecturers, and students</p>
            </div>
            <button
              onClick={handleCreateUser}
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-xl shadow-lg font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 transition-all duration-200"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Create User
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-8 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Users</p>
                  <p className="text-2xl font-bold">{allUsers.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Administrators</p>
                  <p className="text-2xl font-bold">{allUsers.filter(u => u.role === 'admin').length}</p>
                </div>
                <Crown className="w-8 h-8 text-red-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Lecturers</p>
                  <p className="text-2xl font-bold">{allUsers.filter(u => u.role === 'lecturer').length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Students</p>
                  <p className="text-2xl font-bold">{allUsers.filter(u => u.role === 'student').length}</p>
                </div>
                <GraduationCap className="w-8 h-8 text-green-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Search & Filter</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="search"
                className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Search by name, email, or role..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              id="role"
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="lecturer">Lecturer</option>
              <option value="student">Student</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-2">
              Items per Page
            </label>
            <select
              id="limit"
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
        
        {/* Filter Summary */}
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>
              <strong>Filtered Results:</strong> {filteredUsers.length} users
            </span>
            <span>•</span>
            <span>Staff: {staffUsers.length}</span>
            <span>•</span>
            <span>Students: {studentUsers.length}</span>
            {filters.search && (
              <>
                <span>•</span>
                <span className="text-blue-600">Searching: "{filters.search}"</span>
              </>
            )}
            {filters.role !== 'all' && (
              <>
                <span>•</span>
                <span className="text-blue-600">Role: {filters.role}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('staff')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center transition-colors ${
                activeTab === 'staff'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Staff ({staffUsers.length})
              <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                Admins & Lecturers
              </span>
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 px-1 border-b-2 font-semibold text-sm flex items-center transition-colors ${
                activeTab === 'students'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Students ({studentUsers.length})
            </button>
          </nav>
        </div>

        {/* Table Content */}
        <div className="bg-white">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Loading users...</span>
              </div>
            </div>
          ) : currentTabUsers.length === 0 ? (
            <div className="p-8">
              <EmptyState type={activeTab === 'staff' ? 'staff members' : 'students'} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {activeTab === 'students' ? 'Academic Info' : 'Department'}
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="relative px-6 py-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {currentTabUsers.map(user => <UserRow key={user._id} user={user} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <UserModal
          user={selectedUser}
          onClose={handleModalClose}
          degreeOptions={degreeOptions}
        />
      )}
    </div>
  );
};

export default UsersPage;
