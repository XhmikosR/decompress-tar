import fs, {promises as fsP} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import isJpg from 'is-jpg';
import test from 'ava';
import m from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('extract file', async t => {
	const buf = await fsP.readFile(path.join(__dirname, 'fixtures', 'file.tar'));
	const files = await m()(buf);

	t.is(files[0].path, 'test.jpg');
	t.true(isJpg(files[0].data));
});

test('extract file using streams', async t => {
	const stream = fs.createReadStream(path.join(__dirname, 'fixtures', 'file.tar'));
	const files = await m()(stream);

	t.is(files[0].path, 'test.jpg');
	t.true(isJpg(files[0].data));
});

test('extract symlinks', async t => {
	const buf = await fsP.readFile(path.join(__dirname, 'fixtures', 'symlink.tar'));
	const files = await m()(buf);

	t.is(files[0].path, 'test-symlink/symlink');
	t.is(files[0].type, 'symlink');
	t.is(files[0].linkname, 'file.txt');
	t.is(files[1].path, 'test-symlink/file.txt');
	t.is(files[1].type, 'file');
});

test('return empty array if non-valid file is supplied', async t => {
	const buf = await fsP.readFile(__filename);
	const files = await m()(buf);

	t.is(files.length, 0);
});

test('throw on wrong input', async t => {
	await t.throwsAsync(m()('foo'), undefined, 'Expected a Buffer or Stream, got string');
});
