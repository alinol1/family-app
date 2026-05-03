import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Базовые размеры макета из Figma
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Масштабирование по ширине
export const scale = (size) => (width / guidelineBaseWidth) * size;

// Масштабирование по высоте
export const verticalScale = (size) => (height / guidelineBaseHeight) * size;

// Мягкое масштабирование
export const moderateScale = (size, factor = 2) => {
  return size + (scale(size) - size) * factor;
};