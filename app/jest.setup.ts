// AsyncStorage'ın bellek içi sahte sürümü (testler gerçek cihaz deposuna dokunmaz).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
