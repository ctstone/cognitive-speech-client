# Installation
```
npm install --save cognitive-speech-client
```


# Usage

## TypeScript
```TypeScript
import { SpeechAuthClient, SpeechClient } from 'cognitive-speech-client';

// Use with Bing Speech endpoint
const client = new SpeechClient(new SpeechAuthClient("key"));

client.recognize(audioBuffer, (err: Error, speech: SpeechResult) => {
  if (err) throw err;
  console.log(speech.header.name);
});
```

```TypeScript
// use with custom speech recognizer (CRIS) endpoint
const auth = new SpeechAuthClient("key", "region"); // e.g. westus
const client = new SpeechClient(auth, "crisEndpoint");
```

```TypeScript
// auto-renew the authentication token
const auth = new SpeechAuthClient("key", "region", true);
```


## JavaScript
```JavaScript
const csc = require('cognitive-speech-client');

const client = new csc.SpeechClient(new csc.SpeechAuthClient("key"));
client.recognize(audioBuffer, (err, speech) => {
  if (err) throw err;
  console.log(speech.header.name);
});
```

# Test Suite
Use `MockSpeechService` to mock a response for any code that relies on `SpeechClient` without making an actual API call.

`MockSpeechService` intercepts any call to the speech recognizer and responds with a fake status and result.

> `AuthClient` caches its authentication token, so take that into account when mocking multiple responses on the same client.

```TypeScript
import { SpeechAuthClient, SpeechClient, MockSpeechService } from 'cognitive-speech-client';

// Use with Bing Speech endpoint
new MockSpeechService()
  .auth(200, 'fake key')
  .recognize(200, {header:{name:'testable result'}});

const client = new SpeechClient(new SpeechAuthClient('fake key'));

client.recognize(new Buffer(0), (err: Error, speech: SpeechResult) => {
  if (err) throw err;
  expect(speech.header.name).toBe('testable result');
});

```

```TypeScript
// use with custom speech recognizer (CRIS) endpoint
new MockSpeechService('customEndpoint', 'region')
  .auth(200, 'fake key')
  .recognize(200, {header:{name:'testable result'}});

const auth = new SpeechAuthClient("key", "region"); // e.g. westus
const client = new SpeechClient(auth, "crisEndpoint");
```