import request = require('request');
import _ = require('lodash');
import uuid = require('uuid');
import async = require('async');
import { SpeechAuthCallback, SpeechAuthClient } from './speech-auth-client';

export const SPEECH_STATUS: {[key: string]: SpeechStatus} = {
  error: 'error',
  success: 'success',
};

export const SPEECH_PROPERTY: {[key: string]: SpeechProperty} = {
  ERROR: 'ERROR',
  FALSERECO: 'FALSERECO',
  HIGHCONF: 'HIGHCONF',
  LOWCONF: 'LOWCONF',
  MIDCONF: 'MIDCONF',
  NOSPEECH: 'NOSPEECH',
};

export type SpeechStatus = 'success' | 'error';
export type SpeechProperty = 'ERROR' | 'FALSERECO' | 'HIGHCONF' | 'LOWCONF' | 'MIDCONF' | 'NOSPEECH';

export interface SpeechOptions {
  locale?: string;
  scenarios?: string;
  sampleRate?: number;
}

export interface SpeechResult {
  header: RecognizedSpeechHeader;
  results: RecognizedSpeechResult[];
  version: string;
}

export interface RecognizedSpeechHeader extends RecognizedSpeech {
  status: SpeechStatus;
}

export interface RecognizedSpeechResult extends RecognizedSpeech {
  confidence: number;
}

export type SpeechCallback = (err: Error, speech: SpeechResult) => void;

export interface RecognizedSpeech {
  name: string;
  lexical: string;
  properties: {[key: string]: string};
  scenario: string;
}

type RequestAPI = request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;

const GLOBAL_APP_ID = '31b3d95b-af74-4550-9619-de76fe33f0f0';
const RECOGNIZE_DEFAULTS: SpeechOptions = { locale: 'en-US', scenarios: 'ulm', sampleRate: 16000 };

export class SpeechClient {
  private request: RequestAPI;
  private instanceId = uuid.v4();

  constructor(endpoint: string, private auth: SpeechAuthClient) {
    this.request = request.defaults({
      baseUrl: endpoint,
      qs: {
        'appid': GLOBAL_APP_ID,
        'device.os': 'Windows',
        'format': 'json',
        'instanceid': this.instanceId,
        'version': '3.0',
      },
    });
  }

  recognize(buf: Buffer, options: SpeechOptions, callback: SpeechCallback): void {
    options = _.defaults(options, RECOGNIZE_DEFAULTS);
    async.waterfall([
      (next: SpeechAuthCallback) => {
        this.auth.getToken(next);
      },
      (token: string, next: request.RequestCallback) => {
        this.requestTextFromSpeech(buf, token, options, next);
      },
      (resp: request.RequestResponse, body: any, next: SpeechCallback) => {
        this.receiveTextFromSpeech(resp, body, next);
      },
    ], callback);
  }

  private requestTextFromSpeech(buf: Buffer, token: string, options: SpeechOptions, callback: request.RequestCallback): void {
    this.request.post('', {
      body: buf,
      headers: {
        "authorization": `Bearer ${token}`,
        'content-type': `audio/wav; samplerate=${options.sampleRate}`,
      },
      qs: {
        locale: options.locale,
        requestid: uuid.v4(),
        scenarios: options.scenarios,
      },
    }, callback);
  }

  private receiveTextFromSpeech(resp: request.RequestResponse, body: any, callback: SpeechCallback): void {
    if (resp.statusCode !== 200) {
      setImmediate(callback, new Error(`Speech recognizer returned HTTP ${resp.statusCode}: ${resp.statusMessage}`));
      return;
    }

    const speech = JSON.parse(body) as SpeechResult;

    if (speech.header.status !== SPEECH_STATUS.success) {
      setImmediate(callback, new Error(this.errorMessage(speech)));
      return;
    }

    if (speech.results) {
      speech.results
        .filter((x) => x.confidence)
        .forEach((x) => x.confidence = parseFloat(x.confidence.toString()));
    }

    setImmediate(callback, null, speech);
  }

  private errorMessage(speech: SpeechResult): SpeechProperty {
    if (!speech || !speech.header || !speech.header.properties) {
      return SPEECH_PROPERTY.ERROR;
    } else if (speech.header.properties.hasOwnProperty(SPEECH_PROPERTY.NOSPEECH)) {
      return SPEECH_PROPERTY.NOSPEECH;
    } else if (speech.header.properties.hasOwnProperty(SPEECH_PROPERTY.FALSERECO)) {
      return SPEECH_PROPERTY.FALSERECO;
    } else {
      return SPEECH_PROPERTY.ERROR;
    }
  }
}
