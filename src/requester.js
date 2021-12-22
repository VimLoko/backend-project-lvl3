import axios from 'axios';

export default {
  instanse: axios.create({
    timeout: 10000,
    timeoutErrorMessage: 'Ошибка сети',
  }),

  get(url) {
    return this.instanse.get(url).catch((e) => {
      throw new Error(e);
    });
  },
};
