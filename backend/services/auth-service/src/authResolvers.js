const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./authModel');
const { sendResetEmail } = require('./emailService');

const resolvers = {
  Query: {
    me: async (_, __, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.user;
    }
  },
  Mutation: {
    register: async (_, { email, password, firstName, lastName, role }) => {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          throw new Error('User already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
          { userId: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );

        return {
          token,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        };
      } catch (error) {
        throw new Error(error.message);
      }
    },

    login: async (_, { email, password }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          throw new Error('Invalid credentials');
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          throw new Error('Invalid credentials');
        }

        const token = jwt.sign(
          { userId: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );

        return {
          token,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        };
      } catch (error) {
        throw new Error(error.message);
      }
    },

    requestPasswordReset: async (_, { email }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return { success: false, message: 'If a user with this email exists, a password reset link has been sent.' };
        }

        const resetToken = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
        await user.save();

        await sendResetEmail(user.email, resetToken);

        return { success: true, message: 'Password reset email sent successfully' };
      } catch (error) {
        return { success: false, message: 'Failed to process password reset request' };
      }
    },

    resetPassword: async (_, { token, newPassword }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({
          _id: decoded.userId,
          resetToken: token,
          resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
          return { success: false, message: 'Invalid or expired reset token' };
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        return { success: true, message: 'Password reset successful' };
      } catch (error) {
        return { success: false, message: 'Failed to reset password' };
      }
    },

    verifyEmail: async (_, { token }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.userId });

        if (!user) {
          return { success: false, message: 'Invalid verification token' };
        }

        user.isVerified = true;
        await user.save();

        return { success: true, message: 'Email verified successfully' };
      } catch (error) {
        return { success: false, message: 'Failed to verify email' };
      }
    }
  }
};

module.exports = resolvers;