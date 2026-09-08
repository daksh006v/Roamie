import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface RoamieLogoProps {
  width?: number;
}

export const RoamieLogo: React.FC<RoamieLogoProps> = ({
  width: logoWidth = Math.min(width * 0.58, 230),
}) => {
  const logoHeight = logoWidth / 2.415;

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/images/roamie_logo.png')}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
