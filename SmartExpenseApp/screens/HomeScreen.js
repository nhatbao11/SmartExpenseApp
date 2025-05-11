import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, TextInput, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../utils/colors';
import { API_BASE_URL } from '../utils/config';

// Hàm tùy chỉnh định dạng số với dấu chấm
const formatNumberWithDot = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const HomeScreen = ({ navigation }) => {
  const [balance, setBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [username, setUsername] = useState('');
  const [greeting, setGreeting] = useState('');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const getUserData = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('username');
        if (storedUsername) {
          setUsername(storedUsername);
        } else {
          setUsername('Người dùng');
        }

        const hour = new Date().getHours();
        if (hour >= 0 && hour < 12) {
          setGreeting('Xin chào buổi sáng');
        } else if (hour >= 12 && hour < 15) {
          setGreeting('Xin chào buổi trưa');
        } else if (hour >= 15 && hour < 18) {
          setGreeting('Xin chào buổi chiều');
        } else {
          setGreeting('Xin chào buổi tối');
        }
      } catch (error) {
        console.error('HomeScreen: Error getting username:', error);
        setUsername('Người dùng');
      }
    };

    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        console.log('HomeScreen: Fetching data with token:', token);
        const response = await axios.get(`${API_BASE_URL}/api/home/`, {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('HomeScreen: API response:', response.data);
        setBalance(response.data.current_balance || 0);
        setTotalIncome(response.data.total_income || 0);
        setTotalExpense(response.data.total_expense || 0);
        setRecentTransactions(response.data.recent_transactions || []);
      } catch (error) {
        console.error('HomeScreen: API error:', error.response?.data, error.response?.status);
      }
    };

    getUserData();
    fetchData();
  }, []);

  const renderTransaction = ({ item }) => {
    let iconName = 'attach-money';
    if (item.transaction_type === 'income') {
      iconName = 'trending-up';
    } else if (item.description.toLowerCase().includes('quà') || item.description.toLowerCase().includes('gift')) {
      iconName = 'card-giftcard';
    } else if (item.description.toLowerCase().includes('nhà') || item.description.toLowerCase().includes('rent')) {
      iconName = 'home';
    } else if (item.description.toLowerCase().includes('khác') || item.description.toLowerCase().includes('other')) {
      iconName = 'category';
    }

    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });

    const displayAmount = parseInt(item.amount);

    return (
      <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View style={styles.transactionIconContainer}>
            <Icon name={iconName} size={24} color={COLORS.text} />
          </View>
          <View>
            <Text style={styles.transactionText}>{item.description}</Text>
            <Text style={styles.transactionDate}>{formattedDate}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: item.transaction_type === 'income' ? COLORS.primary : COLORS.error },
          ]}
        >
          {item.transaction_type === 'income' ? '+' : '-'}
          {formatNumberWithDot(displayAmount)} VND
        </Text>
      </LinearGradient>
    );
  };

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên mới.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      await axios.put(
        `${API_BASE_URL}/api/users/${userId}/`,
        { username: newUsername },
        {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      await AsyncStorage.setItem('username', newUsername);
      setUsername(newUsername);
      setNewUsername('');
      setSettingsModalVisible(false);
      Alert.alert('Thành công', 'Đã đổi tên thành công!');
    } catch (error) {
      console.error('HomeScreen: Change username error:', error.response?.data, error.response?.status);
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể đổi tên');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      await axios.put(
        `${API_BASE_URL}/api/users/${userId}/change-password/`,
        { old_password: oldPassword, new_password: newPassword },
        {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSettingsModalVisible(false);
      Alert.alert('Thành công', 'Đã đổi mật khẩu thành công!');
    } catch (error) {
      console.error('HomeScreen: Change password error:', error.response?.data, error.response?.status);
      Alert.alert('Lỗi', error.response?.data?.error || 'Mật khẩu cũ không đúng hoặc lỗi khác');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('username');
              await AsyncStorage.removeItem('userId');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('HomeScreen: Logout error:', error);
              Alert.alert('Lỗi', 'Không thể đăng xuất, vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/logo.png')} style={styles.logoImage} />
          <Text style={styles.title}>Trang chủ</Text>
        </View>
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)}>
          <Icon name="settings" size={30} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.greetingContainer}>
        <Text style={styles.greetingText}>
          {greeting}, {username}!
        </Text>
      </View>

      <LinearGradient colors={['#FDE68A', '#FEF3C7']} style={styles.balanceCard}>
        <Text style={styles.label}>Số dư</Text>
        <Text style={styles.balanceAmount}>{formatNumberWithDot(balance)} VND</Text>
        <View style={styles.summary}>
          <View style={[styles.summaryItem, { alignItems: 'flex-start' }]}>
            <View style={styles.summaryRow}>
              <Icon name="arrow-upward" size={20} color={COLORS.primary} />
              <Text style={styles.summaryLabel}>Thu nhập</Text>
            </View>
            <Text style={styles.income}>{formatNumberWithDot(totalIncome)} VND</Text>
          </View>
          <View style={[styles.summaryItem, { alignItems: 'flex-end' }]}>
            <View style={styles.summaryRow}>
              <Icon name="arrow-downward" size={20} color={COLORS.error} />
              <Text style={styles.summaryLabel}>Chi tiêu</Text>
            </View>
            <Text style={styles.expense}>{formatNumberWithDot(totalExpense)} VND</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.transactionHeader}>
        <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Text style={styles.seeAll}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
      {recentTransactions.length === 0 ? (
        <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={styles.card}>
          <Text style={styles.noDataText}>Chưa có giao dịch</Text>
        </LinearGradient>
      ) : (
        <FlatList
          data={recentTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id.toString()}
          style={styles.transactionList}
        />
      )}

      {/* Modal cài đặt */}
      <Modal visible={settingsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cài đặt</Text>

            {/* Đổi tên */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Đổi tên</Text>
              <TextInput
                style={styles.input}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="Nhập tên mới"
                placeholderTextColor={COLORS.text + '80'}
              />
              <TouchableOpacity style={styles.button} onPress={handleChangeUsername}>
                <Text style={styles.buttonText}>Lưu</Text>
              </TouchableOpacity>
            </View>

            {/* Đổi mật khẩu */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Đổi mật khẩu</Text>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Mật khẩu cũ"
                secureTextEntry
                placeholderTextColor={COLORS.text + '80'}
              />
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mật khẩu mới"
                secureTextEntry
                placeholderTextColor={COLORS.text + '80'}
              />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Xác nhận mật khẩu mới"
                secureTextEntry
                placeholderTextColor={COLORS.text + '80'}
              />
              <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
                <Text style={styles.buttonText}>Đổi mật khẩu</Text>
              </TouchableOpacity>
            </View>

            {/* Đăng xuất */}
            <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
              <Text style={styles.buttonText}>Đăng xuất</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={() => setSettingsModalVisible(false)}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: 'Roboto-Bold',
  },
  greetingContainer: {
    marginHorizontal: 20,
    marginVertical: 20,
  },
  greetingText: {
    fontSize: 20,
    color: COLORS.white,
    fontFamily: 'Roboto-Medium',
  },
  balanceCard: {
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 25,
    marginBottom: 25,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  label: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Roboto-Regular',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: 15,
    fontFamily: 'Roboto-Bold',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '10',
    padding: 10,
    borderRadius: 8,
  },
  summaryItem: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 5,
    fontFamily: 'Roboto-Regular',
  },
  income: {
    fontSize: 18,
    color: COLORS.primary,
    marginTop: 5,
    fontFamily: 'Roboto-Medium',
  },
  expense: {
    fontSize: 18,
    color: COLORS.error,
    marginTop: 5,
    fontFamily: 'Roboto-Medium',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: 'Roboto-Medium',
  },
  seeAll: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: 'Roboto-Medium',
  },
  transactionList: {
    marginHorizontal: 20,
  },
  transactionCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  transactionText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Medium',
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.text + '80',
    fontFamily: 'Roboto-Regular',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Medium',
  },
  card: {
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    fontFamily: 'Roboto-Regular',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.text,
    fontFamily: 'Roboto-Medium',
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 10,
    fontFamily: 'Roboto-Medium',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.text + '33',
    marginBottom: 10,
    fontFamily: 'Roboto-Regular',
  },
  button: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Bold',
  },
  logoutButton: {
    backgroundColor: COLORS.error,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  closeButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Roboto-Medium',
  },
});

export default HomeScreen;