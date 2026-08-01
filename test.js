import {Buffer} from 'node:buffer';
import fs, {promises as fsP} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileTypeFromBuffer} from 'file-type';
import test from 'ava';
import tarStream from 'tar-stream';
import decompressTar from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function isJpg(input) {
	const fileType = await fileTypeFromBuffer(input);
	return fileType?.mime === 'image/jpeg';
}

const packToBuffer = pack => new Promise((resolve, reject) => {
	const chunks = [];
	pack.on('data', chunk => chunks.push(chunk));
	pack.on('end', () => resolve(Buffer.concat(chunks)));
	pack.on('error', reject);
});

test('extract file', async t => {
	const buf = await fsP.readFile(path.join(__dirname, 'fixtures', 'file.tar'));
	const files = await decompressTar()(buf);

	t.is(files[0].path, 'test.jpg');
	t.true(await isJpg(files[0].data));
});

test('extract file using streams', async t => {
	const stream = fs.createReadStream(path.join(__dirname, 'fixtures', 'file.tar'));
	const files = await decompressTar()(stream);

	t.is(files[0].path, 'test.jpg');
	t.true(await isJpg(files[0].data));
});

test('extract symlinks', async t => {
	const buf = await fsP.readFile(path.join(__dirname, 'fixtures', 'symlink.tar'));
	const files = await decompressTar()(buf);

	t.is(files[0].path, 'test-symlink/symlink');
	t.is(files[0].type, 'symlink');
	t.is(files[0].linkname, 'file.txt');
	t.is(files[1].path, 'test-symlink/file.txt');
	t.is(files[1].type, 'file');
});

test('return empty array if non-valid file is supplied', async t => {
	const buf = await fsP.readFile(__filename);
	const files = await decompressTar()(buf);

	t.is(files.length, 0);
});

test('throw on wrong input', async t => {
	await t.throwsAsync(decompressTar()('foo'), undefined, 'Expected a Buffer or Stream, got string');
});

test('reject a directory entry with a non-zero size instead of hanging', async t => {
	// tar-stream forbids a body on a directory entry, so pack a file then flip the
	// typeflag to directory ('0' -> '5') and repair the header checksum
	const pack = tarStream.pack();
	pack.entry({name: 'd', size: 100}).end(Buffer.alloc(100));
	pack.finalize();
	const buf = await packToBuffer(pack);
	buf[156] = 0x35;
	buf.fill(0x20, 148, 156);
	let checksum = 0;
	for (let i = 0; i < 512; i++) {
		checksum += buf[i];
	}

	buf.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148);

	await t.throwsAsync(decompressTar()(buf), {message: /non-zero size/});
});

test('reject a truncated archive instead of crashing', async t => {
	const pack = tarStream.pack();
	pack.entry({name: 'big.bin', size: 4096}).end(Buffer.alloc(4096, 0x41));
	pack.finalize();
	const full = await packToBuffer(pack);

	await t.throwsAsync(decompressTar()(full.subarray(0, 512 + 200)));
});
