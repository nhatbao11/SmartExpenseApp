import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../utils/colors';

const OnboardingScreen = ({ navigation }) => {
  const [initialBalance, setInitialBalance] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    console.log('Submitting initial balance:', initialBalance);
    if (!initialBalance || isNaN(initialBalance) || Number(initialBalance) < 0) {
      setError('Vui lòng nhập số dư hợp lệ');
      console.log('Validation error:', error);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('Token:', token);
      if (!token) {
        Alert.alert('Lỗi', 'Không tìm thấy token, vui lòng đăng nhập lại');
        navigation.navigate('Login');
        return;
      }

      console.log('Sending request to API...');
      const response = await axios.post(
        'http://192.168.1.4:8000/api/initial-balance/',
        { initial_balance: Number(initialBalance) },
        {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('API response:', response.data);
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      navigation.replace('Home');
    } catch (error) {
      console.error('API error:', error.response?.data, error.response?.status, error.message);
      Alert.alert(
        'Lỗi',
        error.response?.data?.detail || error.message || 'Không thể lưu số dư, vui lòng thử lại'
      );
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.secondary]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        <Text style={styles.title}>Chào mừng bạn!</Text>
        <Text style={styles.subtitle}>
          Vui lòng nhập số dư ban đầu để bắt đầu quản lý tài chính
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Số dư ban đầu (VND)"
            placeholderTextColor={COLORS.text + '80'}
            value={initialBalance}
            onChangeText={(text) => {
              setInitialBalance(text);
              setError('');
            }}
            keyboardType="numeric"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Tiếp tục</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white + 'CC',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.text + '33',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;