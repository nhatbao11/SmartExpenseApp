import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../utils/colors';

const HomeScreen = ({ navigation }) => {
  const [data, setData] = useState({
    current_balance: 0,
    total_income: 0,
    total_expense: 0,
    recent_transactions: [],
  });
  const [username, setUsername] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const storedUsername = await AsyncStorage.getItem('username');
        console.log('HomeScreen: Fetching data with token:', token);
        console.log('HomeScreen: Username:', storedUsername);
        if (storedUsername) setUsername(storedUsername);
        const response = await axios.get('http://192.168.1.4:8000/api/home/', {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('HomeScreen: API response:', response.data);
        setData(response.data);
      } catch (error) {
        console.error('HomeScreen: API error:', error.response?.data);
        if (error.response?.status === 401 || error.response?.status === 403) {
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('username');
          navigation.replace('Login');
        }
      }
    };
    fetchData();
  }, [navigation]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('username');
    console.log('Cleared userToken and username');
    navigation.replace('Login');
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.secondary]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Chào {username || 'Khách'}!</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tổng quan tài chính</Text>
        <Text style={styles.balance}>
          Số dư: {data.current_balance.toLocaleString()} VND
        </Text>
        <View style={styles.summary}>
          <Text style={styles.income}>
            Thu nhập: {data.total_income.toLocaleString()} VND
          </Text>
          <Text style={styles.expense}>
            Chi tiêu: {data.total_expense.toLocaleString()} VND
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Giao dịch gần đây</Text>
      <FlatList
        data={data.recent_transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.transaction}>
            <Text style={styles.transactionText}>
              {item.description}: {item.amount.toLocaleString()} VND
            </Text>
            <Text style={styles.transactionType}>{item.transaction_type}</Text>
          </View>
        )}
        style={styles.transactionList}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  balance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  income: {
    fontSize: 16,
    color: COLORS.success,
  },
  expense: {
    fontSize: 16,
    color: COLORS.error,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  transactionList: {
    marginHorizontal: 20,
  },
  transaction: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  transactionType: {
    fontSize: 14,
    color: COLORS.text + '80',
  },
});

export default HomeScreen;