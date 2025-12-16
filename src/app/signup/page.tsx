'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeClosed, ArrowRight, Check, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth';

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                className
            )}
            {...props}
        />
    )
}

// Password strength checker
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Fair', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
}

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [isClient, setIsClient] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const router = useRouter();
    const { user, loading } = useAuth();

    // For 3D card effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
    const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left - rect.width / 2);
        mouseY.set(e.clientY - rect.top - rect.height / 2);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    const passwordStrength = getPasswordStrength(password);
    const passwordsMatch = password && confirmPassword && password === confirmPassword;
    const passwordsDontMatch = password && confirmPassword && password !== confirmPassword;

    // Ensure we're on client side
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/app');
        }
    }, [user, loading, router]);

    const handleGoogleSignup = async () => {
        if (!isClient) return;

        setIsGoogleLoading(true);
        setError('');

        try {
            const { createClient } = await import('@supabase/supabase-js');

            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                setError('Missing Supabase environment variables');
                return;
            }

            const supabase = createClient(supabaseUrl, supabaseKey);
            const redirectUrl = window.location.origin + '/auth/callback?next=/welcome';

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: {
                        prompt: 'select_account'
                    }
                }
            });

            if (error) {
                setError('Google authentication failed. Please try again. (' + error.message + ')');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            setError('Google authentication failed. Please try again. (' + errorMessage + ')');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !name || !isClient) return;

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate password strength
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { createClient } = await import('@supabase/supabase-js');

            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                setError('Missing Supabase environment variables');
                return;
            }

            const supabase = createClient(supabaseUrl, supabaseKey);
            const redirectUrl = window.location.origin + '/auth/callback?next=/welcome';

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: {
                        name: name,
                        full_name: name,
                    }
                }
            });

            if (error) {
                setError(error.message);
            } else {
                setIsSuccess(true);
            }
        } catch (error) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Don't render until client-side
    if (!isClient) {
        return (
            <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-purple-500/40" />
                <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.05] shadow-2xl">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-white/70 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/60">Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-purple-500/40" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-white/[0.05] shadow-2xl max-w-md mx-4"
                >
                    <div className="text-center space-y-4">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center"
                        >
                            <Check className="w-8 h-8 text-green-400" />
                        </motion.div>

                        <h2 className="text-2xl font-bold text-white">Check your email</h2>
                        <p className="text-white/60">
                            We've sent a confirmation link to <span className="text-white font-medium">{email}</span>
                        </p>
                        <p className="text-white/40 text-sm">
                            Click the link in the email to activate your account.
                        </p>

                        <Link
                            href="/login"
                            className="inline-block mt-4 text-purple-400 hover:text-purple-300 transition-colors text-sm"
                        >
                            ← Back to login
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center">
            {/* Loading overlay for OAuth redirect */}
            {isGoogleLoading && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                        <h3 className="text-lg font-semibold text-white mb-2">Signing you up...</h3>
                        <p className="text-gray-300">Please wait while we complete your registration</p>
                    </div>
                </div>
            )}

            {/* Background gradient effect */}
            <div className="absolute inset-0 bg-purple-500/40" />

            {/* Subtle noise texture overlay */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    backgroundSize: '200px 200px'
                }}
            />

            {/* Top radial glow */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-purple-400/20 blur-[80px]" />
            <motion.div
                className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[100vh] h-[60vh] rounded-b-full bg-purple-300/20 blur-[60px]"
                animate={{
                    opacity: [0.15, 0.3, 0.15],
                    scale: [0.98, 1.02, 0.98]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "mirror"
                }}
            />
            <motion.div
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[90vh] h-[90vh] rounded-t-full bg-purple-400/20 blur-[60px]"
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    repeatType: "mirror",
                    delay: 1
                }}
            />

            {/* Animated glow spots */}
            <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse opacity-40" />
            <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse delay-1000 opacity-40" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-sm relative z-10 mx-4"
                style={{ perspective: 1500 }}
            >
                <motion.div
                    className="relative"
                    style={{ rotateX, rotateY }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    whileHover={{ z: 10 }}
                >
                    <div className="relative group">
                        {/* Card glow effect */}
                        <motion.div
                            className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700"
                            animate={{
                                boxShadow: [
                                    "0 0 10px 2px rgba(255,255,255,0.03)",
                                    "0 0 15px 5px rgba(255,255,255,0.05)",
                                    "0 0 10px 2px rgba(255,255,255,0.03)"
                                ],
                                opacity: [0.2, 0.4, 0.2]
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut",
                                repeatType: "mirror"
                            }}
                        />

                        {/* Glass card background */}
                        <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.05] shadow-2xl overflow-hidden">
                            {/* Logo and header */}
                            <div className="text-center space-y-1 mb-5">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", duration: 0.8 }}
                                    className="mx-auto w-10 h-10 rounded-full border border-white/10 flex items-center justify-center relative overflow-hidden"
                                >
                                    <span className="text-lg font-bold text-white">S</span>
                                    <div className="absolute inset-0 bg-white/10 opacity-50" />
                                </motion.div>

                                <motion.h1
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-xl font-bold text-white"
                                >
                                    Create Account
                                </motion.h1>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-white/60 text-xs"
                                >
                                    Sign up to get started with SignalsLoop
                                </motion.p>
                            </div>

                            {/* Error Messages */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                                >
                                    <p className="text-red-400 text-sm">{error}</p>
                                </motion.div>
                            )}

                            {/* Google Sign Up Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleGoogleSignup}
                                disabled={isGoogleLoading}
                                className="w-full relative group/google mb-4"
                            >
                                <div className="absolute inset-0 bg-white/5 rounded-lg blur opacity-0 group-hover/google:opacity-70 transition-opacity duration-300" />

                                <div className="relative overflow-hidden bg-white/5 text-white font-medium h-10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-2">
                                    {isGoogleLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            <span className="text-white/80 group-hover/google:text-white transition-colors text-sm">
                                                Continue with Google
                                            </span>
                                        </>
                                    )}
                                </div>
                            </motion.button>

                            {/* Divider */}
                            <div className="relative mt-4 mb-4 flex items-center">
                                <div className="flex-grow border-t border-white/5"></div>
                                <motion.span
                                    className="mx-3 text-xs text-white/40"
                                    initial={{ opacity: 0.7 }}
                                    animate={{ opacity: [0.7, 0.9, 0.7] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    or
                                </motion.span>
                                <div className="flex-grow border-t border-white/5"></div>
                            </div>

                            {/* Signup Form */}
                            <form onSubmit={handleSignup} className="space-y-3">
                                {/* Name Field */}
                                <motion.div
                                    className={`relative ${focusedInput === "name" ? 'z-10' : ''}`}
                                    whileFocus={{ scale: 1.02 }}
                                    whileHover={{ scale: 1.01 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <div className="relative flex items-center overflow-hidden rounded-lg">
                                        <User className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "name" ? 'text-white' : 'text-white/40'
                                            }`} />

                                        <Input
                                            type="text"
                                            placeholder="Full name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            onFocus={() => setFocusedInput("name")}
                                            onBlur={() => setFocusedInput(null)}
                                            className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 transition-all duration-300 pl-10 pr-3 focus:bg-white/10"
                                            required
                                        />
                                    </div>
                                </motion.div>

                                {/* Email Field */}
                                <motion.div
                                    className={`relative ${focusedInput === "email" ? 'z-10' : ''}`}
                                    whileFocus={{ scale: 1.02 }}
                                    whileHover={{ scale: 1.01 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <div className="relative flex items-center overflow-hidden rounded-lg">
                                        <Mail className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "email" ? 'text-white' : 'text-white/40'
                                            }`} />

                                        <Input
                                            type="email"
                                            placeholder="Email address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setFocusedInput("email")}
                                            onBlur={() => setFocusedInput(null)}
                                            className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 transition-all duration-300 pl-10 pr-3 focus:bg-white/10"
                                            required
                                        />
                                    </div>
                                </motion.div>

                                {/* Password Field */}
                                <motion.div
                                    className={`relative ${focusedInput === "password" ? 'z-10' : ''}`}
                                    whileFocus={{ scale: 1.02 }}
                                    whileHover={{ scale: 1.01 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <div className="relative flex items-center overflow-hidden rounded-lg">
                                        <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "password" ? 'text-white' : 'text-white/40'
                                            }`} />

                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedInput("password")}
                                            onBlur={() => setFocusedInput(null)}
                                            className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 transition-all duration-300 pl-10 pr-10 focus:bg-white/10"
                                            required
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 text-white/40 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeClosed className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Password strength indicator */}
                                    {password && (
                                        <div className="mt-2">
                                            <div className="flex gap-1 mb-1">
                                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength.score ? passwordStrength.color : 'bg-white/10'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-xs ${passwordStrength.score <= 2 ? 'text-red-400' :
                                                passwordStrength.score <= 4 ? 'text-yellow-400' : 'text-green-400'
                                                }`}>
                                                {passwordStrength.label}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Confirm Password Field */}
                                <motion.div
                                    className={`relative ${focusedInput === "confirmPassword" ? 'z-10' : ''}`}
                                    whileFocus={{ scale: 1.02 }}
                                    whileHover={{ scale: 1.01 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                >
                                    <div className="relative flex items-center overflow-hidden rounded-lg">
                                        <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${focusedInput === "confirmPassword" ? 'text-white' : 'text-white/40'
                                            }`} />

                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            onFocus={() => setFocusedInput("confirmPassword")}
                                            onBlur={() => setFocusedInput(null)}
                                            className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 transition-all duration-300 pl-10 pr-10 focus:bg-white/10"
                                            required
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 text-white/40 hover:text-white transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeClosed className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Password match indicator */}
                                    {confirmPassword && (
                                        <div className="mt-1 flex items-center gap-1">
                                            {passwordsMatch ? (
                                                <>
                                                    <Check className="w-3 h-3 text-green-400" />
                                                    <span className="text-xs text-green-400">Passwords match</span>
                                                </>
                                            ) : passwordsDontMatch ? (
                                                <>
                                                    <X className="w-3 h-3 text-red-400" />
                                                    <span className="text-xs text-red-400">Passwords don't match</span>
                                                </>
                                            ) : null}
                                        </div>
                                    )}
                                </motion.div>

                                {/* Submit Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isLoading || !!passwordsDontMatch}
                                    className="w-full relative group/button mt-5"
                                >
                                    <div className="absolute inset-0 bg-white/10 rounded-lg blur-lg opacity-0 group-hover/button:opacity-70 transition-opacity duration-300" />

                                    <div className={cn(
                                        "relative overflow-hidden bg-white text-black font-medium h-10 rounded-lg transition-all duration-300 flex items-center justify-center",
                                        (isLoading || passwordsDontMatch) && "opacity-50 cursor-not-allowed"
                                    )}>
                                        <AnimatePresence mode="wait">
                                            {isLoading ? (
                                                <motion.div
                                                    key="loading"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center justify-center"
                                                >
                                                    <div className="w-4 h-4 border-2 border-black/70 border-t-transparent rounded-full animate-spin" />
                                                </motion.div>
                                            ) : (
                                                <motion.span
                                                    key="button-text"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex items-center justify-center gap-1 text-sm font-medium"
                                                >
                                                    Create Account
                                                    <ArrowRight className="w-3 h-3 group-hover/button:translate-x-1 transition-transform duration-300" />
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.button>
                            </form>

                            {/* Login Link */}
                            <motion.p
                                className="text-center text-xs text-white/60 mt-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                Already have an account?{' '}
                                <Link
                                    href="/login"
                                    className="relative inline-block group/login"
                                >
                                    <span className="relative z-10 text-white group-hover/login:text-purple-300 transition-colors duration-300 font-medium">
                                        Sign in
                                    </span>
                                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-purple-300 group-hover/login:w-full transition-all duration-300" />
                                </Link>
                            </motion.p>

                            {/* Back to Home Link */}
                            <motion.p
                                className="text-center text-xs text-white/60 mt-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                <Link
                                    href="/"
                                    className="relative inline-block group/home"
                                >
                                    <span className="relative z-10 text-white/60 group-hover/home:text-white/70 transition-colors duration-300">
                                        ← Back to Home
                                    </span>
                                </Link>
                            </motion.p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
