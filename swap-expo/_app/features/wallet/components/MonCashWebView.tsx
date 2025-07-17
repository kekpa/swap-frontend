import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  BackHandler,
} from "react-native";
import { WebView } from "react-native-webview";
import logger from "../../../utils/logger";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../../../_api/apiClient";
import { useAuthContext } from "../../auth/context/AuthContext";

interface MonCashWebViewProps {
  paymentUrl: string;
  onCancel: () => void;
  onSuccess: () => void;
  visible?: boolean;
}

const MonCashWebView: React.FC<MonCashWebViewProps> = ({
  paymentUrl,
  onCancel,
  onSuccess,
  visible = true,
}) => {
  const webviewRef = useRef<any>(null);
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);
  const auth = useAuthContext();
  const [checkingStatus, setCheckingStatus] = useState(false);

  if (!visible) {
    return null;
  }

  if (!auth) {
    throw new Error("Auth context is undefined");
  }

  const { user, getAccessToken } = auth;

  const getPaymentId = () => {
    try {
      const url = new URL(paymentUrl);
      const token = url.searchParams.get("token");
      if (token) return token;

      const pathParts = url.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart !== "Redirect") return lastPart;

      return null;
    } catch (error) {
      logger.error("Error extracting payment ID from URL:", error);
      return null;
    }
  };

  useEffect(() => {
    let statusCheckInterval: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      if (checkingStatus) return;

      try {
        setCheckingStatus(true);
        const orderId = getPaymentId();
        if (!orderId) {
          logger.warn("Could not extract payment ID from URL");
          setCheckingStatus(false);
          return;
        }

        const token = await getAccessToken();
        const response = await apiClient.get(
          `/payments/status?orderId=${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Profile-ID": user?.profileId,
            },
          }
        );

        logger.debug(
          `Payment status check response: ${JSON.stringify(response.data)}`
        );

        if (response.data.status === "completed") {
          clearInterval(statusCheckInterval);
          Alert.alert(
            "Payment Successful",
            "Your payment has been processed successfully.",
            [{ text: "OK", onPress: onSuccess }]
          );
        } else if (response.data.status === "failed") {
          clearInterval(statusCheckInterval);
          Alert.alert(
            "Payment Failed",
            "Your payment could not be processed. Please try again.",
            [{ text: "OK", onPress: onCancel }]
          );
        }
      } catch (error) {
        logger.error("Error checking payment status:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    statusCheckInterval = setInterval(checkPaymentStatus, 5000);

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onCancel();
        return true;
      }
    );

    return () => {
      clearInterval(statusCheckInterval);
      backHandler.remove();
    };
  }, [paymentUrl, onSuccess, onCancel, user, getAccessToken]);

  const handleWebViewNavigationStateChange = (navState: any) => {
    logger.debug(`WebView navigated to: ${navState.url}`, "payments");

    if (navState.url.includes("success") || navState.url.includes("callback")) {
      Alert.alert(
        "Payment Processing",
        "Your payment is being processed. You will be notified when it completes.",
        [
          {
            text: "OK",
            onPress: onSuccess,
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { display: visible ? "flex" : "none" }]}
    >
      <View style={styles.webViewHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.webViewTitle}>MonCash Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.webViewContainer}>
        <WebView
          source={{ uri: paymentUrl }}
          style={styles.webView}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          cacheEnabled={false}
          incognito={true}
          thirdPartyCookiesEnabled={true}
          ref={webviewRef}
          onLoadStart={() => {
            logger.debug("WebView started loading", "payments");
            setIsWebViewLoading(true);
          }}
          onLoadEnd={() => {
            logger.debug("WebView finished loading", "payments");
            setIsWebViewLoading(false);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            logger.error("WebView error:", nativeEvent);
            setIsWebViewLoading(false);

            Alert.alert(
              "Payment Error",
              "There was an error loading the payment page. Please try again.",
              [
                {
                  text: "Go Back",
                  onPress: onCancel,
                },
              ]
            );
          }}
        />

        {isWebViewLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading payment page...</Text>
            <Text style={styles.loadingSubText}>
              This may take a few moments. Please wait.
            </Text>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  webViewContainer: {
    flex: 1,
    position: "relative",
    margin: 0,
    padding: 0,
  },
  webView: {
    flex: 1,
    margin: 0,
    padding: 0,
  },
  webViewHeader: {
    height: Platform.OS === "ios" ? 44 : 56,
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 4,
  },
  webViewTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  placeholder: {
    width: 70,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  cancelButton: {
    marginTop: 20,
    backgroundColor: "#f44336",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default MonCashWebView;
