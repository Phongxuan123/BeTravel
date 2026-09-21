import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomePlaceholderScreen from './src/screens/HomePlaceholderScreen';

export default function App() {
  const [screen, setScreen] = useState('onboarding');
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [session, setSession] = useState(null);

  const renderScreen = () => {
    if (screen === 'onboarding') {
      return (
        <OnboardingScreen
          index={onboardingIndex}
          onNext={() =>
            setOnboardingIndex((i) => Math.min(i + 1, 3))
          }
          onSkip={() => setScreen('login')}
          onRegister={() => setScreen('register')}
          onLogin={() => setScreen('login')}
        />
      );
    }

    if (screen === 'register') {
      return (
        <RegisterScreen
          onBack={() => setScreen('login')}
          onLogin={() => setScreen('login')}
          onRegistered={(email) => {
            setLoginIdentifier(email);
            setScreen('login');
          }}
        />
      );
    }

    if (screen === 'home') {
      return (
        <HomePlaceholderScreen
          session={session}
          onLogout={() => {
            setSession(null);
            setScreen('login');
          }}
        />
      );
    }

    return (
      <LoginScreen
        initialIdentifier={loginIdentifier}
        onRegister={() => setScreen('register')}
        onSuccess={(data) => {
          setSession(data);
          setScreen('home');
        }}
      />
    );
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
    </SafeAreaProvider>
  );
}