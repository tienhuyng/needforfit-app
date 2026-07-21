import '@testing-library/jest-dom';
import i18n from '../src/config/i18n';

beforeAll(async () => {
  await i18n.changeLanguage('vi');
});
