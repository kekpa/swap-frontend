import { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useAuthContext } from "./context/AuthContext";

export default function LaunchScreen({ navigation }: { navigation: any }) {
  const authContext = useAuthContext();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (navigation && typeof navigation.replace === "function" && authContext) {
        if (authContext.justLoggedOut) {
          navigation.replace("SignIn");
          if (authContext.setJustLoggedOut) {
            authContext.setJustLoggedOut(false);
          }
        } else if (authContext.needsLogin) {
          navigation.replace("SignIn");
        } else {
        navigation.replace("SignUpScreen");
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigation, authContext]);

  return (
    <View style={styles.container}>
      {/* Background Decorations */}
      <View style={styles.decoration1}></View>
      <View style={styles.decoration2}></View>
      
      {/* Center Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.splashLogo}>
          <Text style={styles.logoText}>Swap</Text>
        </View>
        <Text style={styles.tagline}>Your Social Banking App</Text>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  decoration1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 183, 70, 0.15)", // Orange decoration
    top: height * 0.1,
    left: -60,
  },
  decoration2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(44, 208, 73, 0.15)", // Green decoration
    bottom: height * 0.15,
    right: -40,
  },
  logoContainer: {
    alignItems: "center",
  },
  splashLogo: {
    width: 220,
    height: 220,
    borderRadius: 40,
    backgroundColor: "#8b14fd", // Purple
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8b14fd",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  logoText: {
    fontSize: 48,
    fontWeight: "800",
    color: "white",
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 24,
    fontSize: 16,
    color: "#6B7280", // Gray color for tagline
  },
});
