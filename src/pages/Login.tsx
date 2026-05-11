import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { User, Mail, Phone as PhoneIcon, Lock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Login() {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  let from = (location.state as any)?.from?.pathname || '/';
  
  // Force redirect to home page instead of profile
  if (from === '/profile') {
    from = '/';
  }

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const checkExistingSession = async () => {
      if (!loading && user) {
        // Only blindly redirect if we've completely finished step 3 or haven't initiated the login flow
        if (step !== 3) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              navigate(from, { replace: true });
            } else {
              setStep(3);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    };
    checkExistingSession();
  }, [user, loading, navigate, from, step]);

  // Helper to generate dummy credentials for Firebase Auth
  const getDummyCredentials = (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    return {
      dummyEmail: `${cleanPhone}@barbic.app`,
      dummyPassword: `Barbic@${cleanPhone}!`
    };
  };

  const handleSendOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send OTP');
      
      setStep(2);
      setTimer(300); // 5 minutes timer
      
      // Start countdown
      const interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) clearInterval(interval);
          return t - 1;
        });
      }, 1000);

      toast.success(data.message || 'OTP sent successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      toast.error('Please enter a valid OTP');
      return;
    }
    setIsSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, otp })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid OTP');

      toast.success('OTP Verified!');

      // Now handle Firebase Auth
      await setPersistence(auth, browserLocalPersistence);
      const { dummyEmail, dummyPassword } = getDummyCredentials(cleanPhone);

      try {
        // Try to sign in (Existing User in Auth)
        const userCredential = await signInWithEmailAndPassword(auth, dummyEmail, dummyPassword);
        
        // Wait! Even if they exist in Auth, we must verify they have a Firestore document.
        // A deleted user from the backend won't have a Firestore document anymore.
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (!userDoc.exists()) {
          // Found ghost Auth user, but no DB record. Treat as completely new.
          setStep(3);
          return;
        }

        toast.success('Welcome back!');
        navigate(from, { replace: true });
      } catch (authError: any) {
        // If user not found, they are a NEW user
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          setStep(3); // Go to signup step
        } else {
          throw authError;
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP or OTP expired');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error('Please fill all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const { dummyEmail, dummyPassword } = getDummyCredentials(cleanPhone);

      let targetUid = user?.uid;

      if (!targetUid) {
        // Only run createUser if they actually didn't exist in Firebase Auth yet
        try {
           const result = await createUserWithEmailAndPassword(auth, dummyEmail, dummyPassword);
           targetUid = result.user.uid;
        } catch (authError: any) {
           // Fallback if they were somehow created exactly between steps
           if (authError.code === 'auth/email-already-in-use') {
              const res = await signInWithEmailAndPassword(auth, dummyEmail, dummyPassword);
              targetUid = res.user.uid;
           } else {
              throw authError;
           }
        }
      }

      if (!targetUid) throw new Error("Could not initialize authentication session.");

      // Save user details to Firestore
      await setDoc(doc(db, 'users', targetUid), {
        uid: targetUid,
        name: name,
        email: email,
        phone: `+91${cleanPhone}`,
        role: 'customer',
        createdAt: new Date().toISOString(),
        phoneVerified: true
      });

      toast.success('Account created successfully!');
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main py-12 px-4 sm:px-6 lg:px-8 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-accent-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative z-10"
      >
        <div>
          <h2 className="mt-2 text-center font-display text-3xl font-bold text-ink">
            {step === 1 && 'Login or Signup'}
            {step === 2 && 'Verify OTP'}
            {step === 3 && 'Complete Signup'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 1 && 'Enter your mobile number to continue'}
            {step === 2 && `We've sent an OTP to +91 ${phone}`}
            {step === 3 && 'Just a few more details to get started'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm font-medium">+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="block w-full pl-12 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors font-medium tracking-wide"
                      placeholder="Enter 10 digit number"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || phone.length < 10}
                  className="btn-primary w-full h-[54px] text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors tracking-widest text-lg font-bold text-center"
                      placeholder="000000"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || otp.length < 4}
                    className="btn-primary w-full h-[54px] text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Verify OTP'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary w-full h-[54px] text-sm uppercase tracking-wider mt-3"
                  >
                    Change Number
                  </button>
                </div>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    disabled={timer > 0 || isSubmitting}
                    onClick={handleSendOtp}
                    className="text-sm font-medium text-primary-500 hover:text-primary-600 disabled:text-gray-400"
                  >
                    {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleCompleteSignup} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !name || !email}
                  className="btn-primary w-full h-[54px] text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Complete Signup'
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
