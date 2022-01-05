import axios from 'axios';
import 'axios-debug-log';

export default {
  instanse: axios.create({
    timeout: 3000,
    timeoutErrorMessage: 'Ошибка сети',
  }),

  get(url, config = {}) {
    return this.instanse.get(url, config);
  },
};
