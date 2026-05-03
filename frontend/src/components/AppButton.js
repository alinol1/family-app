import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

export default function AppButton({
  title,
  onPress,
  backgroundColor = colors.primary,
  textColor = '#FFFFFF',
  outlined = false,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: outlined ? '#FFFFFF' : backgroundColor,
          borderWidth: outlined ? 1 : 0,
          borderColor: outlined ? colors.border : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.text,
          {
            color: outlined ? colors.textPrimary : textColor,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 343,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
  },
});