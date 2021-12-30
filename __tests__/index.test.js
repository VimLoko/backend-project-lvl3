import nock from 'nock';
import { readFile, mkdtemp } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { beforeEach } from '@jest/globals';
import pageLoader from '../src';

nock.disableNetConnect();

const getFullPath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);
const baseUrl = 'https://ru.hexlet.io';
const pathname = '/courses';
let tempFolder = '';
const assets = [
  { pathname: '/assets/professions/nodejs.png', file: 'nodejs.png', contentType: 'image/png' },
];
beforeEach(async () => {
  tempFolder = await mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('check load HTML-page data', async () => {
  const response = await readFile(getFullPath('ru-hexlet-io-courses-without-assets.html'), 'utf-8');
  const expected = await readFile(getFullPath('ru-hexlet-io-courses-without-assets-expected.html'), 'utf-8');
  nock(baseUrl)
    .get(pathname)
    .reply(200, response);

  const filePath = await pageLoader(`${baseUrl}${pathname}`, tempFolder);
  const responseSavedFile = await readFile(filePath, 'utf-8');
  expect(responseSavedFile).toBe(expected);
});

test('check load HTML-page data and assets', async () => {
  const response = await readFile(getFullPath('ru-hexlet-io-courses-with-assets.html'), 'utf-8');
  const expectedHtml = await readFile(getFullPath('ru-hexlet-io-courses-with-assets-expected.html'), 'utf-8');
  const expectedImg = await readFile(getFullPath('nodejs.png'), 'utf-8');
  nock(baseUrl)
    .get(pathname)
    .reply(200, response);
  assets.forEach((asset) => {
    nock(baseUrl)
      .get(asset.pathname)
      .replyWithFile(200, getFullPath(asset.file), {
        'Content-Type': asset.contentType,
      });
  });
  const filePath = await pageLoader(`${baseUrl}${pathname}`, tempFolder);
  const responseSavedFile = await readFile(filePath, 'utf-8');
  const imgSave = await readFile(`${tempFolder}/ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png`, 'utf-8');
  expect(responseSavedFile).toBe(expectedHtml);
  expect(imgSave).toBe(expectedImg);
});
