// Copyright 2025 licenser.author
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AddMoneySuccessScreenProps {
  onDone: () => void;
  amount: string;
  destination?: string;
}

const AddMoneySuccessScreen: React.FC<AddMoneySuccessScreenProps> = ({
  onDone,
  amount = "€5.00",
  destination = "Money pocket",
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.successIconContainer}>
          <Ionicons name="checkmark" size={40} color="#fff" />
        </View>

        <Text style={styles.amountText}>{amount}</Text>
        <Text style={styles.destinationText}>Added to {destination}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={onDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#7047EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  amountText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  destinationText: {
    fontSize: 16,
    color: "#666",
  },
  footer: {
    padding: 24,
  },
  doneButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7047EB",
    justifyContent: "center",
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default AddMoneySuccessScreen;
