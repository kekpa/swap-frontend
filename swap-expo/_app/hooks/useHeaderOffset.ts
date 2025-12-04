/**
 * useHeaderOffset Hook
 *
 * Provides consistent header offset calculations across all screens.
 * Adapts automatically to different iPhone models:
 * - iPhone SE (smaller safe area)
 * - iPhone 14/15/16 (standard notch)
 * - iPhone 14/15/16 Pro Max (Dynamic Island)
 *
 * This hook eliminates hard-coded pixel values and ensures
 * content doesn't go behind the SearchHeader on any device.
 *
 * @example
 * const { headerHeight } = useHeaderOffset();
 * <ScrollView contentContainerStyle={{ paddingTop: headerHeight }} />
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// SearchHeader content height: profile avatar + search + padding
const SEARCH_HEADER_CONTENT_HEIGHT = 58;

export const useHeaderOffset = () => {
  const insets = useSafeAreaInsets();

  return {
    /** Total header height including safe area (use for content padding) */
    headerHeight: insets.top + SEARCH_HEADER_CONTENT_HEIGHT,
    /** Safe area top inset only */
    safeAreaTop: insets.top,
    /** Bottom safe area (for bottom tabs/home indicator) */
    safeAreaBottom: insets.bottom,
    /** The SearchHeader content height (without safe area) */
    headerContentHeight: SEARCH_HEADER_CONTENT_HEIGHT,
  };
};

export default useHeaderOffset;
