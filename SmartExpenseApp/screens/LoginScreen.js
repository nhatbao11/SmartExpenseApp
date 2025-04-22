import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../utils/colors';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ username: '', password: '' });

  const validateInputs = () => {
    let valid = true;
    const newErrors = { username: '', password: '' };

    if (!username.trim()) {
      newErrors.username = 'Tên đăng nhập không được để trống';
      valid = false;
    }
    if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;
  
    try {
      console.log('Sending login request:', { username, password });
      const response = await axios.post('http://192.168.1.4:8000/api/login/', {
        username,
        password,
      });
      console.log('Login response:', response.data);
      await AsyncStorage.setItem('userToken', response.data.token);
      const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      if (onboardingCompleted) {
        navigation.navigate('Home');
      } else {
        navigation.navigate('Onboarding');
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      Alert.alert('Lỗi', error.response?.data?.error || 'Đăng nhập thất bại');
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
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Đăng nhập</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, errors.username ? styles.inputError : null]}
            placeholder="Tên đăng nhập"
            placeholderTextColor={COLORS.text + '80'}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setErrors({ ...errors, username: '' });
            }}
          />
          {errors.username ? (
            <Text style={styles.errorText}>{errors.username}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="Mật khẩu"
              placeholderTextColor={COLORS.text + '80'}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors({ ...errors, password: '' });
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Icon
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Đăng nhập</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.link}
        >
          <Text style={styles.linkText}>Chưa có tài khoản? Đăng ký</Text>
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
    backgroundColor: COLORS.white + 'CC', // Màu trắng trong suốt
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
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
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 12,
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
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 20,
  },
  linkText: {
    color: COLORS.text,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;