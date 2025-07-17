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
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ProcessingModalProps {
  visible: boolean;
  icon?: string; // Icon name from Ionicons
  iconColor?: string;
  heading?: string; // Optional heading text
  message?: string; // Optional message text (takes precedence if provided)
  // Legacy props for backward compatibility
  recipientName?: string;
  amount?: string;
  onComplete: () => void;
  duration?: number; // Optional duration in ms, defaults to 2000
}

const { height } = Dimensions.get("window");
const MODAL_HEIGHT = height / 3;

const ProcessingModal: React.FC<ProcessingModalProps> = ({
  visible,
  icon = "time-outline",
  iconColor = "#999",
  heading = "Processing",
  message,
  recipientName,
  amount,
  onComplete,
  duration = 2000,
}) => {
  const translateY = React.useRef(new Animated.Value(MODAL_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      // Animate modal in
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after specified duration
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: MODAL_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onComplete();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, translateY, onComplete, duration]);

  if (!visible) return null;

  // Use provided message if available, otherwise use legacy format
  const displayMessage =
    message ||
    (amount && recipientName
      ? `Your ${amount} transfer to ${recipientName} is being processed`
      : "Processing your request");

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[styles.modalContainer, { transform: [{ translateY }] }]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={32} color={iconColor} />
        </View>
        <Text style={styles.headingText}>{heading}</Text>
        <Text style={styles.messageText}>{displayMessage}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
    elevation: 10,
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    backgroundColor: "#2a2a2a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  headingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 18,
    color: "white",
    textAlign: "center",
    lineHeight: 24,
  },
});

export default ProcessingModal;
