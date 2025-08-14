import { ethers } from 'ethers';
import { contractService } from './contracts';

export interface QRCodeData {
  tokenId: number;
  eventId: string; // Database event UUID instead of contract address
  signature: string;
  timestamp: number;
  nonce?: string; // Optional for backward compatibility
}

export interface VerificationResult {
  isValid: boolean;
  tokenId?: number;
  owner?: string;
  isUsed?: boolean;
  error?: string;
}

export class QRVerificationService {
  private static readonly SECRET_KEY = import.meta.env.VITE_QR_SECRET_KEY || 'default-secret-key';

  static generateQRCodeData(tokenId: number, eventId: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.random().toString(36).substring(2, 15); // Random nonce
    
    const message = `${tokenId}-${eventId}-${timestamp}-${nonce}`;
    
    const signature = ethers.keccak256(ethers.toUtf8Bytes(message + this.SECRET_KEY));
    
    const qrData: QRCodeData = {
      tokenId,
      eventId,
      signature,
      timestamp,
      nonce
    };
    
    return JSON.stringify(qrData);
  }

  static parseQRCodeData(qrString: string): QRCodeData | null {
    try {
      const data = JSON.parse(qrString);
      
      if (!data.tokenId || !data.eventId || !data.signature || !data.timestamp) {
        return null;
      }
      
      return data as QRCodeData;
    } catch (error) {
      console.error('Failed to parse QR code data:', error);
      return null;
    }
  }

  static validateSignature(qrData: QRCodeData): boolean {
    try {
      const nonce = qrData.nonce || ''; // Handle backward compatibility
      const message = `${qrData.tokenId}-${qrData.eventId}-${qrData.timestamp}${nonce ? '-' + nonce : ''}`;
      const expectedSignature = ethers.keccak256(ethers.toUtf8Bytes(message + this.SECRET_KEY));
      
      return expectedSignature === qrData.signature;
    } catch (error) {
      console.error('Signature validation failed:', error);
      return false;
    }
  }

  static async verifyTicketQR(qrString: string, skipBlockchain: boolean = true): Promise<VerificationResult> {
    try {
      const qrData = this.parseQRCodeData(qrString);
      
      if (!qrData) {
        return {
          isValid: false,
          error: 'Invalid QR code format'
        };
      }

      if (!this.validateSignature(qrData)) {
        return {
          isValid: false,
          error: 'Invalid QR code signature - possible forgery'
        };
      }

      // Check if QR code has expired (30 seconds for dynamic QR codes)
      if (this.isQRCodeExpired(qrData.timestamp, 30/(60*60))) { // 30 seconds = 30/3600 hours
        return {
          isValid: false,
          error: 'QR code has expired. Please refresh your ticket.'
        };
      }

      // Check if ticket exists in database using both token_id and event_id
      // Use service role client to bypass RLS for venue staff verification
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseServiceRole = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!, // Need service role key
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      console.log('Searching for ticket - tokenId:', qrData.tokenId, 'eventId:', qrData.eventId);
      
      const { data: ticketData, error: dbError } = await supabaseServiceRole
        .from('tickets')
        .select('is_used, used_at, owner_id, token_id')
        .eq('token_id', qrData.tokenId.toString())
        .eq('event_id', qrData.eventId)
        .maybeSingle();

      if (dbError) {
        console.error('Database error details:', dbError);
        return {
          isValid: false,
          tokenId: qrData.tokenId,
          error: `Database error: ${dbError.message}`
        };
      }

      if (!ticketData) {
        return {
          isValid: false,
          tokenId: qrData.tokenId,
          error: `Ticket not found - tokenId: ${qrData.tokenId}, eventId: ${qrData.eventId}, timestamp: ${qrData.timestamp}`
        };
      }

      if (ticketData?.is_used) {
        return {
          isValid: false,
          tokenId: qrData.tokenId,
          isUsed: true,
          error: `Ticket already used${ticketData.used_at ? ' on ' + new Date(ticketData.used_at).toLocaleString() : ''}`
        };
      }

      if (!skipBlockchain) {
        // Optional blockchain validation (requires Web3)
        try {
          const isTicketValid = await contractService.isTicketValid(
            qrData.contractAddress, 
            qrData.tokenId
          );

          if (!isTicketValid) {
            return {
              isValid: false,
              tokenId: qrData.tokenId,
              error: 'Ticket does not exist on blockchain'
            };
          }

          const owner = await contractService.checkTicketOwnership(
            qrData.contractAddress,
            qrData.tokenId
          );

          return {
            isValid: true,
            tokenId: qrData.tokenId,
            owner,
            isUsed: false
          };
        } catch (error: any) {
          console.warn('Blockchain verification failed, falling back to database-only:', error.message);
        }
      }

      // Database-only verification (works without Web3)
      return {
        isValid: true,
        tokenId: qrData.tokenId,
        owner: ticketData?.owner_id,
        isUsed: false
      };

    } catch (error: any) {
      console.error('QR verification failed:', error);
      return {
        isValid: false,
        error: `Verification failed: ${error.message || 'Unknown error'}`
      };
    }
  }

  static async markTicketAsUsed(eventId: string, tokenId: number): Promise<{success: boolean; error?: string}> {
    try {
      // Use service role client to bypass RLS for venue staff
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseServiceRole = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      // Update ticket as used in database only (no gas fees)
      const { data, error } = await supabaseServiceRole
        .from('tickets')
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('token_id', tokenId.toString())
        .eq('event_id', eventId)
        .select();

      if (error) {
        console.error('Database error:', error);
        return {
          success: false,
          error: 'Failed to update ticket status in database'
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Ticket not found in database'
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Failed to mark ticket as used:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  static generateQRCodeURL(qrData: string): string {
    const encodedData = encodeURIComponent(qrData);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
  }

  static isQRCodeExpired(timestamp: number, maxAgeHours: number = 24): boolean {
    const now = Math.floor(Date.now() / 1000);
    const maxAge = maxAgeHours * 60 * 60;
    return (now - timestamp) > maxAge;
  }
}

export default QRVerificationService;