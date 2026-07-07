// Twilio Voice Service - Uses Edge Functions for calls
import { supabase, callEdgeFunction } from './supabase';
import { sendLocalNotification } from './notifications';

export interface CallOptions {
  to: string;
  from?: string;
  organizationId: string;
}

export interface CallEvent {
  type: 'connecting' | 'ringing' | 'connected' | 'disconnected' | 'error';
  callSid?: string;
  error?: string;
}

type CallEventHandler = (event: CallEvent) => void;

class TwilioVoiceService {
  private eventHandlers: Map<string, CallEventHandler> = new Map();
  private activeCallSid: string | null = null;

  async makeCall(options: CallOptions): Promise<{ success: boolean; callSid?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create call record in database
      const { data: call, error: dbError } = await supabase
        .from('calls')
        .insert({
          organization_id: options.organizationId,
          direction: 'outbound',
          status: 'ringing',
          from_number: options.from || '',
          to_number: options.to,
          initiated_by: user?.id,
        })
        .select()
        .single();

      if (dbError) return { success: false, error: dbError.message };

      // Call edge function to initiate Twilio call
      const { data, error } = await callEdgeFunction('outbound-call', {
        organizationId: options.organizationId,
        to: options.to,
        from: options.from,
        callId: call.id,
      });

      if (error) {
        // Update call status to failed
        await supabase.from('calls').update({ status: 'failed' }).eq('id', call.id);
        return { success: false, error };
      }

      this.activeCallSid = data?.callSid || call.id;
      this.emit({ type: 'ringing', callSid: this.activeCallSid || undefined });

      // Send local notification
      await sendLocalNotification('Calling...', `Calling ${options.to}`, {
        type: 'outbound_call',
        callId: call.id,
      });

      return { success: true, callSid: this.activeCallSid || undefined };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to make call' };
    }
  }

  async endCall(): Promise<void> {
    if (!this.activeCallSid) return;

    try {
      await callEdgeFunction('end-call', { callSid: this.activeCallSid });

      // Update call status
      await supabase
        .from('calls')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', this.activeCallSid);

      this.activeCallSid = null;
      this.emit({ type: 'disconnected' });
    } catch (e) {
      console.error('Failed to end call:', e);
    }
  }

  async sendDtmf(digit: string): Promise<boolean> {
    if (!this.activeCallSid) return false;
    try {
      await callEdgeFunction('send-dtmf', { callSid: this.activeCallSid, digit });
      return true;
    } catch (e) {
      return false;
    }
  }

  onEvent(handler: CallEventHandler): () => void {
    const id = Math.random().toString();
    this.eventHandlers.set(id, handler);
    return () => { this.eventHandlers.delete(id); };
  }

  private emit(event: CallEvent) {
    this.eventHandlers.forEach(handler => handler(event));
  }

  isInCall(): boolean {
    return this.activeCallSid !== null;
  }

  getActiveCallSid(): string | null {
    return this.activeCallSid;
  }
}

export const twilioVoice = new TwilioVoiceService();
