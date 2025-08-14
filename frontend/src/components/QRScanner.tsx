import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Camera, Check, X, AlertTriangle, Scan, User, Clock, Hash } from "lucide-react";
import { QRVerificationService, type VerificationResult } from "@/lib/qrVerification";
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onTicketVerified?: (result: VerificationResult) => void;
  eventId?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onTicketVerified, eventId }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastScannedTicket, setLastScannedTicket] = useState<string>('');
  const [scanCooldown, setScanCooldown] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  const startCamera = async () => {
    try {
      console.log('Starting QR Scanner...');
      
      if (!videoRef.current) {
        console.error('Video element not found');
        return;
      }

      // Create QR Scanner instance
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data);
          
          // Verify the scanned QR code
          verifyTicket(result.data);
        },
        {
          preferredCamera: 'environment', // Use back camera
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      // Start the scanner
      await qrScannerRef.current.start();
      console.log('QR Scanner started successfully');
      setIsScanning(true);

    } catch (error: any) {
      console.error('Failed to start QR scanner:', error);
      
      let errorMessage = 'Unable to start QR scanner. ';
      
      // Mobile-specific error handling
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        errorMessage += 'Camera access requires HTTPS on mobile devices.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'QR scanning is not supported on this device/browser.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      errorMessage += ' Please use manual input below.';
      alert(errorMessage);
    }
  };

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const verifyTicket = async (qrData: string) => {
    if (scanCooldown) {
      return; // Block all scanning during cooldown
    }

    console.log('Processing QR scan...');
    setIsVerifying(true);
    setScanCooldown(true);
    
    // Pause the QR scanner during processing
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }

    try {
      const result = await QRVerificationService.verifyTicketQR(qrData);
      setVerificationResult(result);
      
      if (onTicketVerified) {
        onTicketVerified(result);
      }

      // If verification is successful, mark ticket as used
      if (result.isValid && result.tokenId) {
        const qrCodeData = QRVerificationService.parseQRCodeData(qrData);
        if (qrCodeData) {
          const markUsedResult = await QRVerificationService.markTicketAsUsed(
            qrCodeData.eventId,
            qrCodeData.tokenId
          );
          
          if (!markUsedResult.success) {
            console.warn('Failed to mark ticket as used:', markUsedResult.error);
          }
        }
      }
    } catch (error: any) {
      setVerificationResult({
        isValid: false,
        error: `Verification failed: ${error.message}`
      });
    } finally {
      setIsVerifying(false);
      
      // Reset cooldown and restart scanner after 3 seconds
      setTimeout(() => {
        console.log('Cooldown reset - restarting scanner');
        setScanCooldown(false);
        
        // Restart the QR scanner
        if (qrScannerRef.current && videoRef.current) {
          qrScannerRef.current.start();
        }
      }, 3000);
    }
  };

  const handleManualVerification = () => {
    if (manualInput.trim()) {
      verifyTicket(manualInput.trim());
      setManualInput('');
    }
  };

  const clearResult = () => {
    setVerificationResult(null);
    setLastScannedTicket('');
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Ticket Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Section */}
          <div className="space-y-2">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                className={`w-full h-full object-cover ${!isScanning ? 'hidden' : ''}`}
              />
              {!isScanning && (
                <div className="w-full h-full flex items-center justify-center text-white absolute inset-0">
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-75">Camera not active</p>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="flex gap-2">
              {!isScanning ? (
                <Button onClick={startCamera} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <Button onClick={stopCamera} variant="outline" className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Stop Camera
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Manual Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Manual QR Code Input</label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste QR code data here..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleManualVerification}
                disabled={!manualInput.trim() || isVerifying}
              >
                Verify
              </Button>
            </div>
          </div>

          {/* Verification Status */}
          {isVerifying && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Verifying ticket on blockchain...
              </AlertDescription>
            </Alert>
          )}

          {/* Verification Result */}
          {verificationResult && (
            <Alert className={verificationResult.isValid ? "border-green-500" : "border-red-500"}>
              <div className="flex items-start gap-3">
                {verificationResult.isValid ? (
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <X className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <div className="font-medium">
                    {verificationResult.isValid ? "✅ Valid Ticket" : "❌ Invalid Ticket"}
                  </div>
                  
                  {verificationResult.isValid ? (
                    <div className="space-y-1 text-sm">
                      {verificationResult.tokenId && (
                        <div className="flex items-center gap-2">
                          <Hash className="h-3 w-3" />
                          <span>Token ID: {verificationResult.tokenId}</span>
                        </div>
                      )}
                      {verificationResult.owner && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>Owner: {formatAddress(verificationResult.owner)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Status: Entry Granted</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      {verificationResult.error}
                    </div>
                  )}
                  
                  <Button 
                    onClick={clearResult} 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                  >
                    Clear Result
                  </Button>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;