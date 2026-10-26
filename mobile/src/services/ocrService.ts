import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { OcrResponse } from '../types/api';
import { API_BASE_URL } from './api';

/*
  Keep TRUE until Rand connects
  Manal/Ayesha's real OCR endpoint.
*/
const USE_MOCK_OCR = true;

/*
  Change ONLY this value when testing:

  'success'
  'empty'
  'error'
*/
const MOCK_OCR_MODE:
  | 'success'
  | 'empty'
  | 'error' = 'success';

const wait = (ms: number) =>
  new Promise(resolve =>
    setTimeout(resolve, ms),
  );

export async function extractTextFromImage(
  imageUri: string,
): Promise<OcrResponse> {
  /*
    MOCK OCR
  */
  if (USE_MOCK_OCR) {
    await wait(1200);

    if (
      MOCK_OCR_MODE ===
      'error'
    ) {
      return {
        success: false,

        error:
          'FactTrace could not extract text from this image.',
      };
    }

    if (
      MOCK_OCR_MODE ===
      'empty'
    ) {
      return {
        success: false,

        error:
          'No readable text was detected in the image.',
      };
    }

    return {
      success: true,

      data: {
        extractedText:
          'This is example text extracted from the captured claim.',
      },
    };
  }

  /*
    REAL OCR

    Rand can enable this later.
  */

  try {
    const imageFile =
      new File(imageUri);

    const formData =
      new FormData();

    formData.append(
      'image',
      imageFile,
      'claim.jpg',
    );

    const response =
      await fetch(
        `${API_BASE_URL}/api/ocr`,
        {
          method: 'POST',

          body: formData,
        },
      );

    if (!response.ok) {
      return {
        success: false,

        error:
          `OCR request failed with status ${response.status}`,
      };
    }

    const data =
      (await response.json()) as OcrResponse;

    return data;
  } catch (error) {
    console.log(
      'OCR service error:',
      error,
    );

    return {
      success: false,

      error:
        'Unable to extract text from the image.',
    };
  }
}