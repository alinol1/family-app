import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Базовый макет
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Ограничиваем ширину, чтобы на планшетах и web не раздувало интерфейс
const effectiveWidth = Math.min(width, 430);

export const scale = (size) => (effectiveWidth / guidelineBaseWidth) * size;

export const verticalScale = (size) => (height / guidelineBaseHeight) * size;

export const moderateScale = (size, factor = 0.35) => {
  return size + (scale(size) - size) * factor;
};