import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function VerificationHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Verification History Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
  },
});