import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewInstance,
} from 'react-native';

import { COLORS } from '../constants/app';
import type { WalkthroughStep } from '../services/walkthroughService';

type Props = {
  mode: 'welcome' | 'spotlight' | 'practice_pending' | 'complete';
  step?: WalkthroughStep;
  targetRef?: { current: ViewInstance | null };
  measurementVersion?: number;
  title: string;
  message: string;
  resume?: boolean;
  onStart?: () => void;
  onContinue?: () => void;
  onFinish?: () => void;
  onSkip: () => void;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function WalkthroughOverlay({
  mode,
  targetRef,
  measurementVersion = 0,
  title,
  message,
  resume = false,
  onStart,
  onContinue,
  onFinish,
  onSkip,
}: Props) {
  const { width, height } = useWindowDimensions();
  const overlayRef = useRef<ViewInstance>(null);
  const [overlaySize, setOverlaySize] = useState({ width, height });
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(0);

  const isSpotlight = mode === 'spotlight';
  const tooltipWidth = Math.min(420, width - 32);

  const measureTarget = () => {
    if (!isSpotlight || !targetRef?.current) {
      setTargetRect(null);
      return;
    }

    overlayRef.current?.measureInWindow((overlayX, overlayY) => {
      targetRef.current?.measureInWindow((x, y, targetWidth, targetHeight) => {
        const left = Math.max(0, x - overlayX - 6);
        const top = Math.max(0, y - overlayY - 6);
        const nextRect = {
          x: left,
          y: top,
          width: Math.max(
            0,
            Math.min(targetWidth + 12, overlaySize.width - left),
          ),
          height: Math.max(
            0,
            Math.min(targetHeight + 12, overlaySize.height - top),
          ),
        };

        setTargetRect(previous =>
          previous?.x === nextRect.x &&
          previous?.y === nextRect.y &&
          previous?.width === nextRect.width &&
          previous?.height === nextRect.height
            ? previous
            : nextRect,
        );
      });
    });
  };

  useEffect(() => {
    const frame = requestAnimationFrame(measureTarget);
    return () => cancelAnimationFrame(frame);
  }, [isSpotlight, measurementVersion, width, height, overlaySize]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
    setOverlaySize(previous =>
      previous.width === nextWidth && previous.height === nextHeight
        ? previous
        : { width: nextWidth, height: nextHeight },
    );
  };

  const tooltipGap = 14;
  const aboveSpace = targetRect
    ? Math.max(0, targetRect.y - tooltipGap)
    : 0;
  const belowSpace = targetRect
    ? Math.max(
        0,
        overlaySize.height -
          targetRect.y -
          targetRect.height -
          tooltipGap,
      )
    : 0;
  const placeAbove = Boolean(
    targetRect &&
      (aboveSpace >= tooltipHeight ||
        (belowSpace < tooltipHeight && aboveSpace >= belowSpace)),
  );
  const tooltipSpace = placeAbove ? aboveSpace : belowSpace;
  const tooltipTop = targetRect
    ? placeAbove
      ? Math.max(0, targetRect.y - tooltipGap - tooltipHeight)
      : targetRect.y + targetRect.height + tooltipGap
    : height / 2;
  const tooltipLeft = targetRect
    ? Math.max(
        16,
        Math.min(
          targetRect.x,
          overlaySize.width - tooltipWidth - 16,
        ),
      )
    : Math.max(16, (overlaySize.width - tooltipWidth) / 2);

  const bottom = targetRect
    ? targetRect.y + targetRect.height
    : 0;
  const right = targetRect
    ? targetRect.x + targetRect.width
    : 0;

  return (
    <View
      ref={overlayRef}
      pointerEvents="box-none"
      style={styles.overlay}
      onLayout={handleLayout}
    >
      {isSpotlight ? (
        targetRect ? (
          <>
          <View
            pointerEvents="auto"
            style={[
              styles.scrim,
              { left: 0, top: 0, right: 0, height: targetRect.y },
            ]}
          />
          <View
            pointerEvents="auto"
            style={[
              styles.scrim,
              { left: 0, top: bottom, right: 0, bottom: 0 },
            ]}
          />
          <View
            pointerEvents="auto"
            style={[
              styles.scrim,
              {
                left: 0,
                top: targetRect.y,
                width: targetRect.x,
                height: targetRect.height,
              },
            ]}
          />
          <View
            pointerEvents="auto"
            style={[
              styles.scrim,
              {
                left: right,
                top: targetRect.y,
                right: 0,
                height: targetRect.height,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.highlightBorder,
              {
                left: targetRect.x,
                top: targetRect.y,
                width: targetRect.width,
                height: targetRect.height,
              },
            ]}
          />
          </>
        ) : null
      ) : (
        <View pointerEvents="auto" style={styles.fullScrim} />
      )}

      <View
        onLayout={event => {
          const nextHeight = event.nativeEvent.layout.height;
          setTooltipHeight(previous =>
            previous === nextHeight ? previous : nextHeight,
          );
        }}
        style={[
          styles.card,
          isSpotlight && targetRect
            ? {
                top: tooltipTop,
                left: tooltipLeft,
                width: tooltipWidth,
                maxHeight: tooltipSpace,
                opacity: tooltipHeight > 0 ? 1 : 0,
              }
            : [
                styles.centeredPosition,
                { width: tooltipWidth },
              ],
        ]}
      >
        <ScrollView
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={
            isSpotlight && targetRect
              ? { maxHeight: Math.max(0, tooltipSpace - 136) }
              : { maxHeight: Math.min(250, height * 0.45) }
          }
        >
          {isSpotlight ? (
            <Text style={styles.eyebrow}>GUIDED WALKTHROUGH</Text>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

        </ScrollView>

        {mode === 'welcome' ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={onStart}
          >
            <Text style={styles.primaryButtonText}>
              {resume ? 'Resume Walkthrough' : 'Start Walkthrough'}
            </Text>
          </TouchableOpacity>
        ) : mode === 'complete' && onFinish ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={onFinish}
          >
            <Text style={styles.primaryButtonText}>Start Verifying</Text>
          </TouchableOpacity>
        ) : isSpotlight && onContinue ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={onContinue}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.skipButton}
          onPress={onSkip}
        >
          <Text style={styles.skipButtonText}>Skip Walkthrough</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
  },
  fullScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 16, 29, 0.88)',
  },
  scrim: {
    position: 'absolute',
    backgroundColor: 'rgba(5, 16, 29, 0.88)',
  },
  highlightBorder: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#FFD166',
    borderRadius: 20,
  },
  card: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E1E8F0',
    backgroundColor: COLORS.white,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  centeredPosition: {
    top: '50%',
    alignSelf: 'center',
    transform: [{ translateY: -130 }],
  },
  eyebrow: {
    color: '#AA7000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  message: {
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: COLORS.blue,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  skipButton: {
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  skipButtonText: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: '700',
  },
});
