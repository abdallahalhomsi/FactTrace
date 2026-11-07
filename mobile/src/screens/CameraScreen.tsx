import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ThemeColors } from '../constants/app';
import { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/AppTheme';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CameraScreen({ navigation, route }: Props) {
  const { colors: COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const studyContext = route.params?.studyContext;

  useEffect(() => {
    if (!permission) {
      return;
    }

    if (!permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('No image was captured.');
      }

      navigation.navigate('ClaimReview', {
        imageUri: photo.uri,
        studyContext,
      });
    } catch (error) {
      console.error('Camera capture failed:', error);

      Alert.alert(
        'Could not capture image',
        'Please try taking the photo again.',
      );
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <ActivityIndicator
          size="large"
          color={COLORS.blue}
        />

        <Text style={styles.permissionText}>
          Checking camera permission...
        </Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Ionicons
              name="camera-outline"
              size={38}
              color={COLORS.blue}
            />
          </View>

          <Text style={styles.permissionTitle}>
            Camera access is required
          </Text>

          <Text style={styles.permissionText}>
            FactTrace uses your camera to capture printed or on-screen claims
            for OCR and verification.
          </Text>

          {permission.canAskAgain ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.permissionButton}
              onPress={() => void requestPermission()}
            >
              <Text style={styles.permissionButtonText}>
                Allow Camera Access
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.permissionHelp}>
              Camera permission is disabled in your device settings. Enable it
              for FactTrace and reopen the camera.
            </Text>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.backToHomeButton}
            onPress={handleClose}
          >
            <Text style={styles.backToHomeText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setIsCameraReady(true)}
      />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close camera"
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons
              name="close"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.topTitleContainer}>
            <Text style={styles.topTitle}>
              Scan a Claim
            </Text>

            {studyContext ? (
              <Text style={styles.studyLabel}>
                Study Trial {studyContext.trialIndex}
              </Text>
            ) : null}
          </View>

          <View style={styles.topSpacer} />
        </View>

        <View style={styles.centerArea}>
          <View style={styles.guideBox}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            <View style={styles.guideTextContainer}>
              <Text style={styles.guideTitle}>
                Position the claim inside the frame
              </Text>

              <Text style={styles.guideText}>
                Keep the text clear, well lit, and as straight as possible.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomArea}>
          <Text style={styles.captureHint}>
            Capture one factual claim at a time.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Capture claim"
            disabled={!isCameraReady || isCapturing}
            style={[
              styles.captureOuter,
              (!isCameraReady || isCapturing) &&
                styles.captureOuterDisabled,
            ]}
            onPress={() => void handleCapture()}
          >
            <View style={styles.captureInner}>
              {isCapturing ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#000000',
    },

    overlay: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: 'rgba(0, 0, 0, 0.18)',
    },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingTop: 8,
    },

    closeButton: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 23,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },

    topTitleContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 10,
    },

    topTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },

    studyLabel: {
      marginTop: 2,
      color: '#D5E0EA',
      fontSize: 11,
      fontWeight: '600',
    },

    topSpacer: {
      width: 46,
    },

    centerArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 22,
    },

    guideBox: {
      width: Math.min(SCREEN_WIDTH - 44, 420),
      minHeight: 260,
      justifyContent: 'flex-end',
      borderRadius: 18,
      backgroundColor: 'rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
    },

    corner: {
      position: 'absolute',
      width: 42,
      height: 42,
      borderColor: '#FFFFFF',
    },

    topLeft: {
      top: 0,
      left: 0,
      borderTopWidth: 4,
      borderLeftWidth: 4,
      borderTopLeftRadius: 16,
    },

    topRight: {
      top: 0,
      right: 0,
      borderTopWidth: 4,
      borderRightWidth: 4,
      borderTopRightRadius: 16,
    },

    bottomLeft: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 4,
      borderLeftWidth: 4,
      borderBottomLeftRadius: 16,
    },

    bottomRight: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 4,
      borderRightWidth: 4,
      borderBottomRightRadius: 16,
    },

    guideTextContainer: {
      margin: 18,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.56)',
    },

    guideTitle: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'center',
    },

    guideText: {
      marginTop: 4,
      color: '#E2E8F0',
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
    },

    bottomArea: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 26,
    },

    captureHint: {
      marginBottom: 16,
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowRadius: 4,
    },

    captureOuter: {
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 40,
      borderWidth: 5,
      borderColor: '#FFFFFF',
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
    },

    captureOuterDisabled: {
      opacity: 0.5,
    },

    captureInner: {
      width: 60,
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 30,
      backgroundColor: '#FFFFFF',
    },

    permissionScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      backgroundColor: COLORS.background,
    },

    permissionCard: {
      width: '100%',
      maxWidth: 430,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 20,
      backgroundColor: COLORS.surface,
      padding: 26,
    },

    permissionIcon: {
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 36,
      backgroundColor: COLORS.blueLight,
      marginBottom: 18,
    },

    permissionTitle: {
      color: COLORS.textPrimary,
      fontSize: 21,
      fontWeight: '800',
      textAlign: 'center',
    },

    permissionText: {
      marginTop: 10,
      color: COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },

    permissionHelp: {
      marginTop: 18,
      color: COLORS.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },

    permissionButton: {
      width: '100%',
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 22,
      borderRadius: 13,
      backgroundColor: COLORS.blue,
    },

    permissionButtonText: {
      color: COLORS.white,
      fontSize: 15,
      fontWeight: '800',
    },

    backToHomeButton: {
      minHeight: 44,
      justifyContent: 'center',
      marginTop: 10,
      paddingHorizontal: 14,
    },

    backToHomeText: {
      color: COLORS.blue,
      fontSize: 14,
      fontWeight: '700',
    },
  });