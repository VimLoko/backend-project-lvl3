import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import requester from './requester.js';

const parseUrl = (url) => new URL(url);
const parsePath = (pathName) => path.parse(pathName);
const generatePath = (folder, fileName) => path.join(folder, fileName);
const createAssetsFolder = (folderPath) => mkdir(folderPath);
const saveFile = (filePath, data) => writeFile(filePath, data, 'utf-8');
const downloadAssert = (pageUrl, pathToSave) => requester.get(pageUrl, { responseType: 'stream' })
  .then((response) => writeFile(pathToSave, response.data, 'utf-8'));

const resource = {
  img: 'src',
  link: 'href',
  script: 'src',
};

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

// const findAllResource = (html, pageUrl) => {
//   const $ = cheerio.load(html);
//   const linkObjects = $('img');
//   const folderName = generateNameFromUrl(pageUrl, generateFolderName);
//   const { origin } = parseUrl(pageUrl);
//   const links = [];
//   const savePaths = [];
//   linkObjects.each((index, element) => {
//     const src = $(element).attr('src');
//     const savePath = generateNameFromUrl(`${origin}${src}`, generateFileName);
//     links.push(`${origin}${src}`);
//     savePaths.push(generatePath(folderName, savePath));
//     $(element).attr('src', generatePath(folderName, savePath));
//   });
//   return { html: $.root().html(), links, savePaths };
// };

const isUrl = (urlStr) => {
  try {
    const url = new URL(urlStr);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (e) {
    return false;
  }
};

const createAbsoluteLinks = (link, originDomain) => (
  isUrl(link)
    ? link
    : `${originDomain}${link}`
);

const getPageResourceLinks = (html, originDomain, resourceObj) => {
  const $ = cheerio.load(html);
  const links = [];
  const absoluteLinks = [];
  Object.entries(resourceObj).forEach(([tag, attr]) => {
    const linkObjects = $(`${tag}[${attr}]`);
    linkObjects.each((index, element) => {
      const src = $(element).attr(`${attr}`);
      const absoluteLink = createAbsoluteLinks(src, originDomain);
      const { origin, pathname } = parseUrl(absoluteLink);
      if (origin === originDomain) {
        absoluteLinks.push(createAbsoluteLinks(pathname, originDomain));
        links.push(src);
      }
    });
  });
  return { links, absoluteLinks };
};

const createFilesPath = (folderPath, links) => {
  const arPath = [];
  links.forEach((link) => {
    const strPath = generateNameFromUrl(link, generateFileName);
    arPath.push(generatePath(folderPath, strPath));
  });
  return arPath;
};

const replaceLinksInHTML = (html, searchLinks, replaceLinks) => {
  let htmlStr = html;
  searchLinks.forEach((searchLink, i) => {
    htmlStr = htmlStr.replace(searchLink, replaceLinks[i]);
  });
  return htmlStr;
};

// const findAllResource = (html, pageUrl) => {
//   const $ = cheerio.load(html);
//   const linkObjects = $('img');
//   const folderName = generateNameFromUrl(pageUrl, generateFolderName);
//   const { origin } = parseUrl(pageUrl);
//   const links = [];
//   const savePaths = [];
//   linkObjects.each((index, element) => {
//     const src = $(element).attr('src');
//     const savePath = generateNameFromUrl(`${origin}${src}`, generateFileName);
//     links.push(`${origin}${src}`);
//     savePaths.push(generatePath(folderName, savePath));
//     $(element).attr('src', generatePath(folderName, savePath));
//   });
//   return { html: $.root().html(), links, savePaths };
// };

export default (pageUrl, folder = '') => {
  const { origin } = parseUrl(pageUrl);
  const fileName = generateNameFromUrl(pageUrl, generateFileName);
  const folderName = generateNameFromUrl(pageUrl, generateFolderName);
  const filePath = generatePath(folder, fileName);
  const folderPath = generatePath(folder, folderName);
  return requester.get(pageUrl)
    .then((response) => response.data)
    .then((data) => {
      const { links, absoluteLinks } = getPageResourceLinks(data, origin, resource);
      return { html: data, links, absoluteLinks };
    })
    .then((data) => {
      const arSavePath = createFilesPath(folderPath, data.absoluteLinks);
      const arHTMLPath = createFilesPath(folderName, data.absoluteLinks);
      return { ...data, arSavePath, arHTMLPath };
    })
    .then((data) => {
      const replacedHtml = replaceLinksInHTML(data.html, data.links, data.arHTMLPath);
      return { ...data, replacedHtml };
    })
    .then((data) => (data.links.length > 0
      ? createAssetsFolder(folderPath).then(() => data)
      : data))
    .then((data) => saveFile(filePath, data.replacedHtml).then(() => data))
    .then(({ absoluteLinks, arSavePath }) => absoluteLinks
      .map((img, i) => downloadAssert(img, `${arSavePath[i]}`)))
    .then(() => filePath);
};
