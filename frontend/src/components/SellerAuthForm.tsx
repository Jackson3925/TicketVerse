import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SellerAuthFormProps {
  mode?: "login" | "signup";
  onSuccess?: () => void;
  className?: string;
}

const SellerAuthForm = ({ 
  mode: initialMode = "login", 
  onSuccess, 
  className = "" 
}: SellerAuthFormProps) => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    businessName: ""
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
      
      if (!formData.businessName.trim()) {
        return "Business/Organization name is required";
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
        await signIn(formData.email.trim(), formData.password);
        toast({
          title: "Welcome back!",
          description: "You're logged in as a seller.",
        });
        
        // Reset form
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          displayName: "",
          businessName: ""
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        await signUp(formData.email.trim(), formData.password, formData.displayName.trim(), "seller");
        toast({
          title: "Seller Account Created!",
          description: "Please check your email to verify your account.",
        });
        
        // Store email for verification page and redirect
        localStorage.setItem('pendingVerificationEmail', formData.email.trim());
        navigate(`/auth/verify-email?email=${encodeURIComponent(formData.email.trim())}`);
      }
      
    } catch (err: any) {
      console.error('Seller auth error:', err);
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
      displayName: "",
      businessName: ""
    });
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Store className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Seller Portal</span>
        </div>
        <CardTitle className="text-2xl text-center">
          {mode === "login" ? "Seller Login" : "Join as Seller"}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === "login" 
            ? "Access your seller dashboard and manage events" 
            : "Create your seller account to start selling tickets"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayName">Contact Person Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your full name"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange("displayName", e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    required={mode === "signup"}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="businessName">Business/Organization Name</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Your business or organization name"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    required={mode === "signup"}
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Business email address"
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
          
          {mode === "signup" && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Seller Benefits:</strong> Create unlimited events, access analytics dashboard, 
                manage customer relationships, and control resale settings.
              </p>
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
                {mode === "login" ? "Signing In..." : "Creating Seller Account..."}
              </>
            ) : (
              mode === "login" ? "Sign In as Seller" : "Create Seller Account"
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
              ? "Don't have a seller account? Sign up" 
              : "Already have a seller account? Sign in"
            }
          </Button>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          Looking to buy tickets?{" "}
          <Button variant="link" className="p-0 h-auto font-normal">
            Switch to Customer Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SellerAuthForm;