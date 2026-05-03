import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../utils/colors';

export default function FamilyChoiceScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Семья</Text>
      <Text style={styles.subtitle}>
        Создайте семью или присоединитесь по коду
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('CreateFamily')}
      >
        <Text style={styles.buttonText}>Создать семью</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.navigate('JoinFamily')}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Присоединиться по коду
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
  },
});