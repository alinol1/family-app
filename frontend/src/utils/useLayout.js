import { useWindowDimensions } from 'react-native';
import { layout } from './layout';

const SMALL_WIDTH_THRESHOLD = 360;
const SHORT_HEIGHT_THRESHOLD = 700;
const TABLET_THRESHOLD = 768;

export const useLayout = () => {
  const { width, height } = useWindowDimensions();

  const isSmall = width < SMALL_WIDTH_THRESHOLD;
  const isShort = height < SHORT_HEIGHT_THRESHOLD;
  const isTablet = width >= TABLET_THRESHOLD;

  return {
    width,
    height,
    isSmall,
    isShort,
    isTablet,
    screenPadding: isSmall
      ? layout.screenPaddingSmall
      : layout.screenPadding,
    contentMaxWidth: isTablet ? 430 : undefined,
  };
};