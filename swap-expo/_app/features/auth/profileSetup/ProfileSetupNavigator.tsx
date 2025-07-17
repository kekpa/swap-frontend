import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  HowYouHeardAboutUs, 
  NotificationActivation, 
  PasscodeSetup, 
  BioSetup 
} from './index';

// Define the profile setup stack navigator param list
export type ProfileSetupStackParamList = {
  HowYouHeardAboutUs: undefined;
  NotificationActivation: undefined;
  PasscodeSetup: undefined;
  BioSetup: undefined;
};

const Stack = createStackNavigator<ProfileSetupStackParamList>();

/**
 * ProfileSetupNavigator manages the navigation flow for the profile setup process
 * after a user has signed up or needs to complete their profile.
 */
const ProfileSetupNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="HowYouHeardAboutUs"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        cardOverlayEnabled: true,
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 0.5, 0.9, 1],
              outputRange: [0, 0.25, 0.7, 1],
            }),
          },
          overlayStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
              extrapolate: 'clamp',
            }),
          },
        }),
      }}
    >
      <Stack.Screen name="HowYouHeardAboutUs" component={HowYouHeardAboutUs} />
      <Stack.Screen name="NotificationActivation" component={NotificationActivation} />
      <Stack.Screen name="PasscodeSetup" component={PasscodeSetup} />
      <Stack.Screen name="BioSetup" component={BioSetup} />
    </Stack.Navigator>
  );
};

export default ProfileSetupNavigator; 