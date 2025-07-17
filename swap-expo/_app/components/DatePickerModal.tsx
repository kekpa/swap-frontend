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
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectDate: (date: string) => void;
}

const { height } = Dimensions.get("window");

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
}) => {
  const translateY = React.useRef(new Animated.Value(height)).current;
  const [currentMonth, setCurrentMonth] = useState("March 2025");
  const [calendarDays, setCalendarDays] = useState<
    Array<{
      day: number;
      month: "current" | "prev" | "next";
      selected: boolean;
      today: boolean;
    }>
  >([]);

  // Parse the selected date
  const selectedDay = parseInt(selectedDate.split(" ")[0]);
  const todayDay = 17; // Assuming 17 is today's date as shown in the screenshot

  React.useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();

      // Generate calendar days for March 2025
      generateCalendarDays();
    } else {
      Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const generateCalendarDays = () => {
    // This is a simplified version - in a real app, you would calculate this based on the actual month
    const days = [
      { day: 24, month: "prev", selected: false, today: false },
      { day: 25, month: "prev", selected: false, today: false },
      { day: 26, month: "prev", selected: false, today: false },
      { day: 27, month: "prev", selected: false, today: false },
      { day: 28, month: "prev", selected: false, today: false },
      { day: 1, month: "current", selected: false, today: false },
      { day: 2, month: "current", selected: false, today: false },

      { day: 3, month: "current", selected: false, today: false },
      { day: 4, month: "current", selected: false, today: false },
      { day: 5, month: "current", selected: false, today: false },
      { day: 6, month: "current", selected: false, today: false },
      { day: 7, month: "current", selected: false, today: false },
      { day: 8, month: "current", selected: false, today: false },
      { day: 9, month: "current", selected: false, today: false },

      { day: 10, month: "current", selected: false, today: false },
      { day: 11, month: "current", selected: false, today: false },
      { day: 12, month: "current", selected: false, today: false },
      { day: 13, month: "current", selected: false, today: false },
      { day: 14, month: "current", selected: false, today: false },
      { day: 15, month: "current", selected: false, today: false },
      { day: 16, month: "current", selected: false, today: false },

      { day: 17, month: "current", selected: false, today: true },
      { day: 18, month: "current", selected: false, today: false },
      { day: 19, month: "current", selected: false, today: false },
      { day: 20, month: "current", selected: false, today: false },
      { day: 21, month: "current", selected: false, today: false },
      { day: 22, month: "current", selected: false, today: false },
      { day: 23, month: "current", selected: false, today: false },

      { day: 24, month: "current", selected: false, today: false },
      { day: 25, month: "current", selected: false, today: false },
      { day: 26, month: "current", selected: false, today: false },
      { day: 27, month: "current", selected: false, today: false },
      { day: 28, month: "current", selected: true, today: false },
      { day: 29, month: "current", selected: false, today: false },
      { day: 30, month: "current", selected: false, today: false },

      { day: 31, month: "current", selected: false, today: false },
      { day: 1, month: "next", selected: false, today: false },
      { day: 2, month: "next", selected: false, today: false },
      { day: 3, month: "next", selected: false, today: false },
      { day: 4, month: "next", selected: false, today: false },
      { day: 5, month: "next", selected: false, today: false },
      { day: 6, month: "next", selected: false, today: false },
    ];

    setCalendarDays(days);
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    })
  ).current;

  const handleDayPress = (day: number, month: "current" | "prev" | "next") => {
    if (month === "current") {
      const newDate = `${day} March 2025`;
      onSelectDate(newDate);
    }
  };

  const handlePrevMonth = () => {
    // In a real app, you would update the month and regenerate the calendar
    console.log("Previous month");
  };

  const handleNextMonth = () => {
    // In a real app, you would update the month and regenerate the calendar
    console.log("Next month");
  };

  const handleReset = () => {
    // Reset to today's date
    const todayDate = `${todayDay} March 2025`;
    onSelectDate(todayDate);
  };

  const handleSet = () => {
    // Confirm the selected date and close the modal
    onClose();
  };

  const renderCalendarDay = (
    day: {
      day: number;
      month: "current" | "prev" | "next";
      selected: boolean;
      today: boolean;
    },
    index: number
  ) => {
    const isSelected = day.month === "current" && day.day === selectedDay;
    const isToday = day.month === "current" && day.day === todayDay;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCell,
          isSelected && styles.selectedDay,
          isToday && styles.todayDay,
        ]}
        onPress={() => handleDayPress(day.day, day.month)}
      >
        <Text
          style={[
            styles.dayText,
            day.month !== "current" && styles.otherMonthDayText,
            isSelected && styles.selectedDayText,
          ]}
        >
          {day.day}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[styles.modalContainer, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Start date</Text>

          <View style={styles.dateContainer}>
            <Text style={styles.selectedDateText}>{selectedDate}</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarHeader}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={styles.navButton}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>{currentMonth}</Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.navButton}
            >
              <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdaysContainer}>
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <Text key={index} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysContainer}>
            {calendarDays.map((day, index) => renderCalendarDay(day, index))}
          </View>

          <TouchableOpacity style={styles.setButton} onPress={handleSet}>
            <Text style={styles.setButtonText}>Set</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#1e1e1e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: "#555",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  selectedDateText: {
    fontSize: 18,
    color: "white",
  },
  resetText: {
    fontSize: 16,
    color: "#4a90e2",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  navButton: {
    padding: 4,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  weekdaysContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  weekdayText: {
    width: 36,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  dayCell: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
  },
  dayText: {
    fontSize: 16,
    color: "white",
  },
  otherMonthDayText: {
    color: "#666",
  },
  selectedDay: {
    backgroundColor: "#4a90e2",
    borderRadius: 18,
  },
  selectedDayText: {
    color: "white",
    fontWeight: "600",
  },
  todayDay: {
    borderWidth: 1,
    borderColor: "#4a90e2",
    borderRadius: 18,
  },
  setButton: {
    backgroundColor: "white",
    borderRadius: 28,
    marginHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  setButtonText: {
    color: "black",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DatePickerModal;
