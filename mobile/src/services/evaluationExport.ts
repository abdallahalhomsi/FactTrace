import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getEvaluationRecords } from './evaluationService';

export async function exportEvaluationRecords(): Promise<number> {
  const records = await getEvaluationRecords();
  if (records.length === 0) {
    throw new Error('There are no local evaluation records to export yet.');
  }

  const contents = JSON.stringify(records, null, 2);
  if (Platform.OS === 'web') {
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'facttrace-evaluations.json';
    link.click();
    URL.revokeObjectURL(url);
    return records.length;
  }

  const file = new File(Paths.cache, 'facttrace-evaluations.json');
  file.create({ intermediates: true, overwrite: true });
  await file.write(contents);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export FactTrace evaluations',
    UTI: 'public.json',
  });
  return records.length;
}
