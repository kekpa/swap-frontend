import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';

type ReferralSource = {
  id: string;
  label: string;
  selected: boolean;
};

const HowYouHeardAboutUs = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  
  const [sources, setSources] = useState<ReferralSource[]>([
    { id: '1', label: 'Fanmi / Zanmi', selected: false },
    { id: '2', label: 'Yon Biznis', selected: false },
    { id: '3', label: 'Nan Travay mwen', selected: false },
    { id: '4', label: 'Google', selected: false },
    { id: '5', label: 'YouTube', selected: false },
    { id: '6', label: 'TikTok', selected: false },
    { id: '7', label: 'Twitter', selected: false },
  ]);

  const toggleSelection = (id: string) => {
    setSources(
      sources.map((source) => 
        source.id === id 
          ? { ...source, selected: !source.selected } 
          : source
      )
    );
  };

  const handleContinue = () => {
    // Save selected sources and navigate to next screen
    navigation.navigate('NotificationActivation' as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Ki jan ou tande pale de Swap</Text>
          <Text style={styles.subtitle}>Sa ap ede nou pèsonalize eksperyans ou.</Text>
          
          <View style={styles.sourcesContainer}>
            {sources.map((source) => (
              <TouchableOpacity
                key={source.id}
                style={[
                  styles.sourceBadge,
                  { 
                    borderColor: "#E2E8F0",
                    backgroundColor: "white"
                  },
                  source.selected && styles.selectedBadge,
                  source.selected && { borderColor: '#8b14fd' }
                ]}
                onPress={() => toggleSelection(source.id)}
              >
                <Text style={styles.bulletPoint}>•</Text>
                <Text 
                  style={[
                    styles.sourceText,
                    { color: "#64748B" },
                    source.selected && { color: '#8b14fd' }
                  ]}
                >
                  {source.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Kontinye</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "white",
  },
  contentContainer: {
    flex: 1,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A202C',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: '#64748B',
  },
  sourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 24,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 12,
  },
  selectedBadge: {
    backgroundColor: 'rgba(139, 20, 253, 0.1)', // Purple with opacity
  },
  bulletPoint: {
    marginRight: 8,
    fontSize: 16,
    color: '#64748B',
  },
  sourceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  continueButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#8b14fd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default HowYouHeardAboutUs; 