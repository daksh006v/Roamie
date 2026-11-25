import React from 'react';
import { Modal } from 'react-native';
import { ProfileView } from './ProfileView';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <ProfileView onClose={onClose} />
    </Modal>
  );
};
