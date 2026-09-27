import User from '../models/User.js';
import { createSearchRegex } from '../utils/searchRegex.js';

// Degree options based on your requirements
const DEGREE_OPTIONS = [
  // Faculty of Computing
  { code: 'COM-101', title: 'BSc (Hons) in Information Technology', faculty: 'Faculty of Computing' },
  { code: 'COM-102', title: 'BSc (Hons) in Software Engineering', faculty: 'Faculty of Computing' },
  { code: 'COM-103', title: 'BSc (Hons) in Computer Science', faculty: 'Faculty of Computing' },
  { code: 'COM-104', title: 'BSc (Hons) in Cyber Security', faculty: 'Faculty of Computing' },
  { code: 'COM-105', title: 'BSc (Hons) in Artificial Intelligence', faculty: 'Faculty of Computing' },
  { code: 'COM-106', title: 'BSc (Hons) in Data Science', faculty: 'Faculty of Computing' },
  { code: 'COM-107', title: 'BSc (Hons) in Interactive Media', faculty: 'Faculty of Computing' },
  { code: 'COM-108', title: 'BSc (Hons) in Information Systems Engineering', faculty: 'Faculty of Computing' },
  { code: 'COM-109', title: 'BSc (Hons) in Computer Systems & Networking', faculty: 'Faculty of Computing' },
  
  // Faculty of Engineering
  { code: 'ENG-201', title: 'BSc (Hons) in Civil Engineering', faculty: 'Faculty of Engineering' },
  { code: 'ENG-202', title: 'BSc (Hons) in Electrical & Electronic Eng.', faculty: 'Faculty of Engineering' },
  { code: 'ENG-203', title: 'BSc (Hons) in Mechanical Engineering', faculty: 'Faculty of Engineering' },
  { code: 'ENG-204', title: 'BSc (Hons) in Mechatronics Engineering', faculty: 'Faculty of Engineering' },
  { code: 'ENG-205', title: 'BSc (Hons) in Materials Engineering', faculty: 'Faculty of Engineering' },
  { code: 'ENG-206', title: 'BSc (Hons) in Quantity Surveying (LJMU)', faculty: 'Faculty of Engineering' },
  
  // SLIIT Business School
  { code: 'BUS-301', title: 'BBA (Hons) in Business Management', faculty: 'SLIIT Business School' },
  { code: 'BUS-302', title: 'BBA (Hons) in Accounting & Finance', faculty: 'SLIIT Business School' },
  { code: 'BUS-303', title: 'BBA (Hons) in Marketing Management', faculty: 'SLIIT Business School' },
  { code: 'BUS-304', title: 'BBA (Hons) in Human Capital Management', faculty: 'SLIIT Business School' },
  { code: 'BUS-305', title: 'BBA (Hons) in Business Analytics', faculty: 'SLIIT Business School' },
  { code: 'BUS-306', title: 'BBA (Hons) in Supply Chain Management', faculty: 'SLIIT Business School' },
  { code: 'BUS-307', title: 'BBA (Hons) in Management Information Systems', faculty: 'SLIIT Business School' },
  { code: 'BUS-308', title: 'BBA (Hons) in Quality Management', faculty: 'SLIIT Business School' },
  
  // Faculty of Humanities & Sciences
  { code: 'HUM-401', title: 'BSc (Hons) in Psychology', faculty: 'Faculty of Humanities & Sciences' },
  { code: 'HUM-402', title: 'BSc (Hons) in Biotechnology', faculty: 'Faculty of Humanities & Sciences' },
  { code: 'HUM-403', title: 'BSc (Hons) in Biomedical Science', faculty: 'Faculty of Humanities & Sciences' },
  { code: 'HUM-404', title: 'BSc (Hons) in Financial Mathematics & Stats', faculty: 'Faculty of Humanities & Sciences' },
  { code: 'HUM-405', title: 'BA in English', faculty: 'Faculty of Humanities & Sciences' },
  { code: 'HUM-406', title: 'B.Ed in Biological Science', faculty: 'Faculty of Humanities & Sciences' },
  { code: 'HUM-407', title: 'B.Ed in Physical Science', faculty: 'Faculty of Humanities & Sciences' },
  { code: 'HUM-408', title: 'B.Ed in English', faculty: 'Faculty of Humanities & Sciences' },
  { code: 'HUM-409', title: 'LLB (Bachelor of Laws)', faculty: 'Faculty of Humanities & Sciences' },
  
  // School of Architecture
  { code: 'ARC-501', title: 'BSc (Hons) in Architecture', faculty: 'School of Architecture' },
  { code: 'ARC-502', title: 'BA (Hons) in Interior Design (LJMU)', faculty: 'School of Architecture' }
];

export const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search } = req.query;
    const searchRegex = createSearchRegex(search);
    const query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (searchRegex) {
      query.$or = [
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { degreeTitle: { $regex: searchRegex } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    if (error instanceof RangeError) return res.status(400).json({ message: error.message });
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, degreeTitle, currentYear, currentSemester } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'All basic fields are required' });
    }

    // Reject non-string email/password to prevent NoSQL operator injection in
    // the User.findOne({ email }) lookup below.
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid email or password format' });
    }

    // Validate student-specific fields
    if (role === 'student') {
      if (!degreeTitle || !currentYear || !currentSemester) {
        return res.status(400).json({ 
          message: 'Degree title, current year, and current semester are required for students' 
        });
      }
      
      if (![1, 2].includes(parseInt(currentSemester))) {
        return res.status(400).json({ message: 'Semester must be 1 or 2' });
      }

      if (!DEGREE_OPTIONS.some(degree => degree.code === degreeTitle)) {
        return res.status(400).json({ message: 'Invalid degree title' });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const userData = {
      firstName,
      lastName,
      email,
      password,
      role,
      createdBy: req.user._id
    };

    // Add student-specific fields if role is student
    if (role === 'student') {
      userData.degreeTitle = degreeTitle;
      userData.currentYear = parseInt(currentYear);
      userData.currentSemester = parseInt(currentSemester);
    }

    const user = new User(userData);
    await user.save();

    console.log('User created successfully:', user.email);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, isActive, degreeTitle, currentYear, currentSemester, password } = req.body;

    console.log('Updating user:', id, 'Password provided:', !!password);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Reject a non-string email to prevent NoSQL operator injection in the
    // duplicate-email lookup below.
    if (email !== undefined && typeof email !== 'string') {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Validate student-specific fields if role is student
    if (role === 'student' || user.role === 'student') {
      if (role === 'student') {
        if (!degreeTitle || !currentYear || !currentSemester) {
          return res.status(400).json({ 
            message: 'Degree title, current year, and current semester are required for students' 
          });
        }
        
        if (![1, 2].includes(parseInt(currentSemester))) {
          return res.status(400).json({ message: 'Semester must be 1 or 2' });
        }

        if (!DEGREE_OPTIONS.some(degree => degree.code === degreeTitle)) {
          return res.status(400).json({ message: 'Invalid degree title' });
        }
      }
    }

    // Update basic fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.role = role || user.role;
    user.isActive = isActive !== undefined ? isActive : user.isActive;

    // Handle password update - THIS IS THE CRITICAL FIX
    if (password && password.trim() !== '') {
      console.log('Updating password for user:', user.email);
      user.password = password; // Set the new password - pre-save hook will hash it
    }

    // Update student-specific fields
    if (role === 'student') {
      user.degreeTitle = degreeTitle || user.degreeTitle;
      user.currentYear = currentYear ? parseInt(currentYear) : user.currentYear;
      user.currentSemester = currentSemester ? parseInt(currentSemester) : user.currentSemester;
    } else if (user.role === 'student' && role !== 'student') {
      // If changing from student to another role, clear student fields
      user.degreeTitle = undefined;
      user.currentYear = undefined;
      user.currentSemester = undefined;
    }

    // Use save() method to trigger pre-save hooks (including password hashing)
    const updatedUser = await user.save();

    console.log('User updated successfully:', updatedUser.email);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(id);

    console.log('User deleted successfully:', user.email);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      stats: {
        total: totalUsers,
        active: activeUsers,
        byRole: stats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get degree options for dropdown
export const getDegreeOptions = async (req, res) => {
  try {
    res.json({
      success: true,
      degrees: DEGREE_OPTIONS
    });
  } catch (error) {
    console.error('Get degree options error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
