// Message.tsx - Clean implementation of the chat message component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

interface MessageProps {
  message: string;
  date: string;
  time: string;
  isSentByUser: boolean;
  isBusinessMessage?: boolean;
  businessName?: string;
  senderName?: string;
  showDate?: boolean;
  status?: 'pending' | 'sent' | 'delivered' | 'failed';
}

const Message: React.FC<MessageProps> = ({
  message,
  date,
  time,
  isSentByUser,
  isBusinessMessage,
  businessName,
  senderName,
  showDate,
  status
}) => {
  // Render status indicator for user's messages
  const renderStatusIndicator = () => {
    if (!isSentByUser || !status) return null;
    
    let icon = '';
    let color = '#999';
    
    switch (status) {
      case 'pending':
        icon = 'time-outline';
        color = '#999';
        break;
      case 'sent':
        icon = 'checkmark-outline';
        color = '#999';
        break;
      case 'delivered':
        icon = 'checkmark-done-outline';
        color = '#4169e1';
        break;
      case 'failed':
        icon = 'alert-circle-outline';
        color = '#e74c3c';
        break;
    }
    
    return (
      <View style={styles.statusContainer}>
        <Ionicons name={icon} size={12} color={color} />
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {showDate && <Text style={styles.dateLabel}>{date}</Text>}
      
      <View style={[
        styles.messageRow,
        isSentByUser ? styles.sentRow : styles.receivedRow
      ]}>
        <View style={[
          styles.messageBubble,
          isSentByUser 
            ? styles.sentBubble 
            : (isBusinessMessage ? styles.businessBubble : styles.receivedBubble)
        ]}>
          {/* Business header for business messages */}
          {isBusinessMessage && !isSentByUser && (
            <View style={styles.businessHeader}>
              <Ionicons name="business-outline" size={14} color="#4CAF50" />
              <Text style={styles.businessName}>{businessName || "Business"}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              </View>
            </View>
          )}
          
          {/* Message content */}
          <Text style={styles.messageText}>{message}</Text>
          
          {/* Time and status */}
          <View style={styles.footerContainer}>
            <Text style={styles.timeText}>{time}</Text>
            {renderStatusIndicator()}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  dateLabel: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginHorizontal: 8,
  },
  sentRow: {
    justifyContent: 'flex-end',
  },
  receivedRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: '75%',
  },
  sentBubble: {
    backgroundColor: '#0084ff', // Facebook Messenger blue
  },
  receivedBubble: {
    backgroundColor: '#262626', // Dark gray
  },
  businessBubble: {
    backgroundColor: '#0d3b66', // Deep blue
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  businessName: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  messageText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
  },
  timeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginRight: 4,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  statusContainer: {
    marginLeft: 4,
  }
});

export default Message; 