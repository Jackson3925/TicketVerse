import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, EyeOff, Mail, Lock, User, ShoppingCart, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface CombinedAuthFormProps {
  mode?: "login" | "signup";
  onSuccess?: (userRole: string) => void;
  className?: string;
}

const CombinedAuthForm = ({ 
  mode: initialMode = "login", 
  onSuccess, 
  className = "" 
}: CombinedAuthFormProps) => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState(initialMode);
  const [userRole, setUserRole] = useState<'buyer' | 'seller'>('buyer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      return "Email is required";
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Please enter a valid email address";
    }
    
    if (!formData.password) {
      return "Password is required";
    }
    
    if (formData.password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    
    if (mode === "signup") {
      if (!formData.displayName.trim()) {
        return "Display name is required";
      }
      
      if (formData.password !== formData.confirmPassword) {
        return "Passwords do not match";
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        // For login, we don't need to specify role - it will be determined from the user's profile
        await signIn(formData.email.trim(), formData.password);
        
        // Let the parent handle success with user role detection
        if (onSuccess) {
          onSuccess(userRole); // This will be overridden by the actual user role in the parent
        }
      } else {
        // For signup, we use the selected role
        const roleForSignup = userRole === 'buyer' ? 'customer' : 'seller';
        await signUp(formData.email.trim(), formData.password, formData.displayName.trim(), roleForSignup);
        
        // Store email for verification page
        localStorage.setItem('pendingVerificationEmail', formData.email.trim());
        
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
        
        // Navigate to verification page
        navigate(`/auth/verify-email?email=${encodeURIComponent(formData.email.trim())}`);
        return;
      }
      
      // Reset form
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        displayName: ""
      });
      
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || "An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === "login" ? "signup" : "login");
    setError(null);
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      displayName: ""
    });
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="flex items-center space-x-1">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <Store className="h-5 w-5 text-orange-600" />
          </div>
          <span className="text-lg font-semibold">Concert Platform</span>
        </div>
        <CardTitle className="text-2xl text-center">
          {mode === "login" ? "Sign In" : "Create Account"}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === "login" 
            ? "Welcome back! Sign in to your account" 
            : "Join our platform as a customer or seller"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {mode === "signup" && (
          <Tabs value={userRole} onValueChange={(value) => setUserRole(value as 'buyer' | 'seller')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buyer" className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4" />
                <span>Customer</span>
              </TabsTrigger>
              <TabsTrigger value="seller" className="flex items-center space-x-2">
                <Store className="h-4 w-4" />
                <span>Seller</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="buyer" className="mt-4">
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Join as a <strong>Customer</strong> to browse events, buy tickets, and manage your collection
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="seller" className="mt-4">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Join as a <strong>Seller</strong> to create events, manage sales, and grow your business
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter your display name"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange("displayName", e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  required={mode === "signup"}
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="pl-10 pr-10"
                disabled={loading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className="pl-10 pr-10"
                  disabled={loading}
                  required={mode === "signup"}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "login" ? "Signing In..." : "Creating Account..."}
              </>
            ) : (
              mode === "login" ? "Sign In" : `Create ${userRole === 'buyer' ? 'Customer' : 'Seller'} Account`
            )}
          </Button>
        </form>
        
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={toggleMode}
            disabled={loading}
          >
            {mode === "login" 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CombinedAuthForm;