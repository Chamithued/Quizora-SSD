import { useState, useEffect } from 'react';
import { userService } from '../../services/userService';

const UserModal = ({ user, onClose, approvalMode = false }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'student',
    degreeTitle: '',
    currentYear: 1,
    currentSemester: 1,
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [loadingDegrees, setLoadingDegrees] = useState(true);

  useEffect(() => {
    fetchDegreeOptions();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '', // Always empty for editing
        role: approvalMode ? user.requestedRole || 'student' : user.role,
        degreeTitle: user.degreeTitle || '',
        currentYear: user.currentYear || 1,
        currentSemester: user.currentSemester || 1,
        isActive: user.isActive
      });
    }
  }, [user, approvalMode]);

  const fetchDegreeOptions = async () => {
    try {
      setLoadingDegrees(true);
      const response = await userService.getDegreeOptions();
      setDegreeOptions(response.degrees);
    } catch (err) {
      console.error('Error fetching degree options:', err);
      setError('Failed to load degree options');
    } finally {
      setLoadingDegrees(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'currentYear' || name === 'currentSemester') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic validation
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
        throw new Error('Please fill in all required fields');
      }

      const submitData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        isActive: formData.isActive
      };

      // Handle password - CRITICAL FIX
      if (formData.password && formData.password.trim()) {
        console.log('Password provided, will be updated');
        submitData.password = formData.password.trim();
      } else if (!user) {
        // New user must have password
        throw new Error('Password is required for new users');
      } else {
        console.log('No password provided for existing user, password will remain unchanged');
      }

      // Add student-specific fields if needed
      if (formData.role === 'student') {
        if (!formData.degreeTitle) {
          throw new Error('Degree title is required for students');
        }
        if (!formData.currentYear || !formData.currentSemester) {
          throw new Error('Current year and semester are required for students');
        }
        
        submitData.degreeTitle = formData.degreeTitle;
        submitData.currentYear = formData.currentYear;
        submitData.currentSemester = formData.currentSemester;
      }

      console.log('Submitting user data:', {
        ...submitData,
        password: submitData.password ? '[PROVIDED]' : '[NOT PROVIDED]'
      });

      let response;
      if (approvalMode) {
        response = await userService.approveUser(user._id, submitData);
      } else if (user) {
        console.log('Updating existing user with ID:', user._id);
        response = await userService.updateUser(user._id, submitData);
      } else {
        console.log('Creating new user');
        response = await userService.createUser(submitData);
      }

      console.log('User operation successful:', response);
      onClose(true); // Refresh the parent component
    } catch (err) {
      console.error('User operation failed:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const groupedDegrees = degreeOptions.reduce((groups, degree) => {
    const faculty = degree.faculty;
    if (!groups[faculty]) {
      groups[faculty] = [];
    }
    groups[faculty].push(degree);
    return groups;
  }, {});

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'from-red-500 to-pink-500';
      case 'lecturer':
        return 'from-blue-500 to-indigo-500';
      case 'student':
        return 'from-green-500 to-teal-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className={`px-8 py-6 bg-gradient-to-r ${getRoleColor(formData.role)} text-white rounded-t-2xl`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={user ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">
                    {approvalMode ? 'Approve registration' : user ? 'Edit User' : 'Add New User'}
                  </h3>
                  <p className="text-white text-opacity-80 text-sm">
                    {approvalMode ? 'Verify the requested role and academic details before granting access.' : user ? 'Update user information and settings' : 'Create a new user account'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onClose(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-xl transition-colors duration-200"
              >
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    disabled={approvalMode}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                {!approvalMode && <div className="mt-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password {user ? (
                      <span className="text-gray-500 font-normal">(leave blank to keep current password)</span>
                    ) : (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder={user ? "Enter new password to update" : "Enter password"}
                    value={formData.password}
                    onChange={handleChange}
                    required={!user}
                  />
                  {user && (
                    <p className="text-xs text-gray-500 mt-1">
                      Only fill this field if you want to change the user's password
                    </p>
                  )}
                </div>}
              </div>

              {/* Role & Status */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Role & Status
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      User Role *
                    </label>
                    <select
                      id="role"
                      name="role"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="student">Student</option>
                      <option value="lecturer">Lecturer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        name="isActive"
                        disabled={approvalMode}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={formData.isActive}
                        onChange={handleChange}
                      />
                      <span className="ml-3 block text-sm font-medium text-gray-700">
                        Active User
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Student-specific fields */}
              {formData.role === 'student' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Academic Information
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="degreeTitle" className="block text-sm font-medium text-gray-700 mb-2">
                        Degree Program *
                      </label>
                      {loadingDegrees ? (
                        <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                          Loading degrees...
                        </div>
                      ) : (
                        <select
                          id="degreeTitle"
                          name="degreeTitle"
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          value={formData.degreeTitle}
                          onChange={handleChange}
                        >
                          <option value="">Select a degree program</option>
                          {Object.entries(groupedDegrees).map(([faculty, degrees]) => (
                            <optgroup key={faculty} label={faculty}>
                              {degrees.map((degree) => (
                                <option key={degree.code} value={degree.code}>
                                  {degree.code}: {degree.title}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="currentYear" className="block text-sm font-medium text-gray-700 mb-2">
                          Current Year *
                        </label>
                        <select
                          id="currentYear"
                          name="currentYear"
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          value={formData.currentYear}
                          onChange={handleChange}
                        >
                          <option value={1}>1st Year</option>
                          <option value={2}>2nd Year</option>
                          <option value={3}>3rd Year</option>
                          <option value={4}>4th Year</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="currentSemester" className="block text-sm font-medium text-gray-700 mb-2">
                          Current Semester *
                        </label>
                        <select
                          id="currentSemester"
                          name="currentSemester"
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          value={formData.currentSemester}
                          onChange={handleChange}
                        >
                          <option value={1}>Semester 1</option>
                          <option value={2}>Semester 2</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => onClose(false)}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 border border-transparent rounded-xl text-sm font-medium text-white bg-gradient-to-r ${getRoleColor(formData.role)} hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {user ? 'Updating...' : 'Creating...'}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={user ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} />
                      </svg>
                      {approvalMode ? 'Approve registration' : user ? 'Update User' : 'Create User'}
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
