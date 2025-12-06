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
   * Send a 6-digit OTP to the given email.
   * Supabase must be configured to use Email OTP (not magic link)
   * in Auth → Providers → Email.
   */
  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // create user on first OTP
      },
    });

    if (error) throw error;
  }

  /**
   * Verify the OTP and then set a password + username.
   */
  async verifyOtpAndSetPassword(email: string, token: string, password: string) {
    // 1) Verify OTP (email code)
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email', // IMPORTANT: email OTP, not magic link
    });

    if (error) throw error;
    if (!data.user) throw new Error('OTP verification failed');

    // 2) Set password + username
    const username = email.split('@')[0];

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { username },
    });

    if (updateError) throw updateError;

    // 3) Return latest user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('User not found after update');

    return user;
  }

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Sign in failed');
    return data.user;
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
