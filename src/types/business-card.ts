export interface BusinessCardData {
  name: string;
  jobTitle: string;
  companyName: string;
  mobile: string;
  email: string;
  website: string;
  whatsapp: string;
  linkedin: string;
  about: string;
  photoUrl?: string;
  logoUrl?: string;
  layoutStyle?: number;
}

export type CardType = 'personal' | 'work';

export interface BusinessCard extends BusinessCardData {
  id: string;
  user_id: string;
  card_type: CardType;
  is_default: boolean;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends BusinessCardData {
  id: string;
  userId: string;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
}
