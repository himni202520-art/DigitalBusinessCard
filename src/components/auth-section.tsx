import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, UserPlus, LogOut, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { authService } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export function AuthSection() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  // Handle post-signup auto-create
  useEffect(() => {
    const handlePostSignup = async () => {
      if (!user) return;

      const scannedSlug = localStorage.getItem('scannedCardSlug');
      if (!scannedSlug) return;

      try {
        // 1. Create default business card for new user
        const defaultSlug = `${user.email.split('@')[0]}-${user.id.substring(0, 8)}`;
        const { error: cardError } = await supabase
          .from('business_cards')
          .insert({
            user_id: user.id,
            name: user.username || user.email.split('@')[0],
            job_title: '',
            company_name: '',
            email: user.email,
            slug: defaultSlug,
          });

        if (cardError && cardError.code !== '23505') {
          console.error('Error creating default card:', cardError);
        }

        // 2. Get original card owner info
        const { data: originalCard, error: fetchError } = await supabase
          .from('business_cards')
          .select('user_id, name, email, mobile, whatsapp, linkedin')
          .eq('slug', scannedSlug)
          .single();

        if (originalCard && !fetchError) {
          // 3. Add original card owner as first contact
          const { error: contactError } = await supabase
            .from('contacts')
            .insert({
              owner_user_id: user.id,
              viewer_user_id: originalCard.user_id,
              card_slug: scannedSlug,
              name: originalCard.name,
              email: originalCard.email,
              mobile: originalCard.mobile,
              whatsapp: originalCard.whatsapp,
              linkedin_url: originalCard.linkedin,
            });

          if (contactError && contactError.code !== '23505') {
            console.error('Error adding first contact:', contactError);
          }
        }

        // Clear the stored slug
        localStorage.removeItem('scannedCardSlug');

        // Redirect to CRM
        navigate('/crm');
      } catch (error) {
        console.error('Post-signup setup error:', error);
      }
    };

    handlePostSignup();
  }, [user, navigate]);

  const handleSendOtp = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.sendOtp(email);
      setOtpSent(true);
      toast({
        title: 'OTP Sent',
        description: 'Check your email for the verification code.',
      });
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !otp || !password) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const user = await authService.verifyOtpAndSetPassword(email, otp, password);
      login(authService.mapUser(user));
      toast({
        title: 'Welcome!',
        description: 'Setting up your account...',
      });
      // Post-signup flow handled by useEffect
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: 'Sign Up Failed',
        description: error.message || 'Please check your OTP and try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: 'Missing Fields',
        description: 'Please enter both email and password.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const user = await authService.signInWithPassword(email, password);
      login(authService.mapUser(user));
      toast({
        title: 'Welcome Back!',
        description: 'You have been signed in successfully.',
      });
      navigate('/my-card');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: 'Sign In Failed',
        description: error.message || 'Invalid email or password.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      logout();
      setEmail('');
      setPassword('');
      setOtp('');
      setOtpSent(false);
      toast({
        title: 'Signed Out',
        description: 'You have been signed out successfully.',
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign out.',
        variant: 'destructive',
      });
    }
  };

  if (user) {
    return (
      <Card className="p-4 card-shadow bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Signed in as</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 card-shadow bg-card">
      <div className="flex justify-center gap-2 mb-4">
        <Button
          variant={isLogin ? 'default' : 'outline'}
          onClick={() => {
            setIsLogin(true);
            setOtpSent(false);
            setOtp('');
          }}
          size="sm"
          disabled={loading}
        >
          Sign In
        </Button>
        <Button
          variant={!isLogin ? 'default' : 'outline'}
          onClick={() => {
            setIsLogin(false);
            setOtpSent(false);
            setOtp('');
          }}
          size="sm"
          disabled={loading}
        >
          Sign Up
        </Button>
      </div>

      {isLogin ? (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full gradient-bg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <div className="flex gap-2">
              <Input
                id="signup-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || otpSent}
                className="flex-1"
              />
              {!otpSent && (
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-1" />
                      Send OTP
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {otpSent && (
            <>
              <div className="space-y-2">
                <Label htmlFor="signup-otp">Verification Code</Label>
                <Input
                  id="signup-otp"
                  type="text"
                  placeholder="Enter OTP from email"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full gradient-bg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Complete Sign Up
                  </>
                )}
              </Button>
            </>
          )}
        </form>
      )}
    </Card>
  );
}
