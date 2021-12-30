import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import requester from './requester.js';

const parseUrl = (url) => new URL(url);
const parsePath = (pathName) => path.parse(pathName);
const generatePath = (folder, fileName) => path.join(folder, fileName);

const generateNameFromUrl = (url, fn) => {
  const { host, pathname } = parseUrl(url);
  const { ext, name, dir } = parsePath(pathname);
  const pathNameWithoutExt = generatePath(dir, name);
  const hostWithPathname = pathNameWithoutExt === '/'
    ? `${host}`
    : `${host}${pathNameWithoutExt}`;
  const searchRegExp = /\W/ig;
  const replaceWith = '-';
  const replacedName = `${hostWithPathname.replace(searchRegExp, replaceWith)}`;
  return fn(replacedName, ext);
};

const generateFileName = (name, ext) => {
  const fileExtention = ext || '.html';
  return `${name}${fileExtention}`;
};

const generateFolderName = (name) => `${name}_files`;

const findAllImages = (html, pageUrl) => {
  const $ = cheerio.load(html);
  const linkObjects = $('img');
  const folderName = generateNameFromUrl(pageUrl, generateFolderName);
  const { origin } = parseUrl(pageUrl);
  const links = [];
  const savePaths = [];
  linkObjects.each((index, element) => {
    const src = $(element).attr('src');
    const savePath = generateNameFromUrl(`${origin}${src}`, generateFileName);
    links.push(`${origin}${src}`);
    savePaths.push(generatePath(folderName, savePath));
    $(element).attr('src', generatePath(folderName, savePath));
  });
  return { html: $.root().html(), links, savePaths };
};

// const h = `<!DOCTYPE html>
// <html lang="ru">
//   <head>
//     <meta charset="utf-8">
//     <title>Курсы по программированию Хекслет</title>
//   </head>
//   <body>
//     <img src="/assets/professions/nodejs.png" alt="Иконка профессии Node.js-программист" />
//     <h3>
//       <a href="/professions/nodejs">Node.js-программист</a>
//     </h3>
//   </body>
// </html>`;
//
// findAllImages(h);

const createAssetsFolder = (folderPath) => mkdir(folderPath);
const saveFile = (filePath, data) => writeFile(filePath, data, 'utf-8');
const downloadAssert = (pageUrl, pathToSave) => requester.get(pageUrl, { responseType: 'stream' })
  .then((response) => writeFile(pathToSave, response.data, 'utf-8'));

export default (pageUrl, folder = '') => {
  // const { origin } = parseUrl(pageUrl);
  const fileName = generateNameFromUrl(pageUrl, generateFileName);
  const folderName = generateNameFromUrl(pageUrl, generateFolderName);
  const filePath = generatePath(folder, fileName);
  const folderPath = generatePath(folder, folderName);
  return requester.get(pageUrl)
    .then((response) => response.data)
    .then((data) => findAllImages(data, pageUrl))
    .then((data) => (data.links.length > 0
      ? createAssetsFolder(folderPath).then(() => data)
      : data))
    .then((data) => saveFile(filePath, data.html).then(() => data))
    .then(({ links, savePaths }) => links
      .map((img, i) => downloadAssert(img, `${folder}/${savePaths[i]}`)))
    .then(() => filePath);
};
