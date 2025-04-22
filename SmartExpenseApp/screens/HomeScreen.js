import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../utils/colors';

const HomeScreen = ({ navigation }) => {
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get('http://192.168.1.4:8000/api/home/', {
          headers: { Authorization: `Token ${token}` },
        });
        setBalance(response.data.current_balance);
        setIncome(response.data.total_income);
        setExpense(response.data.total_expense);
        setTransactions(response.data.recent_transactions);
      } catch (error) {
        console.error('Home error:', error);
      }
    };
    fetchHomeData();
  }, []);

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <View>
        <Text style={styles.transactionDescription}>{item.description || item.category}</Text>
        <Text style={styles.transactionDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: item.transaction_type === 'INCOME' ? COLORS.primary : COLORS.error },
        ]}
      >
        {item.transaction_type === 'INCOME' ? '+' : '-'}{item.amount} VND
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.secondary]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>Quản Lý Chi Tiêu</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
          <Text style={styles.balanceAmount}>{balance.toLocaleString()} VND</Text>
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Thu nhập</Text>
              <Text style={[styles.summaryAmount, { color: COLORS.primary }]}>
                +{income.toLocaleString()} VND
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Chi tiêu</Text>
              <Text style={[styles.summaryAmount, { color: COLORS.error }]}>
                -{expense.toLocaleString()} VND
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có giao dịch</Text>}
        />
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddTransaction')} // Tạo sau
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white + 'CC',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.white + 'CC',
  },
  balanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  balanceLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: 10,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  transactionDescription: {
    fontSize: 16,
    color: COLORS.text,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.text + '80',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.secondary,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  fabText: {
    fontSize: 30,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default HomeScreen;