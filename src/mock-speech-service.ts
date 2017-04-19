import nock = require('nock');
import { BING_SPEECH_ENDPOINT } from './speech-client';

export class MockSpeechService {
  authScope: nock.Scope;
  scope: nock.Scope;

  constructor(private endpoint = BING_SPEECH_ENDPOINT, region = '') {
    region = region ? `${region}.` : '';
    this.authScope = nock(`https://${region}api.cognitive.microsoft.com`);
    this.scope = nock(endpoint);
  }

  auth(statusCode: number, body: any = 'some-token', headers?: any): MockSpeechService {
    this.authScope = this.authScope
      .post('/sts/v1.0/issueToken')
      .reply(statusCode, body, headers);
    return this;
  }

  recognize(statusCode: number, body?: any, headers?: any): MockSpeechService {
    this.scope = this.scope
      .post('/recognize')
      .query(true)
      .reply(statusCode, body, headers);
    return this;
  }
}
