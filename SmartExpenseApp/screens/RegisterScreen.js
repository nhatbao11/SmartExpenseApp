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
import axios from 'axios';
import { COLORS } from '../utils/colors';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ username: '', email: '', password: '' });

  const validateInputs = () => {
    let valid = true;
    const newErrors = { username: '', email: '', password: '' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username.trim()) {
      newErrors.username = 'Tên đăng nhập không được để trống';
      valid = false;
    }
    if (!emailRegex.test(email)) {
      newErrors.email = 'Email không hợp lệ';
      valid = false;
    }
    if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    if (!validateInputs()) return;

    try {
      const response = await axios.post('http://192.168.1.4:8000/api/register/', {
        username,
        email,
        password,
      });
      Alert.alert('Thành công', 'Đăng ký thành công!');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Lỗi', 'Đăng ký thất bại, vui lòng thử lại');
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
        <Text style={styles.title}>Đăng ký</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, errors.username ? styles.inputError : null]}
            placeholder="Tên đăng ký"
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
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="Email"
            placeholderTextColor={COLORS.text + '80'}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: '' });
            }}
            keyboardType="email-address"
          />
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
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

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Đăng ký</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.link}
        >
          <Text style={styles.linkText}>Đã có tài khoản? Đăng nhập</Text>
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

export default RegisterScreen;