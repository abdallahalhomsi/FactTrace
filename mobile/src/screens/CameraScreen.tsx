import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ViewInstance,
} from 'react-native';

import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import {
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';

import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { ThemeColors } from '../constants/app';
import { RootStackParamList } from '../navigation/types';
import { verifyClaim } from '../services/verificationService';
import { createHistoryEntryId } from '../services/historyService';
import { useAppTheme } from '../theme/AppTheme';

type Props =
  NativeStackScreenProps<
    RootStackParamList,
    'Camera'
  >;

//a FactTrace QR marker holds a claim id, as "claim_11" or "facttrace:claim_11"
const QR_CLAIM_PATTERN = /^(?:facttrace:)?(claim_\d{1,4})$/i;

//study trials measure the camera and OCR path, so QR markers are only offered outside the study:
//a QR code always gives an exact match and would change the FactTrace condition between participants
const QR_IN_STUDY_TRIALS = false;

type CameraMode = 'photo' | 'qr';

type ScanFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PhotoDimensions = {
  width: number;
  height: number;
};

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    Math.max(value, min),
    max,
  );
}

function mapPreviewFrameToPhoto(
  frame: ScanFrame,
  previewWidth: number,
  previewHeight: number,
  photo: PhotoDimensions,
) {
  const scale = Math.max(
    previewWidth / photo.width,
    previewHeight / photo.height,
  );

  const displayedPhotoWidth =
    photo.width * scale;

  const displayedPhotoHeight =
    photo.height * scale;

  const horizontalCrop =
    (displayedPhotoWidth - previewWidth) / 2;

  const verticalCrop =
    (displayedPhotoHeight - previewHeight) / 2;

  const originX =
    (frame.x + horizontalCrop) / scale;

  const originY =
    (frame.y + verticalCrop) / scale;

  const width =
    frame.width / scale;

  const height =
    frame.height / scale;

  const safeOriginX =
    clamp(
      Math.round(originX),
      0,
      Math.max(
        0,
        photo.width - 1,
      ),
    );

  const safeOriginY =
    clamp(
      Math.round(originY),
      0,
      Math.max(
        0,
        photo.height - 1,
      ),
    );

  const safeWidth =
    clamp(
      Math.round(width),
      1,
      photo.width - safeOriginX,
    );

  const safeHeight =
    clamp(
      Math.round(height),
      1,
      photo.height - safeOriginY,
    );

  return {
    originX: safeOriginX,
    originY: safeOriginY,
    width: safeWidth,
    height: safeHeight,
  };
}

export default function CameraScreen({
  navigation,
  route,
}: Props) {
  const {
    colors: COLORS,
    isDark,
  } = useAppTheme();

  const {
    width: windowWidth,
    height: windowHeight,
  } = useWindowDimensions();

  const styles =
    useMemo(
      () =>
        createStyles(
          COLORS,
          windowWidth,
        ),
      [
        COLORS,
        windowWidth,
      ],
    );

  const [
    permission,
    requestPermission,
  ] =
    useCameraPermissions();

  const cameraRef =
    useRef<CameraView | null>(
      null,
    );

  const guideBoxRef =
    useRef<ViewInstance>(
      null,
    );

  const [
    isCameraReady,
    setIsCameraReady,
  ] =
    useState(false);

  const [
    isCapturing,
    setIsCapturing,
  ] =
    useState(false);

  const studyContext =
    route.params?.studyContext;

  const qrAvailable =
    !studyContext || QR_IN_STUDY_TRIALS;

  const [
    cameraMode,
    setCameraMode,
  ] =
    useState<CameraMode>('photo');

  const [
    isCheckingQr,
    setIsCheckingQr,
  ] =
    useState(false);

  //the camera reports the same code many times a second: handle one at a time
  const qrLock = useRef(false);

  //shown on the camera screen (an alert box does not work on every platform)
  const [
    qrMessage,
    setQrMessage,
  ] =
    useState<string | null>(null);

  const handleQrScanned =
    async (
      scan: BarcodeScanningResult,
    ) => {
      if (
        qrLock.current ||
        cameraMode !== 'qr'
      ) {
        return;
      }

      qrLock.current = true;

      const match =
        QR_CLAIM_PATTERN.exec(
          scan.data.trim(),
        );

      if (!match) {
        setQrMessage(
          'This QR code does not contain a FactTrace claim. Scan the code printed on a claim card, or switch to Photo.',
        );
        //try again after a short pause, so the same wrong code is not reported many times a second
        setTimeout(() => {
          qrLock.current = false;
        }, 2000);

        return;
      }

      setQrMessage(null);

      const claimId =
        match[1].toLowerCase();
      const startedAt =
        studyContext?.startedAt ??
        new Date().toISOString();

      setIsCheckingQr(true);

      try {
        const response =
          await verifyClaim('', {
            source: 'qr',
            claimId,
          });

        if (
          !response.success ||
          !response.data
        ) {
          throw new Error(
            typeof response.error ===
              'string'
              ? response.error
              : 'FactTrace could not check this QR code.',
          );
        }

        navigation.navigate(
          'VerificationResults',
          {
            result:
              response.data,
            historyEntryId:
              createHistoryEntryId(),
            evaluation: {
              inputSource: 'qr',
              startedAt,
            },
            ...(studyContext
              ? { studyContext }
              : {}),
          },
        );
      } catch (error) {
        Alert.alert(
          'Could not check the QR code',
          error instanceof Error
            ? error.message
            : 'Please try again.',
        );
      } finally {
        setIsCheckingQr(false);
        //short pause, so returning to the camera does not scan the same code again at once
        setTimeout(() => {
          qrLock.current = false;
        }, 1500);
      }
    };

  useEffect(() => {
    if (!permission) {
      return;
    }

    if (
      !permission.granted &&
      permission.canAskAgain
    ) {
      void requestPermission();
    }
  }, [
    permission,
    requestPermission,
  ]);

  const handleClose =
    () => {
      if (
        navigation.canGoBack()
      ) {
        navigation.goBack();
      } else {
        navigation.navigate(
          'Home',
        );
      }
    };

  const measureGuideFrame =
    (): Promise<ScanFrame> =>
      new Promise(
        (
          resolve,
          reject,
        ) => {
          const guide =
            guideBoxRef.current;

          if (!guide) {
            reject(
              new Error(
                'Scan frame is not ready.',
              ),
            );

            return;
          }

          guide.measureInWindow(
            (
              x,
              y,
              width,
              height,
            ) => {
              if (
                width <= 0 ||
                height <= 0
              ) {
                reject(
                  new Error(
                    'Scan frame could not be measured.',
                  ),
                );

                return;
              }

              resolve({
                x,
                y,
                width,
                height,
              });
            },
          );
        },
      );

  const handleCapture =
    async () => {
      if (
        !cameraRef.current ||
        !isCameraReady ||
        isCapturing
      ) {
        return;
      }

      try {
        setIsCapturing(true);

        const scanFrame =
          await measureGuideFrame();

        const photo =
          await cameraRef.current
            .takePictureAsync({
              quality: 0.9,
              skipProcessing: false,
            });

        if (!photo?.uri) {
          throw new Error(
            'No image was captured.',
          );
        }

        if (
          !photo.width ||
          !photo.height
        ) {
          throw new Error(
            'The captured image dimensions are unavailable.',
          );
        }

        const crop =
          mapPreviewFrameToPhoto(
            scanFrame,
            windowWidth,
            windowHeight,
            {
              width: photo.width,
              height: photo.height,
            },
          );

        const croppedImage =
          await manipulateAsync(
            photo.uri,
            [
              {
                crop,
              },
            ],
            {
              compress: 0.9,
              format:
                SaveFormat.JPEG,
            },
          );

        if (!croppedImage.uri) {
          throw new Error(
            'The captured claim could not be cropped.',
          );
        }

        navigation.navigate(
          'ClaimReview',
          {
            imageUri:
              croppedImage.uri,
            studyContext,
            ocrRetakes:
              route.params
                ?.ocrRetakes ??
              0,
          },
        );
      } catch (error) {
        console.error(
          'Camera capture/crop failed:',
          error,
        );

        Alert.alert(
          'Could not capture claim',
          'FactTrace could not crop the selected claim area. Please try again.',
        );
      } finally {
        setIsCapturing(false);
      }
    };

  if (!permission) {
    return (
      <SafeAreaView
        style={
          styles.permissionScreen
        }
      >
        <StatusBar
          style={
            isDark
              ? 'light'
              : 'dark'
          }
        />

        <ActivityIndicator
          size="large"
          color={COLORS.blue}
        />

        <Text
          style={
            styles.permissionText
          }
        >
          Checking camera permission...
        </Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={
          styles.permissionScreen
        }
      >
        <StatusBar
          style={
            isDark
              ? 'light'
              : 'dark'
          }
        />

        <View
          style={
            styles.permissionCard
          }
        >
          <View
            style={
              styles.permissionIcon
            }
          >
            <Ionicons
              name="camera-outline"
              size={38}
              color={COLORS.blue}
            />
          </View>

          <Text
            style={
              styles.permissionTitle
            }
          >
            Camera access is required
          </Text>

          <Text
            style={
              styles.permissionText
            }
          >
            FactTrace uses your camera to capture printed or on-screen claims
            for OCR and verification.
          </Text>

          {permission.canAskAgain ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={
                styles.permissionButton
              }
              onPress={() =>
                void requestPermission()
              }
            >
              <Text
                style={
                  styles.permissionButtonText
                }
              >
                Allow Camera Access
              </Text>
            </TouchableOpacity>
          ) : (
            <Text
              style={
                styles.permissionHelp
              }
            >
              Camera permission is disabled in your device settings. Enable it
              for FactTrace and reopen the camera.
            </Text>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            style={
              styles.backToHomeButton
            }
            onPress={
              handleClose
            }
          >
            <Text
              style={
                styles.backToHomeText
              }
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={
        styles.screen
      }
    >
      <StatusBar style="light" />

      <CameraView
        ref={cameraRef}
        style={
          StyleSheet.absoluteFill
        }
        facing="back"
        onCameraReady={() =>
          setIsCameraReady(true)
        }
        //the scanner only runs in QR mode, so photo mode (and every study trial) does no barcode work
        barcodeScannerSettings={
          qrAvailable &&
          cameraMode === 'qr'
            ? { barcodeTypes: ['qr'] }
            : undefined
        }
        onBarcodeScanned={
          qrAvailable &&
          cameraMode === 'qr'
            ? scan =>
                void handleQrScanned(
                  scan,
                )
            : undefined
        }
      />

      <SafeAreaView
        style={
          styles.overlay
        }
      >
        <View
          style={
            styles.topBar
          }
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close camera"
            style={
              styles.closeButton
            }
            onPress={
              handleClose
            }
          >
            <Ionicons
              name="close"
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View
            style={
              styles.topTitleContainer
            }
          >
            <Text
              style={
                styles.topTitle
              }
            >
              Scan a Claim
            </Text>

            {studyContext ? (
              <Text
                style={
                  styles.studyLabel
                }
              >
                Study Trial{' '}
                {
                  studyContext.trialIndex
                }
              </Text>
            ) : null}
          </View>

          <View
            style={
              styles.topSpacer
            }
          />
        </View>

        <View
          style={
            styles.centerArea
          }
        >
          <View
            ref={guideBoxRef}
            collapsable={false}
            style={
              styles.guideBox
            }
          >
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
          </View>

          <Text
            style={
              styles.outsideGuideNote
            }
          >
            {cameraMode === 'qr'
              ? 'Point the camera at the QR code on a claim card.'
              : 'Only content inside this frame will be scanned.'}
          </Text>
        </View>

        <View
          style={
            styles.bottomArea
          }
        >
          {qrAvailable ? (
            <View
              style={
                styles.modeRow
              }
              accessibilityRole="radiogroup"
            >
              {(
                [
                  ['photo', 'Photo', 'camera-outline'],
                  ['qr', 'QR code', 'qr-code-outline'],
                ] as const
              ).map(
                ([mode, label, icon]) => (
                  <TouchableOpacity
                    key={mode}
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected:
                        cameraMode === mode,
                    }}
                    style={[
                      styles.modeButton,
                      cameraMode === mode &&
                        styles.modeButtonSelected,
                    ]}
                    onPress={() =>
                      setCameraMode(mode)
                    }
                  >
                    <Ionicons
                      name={icon}
                      size={18}
                      color={
                        cameraMode === mode
                          ? '#0B1B2B'
                          : '#FFFFFF'
                      }
                    />
                    <Text
                      style={[
                        styles.modeText,
                        cameraMode === mode &&
                          styles.modeTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          ) : null}

          {cameraMode === 'qr' &&
          qrMessage ? (
            <Text
              style={
                styles.qrMessage
              }
              accessibilityRole="alert"
            >
              {qrMessage}
            </Text>
          ) : null}

          <Text
            style={
              styles.captureHint
            }
          >
            {cameraMode === 'qr'
              ? isCheckingQr
                ? 'Checking the QR code…'
                : 'The claim is checked as soon as the code is read.'
              : 'Capture one factual claim at a time.'}
          </Text>

          {cameraMode === 'photo' ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Capture claim"
            disabled={
              !isCameraReady ||
              isCapturing
            }
            style={[
              styles.captureOuter,
              (
                !isCameraReady ||
                isCapturing
              ) &&
                styles.captureOuterDisabled,
            ]}
            onPress={() =>
              void handleCapture()
            }
          >
            <View
              style={
                styles.captureInner
              }
            >
              {isCapturing ? (
                <ActivityIndicator
                  color={COLORS.blue}
                  size="small"
                />
              ) : null}
            </View>
          </TouchableOpacity>
          ) : isCheckingQr ? (
            <ActivityIndicator
              color="#FFFFFF"
              size="large"
            />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (
  COLORS: ThemeColors,
  screenWidth: number,
) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#000000',
    },

    overlay: {
      flex: 1,
      justifyContent:
        'space-between',
      backgroundColor:
        'rgba(0, 0, 0, 0.18)',
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
      backgroundColor:
        'rgba(0, 0, 0, 0.45)',
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
      width:
        Math.min(
          screenWidth - 44,
          420,
        ),

      minHeight: 260,

      borderRadius: 18,

      backgroundColor:
        'rgba(0, 0, 0, 0.04)',

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

    outsideGuideNote: {
      marginTop: 16,
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      textShadowColor:
        'rgba(0, 0, 0, 0.85)',
      textShadowRadius: 4,
    },

    bottomArea: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 26,
    },

    qrMessage: {
      marginBottom: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      overflow: 'hidden',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      fontSize: 14,
      textAlign: 'center',
    },

    modeRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
    },

    modeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.6)',
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },

    modeButtonSelected: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FFFFFF',
    },

    modeText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    modeTextSelected: {
      color: '#0B1B2B',
    },

    captureHint: {
      marginBottom: 16,
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      textShadowColor:
        'rgba(0, 0, 0, 0.75)',
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
      backgroundColor:
        'rgba(255, 255, 255, 0.18)',
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
      backgroundColor:
        COLORS.background,
    },

    permissionCard: {
      width: '100%',
      maxWidth: 430,
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 20,
      backgroundColor:
        COLORS.surface,
      padding: 26,
    },

    permissionIcon: {
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 36,
      backgroundColor:
        COLORS.blueLight,
      marginBottom: 18,
    },

    permissionTitle: {
      color:
        COLORS.textPrimary,
      fontSize: 21,
      fontWeight: '800',
      textAlign: 'center',
    },

    permissionText: {
      marginTop: 10,
      color:
        COLORS.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },

    permissionHelp: {
      marginTop: 18,
      color:
        COLORS.textMuted,
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
      backgroundColor:
        COLORS.blue,
    },

    permissionButtonText: {
      color:
        COLORS.white,
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
      color:
        COLORS.blue,
      fontSize: 14,
      fontWeight: '700',
    },
  });