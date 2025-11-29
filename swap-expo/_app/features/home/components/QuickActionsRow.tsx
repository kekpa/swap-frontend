import React from 'react';
import { View, StyleSheet } from 'react-native';
import QuickActionButton from './QuickActionButton';

interface QuickActionsRowProps {
  onAddPress: () => void;
  onSendPress: () => void;
  onSolPress: () => void;
  onWalletPress: () => void;
  onSupportPress: () => void;
  activeSolsCount?: number;
}

export default function QuickActionsRow({
  onAddPress,
  onSendPress,
  onSolPress,
  onWalletPress,
  onSupportPress,
  activeSolsCount = 0,
}: QuickActionsRowProps) {
  return (
    <View style={styles.container}>
      <QuickActionButton
        icon="arrow-down-circle"
        label="Add"
        onPress={onAddPress}
      />
      <QuickActionButton
        icon="send"
        label="Send"
        onPress={onSendPress}
      />
      <QuickActionButton
        icon="people-circle"
        label="Sol"
        onPress={onSolPress}
        badge={activeSolsCount}
      />
      <QuickActionButton
        icon="wallet"
        label="Wallet"
        onPress={onWalletPress}
      />
      <QuickActionButton
        icon="help-circle"
        label="Support"
        onPress={onSupportPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
});
