import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';

// Định nghĩa kiểu cho navigation
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Home: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('Checking auth status...');
      // Xóa AsyncStorage để debug
      await AsyncStorage.clear();
      console.log('Cleared AsyncStorage');
      const token = await AsyncStorage.getItem('userToken');
      const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      console.log('Token:', token, 'OnboardingCompleted:', onboardingCompleted);
      if (token && onboardingCompleted === 'true') {
        setInitialRoute('Home');
      } else if (token) {
        setInitialRoute('Onboarding');
      } else {
        setInitialRoute('Login');
      }
    };
    checkAuth();
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;