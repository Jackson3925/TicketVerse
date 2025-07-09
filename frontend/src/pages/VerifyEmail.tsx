import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { auth } = useAuth();
  const { toast } = useToast();
  
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isResending, setIsResending] = useState(false);

  // Get email from URL params or storage
  const email = searchParams.get('email') || localStorage.getItem('pendingVerificationEmail') || '';

  useEffect(() => {
    // Check if there's a verification token in the URL
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (token && type) {
      handleEmailVerification(token, type as 'email' | 'recovery');
    }
  }, [searchParams]);

  const handleEmailVerification = async (token: string, type: 'email' | 'recovery') => {
    try {
      const { error } = await auth.verifyEmail(token, type);
      
      if (error) {
        setVerificationStatus('error');
        setErrorMessage(error.message || 'Failed to verify email. Please try again.');
      } else {
        setVerificationStatus('success');
        toast({
          title: "Email Verified!",
          description: "Your email has been successfully verified. You can now sign in.",
        });
        
        // Clear any pending verification email from storage
        localStorage.removeItem('pendingVerificationEmail');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth/login');
        }, 3000);
      }
    } catch (error) {
      setVerificationStatus('error');
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "No email address found. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await auth.resetPassword({ 
        email, 
        redirectTo: `${window.location.origin}/auth/verify-email?email=${encodeURIComponent(email)}` 
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Verification Email Sent",
        description: "Please check your email for the verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Email Verification</h1>
          <p className="text-xl text-primary-foreground/90">
            Please verify your email address to complete your registration
          </p>
        </div>
      </div>

      {/* Verification Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {verificationStatus === 'success' ? (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                ) : verificationStatus === 'error' ? (
                  <AlertCircle className="h-16 w-16 text-destructive" />
                ) : (
                  <Mail className="h-16 w-16 text-primary" />
                )}
              </div>
              
              <CardTitle className="text-2xl">
                {verificationStatus === 'success' ? "Email Verified!" :
                 verificationStatus === 'error' ? "Verification Failed" :
                 "Check Your Email"}
              </CardTitle>
              
              <CardDescription className="text-center">
                {verificationStatus === 'success' ? (
                  "Your email has been successfully verified. Redirecting to login..."
                ) : verificationStatus === 'error' ? (
                  "There was an issue verifying your email address."
                ) : (
                  <>
                    We've sent a verification link to{" "}
                    <span className="font-semibold">{email}</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {verificationStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              {verificationStatus === 'pending' && (
                <div className="space-y-4">
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Please check your email and click the verification link to activate your account.</p>
                    <p className="mt-2">The link will expire in 24 hours.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={handleResendVerification}
                      disabled={isResending}
                      variant="outline"
                      className="w-full"
                    >
                      {isResending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={handleBackToLogin}
                      variant="ghost"
                      className="w-full"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Login
                    </Button>
                  </div>
                </div>
              )}
              
              {verificationStatus === 'success' && (
                <div className="text-center">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Your account is now active! You will be redirected to the login page in a few seconds.
                    </p>
                    <Button 
                      onClick={handleBackToLogin}
                      className="w-full"
                    >
                      Continue to Login
                    </Button>
                  </div>
                </div>
              )}
              
              {verificationStatus === 'error' && (
                <div className="space-y-2">
                  <Button 
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="w-full"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleBackToLogin}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Help Section */}
          <div className="mt-8 text-center">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Check your spam or junk folder for the verification email</p>
                  <p>• Make sure you entered the correct email address</p>
                  <p>• The verification link expires in 24 hours</p>
                  <p>• Contact support if you continue to have issues</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;