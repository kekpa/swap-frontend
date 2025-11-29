import React, { useRef } from 'react';
import { View, FlatList, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_SPACING = 12;

export interface DiscoveryCardData {
  id: string;
  component: React.ReactNode;
}

interface DiscoveryCardsSliderProps {
  cards: DiscoveryCardData[];
}

export default function DiscoveryCardsSlider({ cards }: DiscoveryCardsSliderProps) {
  const flatListRef = useRef<FlatList>(null);

  const renderItem = ({ item }: { item: DiscoveryCardData }) => {
    return <View style={styles.cardWrapper}>{item.component}</View>;
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={cards}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  flatListContent: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: CARD_SPACING,
  },
});
