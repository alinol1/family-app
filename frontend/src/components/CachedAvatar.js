import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export default function CachedAvatar({
  uri,
  size = 58,
  icon = 'person',
  iconSize = 27,
  backgroundColor = '#E6E6E6',
  iconColor = '#7B7B7B',
  borderRadius,
}) {
  const radius = borderRadius ?? size / 2;

  if (!uri) {
    return (
      <View
        style={[
          styles.placeholder,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor,
          },
        ]}
      >
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor,
      }}
      cachePolicy="memory-disk"
      transition={0}
      contentFit="cover"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});