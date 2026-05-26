import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { fontFamily, fontSize } from '../../utils/fonts';
import { useLayout } from '../../utils/useLayout';

import {
  getActivityOverview,
  createFamilyTask,
  updateFamilyTask,
  deleteFamilyTask,
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
} from '../../api/activity';

const MAIN_COLOR = '#9456FE';

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (!data) {
    return 'Не удалось выполнить действие. Проверьте подключение к серверу.';
  }

  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;

  if (Array.isArray(firstValue)) return firstValue[0];
  if (typeof firstValue === 'string') return firstValue;

  return 'Сервер вернул ошибку.';
}

export default function ActivityScreen() {
  const { screenPadding } = useLayout();

  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('task');
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadActivity = useCallback(async () => {
    try {
      const data = await getActivityOverview();

      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setProducts(Array.isArray(data.shopping_items) ? data.shopping_items : []);
    } catch (error) {
      Alert.alert('Активность', getApiErrorMessage(error));
    }
  }, []);

  const initialLoad = useCallback(async () => {
    try {
      setLoading(true);
      await loadActivity();
    } finally {
      setLoading(false);
    }
  }, [loadActivity]);

  useFocusEffect(
    useCallback(() => {
      initialLoad();
    }, [initialLoad])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadActivity();
    } finally {
      setRefreshing(false);
    }
  };

  const openAddModal = (type) => {
    setModalType(type);
    setInputValue('');
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalVisible(false);
    setInputValue('');
  };

  const addItem = async () => {
    const title = inputValue.trim();

    if (!title) {
      return;
    }

    try {
      setSaving(true);

      if (modalType === 'task') {
        const task = await createFamilyTask(title);
        setTasks((prev) => [task, ...prev]);
      } else {
        const item = await createShoppingItem(title);
        setProducts((prev) => [item, ...prev]);
      }

      closeModal();
    } catch (error) {
      Alert.alert('Активность', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      const updatedTask = await updateFamilyTask(task.id, {
        is_done: !task.is_done,
      });

      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id ? updatedTask : item
        )
      );
    } catch (error) {
      Alert.alert('Задачи семьи', getApiErrorMessage(error));
    }
  };

  const toggleProduct = async (product) => {
    try {
      const updatedProduct = await updateShoppingItem(product.id, {
        is_done: !product.is_done,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? updatedProduct : item
        )
      );
    } catch (error) {
      Alert.alert('Покупки', getApiErrorMessage(error));
    }
  };

  const deleteItem = (type, item) => {
    Alert.alert(
      'Удалить?',
      type === 'task' ? 'Удалить задачу?' : 'Удалить продукт?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'task') {
                await deleteFamilyTask(item.id);
                setTasks((prev) => prev.filter((task) => task.id !== item.id));
              } else {
                await deleteShoppingItem(item.id);
                setProducts((prev) => prev.filter((product) => product.id !== item.id));
              }
            } catch (error) {
              Alert.alert('Активность', getApiErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const renderMeta = (item) => {
    if (item.is_done && item.completed_by_name) {
      return `Выполнил: ${item.completed_by_name}`;
    }

    if (item.created_by_name) {
      return `Добавил: ${item.created_by_name}`;
    }

    return null;
  };

  const renderItem = (item, type) => {
    const isTask = type === 'task';
    const meta = renderMeta(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemRow}
        activeOpacity={0.8}
        onPress={() => (isTask ? toggleTask(item) : toggleProduct(item))}
        onLongPress={() => deleteItem(type, item)}
      >
        <View style={[styles.checkCircle, item.is_done && styles.checkCircleDone]}>
          {item.is_done && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>

        <View style={styles.itemTextBlock}>
          <Text
            style={[styles.itemText, item.is_done && styles.itemTextDone]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {meta && (
            <Text
              style={styles.itemMeta}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {meta}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.container, { paddingHorizontal: screenPadding }]}>
        <Text style={styles.screenTitle} allowFontScaling={false}>
          Активность
        </Text>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="small" color={MAIN_COLOR} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={MAIN_COLOR}
                colors={[MAIN_COLOR]}
              />
            }
          >
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="checkbox-outline" size={24} color={MAIN_COLOR} />
                  <Text style={styles.cardTitle} allowFontScaling={false}>
                    Задачи семьи
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.addButton}
                  activeOpacity={0.8}
                  onPress={() => openAddModal('task')}
                >
                  <Ionicons name="add" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {tasks.length > 0 ? (
                tasks.map((item) => renderItem(item, 'task'))
              ) : (
                <Text style={styles.emptyText} allowFontScaling={false}>
                  Задач пока нет
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="cart-outline" size={24} color={MAIN_COLOR} />
                  <Text style={styles.cardTitle} allowFontScaling={false}>
                    Список продуктов
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.addButton}
                  activeOpacity={0.8}
                  onPress={() => openAddModal('product')}
                >
                  <Ionicons name="add" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {products.length > 0 ? (
                products.map((item) => renderItem(item, 'product'))
              ) : (
                <Text style={styles.emptyText} allowFontScaling={false}>
                  Список пуст
                </Text>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} allowFontScaling={false}>
              {modalType === 'task' ? 'Новая задача' : 'Новый продукт'}
            </Text>

            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={modalType === 'task' ? 'Например: вынести мусор' : 'Например: молоко'}
              placeholderTextColor="#9A9A9A"
              allowFontScaling={false}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.8}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText} allowFontScaling={false}>
                  Отмена
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                activeOpacity={0.8}
                onPress={addItem}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText} allowFontScaling={false}>
                    Добавить
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  screenTitle: {
    marginTop: 18,
    marginBottom: 22,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.titleL,
    color: '#262626',
  },
  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#F7F7F7',
    borderRadius: 28,
    padding: 16,
    marginBottom: 18,
  },
  cardHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    marginLeft: 8,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRow: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D6D6D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkCircleDone: {
    backgroundColor: '#41BF67',
    borderColor: '#41BF67',
  },
  itemTextBlock: {
    flex: 1,
  },
  itemText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },
  itemTextDone: {
    color: '#9A9A9A',
    textDecorationLine: 'line-through',
  },
  itemMeta: {
    marginTop: 3,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    color: '#8A8A8A',
  },
  emptyText: {
    marginTop: 8,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#8A8A8A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  modalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.titleS,
    color: '#262626',
    marginBottom: 14,
  },
  input: {
    height: 54,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodyM,
    color: '#262626',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#606060',
  },
  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    backgroundColor: MAIN_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.bodyM,
    color: '#FFFFFF',
  },
});