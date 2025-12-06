// src/lib/auth.ts
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.email!.split('@')[0],
  };
}

export class AuthService {
  mapUser(user: User): AuthUser {
    return mapSupabaseUser(user);
  }

  /**
   * Send a 6-digit OTP to the given email for SIGN UP.
   */
  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) throw error;
  }

  /**
   * Verify signup OTP and set initial password + username.
   */
  async verifyOtpAndSetPassword(email: string, token: string, password: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email', // email OTP (NOT magic link)
    });
    if (error) throw error;
    if (!data.user) throw new Error('OTP verification failed');

    const username = email.split('@')[0];

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { username },
    });
    if (updateError) throw updateError;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not found after update');
    return user;
  }

  /**
   * Normal sign-in with email + password.
   */
  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Sign in failed');
    return data.user;
  }

  /**
   * Send a password reset OTP to the user's email.
   * (Reset password email template should show {{ .Token }})
   */
  async sendPasswordResetOtp(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  /**
   * Verify password reset OTP and update the password.
   */
  async verifyPasswordResetOtp(
    email: string,
    token: string,
    newPassword: string
  ) {
    // 1) Verify recovery OTP
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    if (error) throw error;
    if (!data.session) {
      throw new Error('Recovery session not created');
    }

    // 2) Update password for the recovered user
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw updateError;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not found after password reset');
    return user;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  }
}

export const authService = new AuthService();
