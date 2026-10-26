import React, { useRef, useState } from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/app';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'Camera'
>;

export default function CameraScreen({
  navigation,
}: Props) {
  const cameraRef = useRef<CameraView | null>(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [flashEnabled, setFlashEnabled] =
    useState(false);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [capturing, setCapturing] =
    useState(false);

  const takePicture = async () => {
    if (
      !cameraRef.current ||
      !cameraReady ||
      capturing
    ) {
      return;
    }

    try {
      setCapturing(true);

      const photo =
        await cameraRef.current.takePictureAsync({
          quality: 0.85,
        });

      if (!photo?.uri) {
        return;
      }

      navigation.navigate('ClaimReview', {
        imageUri: photo.uri,
      });
    } catch (error) {
      console.log('Camera capture error:', error);
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.permissionLoading}>
        <ActivityIndicator
          size="large"
          color={COLORS.blue}
        />

        <Text style={styles.permissionLoadingText}>
          Preparing camera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <StatusBar style="dark" />

        <View style={styles.permissionHeader}>
          <TouchableOpacity
            style={styles.lightBackButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Ionicons
              name="camera-outline"
              size={38}
              color={COLORS.blue}
            />
          </View>

          <Text style={styles.permissionTitle}>
            Camera access needed
          </Text>

          <Text style={styles.permissionDescription}>
            FactTrace uses your camera to capture
            claims for text extraction and review.
          </Text>

          <TouchableOpacity
            style={styles.permissionButton}
            activeOpacity={0.85}
            onPress={requestPermission}
          >
            <Ionicons
              name="camera-outline"
              size={21}
              color={COLORS.white}
            />

            <Text style={styles.permissionButtonText}>
              Allow Camera Access
            </Text>
          </TouchableOpacity>

          <View style={styles.permissionPrivacy}>
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={COLORS.textMuted}
            />

            <Text style={styles.permissionPrivacyText}>
              Photos are used only to extract claim text.
            </Text>
          </View>
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
        flash={flashEnabled ? 'on' : 'off'}
        mode="picture"
        onCameraReady={() =>
          setCameraReady(true)
        }
      />

      <View style={styles.topShade} />
      <View style={styles.bottomShade} />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.controlButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.white}
            />
          </TouchableOpacity>

          <View style={styles.titleArea}>
            <Text style={styles.title}>
              Scan a Claim
            </Text>

            <View style={styles.liveRow}>
              <View style={styles.liveDot} />

              <Text style={styles.liveText}>
                LIVE CAMERA
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.controlButton,
              flashEnabled &&
                styles.controlButtonActive,
            ]}
            onPress={() =>
              setFlashEnabled(
                current => !current,
              )
            }
          >
            <Ionicons
              name={
                flashEnabled
                  ? 'flash'
                  : 'flash-off-outline'
              }
              size={23}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.guideArea}>
          <View style={styles.guidePill}>
            <Ionicons
              name="scan-outline"
              size={18}
              color={COLORS.white}
            />

            <Text style={styles.guideText}>
              Align the claim inside the frame
            </Text>
          </View>

          <View style={styles.scanFrame}>
            <View
              style={[
                styles.corner,
                styles.topLeft,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.topRight,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.bottomLeft,
              ]}
            />

            <View
              style={[
                styles.corner,
                styles.bottomRight,
              ]}
            />

            <View style={styles.scanLine} />
          </View>

          <Text style={styles.helperText}>
            Capture a headline, post, screen,
            or printed statement
          </Text>
        </View>

        <View style={styles.bottomArea}>
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="text-outline"
                size={20}
                color="#CFE2FF"
              />
            </View>

            <View style={styles.infoTextArea}>
              <Text style={styles.infoTitle}>
                Capture readable text
              </Text>

              <Text style={styles.infoDescription}>
                Keep the phone steady and make
                sure the claim is clearly visible.
              </Text>
            </View>
          </View>

          <View style={styles.captureRow}>
            <View style={styles.sideSpace} />

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.captureOuter}
              onPress={takePicture}
              disabled={
                capturing || !cameraReady
              }
            >
              <View
                style={[
                  styles.captureInner,
                  capturing &&
                    styles.captureInnerBusy,
                ]}
              >
                {capturing ? (
                  <ActivityIndicator
                    color={COLORS.white}
                    size="small"
                  />
                ) : (
                  <Ionicons
                    name="camera"
                    size={30}
                    color={COLORS.white}
                  />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.manualButton}
              onPress={() =>
                navigation.navigate(
                  'ClaimReview',
                  {
                    claimText: '',
                  },
                )
              }
            >
              <View style={styles.manualIconCircle}>
                <Ionicons
                  name="document-text-outline"
                  size={21}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.manualText}>
                Enter Manually
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.captureHint}>
            Tap to capture
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },

  overlay: {
    flex: 1,
  },

  topShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 175,
    backgroundColor: 'rgba(4, 15, 28, 0.44)',
  },

  bottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'rgba(4, 15, 28, 0.62)',
  },

  topBar: {
    marginTop: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  controlButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(15, 31, 49, 0.55)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.15)',
  },

  controlButtonActive: {
    backgroundColor:
      'rgba(47, 107, 242, 0.75)',
    borderColor:
      'rgba(170, 202, 255, 0.7)',
  },

  titleArea: {
    flex: 1,
    alignItems: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },

  liveRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
    backgroundColor: '#53D28C',
  },

  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#DCE8F4',
  },

  guideArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingBottom: 25,
  },

  guidePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(10, 29, 48, 0.72)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginBottom: 19,
  },

  guideText: {
    marginLeft: 7,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },

  scanFrame: {
    width: '100%',
    height: 235,
    position: 'relative',
    borderRadius: 20,
    backgroundColor:
      'rgba(255,255,255,0.025)',
  },

  corner: {
    position: 'absolute',
    width: 45,
    height: 45,
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#69A2FF',
    borderTopLeftRadius: 18,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#69A2FF',
    borderTopRightRadius: 18,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#69A2FF',
    borderBottomLeftRadius: 18,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#69A2FF',
    borderBottomRightRadius: 18,
  },

  scanLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '50%',
    height: 1,
    backgroundColor:
      'rgba(104, 162, 255, 0.55)',
  },

  helperText: {
    marginTop: 16,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
  },

  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.11)',
    backgroundColor:
      'rgba(15, 34, 53, 0.75)',
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(73, 128, 200, 0.25)',
  },

  infoTextArea: {
    flex: 1,
    marginLeft: 10,
  },

  infoTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

  infoDescription: {
    marginTop: 2,
    color: '#BCCADD',
    fontSize: 11,
    lineHeight: 15,
  },

  captureRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sideSpace: {
    width: 80,
  },

  captureOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor:
      'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.14)',
  },

  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blue,
  },

  captureInnerBusy: {
    opacity: 0.65,
  },

  manualButton: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },

  manualIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.14)',
  },

  manualText: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '600',
    color: '#DCE8F4',
    textAlign: 'center',
  },

  captureHint: {
    marginTop: 7,
    marginBottom: 4,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
  },

  permissionScreen: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },

  permissionHeader: {
    paddingHorizontal: 22,
    marginTop: 12,
  },

  lightBackButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B3655',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 34,
    paddingBottom: 80,
  },

  permissionIcon: {
    width: 82,
    height: 82,
    borderRadius: 25,
    backgroundColor: '#E9F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  permissionTitle: {
    marginTop: 23,
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  permissionDescription: {
    marginTop: 10,
    maxWidth: 310,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },

  permissionButton: {
    marginTop: 27,
    height: 54,
    borderRadius: 15,
    paddingHorizontal: 22,
    backgroundColor: COLORS.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  permissionButtonText: {
    marginLeft: 8,
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  permissionPrivacy: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  permissionPrivacyText: {
    marginLeft: 6,
    color: COLORS.textMuted,
    fontSize: 11.5,
  },

  permissionLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8FC',
  },

  permissionLoadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});