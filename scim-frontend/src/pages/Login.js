import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Package, LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative z-10 flex flex-col justify-center px-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-sm bg-primary flex items-center justify-center">
              <Package className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                NEXUSLOGISTICS
              </h1>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Supply Chain Command</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Real-time inventory tracking, supplier management, and demand forecasting in one powerful platform.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div>
              <p className="kpi-value text-primary">24/7</p>
              <p className="data-label mt-1">Monitoring</p>
            </div>
            <div>
              <p className="kpi-value text-accent">99.9%</p>
              <p className="data-label mt-1">Uptime</p>
            </div>
            <div>
              <p className="kpi-value text-emerald-400">5K+</p>
              <p className="data-label mt-1">SKUs Tracked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-sm bg-primary flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              NEXUSLOGISTICS
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              Welcome Back
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="h-10"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? (
                <span className="loading-spinner" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className="text-primary hover:underline font-medium"
              data-testid="signup-link"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
