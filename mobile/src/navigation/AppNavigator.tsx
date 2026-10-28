import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import ClaimReviewScreen from '../screens/ClaimReviewScreen';
import VerificationResultsScreen from '../screens/VerificationResultsScreen';
import EvidenceDetailsScreen from '../screens/EvidenceDetailsScreen';
import VerificationHistoryScreen from '../screens/VerificationHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import BrowserComparisonScreen from '../screens/BrowserComparisonScreen';

import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="ClaimReview" component={ClaimReviewScreen} />
      <Stack.Screen
        name="VerificationResults"
        component={VerificationResultsScreen}
      />
      <Stack.Screen
        name="EvidenceDetails"
        component={EvidenceDetailsScreen}
      />
      <Stack.Screen
        name="VerificationHistory"
        component={VerificationHistoryScreen}
      />
      <Stack.Screen
        name="BrowserComparison"
        component={BrowserComparisonScreen}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}