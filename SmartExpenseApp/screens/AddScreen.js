import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Modal,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../utils/colors';
import { API_BASE_URL } from '../utils/config';

const AddScreen = ({ navigation }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({ description: '', amount: '', category: '' });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        console.log('AddScreen: Fetching categories with token:', token);
        const response = await axios.get(`${API_BASE_URL}/api/categories/`, {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('AddScreen: Categories response:', response.data);
        setCategories(response.data);
        if (response.data.length > 0) {
          setCategory(response.data[0].id.toString());
        }

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('AddScreen: Categories error:', error.response?.data, error.response?.status);
      }
    };
    fetchCategories();
  }, []);

  const validateInputs = () => {
    let valid = true;
    const newErrors = { description: '', amount: '', category: '' };

    if (!description.trim()) {
      newErrors.description = 'Mô tả không được để trống';
      valid = false;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      newErrors.amount = 'Số tiền phải là số dương';
      valid = false;
    }
    if (!category) {
      newErrors.category = 'Vui lòng chọn danh mục';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('AddScreen: Sending transaction:', { description, amount, type, category });
      const response = await axios.post(
        `${API_BASE_URL}/api/transactions/`,
        {
          description,
          amount: Number(amount),
          transaction_type: type,
          category: Number(category),
        },
        {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('AddScreen: API response:', response.data);
      Alert.alert('Thành công', 'Giao dịch đã được thêm!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
      setDescription('');
      setAmount('');
      setType('expense');
      setCategory(categories.length > 0 ? categories[0].id.toString() : '');
    } catch (error) {
      console.error('AddScreen: API error:', error.response?.data, error.response?.status);
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể thêm giao dịch');
    }
  };

  const typeOptions = [
    { label: 'Chi tiêu', value: 'expense', icon: 'arrow-downward', color: '#F87171' },
    { label: 'Thu nhập', value: 'income', icon: 'arrow-upward', color: '#34D399' },
  ];

  const renderTypeOption = ({ item }) => (
    <TouchableOpacity
      style={styles.modalOption}
      onPress={() => {
        setType(item.value);
        setTypeModalVisible(false);
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Icon name={item.icon} size={20} color={item.color} />
      </View>
      <Text style={styles.modalOptionText}>{item.label}</Text>
    </TouchableOpacity>
  );

  const renderCategoryOption = ({ item }) => (
    <TouchableOpacity
      style={styles.modalOption}
      onPress={() => {
        setCategory(item.id.toString());
        setErrors({ ...errors, category: '' });
        setCategoryModalVisible(false);
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: COLORS.text + '10' }]}>
        <Icon name={item.icon || 'category'} size={20} color={COLORS.text} />
      </View>
      <Text style={styles.modalOptionText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const selectedTypeLabel = typeOptions.find((opt) => opt.value === type)?.label || 'Chọn loại';
  const selectedCategory = categories.find((cat) => cat.id.toString() === category);
  const selectedCategoryLabel = selectedCategory ? selectedCategory.name : 'Chọn danh mục';

  return (
    <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.container}>
      <Text style={styles.title}>Thêm giao dịch</Text>
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        {categories.length === 0 ? (
          <Text style={styles.noDataText}>Chưa có danh mục, vui lòng thêm danh mục trước</Text>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.description ? styles.inputError : null]}
                placeholder="Mô tả (ví dụ: Mua cà phê)"
                placeholderTextColor={COLORS.text + '80'}
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  setErrors({ ...errors, description: '' });
                }}
              />
              {errors.description ? (
                <Text style={styles.errorText}>{errors.description}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, errors.amount ? styles.inputError : null]}
                placeholder="Số tiền (VND)"
                placeholderTextColor={COLORS.text + '80'}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setErrors({ ...errors, amount: '' });
                }}
                keyboardType="numeric"
              />
              {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={[styles.pickerContainer, errors.category ? styles.inputError : null]}
                onPress={() => setTypeModalVisible(true)}
              >
                <View style={styles.pickerContent}>
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor:
                          type === 'expense' ? '#F87171' + '20' : '#34D399' + '20',
                      },
                    ]}
                  >
                    <Icon
                      name={type === 'expense' ? 'arrow-downward' : 'arrow-upward'}
                      size={20}
                      color={type === 'expense' ? '#F87171' : '#34D399'}
                    />
                  </View>
                  <Text style={styles.pickerText}>{selectedTypeLabel}</Text>
                  <Icon name="arrow-drop-down" size={24} color={COLORS.text} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={[styles.pickerContainer, errors.category ? styles.inputError : null]}
                onPress={() => setCategoryModalVisible(true)}
              >
                <View style={styles.pickerContent}>
                  {selectedCategory && (
                    <View style={[styles.iconContainer, { backgroundColor: COLORS.text + '10' }]}>
                      <Icon name={selectedCategory.icon || 'category'} size={20} color={COLORS.text} />
                    </View>
                  )}
                  <Text style={styles.pickerText}>{selectedCategoryLabel}</Text>
                  <Icon name="arrow-drop-down" size={24} color={COLORS.text} />
                </View>
              </TouchableOpacity>
              {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Thêm giao dịch</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Modal chọn loại giao dịch */}
      <Modal visible={typeModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn loại giao dịch</Text>
            <FlatList
              data={typeOptions}
              renderItem={renderTypeOption}
              keyExtractor={(item) => item.value}
              style={styles.modalList}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setTypeModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal chọn danh mục */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn danh mục</Text>
            <FlatList
              data={categories}
              renderItem={renderCategoryOption}
              keyExtractor={(item) => item.id.toString()}
              style={styles.modalList}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Hủy</Text>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Roboto-Bold',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.text + '33',
    fontFamily: 'Roboto-Regular',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.text + '33',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    marginLeft: 10,
    fontFamily: 'Roboto-Regular',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 5,
    fontFamily: 'Roboto-Regular',
  },
  button: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Bold',
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
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '50%',
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
  modalList: {
    flexGrow: 0,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 10,
    fontFamily: 'Roboto-Regular',
  },
  modalButton: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  modalButtonText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Roboto-Medium',
  },
});

export default AddScreen;