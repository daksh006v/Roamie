import React from 'react';
import { useRouter } from 'expo-router';
import { ProfileView } from '../components/profile/ProfileView';

export default function ProfileScreen() {
  const router = useRouter();
  return <ProfileView onClose={() => router.back()} />;
}
