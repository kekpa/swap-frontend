// Created: SMS invitation utility for inviting contacts to download Swap app - 2025-05-29
import { Linking, Alert } from 'react-native';
import logger from './logger';

export interface InviteContact {
  name: string;
  phoneNumber?: string;
}

// App store links - update these with actual app store URLs when available
const APP_STORE_LINKS = {
  ios: 'https://apps.apple.com/app/swap', // Replace with actual App Store link
  android: 'https://play.google.com/store/apps/details?id=com.swap', // Replace with actual Play Store link
  web: 'https://swap.app', // Replace with actual website
};

/**
 * Opens the device's SMS app with a pre-written invitation message
 * @param contact - Contact to invite
 * @param customMessage - Optional custom message override
 */
export const inviteContactViaSMS = async (
  contact: InviteContact,
  customMessage?: string
): Promise<void> => {
  try {
    // Extract phone number from contact
    const phoneNumber = contact.phoneNumber || '';
    
    if (!phoneNumber) {
      Alert.alert('No Phone Number', `Cannot invite ${contact.name} - no phone number available.`);
      return;
    }

    // Clean phone number (remove formatting)
    const cleanPhoneNumber = phoneNumber.replace(/[^+0-9]/g, '');

    // Create invitation message
    const defaultMessage = customMessage || 
      `Let's chat on Swap! It's a fast, simple, and secure app we can use to message and send money to each other for free. Get it at ${APP_STORE_LINKS.web}`;

    // Create SMS URL
    const smsUrl = `sms:${cleanPhoneNumber}?body=${encodeURIComponent(defaultMessage)}`;

    logger.debug(`[InviteUtils] Opening SMS app for ${contact.name} (${cleanPhoneNumber}) with message length: ${defaultMessage.length}`, 'InviteUtils');

    // Check if SMS is supported
    const canOpenSMS = await Linking.canOpenURL(smsUrl);
    
    if (canOpenSMS) {
      await Linking.openURL(smsUrl);
      logger.info(`[InviteUtils] Successfully opened SMS app for ${contact.name}`, 'InviteUtils');
    } else {
      throw new Error('SMS not supported on this device');
    }

  } catch (error) {
    logger.error(`[InviteUtils] Failed to open SMS for ${contact.name}:`, error);
    
    // Fallback: copy message to clipboard and show alert
    Alert.alert(
      'Cannot Open SMS',
      `Unable to open SMS app. You can manually send this message to ${contact.name}:\n\n"${customMessage || 'Let\'s chat on Swap! Get it at ' + APP_STORE_LINKS.web}"`,
      [
        { text: 'OK', style: 'default' }
      ]
    );
  }
};

/**
 * Shares invitation via the device's share sheet (alternative to SMS)
 * @param contact - Contact to invite
 * @param customMessage - Optional custom message override
 */
export const shareInviteMessage = async (
  contact: InviteContact,
  customMessage?: string
): Promise<void> => {
  try {
    const { Share } = await import('react-native');
    
    const message = customMessage || 
      `Let's chat on Swap! It's a fast, simple, and secure app we can use to message and send money to each other for free. Get it at ${APP_STORE_LINKS.web}`;

    await Share.share({
      message: message,
      title: `Invite ${contact.name} to Swap`,
    });

    logger.info(`[InviteUtils] Successfully shared invite for ${contact.name}`, 'InviteUtils');

  } catch (error) {
    logger.error(`[InviteUtils] Failed to share invite for ${contact.name}:`, error);
    Alert.alert('Share Failed', 'Unable to share invitation. Please try again.');
  }
};

/**
 * Gets the appropriate app store link based on platform
 */
export const getAppStoreLink = (): string => {
  const { Platform } = require('react-native');
  
  if (Platform.OS === 'ios') {
    return APP_STORE_LINKS.ios;
  } else if (Platform.OS === 'android') {
    return APP_STORE_LINKS.android;
  }
  
  return APP_STORE_LINKS.web;
};

/**
 * Creates a custom invitation message
 * @param recipientName - Name of the person being invited
 * @param senderName - Name of the person sending the invite
 */
export const createCustomInviteMessage = (
  recipientName: string,
  senderName?: string
): string => {
  const appLink = getAppStoreLink();
  
  if (senderName) {
    return `Hi ${recipientName}! ${senderName} invited you to try Swap - a fast, secure way to message and send money. Download it here: ${appLink}`;
  }
  
  return `Hi ${recipientName}! I'd like to invite you to try Swap - a fast, secure way to message and send money. Download it here: ${appLink}`;
}; 