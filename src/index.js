import { writeFile } from 'fs/promises';
import path from 'path';
import requester from './requester.js';

const generateFilePageName = (url) => {
  const { host, pathname } = new URL(url);
  const hostWithPathname = `${host}${pathname}`.trim();
  const searchRegExp = /\W/ig;
  const replaceWith = '-';
  return `${hostWithPathname.replace(searchRegExp, replaceWith)}.html`;
};

const generatePath = (folder, fileName) => path.join(folder, fileName);

export default (pageUrl, folder = '') => requester.get(pageUrl)
  .then((response) => response.data)
  .then((data) => {
    const fileName = generateFilePageName(pageUrl);
    const filePath = generatePath(folder, fileName);
    writeFile(filePath, data, 'utf-8');
    return filePath;
  });
