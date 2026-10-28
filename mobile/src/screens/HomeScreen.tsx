import React from 'react';

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/app';
import { useAuth } from '../hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const user = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>FactTrace</Text>

            <Text style={styles.tagline}>
              Check the claim. Explore the evidence.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons
              name="person-outline"
              size={23}
              color={COLORS.blue}
            />
          </TouchableOpacity>
        </View>

        {/* HERO */}
        <LinearGradient
          colors={['#102B49', '#123D67', '#17568C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />

          <Text style={styles.heroTitle}>
            Facts deserve{'\n'}a closer look.
          </Text>

          <View style={styles.heroLabel}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color="#DCEBFF"
            />

            <Text style={styles.heroLabelText}>
              VERIFY WITH EVIDENCE
            </Text>
          </View>

          <Text style={styles.heroDescription}>
            Capture a claim, inspect its sources and make a more informed
            decision.
          </Text>

          <View style={styles.stepsRow}>
            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons
                  name="camera-outline"
                  size={16}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.stepText}>Scan</Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color="#8FB5DB"
            />

            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.stepText}>Review</Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color="#8FB5DB"
            />

            <View style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons
                  name="search-outline"
                  size={16}
                  color={COLORS.white}
                />
              </View>

              <Text style={styles.stepText}>Evidence</Text>
            </View>
          </View>
        </LinearGradient>

        {/* SCAN BUTTON */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.scanButtonWrapper}
          onPress={() => navigation.navigate('Camera')}
        >
          <LinearGradient
            colors={['#3478F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scanButton}
          >
            <View style={styles.scanIconContainer}>
              <Ionicons
                name="scan-outline"
                size={24}
                color={COLORS.white}
              />
            </View>

            <View style={styles.scanTextContainer}>
              <Text style={styles.scanButtonTitle}>
                Scan a Claim
              </Text>

              <Text style={styles.scanButtonSubtitle}>
                Use your camera to capture text
              </Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={22}
              color={COLORS.white}
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* SECONDARY ACTIONS */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate('ClaimReview', {
                claimText: '',
              })
            }
          >
            <View style={styles.actionIconBlue}>
              <Ionicons
                name="create-outline"
                size={23}
                color={COLORS.blue}
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Enter Claim Manually
              </Text>

              <Text style={styles.actionSubtitle}>
                Type or paste a claim instead
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate('VerificationHistory')
            }
          >
            <View style={styles.actionIconPurple}>
              <Ionicons
                name="time-outline"
                size={23}
                color="#7357D9"
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>
                Verification History
              </Text>

              <Text style={styles.actionSubtitle}>
                Review your previous checks
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.actionCard}
            onPress={() => navigation.navigate('BrowserComparison')}
          >
            <View style={styles.actionIconBlue}>
              <Ionicons
                name="search-outline"
                size={23}
                color={COLORS.blue}
              />
            </View>

            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Browser Comparison</Text>
              <Text style={styles.actionSubtitle}>
                Record a manual research task
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* GUEST CARD */}
        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Ionicons
              name="person-circle-outline"
              size={29}
              color={COLORS.blue}
            />
          </View>

          <View style={styles.accountTextContainer}>
            <Text style={styles.accountTitle}>
              {user ? 'Your Account' : 'Using FactTrace as a guest'}
            </Text>

            <Text style={styles.accountDescription}>
              {user
                ? `${user.displayName} · your profile and history are saved on this device.`
                : 'You can verify claims without an account. Create an account to save your history on this device.'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.loginButton}
            onPress={() =>
              navigation.navigate(user ? 'Profile' : 'Login')
            }
          >
            <Text style={styles.loginButtonText}>
              {user ? 'Profile' : 'Log In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* WHY FACTTRACE */}
        <View style={styles.whySection}>
          <Text style={styles.whyTitle}>
            Why FactTrace?
          </Text>

          <View style={styles.whyCardsRow}>
            <View style={styles.whyCard}>
              <View style={styles.whyIconBlue}>
                <Ionicons
                  name="link-outline"
                  size={20}
                  color={COLORS.blue}
                />
              </View>

              <Text style={styles.whyCardTitle}>
                Source-first
              </Text>

              <Text style={styles.whyCardText}>
                See where the evidence comes from.
              </Text>
            </View>

            <View style={styles.whyCard}>
              <View style={styles.whyIconOrange}>
                <Ionicons
                  name="analytics-outline"
                  size={20}
                  color="#D97706"
                />
              </View>

              <Text style={styles.whyCardTitle}>
                Transparent
              </Text>

              <Text style={styles.whyCardText}>
                Understand strong, weak, or unavailable matches.
              </Text>
            </View>

            <View style={styles.whyCard}>
              <View style={styles.whyIconGreen}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#16855A"
                />
              </View>

              <Text style={styles.whyCardTitle}>
                You decide
              </Text>

              <Text style={styles.whyCardText}>
                Evidence supports your final judgment.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },

  container: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    backgroundColor: '#F5F8FC',
  },

  /* HEADER */

  header: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    color: COLORS.textPrimary,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  tagline: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B3655',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  /* HERO */

  heroCard: {
    marginTop: 18,
    minHeight: 205,
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',

    shadowColor: '#0B2542',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 8,
  },

  heroCircleLarge: {
    position: 'absolute',
    width: 175,
    height: 175,
    borderRadius: 88,
    borderWidth: 28,
    borderColor: 'rgba(255,255,255,0.035)',
    right: -60,
    top: -48,
  },

  heroCircleSmall: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.025)',
    right: 18,
    bottom: -35,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.7,
  },

  heroLabel: {
    alignSelf: 'flex-start',
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },

  heroLabelText: {
    color: '#DCEBFF',
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },

  heroDescription: {
    marginTop: 8,
    maxWidth: '92%',
    color: '#CBD9E8',
    fontSize: 14,
    lineHeight: 19,
  },

  stepsRow: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stepIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.11)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepText: {
    marginLeft: 5,
    marginRight: 7,
    color: '#DCE8F4',
    fontSize: 12,
    fontWeight: '600',
  },

  /* MAIN CTA */

  scanButtonWrapper: {
    marginTop: 13,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 6,
  },

  scanButton: {
    minHeight: 64,
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  scanIconContainer: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  scanButtonTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },

  scanButtonSubtitle: {
    marginTop: 2,
    color: '#DCE8FF',
    fontSize: 12,
  },

  /* SECONDARY */

  secondaryActions: {
    marginTop: 9,
    gap: 7,
  },

  actionCard: {
    minHeight: 56,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3EAF2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  actionIconBlue: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionIconPurple: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  actionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  actionSubtitle: {
    marginTop: 1,
    color: COLORS.textSecondary,
    fontSize: 11.5,
  },

  /* ACCOUNT */

  accountCard: {
    marginTop: 9,
    borderRadius: 16,
    backgroundColor: '#EEF4FB',
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#E2ECFA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  accountTextContainer: {
    flex: 1,
    marginHorizontal: 9,
  },

  accountTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  accountDescription: {
    marginTop: 1,
    color: COLORS.textSecondary,
    fontSize: 10.5,
    lineHeight: 13,
  },

  loginButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#D7E2F0',
  },

  loginButtonText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '700',
  },

  /* WHY FACTTRACE */

  whySection: {
    marginTop: 8,
  },

  whyTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },

  whyCardsRow: {
    flexDirection: 'row',
    gap: 7,
  },

  whyCard: {
    flex: 1,
    minHeight: 88,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EAF2',
    paddingHorizontal: 9,
    paddingVertical: 8,
  },

  whyIconBlue: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EDF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  whyIconOrange: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#FFF3E6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  whyIconGreen: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EAF8F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  whyCardTitle: {
    marginTop: 5,
    color: COLORS.textPrimary,
    fontSize: 11.5,
    fontWeight: '700',
  },

  whyCardText: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: 9.5,
    lineHeight: 12,
  },
});