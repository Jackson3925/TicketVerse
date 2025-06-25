import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

type UserRole = 'customer' | 'buyer' | 'seller' | 'admin';

interface UseRoleProtectionProps {
  requiredRole: UserRole;
  redirectTo?: string;
  showToast?: boolean;
}

export const useRoleProtection = ({ 
  requiredRole, 
  redirectTo,
  showToast = true 
}: UseRoleProtectionProps) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Not authenticated - redirect to appropriate auth page
    if (!isAuthenticated) {
      const authPath = requiredRole === 'seller' ? '/auth/seller' : '/auth/customer';
      navigate(authPath);
      return;
    }

    // Authenticated but wrong role
    if (isAuthenticated && user) {
      // Map role names for compatibility ('customer' -> 'buyer')
      const metadataRole = user.user_metadata?.user_role
      const mappedMetadataRole = metadataRole === 'customer' ? 'buyer' : metadataRole
      const userRole = user.userProfile?.user_type || mappedMetadataRole;
      
      // Check role compatibility (allow customer for buyer and vice versa)
      const isRoleCompatible = userRole === requiredRole || 
                              (requiredRole === 'customer' && userRole === 'buyer') ||
                              (requiredRole === 'buyer' && userRole === 'customer')
      
      if (!isRoleCompatible) {
        if (showToast) {
          const messages = {
            seller: {
              title: 'Seller Access Required',
              description: 'This page is only accessible to sellers. Please sign in with a seller account.'
            },
            customer: {
              title: 'Customer Access Required', 
              description: 'This page is only accessible to customers. Please sign in with a customer account.'
            },
            admin: {
              title: 'Admin Access Required',
              description: 'This page is only accessible to administrators.'
            }
          };

          toast({
            title: messages[requiredRole].title,
            description: messages[requiredRole].description,
            variant: 'destructive'
          });
        }

        // Redirect based on user's actual role
        if (redirectTo) {
          navigate(redirectTo);
        } else if (userRole === 'seller') {
          navigate('/seller/dashboard');
        } else if (userRole === 'customer') {
          navigate('/');
        } else {
          navigate('/');
        }
      }
    }
  }, [isAuthenticated, user, requiredRole, navigate, redirectTo, showToast, toast]);

  // Map role names for compatibility ('customer' -> 'buyer')
  const metadataRole = user?.user_metadata?.user_role
  const mappedMetadataRole = metadataRole === 'customer' ? 'buyer' : metadataRole
  const userRole = user?.userProfile?.user_type || mappedMetadataRole;
  // Check role compatibility for access
  const isRoleCompatible = userRole === requiredRole || 
                          (requiredRole === 'customer' && userRole === 'buyer') ||
                          (requiredRole === 'buyer' && userRole === 'customer')
  const hasAccess = isAuthenticated && isRoleCompatible;

  return {
    hasAccess,
    userRole,
    isAuthenticated,
    user
  };
};

// Helper components for role-based rendering
export const CustomerOnly = ({ children }: { children: React.ReactNode }) => {
  const { hasAccess } = useRoleProtection({ requiredRole: 'customer', showToast: false });
  return hasAccess ? <>{children}</> : null;
};

export const SellerOnly = ({ children }: { children: React.ReactNode }) => {
  const { hasAccess } = useRoleProtection({ requiredRole: 'seller', showToast: false });
  return hasAccess ? <>{children}</> : null;
};

// Higher-order component for protecting entire pages
// Hook for general authentication (any role)
export const useAuthRequired = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access this page.',
        variant: 'destructive'
      });
      // Redirect to customer auth by default, they can switch if needed
      navigate('/auth/customer');
    }
  }, [isAuthenticated, navigate, toast]);

  return {
    hasAccess: isAuthenticated,
    user,
    isAuthenticated
  };
};

export const withRoleProtection = (
  Component: React.ComponentType, 
  requiredRole: UserRole,
  redirectTo?: string
) => {
  return function ProtectedComponent(props: any) {
    const { hasAccess } = useRoleProtection({ requiredRole, redirectTo });
    
    // Show loading or redirect while checking access
    if (!hasAccess) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking access permissions...</p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};