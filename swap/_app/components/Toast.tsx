import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  type: ToastType;
  text1: string;
  text2?: string;
  duration?: number;
  onClose?: () => void;
}

interface ToastShowParams extends ToastProps {}

interface ToastState {
  visible: boolean;
  props: ToastProps | null;
}

// Singleton instance to manage toast state
class ToastManager {
  private static instance: ToastManager;
  private listeners: Set<(state: ToastState) => void> = new Set();
  private state: ToastState = { visible: false, props: null };
  
  private constructor() {}
  
  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }
  
  public show(props: ToastShowParams): void {
    this.state = { visible: true, props };
    this.notifyListeners();
    
    // Auto hide after duration
    const duration = props.duration || 3000;
    setTimeout(() => {
      this.hide();
    }, duration);
  }
  
  public hide(): void {
    if (this.state.props?.onClose) {
      this.state.props.onClose();
    }
    this.state = { visible: false, props: null };
    this.notifyListeners();
  }
  
  public addListener(listener: (state: ToastState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Hook to use the toast state
export const useToast = (): ToastState => {
  const [state, setState] = useState<ToastState>({ visible: false, props: null });
  
  useEffect(() => {
    const removeListener = ToastManager.getInstance().addListener(setState);
    return removeListener;
  }, []);
  
  return state;
};

// Toast component
const ToastComponent: React.FC<{ state: ToastState }> = ({ state }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  
  useEffect(() => {
    if (state.visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [state.visible, fadeAnim, slideAnim]);
  
  if (!state.visible || !state.props) return null;
  
  const { type, text1, text2 } = state.props;
  
  const getIconName = (type: ToastType) => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'information-circle';
    }
  };
  
  const getBackgroundColor = (type: ToastType) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#2196F3';
    }
  };
  
  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: getBackgroundColor(type),
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={getIconName(type)} size={24} color="white" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{text1}</Text>
          {text2 && <Text style={styles.message}>{text2}</Text>}
        </View>
        <TouchableOpacity onPress={() => ToastManager.getInstance().hide()}>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Container component to be placed at root of app
export const ToastContainer: React.FC = () => {
  const state = useToast();
  return <ToastComponent state={state} />;
};

// Export a simplified API like react-native-toast-notifications
export const Toast = {
  show: (params: ToastShowParams) => {
    ToastManager.getInstance().show(params);
  },
  hide: () => {
    ToastManager.getInstance().hide();
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  message: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
});

export default Toast; 