
export const TwilioService = {
  /**
   * Sends a generic SMS.
   * Strategy:
   * 1. Try Backend Server (Avoids CORS).
   * 2. If Backend fails (Network Error OR Twilio Error), Fallback to Simulation Mode.
   * 
   * This ensures the user ALWAYS sees a success/mock state and is never blocked.
   */
  async sendSms(to: string, bodyText: string): Promise<{ success: boolean; isMock: boolean; error?: any }> {
    const cleanTo = to.replace(/[^+\d]/g, '');
    const apiUrl = 'http://127.0.0.1:5000/api/send-sms';

    console.log(`[TwilioService] Attempting to send SMS to ${cleanTo} via Backend...`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: cleanTo, body: bodyText })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("✅ [TwilioService] SMS Sent via Backend.");
        return { success: true, isMock: false };
      } else {
        // Backend was reached but returned an error (e.g. Unverified Number).
        // Surface this to the caller instead of falling back to a mock OTP.
        console.warn("⚠️ [TwilioService] Backend reported error:", data);
        return { success: false, isMock: false, error: data };
      }
    } catch (error) {
      // Network / fetch failure: keep the existing fallback behavior so the UI
      // is not blocked in local/offline dev, but distinguish this from a
      // backend-reported Twilio error (which is returned above).
      console.error('❌ [TwilioService] Backend/Network Failed:', error);
      console.warn('🔄 [TwilioService] Falling back to Simulation Mode so UI continues.');

      return { success: true, isMock: true, error };
    }
  },

  /**
   * Generates a random 6 digit OTP and sends it.
   */
  async sendOTP(phoneNumber: string, customMessage?: string): Promise<{ success: boolean; otp?: string; error?: string; isMock?: boolean }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const prefix = customMessage || `Verification Service from AgriQNet Team`;
    const messageBody = `${prefix}. Your code is: ${otp}`;

    const result = await this.sendSms(phoneNumber, messageBody);

    if (result.success) {
      return { success: true, otp, isMock: result.isMock };
    } else {
      // Backend reached but returned an error (do not fabricate an OTP).
      // Pass the backend error object to the caller so the UI can show it.
      return { success: false, error: result.error, isMock: result.isMock };
    }
  }
};
