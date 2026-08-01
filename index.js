import {Buffer} from 'node:buffer';
import {fileTypeFromBuffer} from 'file-type';
import {isStream} from 'is-stream';
import tarStream from 'tar-stream';

const decompressTar = () => async input => {
	if (!Buffer.isBuffer(input) && !isStream(input)) {
		throw new TypeError(`Expected a Buffer or Stream, got ${typeof input}`);
	}

	if (Buffer.isBuffer(input)) {
		const type = await fileTypeFromBuffer(input);

		if (!type || type.mime !== 'application/x-tar') {
			return [];
		}
	}

	const extract = tarStream.extract();
	const files = [];

	const promise = new Promise((resolve, reject) => {
		if (!Buffer.isBuffer(input)) {
			input.on('error', reject);
		}

		extract.on('entry', (header, stream, cb) => {
			// A directory entry has no body; a nonzero size never emits 'end' and hangs the parse
			if (header.type === 'directory' && header.size > 0) {
				stream.resume();
				reject(new Error('Refusing to extract a directory entry with a non-zero size'));
				return;
			}

			const chunk = [];

			// tar-stream destroys the entry stream on malformed input; without this it throws uncaught
			stream.on('error', reject);
			stream.on('data', data => chunk.push(data));
			stream.on('end', () => {
				const file = {
					data: Buffer.concat(chunk),
					mode: header.mode,
					mtime: header.mtime,
					path: header.name,
					type: header.type,
				};

				if (header.type === 'symlink' || header.type === 'link') {
					file.linkname = header.linkname;
				}

				files.push(file);
				cb();
			});
		});

		extract.on('finish', () => resolve(files));
		extract.on('error', reject);
	});

	// eslint-disable-next-line unicorn/no-thenable
	extract.then = promise.then.bind(promise);
	extract.catch = promise.catch.bind(promise);

	if (Buffer.isBuffer(input)) {
		extract.end(input);
	} else {
		input.pipe(extract);
	}

	return extract;
};

export default decompressTar;
