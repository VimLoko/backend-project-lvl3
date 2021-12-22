import nock from 'nock';
import { readFile, mkdtemp } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { beforeEach } from '@jest/globals';
import pageLoader from '../src';

nock.disableNetConnect();

const getFullPath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);
const baseUrl = 'https://duckduckgo.com';
const basefileName = 'duckduckgo-com.html';
let tempFolder = '';
beforeEach(async () => {
  tempFolder = await mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('check file name and save HTML-page data', async () => {
  const response = await readFile(getFullPath(basefileName), 'utf-8');
  nock(baseUrl)
    .get('/')
    .reply(200, response);
  const filePath = await pageLoader(baseUrl, tempFolder);
  const responseSavedFile = await readFile(filePath, 'utf-8');
  expect(responseSavedFile).toBe(response);
});
