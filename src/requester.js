import axios from 'axios';

export default {
  instanse: axios.create({
    timeout: 10000,
    timeoutErrorMessage: 'Ошибка сети',
  }),

  get(url, config = {}) {
    return this.instanse.get(url, config).catch((e) => {
      throw new Error(e);
    });
  },
};
