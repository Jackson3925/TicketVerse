import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Wallet } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWeb3 } from '@/hooks/useWeb3'
import { useToast } from '@/hooks/use-toast'

interface WalletAuthFormProps {
  onSuccess?: () => void
  className?: string
}

export const WalletAuthForm = ({ onSuccess, className }: WalletAuthFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [userType, setUserType] = useState<'buyer' | 'seller'>('buyer')
  
  const { signInWithWallet, signUpWithWallet } = useAuth()
  const { connectWallet, wallet, isConnected, isConnecting } = useWeb3()
  const { toast } = useToast()

  const handleWalletConnect = async () => {
    if (!isConnected) {
      try {
        await connectWallet()
      } catch (error) {
        console.error('Wallet connection failed:', error)
        setError('Failed to connect wallet. Please try again.')
        return
      }
    }

    if (!wallet?.address) {
      setError('No wallet address found')
      return
    }

    await handleWalletAuth(wallet.address)
  }

  const handleWalletAuth = async (walletAddress: string) => {
    setIsLoading(true)
    setError(null)

    try {
      if (isRegistering) {
        if (!displayName.trim()) {
          setError('Display name is required for registration')
          return
        }
        
        await signUpWithWallet(walletAddress, displayName.trim(), userType)
        toast({
          title: "Registration Successful",
          description: `Welcome ${displayName}! Your wallet has been linked to your account.`,
        })
      } else {
        await signInWithWallet(walletAddress)
        toast({
          title: "Login Successful", 
          description: `Logged in with wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        })
      }
      
      onSuccess?.()
    } catch (error: any) {
      console.error('Wallet authentication error:', error)
      
      if (error.message?.includes('Wallet address mismatch')) {
        setError('This wallet doesn\'t match your registered wallet address. Please connect with the correct wallet or register a new account.')
      } else if (error.message?.includes('Wallet address not found')) {
        setError('Wallet not registered. Please sign up first or use a registered wallet.')
        setIsRegistering(true)
      } else if (error.message?.includes('Wallet address already registered')) {
        setError('Wallet already registered. Please try signing in instead.')
        setIsRegistering(false)
      } else {
        setError(error.message || 'Authentication failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegistering(!isRegistering)
    setError(null)
    setDisplayName('')
    setUserType('buyer')
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {isRegistering ? 'Register with Wallet' : 'Login with Wallet'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isConnected && wallet && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Connected Wallet</Label>
              <p className="text-sm text-muted-foreground">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </p>
              <p className="text-xs text-muted-foreground">
                Balance: {parseFloat(wallet.balance).toFixed(4)} ETH
              </p>
            </div>
          )}

          {isRegistering && (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userType">Account Type</Label>
                <Select value={userType} onValueChange={(value: 'buyer' | 'seller') => setUserType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer (Purchase tickets)</SelectItem>
                    <SelectItem value="seller">Seller (Create events)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button
            onClick={handleWalletConnect}
            disabled={isLoading || isConnecting || (isRegistering && !displayName.trim())}
            className="w-full"
          >
            {isLoading || isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isConnecting ? 'Connecting...' : 'Authenticating...'}
              </>
            ) : !isConnected ? (
              'Connect Wallet'
            ) : isRegistering ? (
              'Register with Wallet'
            ) : (
              'Login with Wallet'
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={toggleMode}
              disabled={isLoading}
              className="text-sm"
            >
              {isRegistering 
                ? 'Already have an account? Sign in' 
                : 'Need an account? Register'
              }
            </Button>
          </div>

          {!isConnected && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Make sure you have MetaMask or another Web3 wallet installed</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WalletAuthForm