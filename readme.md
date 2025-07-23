# decompress-tar [![npm version](https://img.shields.io/npm/v/@xhmikosr/decompress-tar?logo=npm&logoColor=fff)](https://www.npmjs.com/package/@xhmikosr/decompress-tar) [![CI Status](https://img.shields.io/github/actions/workflow/status/XhmikosR/decompress-tar/ci.yml?branch=master&label=CI&logo=github)](https://github.com/XhmikosR/decompress-tar/actions/workflows/ci.yml?query=branch%3Amaster)

> tar decompress plugin


## Install

```sh
npm install @xhmikosr/decompress-tar
```


## Usage

```js
import decompress from '@xhmikosr/decompress';
import decompressTar from '@xhmikosr/decompress-tar';

decompress('unicorn.tar', 'dist', {
	plugins: [
		decompressTar()
	]
}).then(() => {
	console.log('Files decompressed');
});
```


## API

### decompressTar()(input)

Returns both a Promise for a Buffer and a [Duplex stream](https://nodejs.org/api/stream.html#stream_class_stream_duplex).

#### input

Type: `Buffer` `Stream`

Buffer or stream to decompress.


## License

MIT © [Kevin Mårtensson](https://github.com/kevva)
