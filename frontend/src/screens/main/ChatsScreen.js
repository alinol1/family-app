import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

export default function ChatsScreen({ navigation }) {
  const { screenPadding } = useLayout();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
        {/* Верх */}
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Чаты</Text>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={28} color="#7B7B7B" />
          </TouchableOpacity>
        </View>

        {/* Поиск */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по чатам"
            placeholderTextColor="#8B8B8B"
            value={search}
            onChangeText={setSearch}
          />
          <Ionicons name="search-outline" size={22} color="#7D7D7D" />
        </View>

        {/* Чаты */}
        <View style={styles.chatsList}>
          
          {/* Общий чат */}
          <TouchableOpacity style={styles.chatItem}>
            <View style={styles.chatAvatar}>
              <Ionicons name="people" size={28} color="#FFFFFF" />
            </View>

            <View style={styles.chatContent}>
              <Text style={styles.chatTitle}>
                Общий чат
              </Text>

              <View style={styles.lastMessageRow}>
                <Text style={styles.lastMessageSender}>
                  Алина:
                </Text>

                <Text style={styles.lastMessageText} numberOfLines={1}>
                  Привет, как дела?
                </Text>
              </View>
            </View>

            <View style={styles.chatMeta}>
              <Text style={styles.chatTime}>
                12:40
              </Text>

              <View style={styles.checksContainer}>
                <Ionicons name="checkmark-done" size={17} color="#3B3B3B" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Личный чат */}
          <TouchableOpacity style={styles.chatItem}>
            <View style={[styles.chatAvatar, styles.personalAvatar]}>
              <Ionicons name="person" size={26} color="#7B7B7B" />
            </View>

            <View style={styles.chatContent}>
              <Text style={styles.personalChatTitle}>
                Мама Юлия
              </Text>

              <View style={styles.lastMessageRow}>
                <Text style={styles.lastMessageSender}>
                  Вы:
                </Text>

                <Text style={styles.lastMessageText} numberOfLines={1}>
                  Хорошо, скоро буду
                </Text>
              </View>
            </View>

            <View style={styles.chatMeta}>
              <Text style={styles.chatTime}>
                11:20
              </Text>

              <View style={styles.checksContainer}>
                <Ionicons name="checkmark" size={17} color="#3B3B3B" />
              </View>
            </View>
          </TouchableOpacity>

        </View>

        {/* Кнопка + */}
        <TouchableOpacity
          style={[
            styles.addButton,
            { bottom: insets.bottom + 110 },
          ]}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  screenTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#262626',
  },

  settingsButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchContainer: {
    height: 52,
    borderRadius: 999,
    backgroundColor: '#FAFAFA',
    marginTop: 30,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
    marginRight: 12,
  },

  chatsList: {
    marginTop: 24,
    gap: 14, // ← изменили
  },

  chatItem: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },

  chatAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#9452FE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  personalAvatar: {
    backgroundColor: '#E6E6E6',
  },

  chatContent: {
    flex: 1,
    marginLeft: 10,
  },

  chatTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  personalChatTitle: {
    fontFamily: fontFamily.medium, // ← изменили
    fontSize: fontSize.titleS,
    color: '#262626',
  },

  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  lastMessageSender: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#606060',
    marginRight: 3,
  },

  lastMessageText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#959595',
  },

  chatMeta: {
    alignItems: 'flex-end',
    paddingTop: 3,
    marginLeft: 8,
  },

  chatTime: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#A4A4A4',
  },

  checksContainer: {
    marginTop: 8,
  },

  addButton: {
    position: 'absolute',
    right: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#9452FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
});