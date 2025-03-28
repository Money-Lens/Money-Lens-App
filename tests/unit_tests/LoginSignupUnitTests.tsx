// Import necessary testing libraries
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import Home from '../../frontend/src/app/page'; // Login page
import SignupPage from '../../frontend/src/app/pages/signup/page';
import ForgotPassword from '../../frontend/src/app/pages/forgot-password/page';
import { apiRequest } from '../../frontend/src/app/assets/utilities/API_HANDLER';

// Mock the imports
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendEmailVerification: jest.fn(),
  auth: jest.fn(),
}));

jest.mock('../../frontend/app/assets/utilities/API_HANDLER', () => ({
  apiRequest: jest.fn(),
}));

describe('Login Page Tests', () => {
  // Setup for each test
  const mockRouter = { push: jest.fn() };
  
  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(mockRouter);
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  // Test 1: Login form renders correctly
  test('renders login form with all required elements', () => {
    render(<Home />);
    
    // Check for form elements
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  // Test 2: Login redirects to dashboard on success
  test('successful login redirects to dashboard', async () => {
    const mockUser = { 
      email: 'test@example.com',
      uid: 'user123',
      emailVerified: true 
    };
    
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    apiRequest.mockResolvedValue({ token: 'fake-token' });
    
    render(<Home />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password123' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Wait for the async operations to complete
    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(apiRequest).toHaveBeenCalled();
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token');
      expect(mockRouter.push).toHaveBeenCalledWith('/pages/dashboard');
    });
  });

  // Test 3: Displays alert when email is not verified
  test('displays alert when email is not verified', async () => {
    const mockUser = { 
      email: 'test@example.com',
      uid: 'user123',
      emailVerified: false 
    };
    
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    global.alert = jest.fn();
    
    render(<Home />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password123' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Wait for the async operations to complete
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Please verify your email before logging in.');
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  // Test 4: Saves email when "Remember Me" is checked
  test('saves email when "Remember Me" is checked', async () => {
    const mockUser = { 
      email: 'test@example.com',
      uid: 'user123',
      emailVerified: true 
    };
    
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    apiRequest.mockResolvedValue({ token: 'fake-token' });
    
    render(<Home />);
    
    // Fill in the form and check "Remember Me"
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password123' } 
    });
    fireEvent.click(screen.getByLabelText(/remember me/i));
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Wait for the async operations to complete
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('rememberedEmail', 'test@example.com');
      expect(localStorage.setItem).toHaveBeenCalledWith('rememberMe', 'true');
    });
  });
});

describe('Signup Page Tests', () => {
  const mockRouter = { push: jest.fn() };
  
  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(mockRouter);
    global.alert = jest.fn();
  });

  // Test 5: Signup form renders correctly
  test('renders signup form with all required fields', () => {
    render(<SignupPage />);
    
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  // Test 6: Validates passwords match
  test('validates that passwords match', async () => {
    render(<SignupPage />);
    
    // Fill in the form with mismatched passwords
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password456' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    
    expect(global.alert).toHaveBeenCalledWith('Passwords do not match!');
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  // Test 7: Successfully creates account and sends verification email
  test('creates account and sends verification email on successful signup', async () => {
    const mockUser = { uid: 'newuser123' };
    
    createUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
    sendEmailVerification.mockResolvedValue({});
    apiRequest.mockResolvedValue({ message: 'User created successfully' });
    
    render(<SignupPage />);
    
    // Fill in the form correctly
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    
    // Wait for the async operations to complete
    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'john@example.com',
        'password123'
      );
      expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
      expect(apiRequest).toHaveBeenCalledWith('/users/signup', expect.anything());
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Signup successful'));
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
});

describe('Forgot Password Page Tests', () => {
  const mockRouter = { push: jest.fn() };
  
  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(mockRouter);
  });

  // Test 8: Forgot password form renders correctly
  test('renders forgot password form with all required elements', () => {
    render(<ForgotPassword />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByText(/back to sign in/i)).toBeInTheDocument();
  });

  // Test 9: Displays success message when reset email is sent
  test('displays success message when reset email is sent', async () => {
    sendPasswordResetEmail.mockResolvedValue({});
    
    render(<ForgotPassword />);
    
    // Fill in the email
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    
    // Wait for the async operations to complete
    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com'
      );
      expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument();
    });
  });

  // Test 10: Displays error message when reset fails
  test('displays error message when reset fails', async () => {
    const error = new Error('User not found');
    sendPasswordResetEmail.mockRejectedValue(error);
    
    render(<ForgotPassword />);
    
    // Fill in the email
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'nonexistent@example.com' } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    
    // Wait for the async operations to complete
    await waitFor(() => {
      expect(screen.getByText(/password reset failed/i)).toBeInTheDocument();
    });
  });
});