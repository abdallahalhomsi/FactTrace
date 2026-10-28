import React, { useRef, useState } from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import SharingIntentionModal, {
  SharingIntention,
} from '../components/SharingIntentionModal';
import { COLORS } from '../constants/app';
import { RootStackParamList } from '../navigation/types';
import { exportEvaluationRecords } from '../services/evaluationExport';
import { saveEvaluationDecision } from '../services/evaluationService';
import { DecisionRequest } from '../types/api';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'BrowserComparison'
>;
type Verdict = DecisionRequest['decision'];
type ConsultedSource = { title: string; url: string };

const VERDICTS: { value: Verdict; label: string }[] = [
  { value: 'trust', label: 'Trust' },
  { value: 'dont_trust', label: "Don't Trust" },
  { value: 'unsure', label: 'Unsure' },
];

export default function BrowserComparisonScreen({ navigation }: Props) {
  const [claimText, setClaimText] = useState('');
  const [participantCode, setParticipantCode] = useState('');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sources, setSources] = useState<ConsultedSource[]>([]);
  const [decision, setDecision] = useState<Verdict | null>(null);
  const [isSharingModalVisible, setSharingModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const submissionAttempted = useRef(false);

  const startTask = () => {
    if (!claimText.trim()) {
      setError('Enter the claim you are about to research.');
      return;
    }
    setError(null);
    setStartedAt(new Date().toISOString());
  };

  const openSource = async () => {
    const url = sourceUrl.trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Use an http or https source URL.');
      }
      await Linking.openURL(url);
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : 'FactTrace could not open that source URL.',
      );
    }
  };

  const addConsultedSource = () => {
    const title = sourceTitle.trim();
    const url = sourceUrl.trim();
    if (!title || !url) {
      setError('Enter a source name and URL after consulting the source.');
      return;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Source URLs must use http or https.');
      }
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : 'Enter a valid source URL.',
      );
      return;
    }

    if (!sources.some(source => source.url === url)) {
      setSources(current => [...current, { title, url }]);
    }
    setSourceTitle('');
    setSourceUrl('');
    setError(null);
  };

  const chooseVerdict = (value: Verdict) => {
    if (hasSubmitted || isSubmitting) {
      return;
    }
    setDecision(value);
    setSharingModalVisible(true);
  };

  const recordIntention = async (intention: SharingIntention) => {
    if (
      !startedAt ||
      !decision ||
      isSubmitting ||
      hasSubmitted ||
      submissionAttempted.current
    ) {
      return;
    }
    submissionAttempted.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await saveEvaluationDecision(
        {
          condition: 'browser',
          claimId: null,
          claimText: claimText.trim(),
          inputSource: 'manual',
          decision,
          sharingIntention: intention,
          sourcesOpened: sources.map(source => source.url),
          startedAt,
          endedAt: new Date().toISOString(),
        },
        participantCode,
        { sourcesConsulted: sources },
      );
      setStatus(result.message);
      setHasSubmitted(true);
      setSharingModalVisible(false);
    } catch (saveError) {
      submissionAttempted.current = false;
      setError(
        saveError instanceof Error
          ? `Could not save your evaluation locally: ${saveError.message}`
          : 'Could not save your evaluation locally. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportRecords = async () => {
    try {
      const count = await exportEvaluationRecords();
      if (count > 0) {
        setStatus(`Exported ${count} locally saved evaluation record(s).`);
      }
    } catch (exportError) {
      Alert.alert(
        'Evaluation export unavailable',
        exportError instanceof Error
          ? exportError.message
          : 'Could not export local evaluation records.',
      );
    }
  };

  const startAnotherTask = () => {
    setClaimText('');
    setParticipantCode('');
    setStartedAt(null);
    setSourceTitle('');
    setSourceUrl('');
    setSources([]);
    setDecision(null);
    setHasSubmitted(false);
    submissionAttempted.current = false;
    setStatus(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Browser Comparison</Text>
            <Text style={styles.subtitle}>
              Record only the sources you actually consult.
            </Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            This study flow does not run a browser search for you. Your records
            are saved locally; server submission requires a real study code.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {startedAt ? 'Research task' : 'Start a task'}
          </Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Claim to research"
            placeholderTextColor={COLORS.textSecondary}
            value={claimText}
            onChangeText={setClaimText}
            editable={!startedAt}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Claim to research"
          />
          {!startedAt ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Research-issued participant code (optional)"
                placeholderTextColor={COLORS.textSecondary}
                value={participantCode}
                onChangeText={setParticipantCode}
                autoCapitalize="characters"
                accessibilityLabel="Research-issued participant code"
              />
              <TouchableOpacity style={styles.primaryButton} onPress={startTask}>
                <Text style={styles.primaryButtonText}>Start Task</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.helper}>
              Started {new Date(startedAt).toLocaleTimeString()} · elapsed time
              is recorded when you finish.
            </Text>
          )}
        </View>

        {startedAt && !hasSubmitted ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Sources consulted</Text>
              <Text style={styles.helper}>
                Open a source, then add its actual title and URL to your record.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Source title or organization"
                placeholderTextColor={COLORS.textSecondary}
                value={sourceTitle}
                onChangeText={setSourceTitle}
                accessibilityLabel="Source title"
              />
              <TextInput
                style={styles.input}
                placeholder="https://example.com/article"
                placeholderTextColor={COLORS.textSecondary}
                value={sourceUrl}
                onChangeText={setSourceUrl}
                autoCapitalize="none"
                keyboardType="url"
                accessibilityLabel="Source URL"
              />
              <View style={styles.sourceActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => void openSource()}
                >
                  <Text style={styles.secondaryButtonText}>Open URL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={addConsultedSource}
                >
                  <Text style={styles.primaryButtonText}>Add Consulted Source</Text>
                </TouchableOpacity>
              </View>
              {sources.map((source, index) => (
                <View key={`${source.url}-${index}`} style={styles.sourceRow}>
                  <View style={styles.sourceCopy}>
                    <Text style={styles.sourceTitle}>{source.title}</Text>
                    <Text style={styles.sourceUrl}>{source.url}</Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${source.title}`}
                    onPress={() =>
                      setSources(current =>
                        current.filter((_, sourceIndex) => sourceIndex !== index),
                      )
                    }
                  >
                    <Ionicons name="close-circle-outline" size={22} color={COLORS.red} />
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={styles.helper}>
                {sources.length} source(s) recorded. If you did not consult any
                sources, leave the list empty.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Your final decision</Text>
              <Text style={styles.helper}>
                Choose your own decision after researching the claim.
              </Text>
              <View style={styles.verdicts}>
                {VERDICTS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.verdictButton,
                      decision === option.value && styles.verdictSelected,
                    ]}
                    onPress={() => chooseVerdict(option.value)}
                  >
                    <Text
                      style={[
                        styles.verdictText,
                        decision === option.value && styles.verdictTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {status ? (
          <Text accessibilityRole="alert" style={styles.status}>
            {status}
          </Text>
        ) : null}

        {hasSubmitted ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={startAnotherTask}>
            <Text style={styles.secondaryButtonText}>Start Another Task</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.exportButton} onPress={() => void exportRecords()}>
          <Ionicons name="download-outline" size={19} color={COLORS.blue} />
          <Text style={styles.exportText}>Export Local Evaluation JSON</Text>
        </TouchableOpacity>
      </ScrollView>

      <SharingIntentionModal
        visible={isSharingModalVisible}
        isSubmitting={isSubmitting}
        onSelect={intention => void recordIntention(intention)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  content: { padding: 20, paddingBottom: 36, rowGap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 3, color: COLORS.textSecondary, fontSize: 13 },
  notice: { borderRadius: 13, backgroundColor: COLORS.blueLight, padding: 14 },
  noticeText: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 19 },
  card: { borderRadius: 18, backgroundColor: COLORS.white, padding: 16 },
  sectionTitle: { marginBottom: 10, color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
  helper: { marginTop: 6, color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  input: {
    minHeight: 48,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 13,
    color: COLORS.textPrimary,
  },
  multiline: { minHeight: 88, paddingTop: 12 },
  primaryButton: {
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
  },
  secondaryButtonText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  sourceActions: { flexDirection: 'row', columnGap: 8, marginTop: 10 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  sourceCopy: { flex: 1 },
  sourceTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  sourceUrl: { marginTop: 3, color: COLORS.textSecondary, fontSize: 12 },
  verdicts: { flexDirection: 'row', columnGap: 8, marginTop: 14 },
  verdictButton: {
    flex: 1,
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 3,
  },
  verdictSelected: { borderColor: COLORS.blue, backgroundColor: COLORS.blue },
  verdictText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  verdictTextSelected: { color: COLORS.white },
  error: { color: COLORS.red, fontSize: 13, lineHeight: 18 },
  status: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 19 },
  exportButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  exportText: { color: COLORS.blue, fontSize: 13, fontWeight: '700' },
});
