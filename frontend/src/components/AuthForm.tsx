import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Store, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthFormProps {
  mode?: "login" | "signup";
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

const AuthForm = ({ 
  mode: initialMode = "login", 
  onSuccess, 
  redirectTo,
  className = "" 
}: AuthFormProps) => {
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
    displayName: "",
    userRole: "customer" // Default to customer
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
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
          description: "You have successfully signed in.",
        });
      } else {
        await signUp(formData.email.trim(), formData.password, formData.displayName.trim(), formData.userRole);
        toast({
          title: "Account created!",
          description: `Welcome ${formData.userRole}! Please check your email to verify your account.`,
        });
      }
      
      // Reset form
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        displayName: "",
        userRole: "customer"
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
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
      displayName: "",
      userRole: "customer"
    });
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === "login" 
            ? "Sign in to your account to continue" 
            : "Sign up to start creating and selling events"
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
          
          {mode === "signup" && (
            <div className="space-y-3">
              <Label className="text-base font-medium">I want to register as:</Label>
              <RadioGroup 
                value={formData.userRole} 
                onValueChange={(value) => handleInputChange("userRole", value)}
                className="grid grid-cols-1 gap-4"
              >
                <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="customer" id="customer" />
                  <div className="flex items-center space-x-3 flex-1">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <div>
                      <Label htmlFor="customer" className="font-medium cursor-pointer">
                        Customer
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Browse events and purchase tickets
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="seller" id="seller" />
                  <div className="flex items-center space-x-3 flex-1">
                    <Store className="h-5 w-5 text-primary" />
                    <div>
                      <Label htmlFor="seller" className="font-medium cursor-pointer">
                        Event Seller
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Create and manage events, sell tickets
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
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
              mode === "login" ? "Sign In" : "Create Account"
            )}
          </Button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            </span>
          </div>
        </div>
        
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={toggleMode}
          disabled={loading}
        >
          {mode === "login" ? "Create Account" : "Sign In"}
        </Button>
        
        {mode === "login" && (
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="text-sm text-muted-foreground hover:text-primary"
              disabled={loading}
            >
              Forgot your password?
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthForm;