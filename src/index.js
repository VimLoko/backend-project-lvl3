import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import debug from 'debug';
import requester from './requester.js';

const log = debug('page-loader');

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

export default (pageUrl, folder = '') => {
  log('run page-loader');
  const { origin } = parseUrl(pageUrl);
  const fileName = generateNameFromUrl(pageUrl, generateFileName);
  const folderName = generateNameFromUrl(pageUrl, generateFolderName);
  const filePath = generatePath(folder, fileName);
  const folderPath = generatePath(folder, folderName);
  log('start request');
  return requester.get(pageUrl)
    .then((response) => {
      log('response is received');
      return response.data;
    })
    .then((data) => {
      log('get all assets links from page');
      const { links, absoluteLinks } = getPageResourceLinks(data, origin, resource);
      return { html: data, links, absoluteLinks };
    })
    .then((data) => {
      log('generate paths for save assets and for replace links in saved local page');
      const arSavePath = createFilesPath(folderPath, data.absoluteLinks);
      const arHTMLPath = createFilesPath(folderName, data.absoluteLinks);
      return { ...data, arSavePath, arHTMLPath };
    })
    .then((data) => {
      log('replace links in saved local page');
      const replacedHtml = replaceLinksInHTML(data.html, data.links, data.arHTMLPath);
      return { ...data, replacedHtml };
    })
    .then((data) => {
      if (data.links.length > 0) {
        log('Create assets folder %o', folderPath);
        return createAssetsFolder(folderPath).then(() => data);
      }
      return data;
    })
    .then((data) => {
      log('save %o', filePath);
      return saveFile(filePath, data.replacedHtml).then(() => data);
    })
    .then(({ absoluteLinks, arSavePath }) => {
      absoluteLinks.forEach((link, i) => {
        log('save %o', arSavePath[i]);
        downloadAssert(link, `${arSavePath[i]}`);
      });
    })
    .then(() => filePath);
};
