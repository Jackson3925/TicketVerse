import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Mail, Lock, User, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CustomerAuthFormProps {
  mode?: "login" | "signup";
  onSuccess?: () => void;
  className?: string;
}

const CustomerAuthForm = ({ 
  mode: initialMode = "login", 
  onSuccess, 
  className = "" 
}: CustomerAuthFormProps) => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [mode, setMode] = useState(initialMode);
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
        await signIn(formData.email.trim(), formData.password);
        toast({
          title: "Welcome back!",
          description: "You're logged in as a customer.",
        });
      } else {
        await signUp(formData.email.trim(), formData.password, formData.displayName.trim(), "customer");
        toast({
          title: "Customer Account Created!",
          description: "Please check your email to verify your account.",
        });
      }
      
      // Reset form
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        displayName: ""
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (err: any) {
      console.error('Customer auth error:', err);
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
          <ShoppingCart className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Customer Portal</span>
        </div>
        <CardTitle className="text-2xl text-center">
          {mode === "login" ? "Customer Login" : "Join as Customer"}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === "login" 
            ? "Sign in to browse events and manage your tickets" 
            : "Create your customer account to start buying tickets"
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
              mode === "login" ? "Sign In as Customer" : "Create Customer Account"
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
              ? "Don't have a customer account? Sign up" 
              : "Already have an account? Sign in"
            }
          </Button>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          Are you an event organizer?{" "}
          <Button variant="link" className="p-0 h-auto font-normal">
            Switch to Seller Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerAuthForm;